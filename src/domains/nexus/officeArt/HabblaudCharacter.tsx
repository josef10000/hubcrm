import { useEffect, useMemo, useRef, useState } from 'react';
import { CHAR_H, CHAR_W, POSE_DURATION, POSE_FRAMES, renderCharacter } from './art/character/render';
import type { Appearance, Pose } from './art/api';

const skinTones = ['#f1c7a5', '#dca17b', '#b8785b', '#8d563f', '#f4d6b3', '#c68c69'];
const hairTones = ['#302126', '#493225', '#775135', '#302f42', '#8a5736', '#2d3545', '#b6783f'];
const hairStyles: Appearance['hairStyle'][] = ['short', 'curly', 'side_part', 'bob', 'afro', 'ponytail', 'spiky', 'wavy'];
const outfits: Appearance['topStyle'][] = ['hoodie', 'shirt_tie', 'sweater', 'jacket', 'blouse', 'polo', 'tshirt'];

export function officeAppearance(seed: number, outfit: string): Appearance {
  const n = Math.abs(Math.trunc(seed));
  return {
    skin: skinTones[n % skinTones.length],
    hair: hairTones[Math.floor(n / 2) % hairTones.length],
    hairStyle: hairStyles[n % hairStyles.length],
    eyes: '#38262d',
    top: outfit,
    topAccent: ['#f5d48e', '#f1a78b', '#c2e2dc', '#f2d3d8'][n % 4],
    topStyle: outfits[Math.floor(n / 3) % outfits.length],
    bottom: ['#35465c', '#49526a', '#5c473d', '#42494d'][n % 4],
    shoes: '#4a3536',
    accessory: (n % 4 === 0 ? 'glasses' : n % 5 === 0 ? 'headphones' : 'none'),
    accessoryColor: '#f3c66b',
    lanyard: n % 3 === 0 ? '#ffd56f' : null,
    look: n % 2 === 0 ? 'f' : 'm',
    facialHair: n % 2 ? 'none' : undefined,
  };
}

export function HabblaudCharacter({ seed, outfit, pose, className = '' }: {
  seed: number;
  outfit: string;
  pose: Pose;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const appearance = useMemo(() => officeAppearance(seed, outfit), [seed, outfit]);
  const [frame, setFrame] = useState(0);
  const seated = pose === 'type' || pose === 'sit';
  const direction = pose === 'type' ? 'up' : 'down';

  useEffect(() => {
    setFrame(0);
    const frameCount = POSE_FRAMES[pose] ?? 1;
    if (frameCount <= 1) return;
    const timer = window.setInterval(() => setFrame(current => (current + 1) % frameCount), POSE_DURATION[pose] ?? 500);
    return () => window.clearInterval(timer);
  }, [pose, seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const sprite = renderCharacter({ appearance, dir: direction, pose, frame, seated });
    const source = sourceRef.current ?? document.createElement('canvas');
    sourceRef.current = source;
    source.width = CHAR_W;
    source.height = CHAR_H;
    const sourceContext = source.getContext('2d');
    if (!sourceContext) return;
    sourceContext.putImageData(new ImageData(sprite.buf.data, CHAR_W, CHAR_H), 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
  }, [appearance, direction, frame, pose, seated]);

  return <canvas ref={canvasRef} className={`office-habblaud-sprite ${className}`} width={CHAR_W * 2} height={CHAR_H * 2} aria-hidden="true" />;
}

export function agentPose(status: 'idle' | 'working' | 'review'): Pose {
  if (status === 'working') return 'type';
  if (status === 'review') return 'raise_hand';
  return 'stand';
}
