import { useState } from 'react';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Offer } from '../types';
import { toast } from 'sonner';

export function useOffers(userId: string, offers: Offer[], setOffers: React.Dispatch<React.SetStateAction<Offer[]>>) {
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Partial<Offer> | null>(null);
  const [isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [lastDeletedOffer, setLastDeletedOffer] = useState<Offer | null>(null);

  const handleSaveOffer = async (offerData: Partial<Offer>) => {
    if (!auth.currentUser || !userId) return;
    try {
      if (!offerData.name || offerData.price === undefined) {
        toast.error('Nome e preço são obrigatórios');
        return;
      }
      const isNew = !offerData.id;
      const offerRef = isNew 
        ? doc(collection(db, 'organizations', userId, 'offers')) 
        : doc(db, 'organizations', userId, 'offers', offerData.id!);
      
      const offerId = offerRef.id;
      const offerToSave: any = {
        id: offerId,
        name: offerData.name,
        type: offerData.type || 'SUBSCRIPTION',
        price: offerData.price,
        active: offerData.active !== undefined ? offerData.active : true,
        displayContext: offerData.displayContext || 'PORTAL',
        order: offerData.order !== undefined ? offerData.order : 0,
        description: offerData.description || '',
        isMostHired: offerData.isMostHired || false,
        details: offerData.details || '',
        createdAt: isNew ? Date.now() : offerData.createdAt || Date.now(),
      };
      if (offerData.setupPrice !== undefined) offerToSave.setupPrice = offerData.setupPrice;
      if (offerData.maxInstallments !== undefined) offerToSave.maxInstallments = offerData.maxInstallments;
      if (offerData.commissionValue !== undefined) offerToSave.commissionValue = offerData.commissionValue;

      // Se este produto está sendo marcado como "Mais Contratado", desmarcar os outros
      if (offerToSave.isMostHired) {
        const otherMostHired = offers.filter(o => o.isMostHired && o.id !== offerId);
        for (const other of otherMostHired) {
          await setDoc(doc(db, 'organizations', userId, 'offers', other.id), { ...other, isMostHired: false }, { merge: true });
        }
      }

      await setDoc(offerRef, offerToSave);
      toast.success(isNew ? 'Oferta criada com sucesso!' : 'Oferta atualizada com sucesso!');
      setIsOfferModalOpen(false);
    } catch (error: any) {
      console.error('Error saving offer:', error);
      toast.error(`Erro ao salvar oferta: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!auth.currentUser || !userId) return;
    const offerToBackup = offers.find((o) => o.id === offerId);
    try {
      await deleteDoc(doc(db, 'organizations', userId, 'offers', offerId));
      if (offerToBackup) setLastDeletedOffer(offerToBackup);
      toast.success('Oferta excluída com sucesso!', {
        action: { label: 'Desfazer', onClick: () => offerToBackup && undoDeleteOffer(offerToBackup) },
      });
      setIsDeleteOfferConfirmOpen(false);
      setOfferToDelete(null);
    } catch (error) {
      console.error('Error deleting offer:', error);
      toast.error('Erro ao excluir oferta');
    }
  };

  const undoDeleteOffer = async (offer: Offer) => {
    if (!auth.currentUser || !userId || !offer) return;
    try {
      await setDoc(doc(db, 'organizations', userId, 'offers', offer.id), offer);
      setLastDeletedOffer(null);
      toast.success('Oferta restaurada!');
    } catch (error) {
      console.error('Error undoing delete:', error);
      toast.error('Erro ao restaurar oferta');
    }
  };

  const restoreDefaultOffers = async () => {
    if (!auth.currentUser || !userId) return;
    try {
      const defaultOffers: Offer[] = [
        { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Ecossistema Essencial', type: 'SUBSCRIPTION', price: 397, setupPrice: 2500, active: true, displayContext: 'PORTAL', createdAt: Date.now() },
        { id: Date.now().toString(36) + Math.random().toString(36).substring(2), name: 'Profissional', type: 'SUBSCRIPTION', price: 897, setupPrice: 7500, active: true, displayContext: 'PORTAL', createdAt: Date.now() },
      ];
      for (const offer of defaultOffers) {
        const exists = offers.some((o) => o.name === offer.name);
        if (!exists) await setDoc(doc(db, 'organizations', userId, 'offers', offer.id), offer);
      }
      toast.success('Ofertas padrão restauradas com sucesso!');
    } catch (error) {
      console.error('Error restoring default offers:', error);
      toast.error('Erro ao restaurar ofertas padrão');
    }
  };

  return {
    isOfferModalOpen, setIsOfferModalOpen,
    editingOffer, setEditingOffer,
    isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen,
    offerToDelete, setOfferToDelete,
    handleSaveOffer, handleDeleteOffer, restoreDefaultOffers,
  };
}
