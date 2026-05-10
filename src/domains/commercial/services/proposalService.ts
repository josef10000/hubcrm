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
    const docRef = doc(db, COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Proposal not found');

    const data = snap.data() as Proposal;

    // Atualizar seleção de itens com base no que o cliente escolheu no checkout
    const updatedItems = data.items.map(item => ({
      ...item,
      isSelected: selectedItems.includes(item.id) || !item.isOptional
    }));

    const totalAmount = updatedItems
      .filter(i => i.isSelected)
      .reduce((acc, curr) => acc + (curr.price * (curr.quantity || 1)), 0);

    await updateDoc(docRef, {
      status: 'approved',
      approvedAt: Timestamp.now(),
      acceptanceMetadata: metadata,
      items: updatedItems,
      totalAmount
    });

    // Disparar Evento para automação
    eventBus.emit('PROPOSAL_APPROVED', {
      proposalId: id,
      leadId: data.leadId,
      orgId: data.orgId,
      totalAmount,
      items: updatedItems
    });
  }
};
