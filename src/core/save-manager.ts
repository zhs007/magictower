import { GameStateManager } from './state';
import { SaveData, GameState, Action } from './types';

export class SaveManager {
    private gameStateManager: GameStateManager;

    constructor(gameStateManager: GameStateManager) {
        this.gameStateManager = gameStateManager;
    }

    public createSaveData(): SaveData {
        const saveData: SaveData = {
            timestamp: Date.now(),
            initialStateSeed: this.gameStateManager.initialStateSeed,
            actions: this.gameStateManager.actionHistory,
        };
        return saveData;
    }

    public saveGame(slotId: string): void {
        try {
            const saveData = this.createSaveData();
            const jsonData = JSON.stringify(saveData);
            localStorage.setItem('save_slot_' + slotId, jsonData);
        } catch (error) {
            console.error('Failed to save game:', error);
        }
    }

    public async loadGame(slotId: string): Promise<GameState | null> {
        try {
            const jsonData = localStorage.getItem('save_slot_' + slotId);
            if (!jsonData) {
                console.warn(`No save data found for slot: ${slotId}`);
                return null;
            }

            const saveData: SaveData = JSON.parse(jsonData);

            // Recreate the initial state
            const newGameStateManager = new GameStateManager();
            const initialState = await GameStateManager.createInitialState(saveData.initialStateSeed);
            newGameStateManager.initializeState(initialState);
            newGameStateManager.initialStateSeed = saveData.initialStateSeed;

            // Replay all actions
            for (const action of saveData.actions) {
                newGameStateManager.dispatch(action);
            }

            // Replace the current game state manager's state with the loaded state
            this.gameStateManager.initializeState(newGameStateManager.getState());
            this.gameStateManager.actionHistory = newGameStateManager.actionHistory;
            this.gameStateManager.initialStateSeed = newGameStateManager.initialStateSeed;

            return this.gameStateManager.getState();
        } catch (error) {
            console.error('Failed to load game:', error);
            return null;
        }
    }

    public listSaves(): SaveData[] {
        const saves: SaveData[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('save_slot_')) {
                try {
                    const jsonData = localStorage.getItem(key);
                    if (jsonData) {
                        saves.push(JSON.parse(jsonData));
                    }
                } catch (error) {
                    console.error(`Failed to parse save data for key: ${key}`, error);
                }
            }
        }
        return saves.sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent
    }
}
