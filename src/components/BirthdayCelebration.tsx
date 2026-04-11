import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BirthdayCelebration() {
  useEffect(() => {
    // Injetar script do canvas-confetti via CDN para garantir que funcione sem instalação extra
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
    script.async = true;
    script.onload = () => {
      const confetti = (window as any).confetti;
      if (confetti) {
        // Disparo inicial
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f97316', '#fbbf24', '#3b82f6', '#22c55e', '#a855f7']
        });

        // Disparos laterais aleatórios nos primeiros segundos
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center"
      >
        <div className="relative">
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", damping: 12 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4"
          >
            <span className="text-4xl">🎉</span>
            <div>
              <h2 className="text-2xl font-bold text-white drop-shadow-md">Parabéns pelo seu dia!</h2>
              <p className="text-white/80 text-sm">O HubCRM deseja um feliz aniversário!</p>
            </div>
            <span className="text-4xl">🎂</span>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
