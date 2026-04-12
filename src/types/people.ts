import { UserRole, UserProfile } from '../types';

export interface OnboardingTask {
  id: string;
  task: string;
  completed: boolean;
  completedAt?: number;
}

export interface VacationPeriod {
  id: string;
  userId: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  type: 'Férias' | 'Licença' | 'Folga' | 'Ausência' | 'Outro';
  reason?: 'Férias' | 'Falta' | 'Motivo Médico' | 'Licença Maternidade/Paternidade' | 'Outro';
  status: 'Pendente' | 'Aprovado' | 'Recusado' | 'Informado';
  createdAt: number;
}

export interface PDIAction {
  id: string;
  description: string;
  completed: boolean;
  completedAt?: number;
}

export interface PDICategory {
  id: string;
  title: string;
  actions: PDIAction[];
}

export interface FeedbackNote {
  id: string;
  userId: string; // Colaborador que recebe
  authorId: string; // Quem escreveu (Líder/RH)
  date: number;
  content: string;
  type: 'Feedback' | 'PDI' | 'Elogio' | 'Atenção';
  private: boolean; // Só visível para Autor, RH e Admin?
}

export interface ENPSResult {
  id: string;
  date: number;
  score: number; // 0-10
  comment?: string;
  orgId: string;
}

// Extensão do UserProfile com campos People
export interface UserProfilePeople extends UserProfile {
  startDate?: string; // Data de contratação (YYYY-MM-DD)
  onboardingTasks?: OnboardingTask[];
  onboardingTemplateId?: string;
  pdiCategories?: PDICategory[];
}

// Template global de onboarding
export interface OnboardingTemplate {
  id: string;
  name: string;
  tasks: string[]; // Apenas o texto das tarefas
  orgId: string;
  active: boolean;
}
