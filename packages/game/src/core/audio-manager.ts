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
        // Assume sound files are located in the repo-level `assets/sounds/`.
        // From this file (packages/game/src/core) the relative path to repo root is
        // ../../../../assets/sounds/<file>. Use URL imports at runtime via the
        // Vite asset pipeline; during tests the files are resolved by import.meta.glob
        this.sounds['attack'] = new Howl({ src: ['../../../../assets/sounds/attack.wav'] });
        this.sounds['pickup'] = new Howl({ src: ['../../../../assets/sounds/pickup.wav'] });
        this.sounds['door'] = new Howl({ src: ['../../../../assets/sounds/door.wav'] });
    }

    public playSound(key: string) {
        if (this.sounds[key]) {
            this.sounds[key].play();
        }
    }
}
