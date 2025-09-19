import * as PIXI from 'pixi.js';
import type { IEntity, ActionCallback } from './types';

export class Entity extends PIXI.Container implements IEntity {
  public action: string;
  public actions: Map<string, ActionCallback>;

  constructor() {
    super();
    this.action = 'idle';
    this.actions = new Map();
  }

  public setAction(actionName: string, callback: ActionCallback): void {
    this.actions.set(actionName, callback);
  }

  public update(deltaTime: number): void {
    const callback = this.actions.get(this.action);
    if (callback) {
      callback(deltaTime);
    }
  }
}
