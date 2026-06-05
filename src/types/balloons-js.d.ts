declare module 'balloons-js' {
  export interface BalloonOptions {
    text?: string;
    fontSize?: number;
    color?: string;
  }

  export function balloons(): void;
  export function textBalloons(options: BalloonOptions[]): void;
}
