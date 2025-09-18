import type * as PIXI from 'pixi.js';

export type ActionCallback = (deltaTime: number) => void;

export interface IEntity extends PIXI.Container {
  action: string;
  actions: Map<string, ActionCallback>;
  setAction(actionName: string, callback: ActionCallback): void;
  update(deltaTime: number): void;
}
