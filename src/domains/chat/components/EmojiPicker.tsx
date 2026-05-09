import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

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

export default function EmojiPicker({ isOpen, onSelect, onClose }: EmojiPickerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="absolute bottom-full right-0 mb-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-4 z-[70] w-64"
          >
            <div className="grid grid-cols-5 gap-2">
              {COMMON_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                >
                  {emoji}
                </button>
              ))}
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
