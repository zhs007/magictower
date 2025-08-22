import { Container, Text, Graphics } from 'pixi.js';
import { BaseScene } from './base-scene';
import { SceneManager } from './scene-manager';
import { saveManager } from '../core/save-manager';

/**
 * The start menu scene.
 */
export class StartScene extends BaseScene {
    private saveSlots: string[] = [];
    private saveSlotsContainer: Container | null = null;

    constructor(sceneManager: SceneManager) {
        super(sceneManager);
    }

    public async onEnter(): Promise<void> {
        this.saveSlots = await saveManager.listSaves();
        this.drawMenu();
    }

    public onExit(): void {
        this.removeChildren();
    }

    private drawMenu(): void {
        // Game Logo (as text)
        const logo = new Text({
            text: 'My Awesome Game',
            style: {
                fontFamily: 'Arial',
                fontSize: 80,
                fill: 0xffffff,
                align: 'center',
            },
        });
        logo.anchor.set(0.5);
        logo.x = 1080 / 2;
        logo.y = 400;
        this.addChild(logo);

        // New Game Button
        const newGameButton = this.createButton('New Game', () => {
            this.sceneManager.goTo('game', { newGame: true });
        });
        newGameButton.position.set(1080 / 2, 800);
        this.addChild(newGameButton);

        // Continue Button
        const continueButton = this.createButton('Continue', () => {
            this.showSaveSlots();
        });
        continueButton.position.set(1080 / 2, 950);
        this.addChild(continueButton);

        // Disable continue button if no saves are available
        if (this.saveSlots.length === 0) {
            continueButton.alpha = 0.5;
            continueButton.interactive = false;
        }
    }

    private createButton(text: string, onClick: () => void): Container {
        const button = new Container();
        const background = new Graphics()
            .roundRect(0, 0, 400, 100, 15)
            .fill(0x1e90ff);

        const buttonText = new Text({
            text: text,
            style: {
                fontFamily: 'Arial',
                fontSize: 50,
                fill: 0xffffff,
            },
        });

        buttonText.anchor.set(0.5);
        buttonText.position.set(background.width / 2, background.height / 2);

        button.addChild(background, buttonText);
        button.pivot.set(background.width / 2, background.height / 2);

        button.interactive = true;
        button.cursor = 'pointer';

        button.on('pointerdown', onClick);
        button.on('pointerover', () => (background.tint = 0x87cefa));
        button.on('pointerout', () => (background.tint = 0xffffff));

        return button;
    }

    private showSaveSlots(): void {
        if (this.saveSlotsContainer) {
            this.saveSlotsContainer.destroy();
        }
        this.saveSlotsContainer = new Container();
        this.addChild(this.saveSlotsContainer);

        const background = new Graphics()
            .rect(0, 0, 600, 800)
            .fill({ color: 0x000000, alpha: 0.8 });
        background.pivot.set(300, 400);
        background.position.set(1080 / 2, 1920 / 2);
        this.saveSlotsContainer.addChild(background);

        const title = new Text({text:'Select a Save', style:{ fill: 0xffffff, fontSize: 50 }});
        title.anchor.set(0.5);
        title.position.set(background.width / 2, 50);
        background.addChild(title);

        this.saveSlots.forEach((slotId, index) => {
            const slotButton = this.createButton(slotId, () => {
                this.sceneManager.goTo('game', { loadSlot: slotId });
            });
            slotButton.position.set(background.width / 2, 150 + index * 150);
            background.addChild(slotButton);
        });

        const closeButton = this.createButton('Back', () => {
            if (this.saveSlotsContainer) {
                this.saveSlotsContainer.destroy();
                this.saveSlotsContainer = null;
            }
        });
        closeButton.position.set(background.width / 2, 700);
        background.addChild(closeButton);
    }
}
