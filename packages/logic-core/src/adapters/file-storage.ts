import fs from 'fs';
import path from 'path';
import { StorageLike } from '../save-manager';

export class FileStorage implements StorageLike {
    private dir: string;

    constructor(baseDir: string) {
        this.dir = baseDir;
        if (!fs.existsSync(this.dir)) {
            fs.mkdirSync(this.dir, { recursive: true });
        }
    }

    private filepath(key: string) {
        // Use encodeURIComponent to avoid problematic characters in filename
        return path.join(this.dir, encodeURIComponent(key));
    }

    getItem(key: string): string | null {
        const fp = this.filepath(key);
        if (!fs.existsSync(fp)) return null;
        return fs.readFileSync(fp, 'utf8');
    }

    setItem(key: string, value: string): void {
        const fp = this.filepath(key);
        fs.writeFileSync(fp, value, 'utf8');
    }

    removeItem(key: string): void {
        const fp = this.filepath(key);
        if (fs.existsSync(fp)) {
            fs.unlinkSync(fp);
        }
    }

    key(index: number): string | null {
        const files = fs.readdirSync(this.dir);
        if (index < 0 || index >= files.length) return null;
        // decodeURIComponent to return original key
        return decodeURIComponent(files[index]);
    }

    get length(): number {
        const files = fs.readdirSync(this.dir);
        return files.length;
    }
}
