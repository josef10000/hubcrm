import React, { useMemo } from 'react';
import { TrendingUp, Flame, Star, Zap } from 'lucide-react';
import { UserProfile } from '../../types';
import confetti from 'canvas-confetti';

interface EnergyScoreCardProps {
  userProfile: UserProfile;
  previousScore?: number;
}

function calculateEnergyScore(userProfile: UserProfile | null | undefined): number {
  if (!userProfile) return 0;
  
  // Nova lógica dinâmica v2.0
  let score = 40; // Base menor para permitir crescimento via ações

  // 1. Humor dos últimos 7 dias (Peso: 30%)
  const moodLogs = userProfile.moodLogs || [];
  if (moodLogs.length > 0) {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentMoods = moodLogs.filter(m => m.date >= oneWeekAgo);
    
    if (recentMoods.length > 0) {
      const avgMood = recentMoods.reduce((acc, m) => acc + m.score, 0) / recentMoods.length;
      // Multiplicamos por 6 para que humor 5 valha 30 pontos
      score += Math.round(avgMood * 6);
    } else {
      // Se não logou humor recente, perde potencial de score
      score += 5; 
    }
  }

  // 2. Onboarding (Peso: 15%)
  const onboarding = userProfile.onboardingTasks;
  if (Array.isArray(onboarding) && onboarding.length > 0) {
    const validOnboarding = onboarding.filter((t: any) => t !== null && typeof t === 'object');
    if (validOnboarding.length > 0) {
      const done = validOnboarding.filter((t: any) => t.completed).length;
      score += Math.round((done / validOnboarding.length) * 15);
    }
  }

  // 3. PDI & Evolução (Peso: 10%)
  const pdi = userProfile.pdiItems || [];
  if (pdi.length > 0) {
    const inProgress = pdi.filter(p => p.status === 'doing').length;
    const recentlyDone = pdi.filter(p => p.status === 'done' && (p.completedAt || 0) > (Date.now() - 30 * 24 * 60 * 60 * 1000)).length;
    score += (inProgress * 2) + (recentlyDone * 3);
  }

  // 4. Engajamento em Pesquisas (eNPS) (Peso: 5%)
  if (userProfile.lastEnpsResponse) {
    const lastDate = (userProfile.lastEnpsResponse as any)?.toMillis ? 
      (userProfile.lastEnpsResponse as any).toMillis() : 
      userProfile.lastEnpsResponse;
    
    const daysSince = (Date.now() - lastDate) / (1000 * 60 * 60 * 24);
    if (daysSince <= 30) score += 5;
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
