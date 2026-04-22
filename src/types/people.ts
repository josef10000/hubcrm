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
  description?: string;
  status: 'Pendente' | 'Aprovado' | 'Recusado' | 'Informado';
  hrFeedback?: string;
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
  isGlobal?: boolean; // Se verdadeiro, é para toda a empresa
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
  // Os campos como startDate e onboardingTasks já estão incluídos no UserProfile (modificado anteriormente)
}

export interface UserSkill {
  name: string;
  level: number; // 1 a 5
  type: 'Hard' | 'Soft';
}

export interface Asset {
  id: string;
  name: string;
  serialNumber?: string;
  category: 'Hardware' | 'Software' | 'Acesso' | 'Outro';
  assignedTo: string; // userId
  assignedAt: number;
  status: 'Em uso' | 'Devolvido' | 'Manutenção';
  orgId: string;
}

export interface CareerEvent {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  type: 'Promoção' | 'Mudança de Cargo' | 'Marco' | 'Entrada';
  orgId: string;
}

export interface UserDocument {
  id: string;
  userId: string;
  name: string;
  url: string; 
  type: 'Contrato' | 'Certificado' | 'Identidade' | 'Outro';
  uploadedAt: number;
  orgId: string;
}

export interface MoodUpdate {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mood: 'very-good' | 'good' | 'neutral' | 'bad' | 'very-bad';
  timestamp: number;
  orgId: string;
}

// Template global de onboarding
export interface OnboardingTemplate {
  id: string;
  name: string;
  tasks: string[]; // Apenas o texto das tarefas
  orgId: string;
  active: boolean;
}

export interface Appointment {
  id: string;
  requesterId: string;
  targetId: string;
  startTime: number; // timestamp
  duration: 15 | 30 | 60;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  meetingName: string;
  meetingLink?: string;
  isRecurring: boolean;
  recurringDay?: number; // 0-6 (dom-sab)
  orgId: string;
  createdAt: number;
}

export interface AvailabilityBlock {
  id: string;
  userId: string;
  startTime: number; // timestamp (início do dia ou horário fixo)
  endTime: number; // timestamp
  reason?: string;
  isPrivate: boolean;
  orgId: string;
}
