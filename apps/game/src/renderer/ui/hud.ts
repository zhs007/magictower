import { Container, Graphics, Text } from 'pixi.js';
import { GameState, IPlayer, dataManager } from '@proj-tower/logic-core';
import { eventManager } from '../../core/event-manager';

const HUD_WIDTH = 1080;
const HUD_HEIGHT = 400;
const PADDING = 20;
const FONT_SIZE = 48;

export class HUD extends Container {
    private background: Graphics;
    private playerStatsText: Text;
    private levelText: Text;
    private expText: Text;
    private monsterStatsText: Text;
    private keysText: Text;

    constructor() {
        super();
        this.background = new Graphics();
        this.drawBackground();
        this.addChild(this.background);

        this.playerStatsText = this.createText('', PADDING, PADDING);
        this.levelText = this.createText('', PADDING, PADDING + FONT_SIZE * 1.5);
        this.expText = this.createText('', PADDING, PADDING + FONT_SIZE * 3);
        this.monsterStatsText = this.createText('', PADDING, PADDING + FONT_SIZE * 4.5);
        this.keysText = this.createText('', PADDING, PADDING + FONT_SIZE * 6);

        this.addChild(
            this.playerStatsText,
            this.levelText,
            this.expText,
            this.monsterStatsText,
            this.keysText
        );
        this.monsterStatsText.visible = false;

        this.registerListeners();
    }

    // --- Event Handlers ---
    private playerUpdateHandler = (payload: any) => this.handlePlayerUpdate(payload);
    private keysChangeHandler = (payload: any) => this.handleKeysChange(payload);
    private battleEndHandler = (payload: any) => this.handleBattleEnd(payload);
    private levelUpHandler = (payload: any) => this.handleLevelUp(payload);

    private registerListeners(): void {
        eventManager.on('HP_CHANGED', this.playerUpdateHandler);
        eventManager.on('KEYS_CHANGED', this.keysChangeHandler);
        eventManager.on('BATTLE_ENDED', this.battleEndHandler);
        eventManager.on('PLAYER_LEVELED_UP', this.levelUpHandler);
    }

    private createText(content: string, x: number, y: number): Text {
        const text = new Text({
            text: content,
            style: { fontFamily: 'Arial', fontSize: FONT_SIZE, fill: 0xffffff, align: 'left' },
        });
        text.position.set(x, y);
        return text;
    }

    private drawBackground(): void {
        this.background.rect(0, 0, HUD_WIDTH, HUD_HEIGHT).fill(0x333333);
    }

    // This method is for the very first draw.
    public update(state: GameState): void {
        this.updatePlayerInfo(state.player);
        this.updateKeys(state.player.keys);
        this.monsterStatsText.visible = false;
    }

    private updatePlayerInfo(player: IPlayer): void {
        this.playerStatsText.text = `HP ${player.hp}/${player.maxhp}  ATK ${player.attack}  DEF ${player.defense}  SPD ${player.speed}`;
        this.levelText.text = `Level: ${player.level}`;

        const levelData = dataManager.getLevelData();
        const currentLevelInfo = levelData.find((ld) => ld.level === player.level);
        const nextLevelInfo = levelData.find((ld) => ld.level === player.level + 1);

        if (currentLevelInfo && nextLevelInfo) {
            const expForNextLevel = nextLevelInfo.exp_needed - currentLevelInfo.exp_needed;
            const currentExpInLevel = player.exp - currentLevelInfo.exp_needed;
            this.expText.text = `EXP: ${currentExpInLevel} / ${expForNextLevel}`;
        } else {
            this.expText.text = `EXP: ${player.exp}`;
        }
    }

    private updateMonsterStats(name: string, hp: number, attack: number, defense: number): void {
        this.monsterStatsText.text = `${name}: HP ${hp}  ATK ${attack}  DEF ${defense}`;
    }

    private updateKeys(
        keys:
            | { yellow?: number; blue?: number; red?: number }
            | { yellow: number; blue: number; red: number }
    ): void {
        const yellow = (keys as any).yellow ?? 0;
        const blue = (keys as any).blue ?? 0;
        const red = (keys as any).red ?? 0;
        this.keysText.text = `钥匙: 黄 ${yellow}  蓝 ${blue}  红 ${red}`;
    }

    private handlePlayerUpdate(payload: {
        entityId: string;
        name?: string;
        newHp: number;
        maxHp: number;
        level: number;
        exp: number;
        attack: number;
        defense: number;
        speed: number;
    }): void {
        if (payload.entityId === 'player') {
            // Reconstruct a partial player object for the update method
            const playerUpdate = {
                hp: payload.newHp,
                maxhp: payload.maxHp,
                level: payload.level,
                exp: payload.exp,
                attack: payload.attack,
                defense: payload.defense,
                speed: payload.speed,
            } as IPlayer; // Cast to IPlayer, acknowledging it's partial
            this.updatePlayerInfo(playerUpdate);
        } else if (payload.name) {
            this.monsterStatsText.visible = true;
            this.updateMonsterStats(payload.name, payload.newHp, payload.attack, payload.defense);
        }
    }

    private handleKeysChange(payload: {
        keys: { yellow: number; blue: number; red: number };
    }): void {
        this.updateKeys(payload.keys);
    }

    private handleBattleEnd(payload: {
        finalPlayerHp: number;
        finalPlayerMaxHp: number;
        finalPlayerLevel: number;
        finalPlayerExp: number;
        finalPlayerAtk: number;
        finalPlayerDef: number;
        finalPlayerSpeed: number;
    }): void {
        this.monsterStatsText.visible = false;
        const playerUpdate = {
            hp: payload.finalPlayerHp,
            maxhp: payload.finalPlayerMaxHp,
            level: payload.finalPlayerLevel,
            exp: payload.finalPlayerExp,
            attack: payload.finalPlayerAtk,
            defense: payload.finalPlayerDef,
            speed: payload.finalPlayerSpeed,
        } as IPlayer;
        this.updatePlayerInfo(playerUpdate);
    }

    private handleLevelUp(payload: any): void {
        // The battle_end event will handle the final state update.
        // This handler is mostly for triggering special effects in the future.
        console.log('HUD received level up event:', payload);
    }

    public destroy(options?: any): void {
        eventManager.off('HP_CHANGED', this.playerUpdateHandler);
        eventManager.off('KEYS_CHANGED', this.keysChangeHandler);
        eventManager.off('BATTLE_ENDED', this.battleEndHandler);
        eventManager.off('PLAYER_LEVELED_UP', this.levelUpHandler);
        super.destroy(options);
    }
}
