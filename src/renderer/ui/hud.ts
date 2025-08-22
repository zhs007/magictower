import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GameState, IPlayer } from '../../core/types';

const FONT_STYLE = new TextStyle({
    fill: 'white',
    fontSize: 42,
    fontFamily: '"Courier New", Courier, monospace',
    fontWeight: 'bold',
});

const LABEL_STYLE = new TextStyle({
    ...FONT_STYLE,
    fill: '#cccccc',
});

export class HUD extends Container {
    public floorText: Text;
    public hpText: Text;
    public atkText: Text;
    public defText: Text;
    public yellowKeyText: Text;
    public blueKeyText: Text;
    public redKeyText: Text;

    constructor() {
        super();
        this.drawBackground();

        // --- Stats Display ---
        this.floorText = this.addStat('Floor:', 100, 50);
        this.hpText = this.addStat('HP:', 100, 120);
        this.atkText = this.addStat('ATK:', 100, 190);
        this.defText = this.addStat('DEF:', 100, 260);

        // --- Key Display ---
        // For now, we will use text. Sprites can be added later.
        this.yellowKeyText = this.addStat('Yellow Keys:', 550, 120);
        this.blueKeyText = this.addStat('Blue Keys:', 550, 190);
        this.redKeyText = this.addStat('Red Keys:', 550, 260);
    }

    private drawBackground(): void {
        const hudBackground = new Graphics();
        hudBackground.fill({ color: 0x000000, alpha: 0.7 });
        hudBackground.drawRect(0, 0, 1080, 400); // Simple semi-transparent bar for HUD
        hudBackground.fill();
        this.addChild(hudBackground);
    }

    private addStat(label: string, x: number, y: number): Text {
        const labelText = new Text(label, LABEL_STYLE);
        labelText.x = x;
        labelText.y = y;
        this.addChild(labelText);

        const valueText = new Text('0', FONT_STYLE);
        valueText.x = x + labelText.width + 20;
        valueText.y = y;
        this.addChild(valueText);

        return valueText;
    }

    public update(state: GameState): void {
        this.floorText.text = `${state.currentFloor}`;
        this.hpText.text = `${state.player.hp}`;
        this.atkText.text = `${state.player.attack}`;
        this.defText.text = `${state.player.defense}`;

        // Assuming player state has a 'keys' property like this:
        // state.player.keys: { yellow: 1, blue: 0, red: 2 }
        const keys = (state.player as any).keys || { yellow: 0, blue: 0, red: 0 };
        this.yellowKeyText.text = `${keys.yellow}`;
        this.blueKeyText.text = `${keys.blue}`;
        this.redKeyText.text = `${keys.red}`;
    }
}
