import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { balloons, textBalloons } from 'balloons-js';

interface BirthdayCelebrationProps {
  uid?: string;
}

export default function BirthdayCelebration({ uid }: BirthdayCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!uid) return;

    // Verificar se já foi exibido hoje
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const storageKey = `bday-shown-${uid}-${today}`;
    const alreadyShown = localStorage.getItem(storageKey);

    if (alreadyShown) return;

    // Se não foi exibido, mostrar agora
    setIsVisible(true);
    localStorage.setItem(storageKey, 'true');

    // Disparar balões comemorativos
    try {
      balloons();
      textBalloons([
        {
          text: "💩🔥😈",
          fontSize: 120,
          color: "#000000",
        },
      ]);
    } catch (e) {
      console.warn('Erro ao disparar balões:', e);
    }

    // Injetar script do canvas-confetti via CDN
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

        // Disparos laterais
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);

          const particleCount = 50 * (timeLeft / duration);
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
          confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
      }
    };
    document.body.appendChild(script);

    // Auto-hide após 8 segundos
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 8000);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      clearTimeout(timer);
    };
  }, [uid]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.5 } }}
          className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            exit={{ y: 50 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 px-6 py-4 md:px-10 md:py-6 rounded-[2rem] shadow-2xl flex items-center gap-4 md:gap-6 border-b-4 border-b-primary-500/30"
          >
            <span className="text-3xl md:text-5xl animate-bounce">🎉</span>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-white drop-shadow-lg leading-tight">Parabéns pelo seu dia!</h2>
              <p className="text-white/90 text-sm md:text-base font-medium">A Hub Symples deseja um feliz aniversário!</p>
            </div>
            <span className="text-3xl md:text-5xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎂</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
