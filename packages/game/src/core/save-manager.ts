import { GameStateManager } from './state';
import { SaveData, GameState } from '@proj-tower/logic-core';

export class SaveManager {
    private gameStateManager: GameStateManager;

    constructor(gameStateManager: GameStateManager) {
        this.gameStateManager = gameStateManager;
    }

    // Instance method for saving the current game state
    public saveGame(slotId: string): void {
        try {
            const saveData: SaveData = {
                timestamp: Date.now(),
                initialStateSeed: this.gameStateManager.initialStateSeed,
                actions: this.gameStateManager.actionHistory,
            };
            const jsonData = JSON.stringify(saveData);
            localStorage.setItem('save_slot_' + slotId, jsonData);
        } catch (error) {
            console.error('Failed to save game:', error);
        }
    }

    // Static method to load a game state from a slot, does not modify any instance
    public static async loadGame(slotId: string): Promise<GameState | null> {
        try {
            const jsonData = localStorage.getItem('save_slot_' + slotId);
            if (!jsonData) {
                console.warn(`No save data found for slot: ${slotId}`);
                return null;
            }

            const saveData: SaveData = JSON.parse(jsonData);

            // Recreate the initial state from seed
            const initialState = await GameStateManager.createInitialState(
                saveData.initialStateSeed
            );
            const tempGameStateManager = new GameStateManager();
            tempGameStateManager.initializeState(initialState);
            tempGameStateManager.initialStateSeed = saveData.initialStateSeed;

            // Replay all actions to reconstruct the final state
            for (const action of saveData.actions) {
                tempGameStateManager.dispatch(action);
            }

            return tempGameStateManager.getState();
        } catch (error) {
            console.error(`Failed to load game: ${error}`);
            return null;
        }
    }

    // Static method to list all available save slot IDs
    public static listSaves(): string[] {
        const slots: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('save_slot_')) {
                slots.push(key.replace('save_slot_', ''));
            }
        }
        return slots;
    }
}
