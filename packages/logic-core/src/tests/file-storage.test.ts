import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { FileStorage } from '../adapters/file-storage';

describe('FileStorage', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filestorage-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should set/get/remove items and report length/key correctly', () => {
        const s = new FileStorage(tmpDir);
        expect(s.getItem('a')).toBeNull();
        s.setItem('a', '1');
        s.setItem('b', '2');
        expect(s.getItem('a')).toBe('1');
        expect(s.getItem('b')).toBe('2');
        expect(s.length).toBe(2);
        const keys = [s.key(0), s.key(1)];
        expect(keys).toContain('a');
        expect(keys).toContain('b');
        s.removeItem('a');
        expect(s.getItem('a')).toBeNull();
        expect(s.length).toBe(1);
    });
});
