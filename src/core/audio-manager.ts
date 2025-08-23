import { Howl } from 'howler';

export class AudioManager {
    private sounds: { [key: string]: Howl } = {};
    private static instance: AudioManager;

    private constructor() {}

    public static getInstance(): AudioManager {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager();
        }
        return AudioManager.instance;
    }

    public loadSounds() {
        // Assume sound files are in /assets/sounds/
        this.sounds['attack'] = new Howl({ src: ['/assets/sounds/attack.wav'] });
        this.sounds['pickup'] = new Howl({ src: ['/assets/sounds/pickup.wav'] });
        this.sounds['door'] = new Howl({ src: ['/assets/sounds/door.wav'] });
    }

    public playSound(key: string) {
        if (this.sounds[key]) {
            this.sounds[key].play();
        }
    }
}
