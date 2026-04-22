import React, { useMemo } from 'react';
import { TrendingUp, Flame, Star, Zap } from 'lucide-react';
import { UserProfile } from '../../types';
import confetti from 'canvas-confetti';

interface EnergyScoreCardProps {
  userProfile: UserProfile;
  previousScore?: number;
}

function calculateEnergyScore(userProfile: UserProfile): number {
  if (!userProfile) return 0;
  let score = 60; // base

  // NPS/eNPS pessoal se disponível
  const profileAny = userProfile as any;
  if (profileAny.enpsScore !== undefined && typeof profileAny.enpsScore === 'number') {
    const nps = profileAny.enpsScore;
    if (nps >= 9) score += 20;
    else if (nps >= 7) score += 10;
    else score -= 10;
  }

  // Onboarding completo
  const onboarding = profileAny.onboardingTasks;
  if (Array.isArray(onboarding) && onboarding.length > 0) {
    const done = onboarding.filter((t: any) => t && t.completed).length;
    score += Math.round((done / onboarding.length) * 15);
  }

  // PDI em andamento
  const pdi = profileAny.pdiItems;
  if (Array.isArray(pdi) && pdi.length > 0) {
    const inProgress = pdi.filter((p: any) => p && p.status === 'doing').length;
    score += inProgress * 3;
  }

  return Math.max(0, Math.min(100, score));
}

const LEVELS = [
  { min: 0,  max: 39,  label: 'Em Recuperação', color: 'text-rose-400',    bg: 'from-rose-500/20 to-transparent',    border: 'border-rose-500/30',    icon: '😔' },
  { min: 40, max: 59,  label: 'Em Crescimento',  color: 'text-yellow-400',  bg: 'from-yellow-500/20 to-transparent',  border: 'border-yellow-500/30',  icon: '🌱' },
  { min: 60, max: 79,  label: 'Engajado',          color: 'text-blue-400',    bg: 'from-blue-500/20 to-transparent',    border: 'border-blue-500/30',    icon: '⚡' },
  { min: 80, max: 100, label: 'High Performance',  color: 'text-emerald-400', bg: 'from-emerald-500/20 to-transparent', border: 'border-emerald-500/30', icon: '🔥' },
];

function getLevel(score: number) {
  return LEVELS.find(l => score >= l.min && score <= l.max) || LEVELS[1];
}

export function EnergyScoreCard({ userProfile, previousScore }: EnergyScoreCardProps) {
  const score = useMemo(() => calculateEnergyScore(userProfile), [userProfile]);
  const level = getLevel(score);
  const prevLevel = previousScore !== undefined ? getLevel(previousScore) : null;

  // Dispara confetes se subiu de nível
  React.useEffect(() => {
    if (prevLevel && score > (previousScore ?? score) && getLevel(score).label !== prevLevel.label) {
      confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });
    }
  }, [score]);

  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className={`bg-gradient-to-br ${level.bg} border ${level.border} rounded-3xl p-5 shadow-xl`}>
      <div className="flex items-center gap-4">
        {/* SVG Gauge */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="36" fill="none"
              stroke={score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#eab308' : '#f43f5e'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white">{score}</span>
            <span className="text-[8px] text-gray-400 uppercase tracking-wider">score</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{level.icon}</span>
            <h3 className={`font-bold text-sm ${level.color}`}>{level.label}</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Seu índice de energia e engajamento esta semana
          </p>
          {/* Barra de subníveis */}
          <div className="flex gap-1">
            {LEVELS.map((l, i) => (
              <div
                key={l.label}
                className={`h-1 flex-1 rounded-full transition-all ${
                  score >= l.min ? l.color.replace('text-', 'bg-') : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-gray-600">😔</span>
            <span className="text-[9px] text-gray-600">🌱</span>
            <span className="text-[9px] text-gray-600">⚡</span>
            <span className="text-[9px] text-gray-600">🔥</span>
          </div>
        </div>
      </div>
    </div>
  );
}
