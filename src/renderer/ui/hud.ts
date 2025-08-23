import { Container, Graphics, Text } from 'pixi.js';
import { GameState } from '../../core/types';

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
    }

    private createText(content: string, x: number, y: number): Text {
        const text = new Text({
            text: content,
            style: {
                fontFamily: 'Arial',
                fontSize: FONT_SIZE,
                fill: 0xffffff,
                align: 'left',
            }
        });
        text.position.set(x, y);
        return text;
    }

    private drawBackground(): void {
        this.background.rect(0, 0, HUD_WIDTH, HUD_HEIGHT).fill(0x333333);
    }

    public update(state: GameState): void {
        const player = state.player;
        const inBattle = state.interactionState.type === 'battle';

        const playerHp = inBattle ? state.interactionState.playerHp : player.hp;
        this.playerStatsText.text = `勇者: HP ${playerHp}  ATK ${player.attack}  DEF ${player.defense}`;
        this.keysText.text = `钥匙: 黄 ${player.keys.yellow}  蓝 ${player.keys.blue}  红 ${player.keys.red}`;

        if (inBattle) {
            const monster = state.monsters[state.interactionState.monsterId];
            if (monster) {
                this.monsterStatsText.text = `${monster.name}: HP ${state.interactionState.monsterHp}  ATK ${monster.attack}  DEF ${monster.defense}`;
                this.monsterStatsText.visible = true;
            }
        } else {
            this.monsterStatsText.visible = false;
        }
    }
}
