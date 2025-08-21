import { GameState, Action } from './types';
import { handleMove, handlePickupItem, handleOpenDoor } from './logic';

export class GameStateManager {
    private currentState: GameState;

    constructor(initialState: GameState) {
        this.currentState = initialState;
    }

    public initializeState(initialState: GameState): void {
        this.currentState = initialState;
    }

    public getState(): GameState {
        return this.currentState;
    }

    public dispatch(action: Action): void {
        let newState: GameState;
        switch (action.type) {
            case 'MOVE':
                newState = handleMove(this.currentState, action.payload.dx, action.payload.dy);
                break;
            case 'PICK_UP_ITEM':
                newState = handlePickupItem(this.currentState, action.payload.itemId);
                break;
            case 'OPEN_DOOR':
                newState = handleOpenDoor(this.currentState, action.payload.doorId);
                break;
            default:
                newState = this.currentState;
        }
        this.currentState = newState;
    }
}
