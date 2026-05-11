import { db } from '@/lib/firebase';
import { 
  collection, doc, setDoc, getDoc, getDocs, 
  query, where, orderBy, Timestamp, updateDoc 
} from 'firebase/firestore';
import { Proposal, ProposalSchema } from '../entities/proposal.entity';
import { eventBus } from '@/core/events/eventBus';

const COLLECTION = 'proposals';

export const proposalService = {
  async create(data: Omit<Proposal, 'id' | 'createdAt'>): Promise<string> {
    const newDoc = doc(collection(db, COLLECTION));
    const proposal: Proposal = {
      ...data,
      id: newDoc.id,
      createdAt: new Timestamp(Math.floor(Date.now() / 1000), 0)
    };

    await setDoc(newDoc, proposal);
    return newDoc.id;
  },

  async getById(id: string): Promise<Proposal | null> {
    const docRef = doc(db, COLLECTION, id);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) return null;
    
    const data = snap.data();
    // Converter timestamps do Firestore para Date para o Zod
    const proposal = {
      ...data,
      createdAt: data.createdAt?.toDate(),
      expiresAt: data.expiresAt?.toDate(),
      viewedAt: data.viewedAt?.toDate(),
      approvedAt: data.approvedAt?.toDate(),
    };

    return ProposalSchema.parse(proposal);
  },

  async markAsViewed(id: string) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      status: 'viewed',
      viewedAt: Timestamp.now()
    });
  },

  async approve(id: string, metadata: { ip: string, userAgent: string }, selectedItems: string[]) {
    const res = await fetch('/api/proposal_approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proposalId: id,
        metadata,
        selectedItems
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Erro ao aprovar proposta no servidor');
    }

    return await res.json();
  }
};
