import { 
  Client, Offer, Lead, UserProfile, Tag, WikiArticle, 
  Transaction, TransactionCategory, Budget, CommissionEntry,
  SupportRequest, OnboardingQuestion
} from '../types';
import { VacationPeriod, Appointment } from '@/types/people';
import { CRMSlice } from './slices/crmSlice';
import { WikiSlice } from './slices/wikiSlice';
import { FinanceSlice } from './slices/financeSlice';
import { PeopleSlice } from './slices/peopleSlice';

export interface BaseState {
  currentUserId: string | null;
  effectiveOrgId: string | null;
  loading: boolean;
  initialized: boolean;
}

export interface BaseActions {
  initialize: (userId: string, orgId: string, permissions: string[]) => () => void;
  init: (userId: string, orgId: string, permissions: string[]) => () => void;
  setLoading: (loading: boolean) => void;
  setNewTransaction: (transaction: Partial<Transaction>) => void;
}

export interface ConfigState {
  churnRiskDays: number;
  newTransaction: Partial<Transaction>;
  isSyncing: boolean;
  errorMsg: string | null;
}

export type CRMStoreState = BaseState & BaseActions & ConfigState & CRMSlice & WikiSlice & FinanceSlice & PeopleSlice;
