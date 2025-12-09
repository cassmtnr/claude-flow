import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
export class GeminiCache {
    cache = new Map();
    config;
    initialized = false;
    constructor(config){
        this.config = config;
    }
    async initialize() {
        if (!this.config.enabled || this.initialized) return;
        try {
            await fs.mkdir(this.config.directory, {
                recursive: true
            });
            await this.loadFromDisk();
            this.initialized = true;
        } catch (error) {
            console.warn('Failed to initialize cache:', error);
        }
    }
    generateKey(params) {
        const normalized = JSON.stringify(params, Object.keys(params).sort());
        return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
    }
    async get(key) {
        if (!this.config.enabled) return null;
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.createdAt > this.config.ttl) {
            this.cache.delete(key);
            await this.removeFromDisk(key);
            return null;
        }
        entry.accessedAt = Date.now();
        return entry.value;
    }
    async set(key, value) {
        if (!this.config.enabled) return;
        const size = JSON.stringify(value).length;
        await this.evictIfNeeded();
        const entry = {
            key,
            value,
            createdAt: Date.now(),
            accessedAt: Date.now(),
            size
        };
        this.cache.set(key, entry);
        await this.saveToDisk(key, entry);
    }
    async invalidate(pattern) {
        let invalidated = 0;
        for (const [key, entry] of this.cache.entries()){
            let shouldInvalidate = !pattern;
            if (pattern) {
                const value = entry.value;
                if (pattern.target && value.requestId?.includes(pattern.target)) {
                    shouldInvalidate = true;
                }
                if (pattern.type && value.findings?.some((f)=>f.type === pattern.type)) {
                    shouldInvalidate = true;
                }
            }
            if (shouldInvalidate) {
                this.cache.delete(key);
                await this.removeFromDisk(key);
                invalidated++;
            }
        }
        return invalidated;
    }
    async clear() {
        this.cache.clear();
        try {
            const files = await fs.readdir(this.config.directory);
            await Promise.all(files.filter((f)=>f.endsWith('.json')).map((f)=>fs.unlink(path.join(this.config.directory, f))));
        } catch  {}
    }
    getStats() {
        let totalSize = 0;
        for (const entry of this.cache.values()){
            totalSize += entry.size;
        }
        return {
            entries: this.cache.size,
            size: totalSize,
            hitRate: 0
        };
    }
    async evictIfNeeded() {
        while(this.cache.size >= this.config.maxSize){
            let lruKey = null;
            let lruTime = Infinity;
            for (const [key, entry] of this.cache.entries()){
                if (entry.accessedAt < lruTime) {
                    lruTime = entry.accessedAt;
                    lruKey = key;
                }
            }
            if (lruKey) {
                this.cache.delete(lruKey);
                await this.removeFromDisk(lruKey);
            } else {
                break;
            }
        }
    }
    async saveToDisk(key, entry) {
        try {
            const filePath = path.join(this.config.directory, `${key}.json`);
            await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
        } catch (error) {
            console.warn(`Failed to save cache entry ${key}:`, error);
        }
    }
    async removeFromDisk(key) {
        try {
            const filePath = path.join(this.config.directory, `${key}.json`);
            await fs.unlink(filePath);
        } catch  {}
    }
    async loadFromDisk() {
        try {
            const files = await fs.readdir(this.config.directory);
            const jsonFiles = files.filter((f)=>f.endsWith('.json'));
            for (const file of jsonFiles){
                try {
                    const filePath = path.join(this.config.directory, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const entry = JSON.parse(content);
                    if (Date.now() - entry.createdAt <= this.config.ttl) {
                        this.cache.set(entry.key, entry);
                    } else {
                        await fs.unlink(filePath);
                    }
                } catch  {}
            }
        } catch  {}
    }
}

//# sourceMappingURL=cache.js.map