// Minimal character-art contract adapted from Habblaud's MIT-licensed renderer.
export const TILE = 16;
export type Dir = 'down' | 'up' | 'left' | 'right';
export type Pose = 'stand' | 'walk' | 'run' | 'sit' | 'type' | 'sleep' | 'drink' | 'use' | 'raise_hand' | 'talk' | 'stretch' | 'read' | 'play' | 'wait' | 'cheer' | 'laugh' | 'game' | 'rps' | 'groom' | 'sulk';
export type HeldItem = 'none' | 'coffee' | 'water' | 'papers' | 'laptop' | 'book' | 'box' | 'paddle' | 'popcorn' | 'controller' | 'rock' | 'paper' | 'scissors' | 'phone' | 'lipstick' | 'comb';
export type HairStyle = 'short' | 'buzz' | 'spiky' | 'side_part' | 'curly' | 'afro' | 'bob' | 'long' | 'ponytail' | 'bun' | 'pigtails' | 'mohawk' | 'bald' | 'wavy';
export type TopStyle = 'tshirt' | 'hoodie' | 'shirt_tie' | 'sweater' | 'jacket' | 'blouse' | 'polo';
export type Accessory = 'none' | 'glasses' | 'sunglasses' | 'headphones' | 'cap' | 'beanie' | 'earrings' | 'bow';
export interface Appearance {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  eyes: string;
  top: string;
  topAccent: string;
  topStyle: TopStyle;
  bottom: string;
  shoes: string;
  accessory: Accessory;
  accessoryColor: string;
  lanyard: string | null;
  look: 'f' | 'm';
  facialHair?: 'none' | 'stubble' | 'beard' | 'mustache' | 'goatee';
  bottomStyle?: 'pants' | 'shorts' | 'skirt';
}
export interface CharacterFrameRequest {
  appearance: Appearance;
  dir: Dir;
  pose: Pose;
  frame: number;
  held?: HeldItem;
  seated?: boolean;
  costume?: 'santa' | 'witch' | 'pumpkin' | 'vampire';
}
export interface Rect { x: number; y: number; w: number; h: number; }
export type SpriteRectName = 'screen' | 'board' | 'glass' | 'face' | 'tv' | 'sign' | 'art' | 'glow' | 'screen2';
