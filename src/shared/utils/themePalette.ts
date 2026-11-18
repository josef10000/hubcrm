export interface ThemePalette {
  primaryHex: string;
  lightHex: string;
  rgb: string; // "r, g, b" for rgba() usage
  isLight: boolean;
}

const PALETTES: Record<string, ThemePalette> = {
  orange: { primaryHex: '#f97316', lightHex: '#fbbf24', rgb: '249, 115, 22', isLight: false },
  blue: { primaryHex: '#3b82f6', lightHex: '#60a5fa', rgb: '59, 130, 246', isLight: false },
  green: { primaryHex: '#22c55e', lightHex: '#4ade80', rgb: '34, 197, 94', isLight: false },
  purple: { primaryHex: '#a855f7', lightHex: '#c084fc', rgb: '168, 85, 247', isLight: false },
  rose: { primaryHex: '#f43f5e', lightHex: '#fb7185', rgb: '244, 63, 94', isLight: false },
  cyberpunk: { primaryHex: '#00f3ff', lightHex: '#66f8ff', rgb: '0, 243, 255', isLight: false },
  minimalist: { primaryHex: '#9ca3af', lightHex: '#e5e7eb', rgb: '156, 163, 175', isLight: false },
  forest: { primaryHex: '#10b981', lightHex: '#34d399', rgb: '16, 185, 129', isLight: false },
  nordic: { primaryHex: '#0ea5e9', lightHex: '#38bdf8', rgb: '14, 165, 233', isLight: false },
  midnight: { primaryHex: '#8b5cf6', lightHex: '#a78bfa', rgb: '139, 92, 246', isLight: false },
  barbie: { primaryHex: '#f472b6', lightHex: '#f9a8d4', rgb: '244, 114, 182', isLight: false },
  'branco-elite': { primaryHex: '#0f172a', lightHex: '#475569', rgb: '15, 23, 42', isLight: true },
  'prata-platinum': { primaryHex: '#a1a1aa', lightHex: '#cbd5e1', rgb: '161, 161, 170', isLight: false },
  'preto-absoluto': { primaryHex: '#fbbf24', lightHex: '#fde047', rgb: '251, 191, 36', isLight: false }
};

export function getThemePalette(themeColor?: string): ThemePalette {
  if (!themeColor) return PALETTES.orange;
  return PALETTES[themeColor] || PALETTES.orange;
}
