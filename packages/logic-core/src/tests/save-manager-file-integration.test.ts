import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { FileStorage } from '../adapters/file-storage';
import { SaveManager } from '../save-manager';
import { GameStateManager } from '../state';
import { dataManager } from '../data-manager';

describe('SaveManager + FileStorage integration', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'save-int-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should save and load a game using FileStorage', async () => {
        // minimal data manager stubs
        const mockMap = { floor: 1, layout: [[0]], entities: { player_start: { type: 'player_start', id: 'player', x: 0, y: 0 } } } as any;
        // temporarily stub dataManager functions
        const origGetMap = dataManager.getMapLayout;
        const origLoad = dataManager.loadAllData;
        dataManager.getMapLayout = () => mockMap;
        dataManager.loadAllData = async () => {};

        const gsm = new GameStateManager();
        await gsm.createAndInitializeState(1);

        const storage = new FileStorage(tmpDir);
        const saveManager = new SaveManager(gsm, { storage });

        saveManager.saveGame('slot1');

        const loaded = await SaveManager.loadGame('slot1', { storage });
        expect(loaded).not.toBeNull();

        // restore
        dataManager.getMapLayout = origGetMap;
        dataManager.loadAllData = origLoad;
    });
});
