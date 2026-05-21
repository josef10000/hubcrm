import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useChatStore } from '@/store/useChatStore';

interface EmojiPickerProps {
  isOpen: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const COMMON_EMOJIS = [
  '😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😋', '😎', '🤔',
  '🙄', '😴', '😷', '🥺', '😭', '😡', '🤯', '😱', '🥳', '😇',
  '👍', '👎', '🙌', '👏', '🤝', '🔥', '✨', '⭐', '❤️', '💔',
  '💙', '🌈', '🎉', '💡', '🚀', '✅', '❌', '📍', '💰', '🎯'
];

// Emojis que aceitam modificador de tom de pele fitzpatrick
const SKIN_TONE_SUPPORTING_EMOJIS = ['👍', '👎', '🙌', '👏', '🤝'];

const SKIN_TONES = [
  { id: 'default', label: '🟡', code: '' },
  { id: 'light', label: '🏻', code: '🏻' },
  { id: 'medium-light', label: '🏼', code: '🏼' },
  { id: 'medium', label: '🏽', code: '🏽' },
  { id: 'medium-dark', label: '🏾', code: '🏾' },
  { id: 'dark', label: '🏿', code: '🏿' },
];

export default function EmojiPicker({ isOpen, onSelect, onClose }: EmojiPickerProps) {
  const emojiSkinTone = useChatStore(state => state.emojiSkinTone);
  const setEmojiSkinTone = useChatStore(state => state.setEmojiSkinTone);

  const getEmojiWithSkinTone = (emoji: string) => {
    if (!SKIN_TONE_SUPPORTING_EMOJIS.includes(emoji)) {
      return emoji;
    }
    const selectedTone = SKIN_TONES.find(t => t.id === emojiSkinTone);
    if (!selectedTone || selectedTone.id === 'default') {
      return emoji;
    }
    return emoji + selectedTone.code;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-full right-0 mb-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 z-[70] w-68"
          >
            {/* Seletor de Tom de Pele */}
            <div className="flex items-center justify-between gap-1 mb-3 pb-2.5 border-b border-zinc-100 dark:border-white/5">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
                Tom de Pele
              </span>
              <div className="flex gap-1 bg-zinc-50 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-100 dark:border-white/5">
                {SKIN_TONES.map(tone => (
                  <button
                    key={tone.id}
                    type="button"
                    title={`Tom ${tone.id}`}
                    onClick={() => setEmojiSkinTone(tone.id)}
                    className={`w-6 h-6 flex items-center justify-center text-xs rounded transition-all active:scale-95 ${
                      emojiSkinTone === tone.id
                        ? 'bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/50 dark:border-white/5'
                        : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {tone.id === 'default' ? '🟡' : `👍${tone.code}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Emojis */}
            <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
              {COMMON_EMOJIS.map(emoji => {
                const finalEmoji = getEmojiWithSkinTone(emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelect(finalEmoji);
                      onClose();
                    }}
                    className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors active:scale-90"
                  >
                    {finalEmoji}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest">
              Mais comuns
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
