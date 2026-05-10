import { StateCreator } from 'zustand';
import { CRMStoreState } from '../types';
import { ClientStage } from '@/types';

export interface PreferencesSlice {
  defaultStages: ClientStage[];
  defaultContractText: string;
  checkoutTitle: string;
  checkoutDescription: string;
  csatTitle: string;
  csatQuestion: string;
  softSkillsPool: string[];
  beginnerGuideArticleId: string;
  onboardingQuestions: any[];

  setDefaultStages: (stages: ClientStage[]) => void;
  setDefaultContractText: (text: string) => void;
  setCheckoutTitle: (title: string) => void;
  setCheckoutDescription: (description: string) => void;
  setCsatTitle: (title: string) => void;
  setCsatQuestion: (question: string) => void;
  setSoftSkillsPool: (pool: string[]) => void;
  setBeginnerGuideArticleId: (id: string) => void;
  setOnboardingQuestions: (questions: any[]) => void;
}

export const createPreferencesSlice: StateCreator<
  CRMStoreState,
  [],
  [],
  PreferencesSlice
> = (set) => ({
  defaultStages: [],
  defaultContractText: '',
  checkoutTitle: '',
  checkoutDescription: '',
  csatTitle: '',
  csatQuestion: '',
  softSkillsPool: [],
  beginnerGuideArticleId: '',
  onboardingQuestions: [],

  setDefaultStages: (defaultStages) => set({ defaultStages }),
  setDefaultContractText: (defaultContractText) => set({ defaultContractText }),
  setCheckoutTitle: (checkoutTitle) => set({ checkoutTitle }),
  setCheckoutDescription: (checkoutDescription) => set({ checkoutDescription }),
  setCsatTitle: (csatTitle) => set({ csatTitle }),
  setCsatQuestion: (csatQuestion) => set({ csatQuestion }),
  setSoftSkillsPool: (softSkillsPool) => set({ softSkillsPool }),
  setBeginnerGuideArticleId: (beginnerGuideArticleId) => set({ beginnerGuideArticleId }),
  setOnboardingQuestions: (onboardingQuestions) => set({ onboardingQuestions }),
});
