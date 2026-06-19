import { db } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { CreativeEntity, CreativeMapper } from '../entities/creative.entity';

export const hubadsService = {
  /**
   * Obtém o próximo código de rastreamento sequencial (ex: HUBADS-001, HUBADS-002...)
   */
  getNextTrackingCode: async (orgId: string): Promise<string> => {
    try {
      const q = query(
        collection(db, 'organizations', orgId, 'hubads_creatives'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return 'HUBADS-001';
      }
      
      const lastDoc = querySnapshot.docs[0].data();
      const lastCode = lastDoc.trackingCode;
      
      if (lastCode && typeof lastCode === 'string' && lastCode.startsWith('HUBADS-')) {
        const numPart = lastCode.substring(7); // extrai o número após "HUBADS-"
        const num = parseInt(numPart, 10);
        if (!isNaN(num)) {
          const nextNum = num + 1;
          const paddedNum = String(nextNum).padStart(3, '0');
          return `HUBADS-${paddedNum}`;
        }
      }
      return 'HUBADS-001';
    } catch (error) {
      console.error('[HubAdsService] Error generating tracking code:', error);
      return `HUBADS-${Math.floor(100 + Math.random() * 900)}`; // Fallback caso ocorra erro de permissão ou ordenação
    }
  },

  /**
   * Cria um novo criativo no Firestore
   */
  createCreative: async (orgId: string, payload: Omit<Partial<CreativeEntity>, 'id' | 'trackingCode'>, userId: string): Promise<CreativeEntity> => {
    const trackingCode = await hubadsService.getNextTrackingCode(orgId);
    const colRef = collection(db, 'organizations', orgId, 'hubads_creatives');
    const docRef = doc(colRef);
    const creativeId = docRef.id;

    const rawData = {
      ...payload,
      id: creativeId,
      trackingCode,
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const entity = CreativeMapper.toEntity(rawData);
    const firestoreData = CreativeMapper.toFirestore(entity);

    // Salva o documento com o ID gerado
    await setDoc(docRef, {
      id: creativeId,
      ...firestoreData
    });

    return {
      ...entity,
      id: creativeId
    };
  },

  /**
   * Atualiza um criativo existente
   */
  updateCreative: async (orgId: string, creativeId: string, data: Partial<CreativeEntity>): Promise<void> => {
    const docRef = doc(db, 'organizations', orgId, 'hubads_creatives', creativeId);
    
    // Normaliza pelo Mapper
    const firestoreData = CreativeMapper.toFirestore(data);

    await updateDoc(docRef, firestoreData);
  },

  /**
   * Exclui um criativo do sistema
   */
  deleteCreative: async (orgId: string, creativeId: string): Promise<void> => {
    const docRef = doc(db, 'organizations', orgId, 'hubads_creatives', creativeId);
    await deleteDoc(docRef);
  }
};
