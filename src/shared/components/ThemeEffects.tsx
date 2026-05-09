import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from '@/contexts/UIContext';
import { Star, Heart, Leaf, Sparkles, Snowflake } from 'lucide-react';

const Particle = ({ children, delay, duration, x, y, size, opacity = 1 }: any) => (
  <motion.div
    initial={{ y: -20, x, opacity: 0, rotate: 0 }}
    animate={{ 
      y: window.innerHeight + 20, 
      opacity: [0, opacity, opacity, 0],
      rotate: 360,
      x: x + (Math.random() * 100 - 50)
    }}
    transition={{ 
      duration, 
      repeat: Infinity, 
      delay, 
      ease: "linear" 
    }}
    className="absolute pointer-events-none z-0"
    style={{ left: 0, top: 0, fontSize: size }}
  >
    {children}
  </motion.div>
);

const TwinklingStar = ({ top, left, delay }: any) => (
  <motion.div
    initial={{ opacity: 0.2, scale: 0.5 }}
    animate={{ opacity: [0.2, 1, 0.2], scale: [0.5, 1.2, 0.5] }}
    transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay }}
    className="absolute w-1 h-1 bg-white rounded-full blur-[1px] pointer-events-none"
    style={{ top: `${top}%`, left: `${left}%` }}
  />
);

export default function ThemeEffects() {
  const { themeColor } = useUI();

  const particles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      delay: Math.random() * 10,
      duration: 10 + Math.random() * 15,
      size: 10 + Math.random() * 20
    }));
  }, []);

  const stars = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 5
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <AnimatePresence>
        {themeColor === 'cyberpunk' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0"
          >
            <div className="scanlines absolute inset-0 opacity-20" />
            <div className="scanline-move" />
          </motion.div>
        )}

        {themeColor === 'nordic' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0"
          >
            <div className="frosty-texture absolute inset-0" />
            {particles.map(p => (
              <Particle key={p.id} {...p} opacity={0.4}>
                <Snowflake size={p.size} className="text-blue-100/30" />
              </Particle>
            ))}
          </motion.div>
        )}

        {themeColor === 'forest' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0"
          >
            {particles.map(p => (
              <Particle key={p.id} {...p} opacity={0.3}>
                <Leaf size={p.size} className="text-emerald-500/20" />
              </Particle>
            ))}
          </motion.div>
        )}

        {themeColor === 'midnight' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0 bg-gradient-to-b from-transparent to-midnight-950/50"
          >
            {stars.map(s => (
              <TwinklingStar key={s.id} {...s} />
            ))}
          </motion.div>
        )}

        {themeColor === 'barbie' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-0"
          >
            {particles.map(p => (
              <Particle key={p.id} {...p} opacity={0.5}>
                {p.id % 2 === 0 ? (
                  <Heart size={p.size} className="text-pink-400/30 fill-pink-400/10" />
                ) : (
                  <Sparkles size={p.size} className="text-rose-300/40" />
                )}
              </Particle>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
