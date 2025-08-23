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

    constructor() {
        super();
        this.background = new Graphics();
        this.drawBackground();
        this.addChild(this.background);

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

    // This method is for the very first draw.
    public update(state: GameState): void {
        this.updatePlayerStats(state.player.hp, state.player.attack, state.player.defense);
        this.updateKeys(state.player.keys);
        this.monsterStatsText.visible = false;
    }

    private updatePlayerStats(hp: number, attack: number, defense: number): void {
        this.playerStatsText.text = `勇者: HP ${hp}  ATK ${attack}  DEF ${defense}`;
    }

    private updateMonsterStats(name: string, hp: number, attack: number, defense: number): void {
        this.monsterStatsText.text = `${name}: HP ${hp}  ATK ${attack}  DEF ${defense}`;
    }

    private updateKeys(keys: { yellow: number, blue: number, red: number }): void {
        this.keysText.text = `钥匙: 黄 ${keys.yellow}  蓝 ${keys.blue}  红 ${keys.red}`;
    }

    private handleHpChange(payload: { entityId: string, name?: string, newHp: number, attack: number, defense: number }): void {
        if (payload.entityId === 'player') {
            this.updatePlayerStats(payload.newHp, payload.attack, payload.defense);
        } else if (payload.name) {
            this.monsterStatsText.visible = true;
            this.updateMonsterStats(payload.name, payload.newHp, payload.attack, payload.defense);
        }
    }

    private handleKeysChange(payload: { keys: { yellow: number, blue: number, red: number } }): void {
        this.updateKeys(payload.keys);
    }

    private handleBattleEnd(payload: { finalPlayerHp: number, finalPlayerAtk: number, finalPlayerDef: number }): void {
        this.monsterStatsText.visible = false;
        this.updatePlayerStats(payload.finalPlayerHp, payload.finalPlayerAtk, payload.finalPlayerDef);
    }

    public destroy(options?: any): void {
        eventManager.off('HP_CHANGED', this.hpChangeHandler);
        eventManager.off('KEYS_CHANGED', this.keysChangeHandler);
        eventManager.off('BATTLE_ENDED', this.battleEndHandler);
        super.destroy(options);
    }
}
