import { GameStateManager } from './state';
import { SaveData, GameState } from './types';

const CURRENT_SAVE_VERSION = 1;
// A simple date-based version for game data. Update this when gamedata changes.
const CURRENT_DATA_VERSION = '20250916';

// Minimal Storage interface compatible with DOM Storage
export interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    key(index: number): string | null;
    readonly length: number;
}

// Minimal Logger interface
import { ILogger, getLogger } from './logger';

// Backwards-compatible alias for the previous LoggerLike shape
export type LoggerLike = ILogger;

export class SaveManager {
    private gameStateManager: GameStateManager;
    private storage: StorageLike;
    private logger: LoggerLike;

    constructor(
        gameStateManager: GameStateManager,
        options?: { storage?: StorageLike; logger?: LoggerLike }
    ) {
        this.gameStateManager = gameStateManager;
        this.storage = options?.storage ?? (globalThis as any).localStorage;
    this.logger = options?.logger ?? getLogger();
    }

    // Instance method for saving the current game state
    public saveGame(slotId: string): void {
        try {
            const saveData: SaveData = {
                saveVersion: CURRENT_SAVE_VERSION,
                dataVersion: CURRENT_DATA_VERSION,
                timestamp: Date.now(),
                initialStateSeed: this.gameStateManager.initialStateSeed,
                actions: this.gameStateManager.actionHistory,
            };
            const jsonData = JSON.stringify(saveData);
            this.storage.setItem('save_slot_' + slotId, jsonData);
        } catch (error) {
            this.logger.error('Failed to save game:', error);
        }
    }

    // Static method to load a game state from a slot, does not modify any instance
    public static async loadGame(
        slotId: string,
        options?: { storage?: StorageLike; logger?: LoggerLike }
    ): Promise<GameState | null> {
    const storage = options?.storage ?? (globalThis as any).localStorage;
    const logger = options?.logger ?? getLogger();
        try {
            const jsonData = storage.getItem('save_slot_' + slotId);
            if (!jsonData) {
                logger.warn(`No save data found for slot: ${slotId}`);
                return null;
            }

            const saveData: SaveData = JSON.parse(jsonData);

            if (saveData.saveVersion !== CURRENT_SAVE_VERSION) {
                logger.warn(
                    `Save data version mismatch. Save version: ${saveData.saveVersion}, Current version: ${CURRENT_SAVE_VERSION}. Loading may fail.`
                );
            }
            if (saveData.dataVersion !== CURRENT_DATA_VERSION) {
                logger.warn(
                    `Game data version mismatch. Save data version: ${saveData.dataVersion}, Current data version: ${CURRENT_DATA_VERSION}. Game balance may be affected.`
                );
            }

            // Recreate the initial state from seed using an instance (createInitialState is now an instance method)
            const tempGameStateManager = new GameStateManager();
            const initialState = await tempGameStateManager.createInitialState(saveData.initialStateSeed);
            tempGameStateManager.initializeState(initialState);
            tempGameStateManager.initialStateSeed = saveData.initialStateSeed;

            // Replay all actions to reconstruct the final state
            for (const action of saveData.actions) {
                tempGameStateManager.dispatch(action);
            }

            return tempGameStateManager.getState();
        } catch (error) {
            logger.error(`Failed to load game: ${error}`);
            return null;
        }
    }

    // Static method to list all available save slot IDs
    public static listSaves(options?: { storage?: StorageLike }): string[] {
        const storage = options?.storage ?? (globalThis as any).localStorage;
        const slots: string[] = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith('save_slot_')) {
                slots.push(key.replace('save_slot_', ''));
            }
        }
        return slots;
    }
}
