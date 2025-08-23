import { Container, Graphics, Text } from 'pixi.js';
import { GameState } from '../../core/types';
import { eventManager } from '../../core/event-manager';

const HUD_WIDTH = 1080;
const HUD_HEIGHT = 400;
const PADDING = 20;
const FONT_SIZE = 48;

export class HUD extends Container {
    private background: Graphics;
    private playerStatsText: Text;
    private monsterStatsText: Text;
    private keysText: Text;

    // Store last known state for comparison or full redraws
    private lastState: GameState | null = null;

    constructor() {
        super();
        this.background = new Graphics();
        this.drawBackground();
        this.addChild(this.background);

        this.playerStatsText = this.createText('', PADDING, PADDING);
        this.monsterStatsText = this.createText('', PADDING, PADDING + FONT_SIZE * 2);
        this.keysText = this.createText('', PADDING, PADDING + FONT_SIZE * 4);
        this.monsterStatsText.visible = false;

        this.addChild(this.playerStatsText, this.monsterStatsText, this.keysText);

        // Register event listeners
        this.registerListeners();
    }

    private hpChangeHandler = (payload: any) => this.handleHpChange(payload);
    private keysChangeHandler = (payload: any) => this.handleKeysChange(payload);
    private battleEndHandler = (payload: any) => this.handleBattleEnd(payload);
    private debugFlashHandler = () => this.handleDebugFlash();

    private registerListeners(): void {
        eventManager.on('HP_CHANGED', this.hpChangeHandler);
        eventManager.on('KEYS_CHANGED', this.keysChangeHandler);
        eventManager.on('BATTLE_ENDED', this.battleEndHandler);
        eventManager.on('DEBUG_FLASH_RED', this.debugFlashHandler);
    }

    private createText(content: string, x: number, y: number): Text {
        const text = new Text({ text: content, style: { fontFamily: 'Arial', fontSize: FONT_SIZE, fill: 0xffffff, align: 'left' } });
        text.position.set(x, y);
        return text;
    }

    private drawBackground(): void {
        this.background.rect(0, 0, HUD_WIDTH, HUD_HEIGHT).fill(0x333333);
    }

    // Initial setup from GameState
    public update(state: GameState): void {
        this.lastState = state;
        const player = state.player;

        const playerHp = state.interactionState.type === 'battle' ? state.interactionState.playerHp : player.hp;
        this.playerStatsText.text = `勇者: HP ${playerHp}  ATK ${player.attack}  DEF ${player.defense}`;
        this.keysText.text = `钥匙: 黄 ${player.keys.yellow}  蓝 ${player.keys.blue}  红 ${player.keys.red}`;

        if (state.interactionState.type === 'battle') {
            const monster = state.monsters[state.interactionState.monsterId];
            if (monster) {
                this.monsterStatsText.text = `${monster.name}: HP ${state.interactionState.monsterHp}  ATK ${monster.attack}  DEF ${monster.defense}`;
                this.monsterStatsText.visible = true;
            }
        } else {
            this.monsterStatsText.visible = false;
        }
    }

    private handleHpChange(payload: { entityId: string, newHp: number }): void {
        if (!this.lastState) return;

        if (payload.entityId === 'player') {
            this.playerStatsText.text = `勇者: HP ${payload.newHp}  ATK ${this.lastState.player.attack}  DEF ${this.lastState.player.defense}`;
        } else {
            const monster = this.lastState.monsters[payload.entityId];
            if (monster) {
                this.monsterStatsText.text = `${monster.name}: HP ${payload.newHp}  ATK ${monster.attack}  DEF ${monster.defense}`;
            }
        }
    }

    private handleKeysChange(payload: { keys: { yellow: number, blue: number, red: number } }): void {
        this.keysText.text = `钥匙: 黄 ${payload.keys.yellow}  蓝 ${payload.keys.blue}  红 ${payload.keys.red}`;
    }

    private handleBattleEnd(payload: { finalPlayerHp: number }): void {
        this.monsterStatsText.visible = false;
        // After battle, player HP on the HUD should reflect the final state.
        if (this.lastState) {
            this.playerStatsText.text = `勇者: HP ${payload.finalPlayerHp}  ATK ${this.lastState.player.attack}  DEF ${this.lastState.player.defense}`;
        }
    }

    private handleDebugFlash(): void {
        // Change background to red for debugging
        this.background.clear();
        this.background.rect(0, 0, HUD_WIDTH, HUD_HEIGHT).fill(0xff0000);
    }

    public destroy(options?: any): void {
        // Unregister listeners to prevent memory leaks
        eventManager.off('HP_CHANGED', this.hpChangeHandler);
        eventManager.off('KEYS_CHANGED', this.keysChangeHandler);
        eventManager.off('BATTLE_ENDED', this.battleEndHandler);
        eventManager.off('DEBUG_FLASH_RED', this.debugFlashHandler);
        super.destroy(options);
    }
}
