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

    private lastState: GameState | null = null;

    constructor() {
        super();
        this.background = new Graphics();
        this.drawBackground();
        this.addChild(this.background);

        // Create placeholder text objects to define position and initial style
        this.playerStatsText = this.createText('', PADDING, PADDING);
        this.monsterStatsText = this.createText('', PADDING, PADDING + FONT_SIZE * 2);
        this.keysText = this.createText('', PADDING, PADDING + FONT_SIZE * 4);

        this.addChild(this.playerStatsText, this.monsterStatsText, this.keysText);
        this.monsterStatsText.visible = false;

        this.registerListeners();
    }

    // --- Event Handlers ---
    private hpChangeHandler = (payload: any) => this.handleHpChange(payload);
    private keysChangeHandler = (payload: any) => this.handleKeysChange(payload);
    private battleEndHandler = (payload: any) => this.handleBattleEnd(payload);

    private registerListeners(): void {
        eventManager.on('HP_CHANGED', this.hpChangeHandler);
        eventManager.on('KEYS_CHANGED', this.keysChangeHandler);
        eventManager.on('BATTLE_ENDED', this.battleEndHandler);
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
        this.updatePlayerStats(state.interactionState.type === 'battle' ? state.interactionState.playerHp : state.player.hp);
        this.updateKeys(state.player.keys);

        if (state.interactionState.type === 'battle') {
            this.updateMonsterStats(state.interactionState.monsterHp);
            this.monsterStatsText.visible = true;
        } else {
            this.monsterStatsText.visible = false;
        }
    }

    private updatePlayerStats(hp: number): void {
        if (!this.lastState) return;
        const newTextContent = `勇者: HP ${hp}  ATK ${this.lastState.player.attack}  DEF ${this.lastState.player.defense}`;
        this.removeChild(this.playerStatsText);
        this.playerStatsText = this.createText(newTextContent, PADDING, PADDING);
        this.addChild(this.playerStatsText);
    }

    private updateMonsterStats(hp: number): void {
        if (!this.lastState || this.lastState.interactionState.type !== 'battle') return;
        const monster = this.lastState.monsters[this.lastState.interactionState.monsterId];
        if (!monster) return;

        const newTextContent = `${monster.name}: HP ${hp}  ATK ${monster.attack}  DEF ${monster.defense}`;
        this.removeChild(this.monsterStatsText);
        this.monsterStatsText = this.createText(newTextContent, PADDING, PADDING + FONT_SIZE * 2);
        this.addChild(this.monsterStatsText);
        this.monsterStatsText.visible = true;
    }

    private updateKeys(keys: { yellow: number, blue: number, red: number }): void {
        const newTextContent = `钥匙: 黄 ${keys.yellow}  蓝 ${keys.blue}  红 ${keys.red}`;
        this.removeChild(this.keysText);
        this.keysText = this.createText(newTextContent, PADDING, PADDING + FONT_SIZE * 4);
        this.addChild(this.keysText);
    }

    private handleHpChange(payload: { entityId: string, newHp: number }): void {
        if (payload.entityId === 'player') {
            this.updatePlayerStats(payload.newHp);
        } else {
            this.updateMonsterStats(payload.newHp);
        }
    }

    private handleKeysChange(payload: { keys: { yellow: number, blue: number, red: number } }): void {
        this.updateKeys(payload.keys);
    }

    private handleBattleEnd(payload: { finalPlayerHp: number }): void {
        this.monsterStatsText.visible = false;
        this.updatePlayerStats(payload.finalPlayerHp);
    }

    public destroy(options?: any): void {
        eventManager.off('HP_CHANGED', this.hpChangeHandler);
        eventManager.off('KEYS_CHANGED', this.keysChangeHandler);
        eventManager.off('BATTLE_ENDED', this.battleEndHandler);
        super.destroy(options);
    }
}
