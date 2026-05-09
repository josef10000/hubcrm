import { Client } from '@/types';

/**
 * Calcula o Health Score de um cliente (0-100)
 * 
 * Critérios:
 * 1. Status do Site (40%)
 * 2. Status de Pagamento (30%)
 * 3. Engajamento/Etapas (30%)
 * 4. Bônus NPS (se houver feedback positivo)
 */
export function calculateHealthScore(client: Client): number {
  let score = 0;

  // 1. Status do Site (Máx 40 pontos)
  if (client.status === 'Ativo') {
    score += 40;
  } else if (client.status === 'Em Desenvolvimento') {
    score += 30;
  } else if (client.status === 'Inadimplente') {
    score += 0;
  } else if (client.status === 'Cancelado') {
    return 0; // Cliente cancelado sempre tem health 0
  }

  // 2. Status de Pagamento Asaas (Máx 30 pontos)
  if (client.paymentStatus === 'RECEIVED') {
    score += 30;
  } else if (client.paymentStatus === 'PENDING') {
    score += 15;
  } else if (client.paymentStatus === 'OVERDUE') {
    score += 0;
  } else {
    // N/A ou indefinido - assume neutro/médio
    score += 20;
  }

  // 3. Progresso etapas/briefing (Máx 30 pontos)
  if (client.stages && client.stages.length > 0) {
    const completedStages = client.stages.filter(s => s.completed).length;
    const progressPercent = completedStages / client.stages.length;
    score += Math.round(progressPercent * 30);
  } else {
    // Se não tiver etapas definidas, assume progresso inicial
    score += 15;
  }

  // 4. Ajuste NPS (Se houver feedback)
  if (client.npsScore !== undefined) {
    // NPS 0 a 10. 
    // Se for promotor (9-10), bônus de até 10 pontos (capado em 100)
    // Se for detrator (0-6), penalidade de até 20 pontos
    if (client.npsScore >= 9) {
      score += 10;
    } else if (client.npsScore <= 6) {
      score -= 20;
    }
  }

  // Garantir limites entre 0 e 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Retorna a cor correspondente ao score
 */
export function getHealthColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-rose-500';
}

/**
 * Retorna o label amigável correspondente ao score
 */
export function getHealthLabel(score: number): string {
  if (score >= 80) return 'Saudável';
  if (score >= 50) return 'Alerta';
  return 'Risco Crítico';
}
