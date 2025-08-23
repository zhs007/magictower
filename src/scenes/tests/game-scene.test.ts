import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameScene } from '../game-scene';
import { SceneManager } from '../scene-manager';
import { GameStateManager } from '../../core/state';
import { Renderer } from '../../renderer/renderer';
import { GameState } from '../../core/types';

// Mock dependencies
vi.mock('../scene-manager');
vi.mock('../../core/state');
vi.mock('../../renderer/renderer');
vi.mock('../../core/input-manager');
vi.mock('../../data/data-manager', () => ({
    dataManager: {
        loadAllData: vi.fn().mockResolvedValue(undefined),
    },
}));


describe('GameScene', () => {
    let sceneManager: SceneManager;
    let gameScene: GameScene;

    beforeEach(() => {
        sceneManager = new (vi.mocked(SceneManager))();
        gameScene = new GameScene(sceneManager);

        // Mock internal instances created by GameScene
        gameScene['gameStateManager'] = new (vi.mocked(GameStateManager))();
        gameScene['renderer'] = new (vi.mocked(Renderer))(gameScene);
        gameScene['playerEntityKey'] = 'player1';

        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should dispatch CHANGE_DIRECTION before animating item pickup if player is facing away', () => {
        const mockDispatch = vi.spyOn(gameScene['gameStateManager']!, 'dispatch');
        const mockAnimate = vi.spyOn(gameScene['renderer'], 'animateItemPickup');
        const mockRender = vi.spyOn(gameScene['renderer'], 'render');

        const initialGameState: Partial<GameState> = {
            interactionState: { type: 'item_pickup', itemId: 'item1' },
            entities: {
                'player1': { id: 'player1', type: 'player_start', x: 2, y: 1, direction: 'right' },
                'item1': { id: 'item1', type: 'item', x: 1, y: 1 },
            },
        };

        // Mock getState to return our initial state, and then a turned state
        vi.spyOn(gameScene['gameStateManager']!, 'getState')
            .mockReturnValueOnce(initialGameState as GameState) // First call in processInteraction
            .mockReturnValueOnce({ // Second call after dispatch
                ...initialGameState,
                entities: {
                    ...initialGameState.entities,
                    'player1': { ...initialGameState.entities!['player1'], direction: 'left' }
                }
            } as GameState);

        gameScene['processInteraction'](initialGameState as GameState);

        // 1. Assert that CHANGE_DIRECTION was dispatched first
        expect(mockDispatch).toHaveBeenCalledWith({
            type: 'CHANGE_DIRECTION',
            payload: { entityId: 'player1', direction: 'left' }
        });

        // 2. Assert render was called to show the turn
        expect(mockRender).toHaveBeenCalled();

        // 3. Assert that the animation has NOT been called yet
        expect(mockAnimate).not.toHaveBeenCalled();

        // 4. Run timers to trigger the animation
        vi.runAllTimers();

        // 5. Assert that the animation is now called
        expect(mockAnimate).toHaveBeenCalled();
    });

    it('should NOT dispatch CHANGE_DIRECTION if player is already facing the item', () => {
        const mockDispatch = vi.spyOn(gameScene['gameStateManager']!, 'dispatch');
        const mockAnimate = vi.spyOn(gameScene['renderer'], 'animateItemPickup');

        const initialGameState: Partial<GameState> = {
            interactionState: { type: 'item_pickup', itemId: 'item1' },
            entities: {
                'player1': { id: 'player1', type: 'player_start', x: 0, y: 1, direction: 'right' },
                'item1': { id: 'item1', type: 'item', x: 1, y: 1 },
            },
        };

        vi.spyOn(gameScene['gameStateManager']!, 'getState').mockReturnValue(initialGameState as GameState);

        gameScene['processInteraction'](initialGameState as GameState);

        // Assert that CHANGE_DIRECTION was NOT dispatched
        expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'CHANGE_DIRECTION' }));

        // Assert that the animation was called immediately
        expect(mockAnimate).toHaveBeenCalled();
    });
});
