import React from 'react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import ClientModal from '@crm/components/ClientModal';
import OfferModal from '@crm/components/OfferModal';
import ConfirmationModal from '@shared/components/ConfirmationModal';
import EmployeeSurveyModal from '@shared/components/EmployeeSurveyModal';

export function GlobalModals() {
  const { user } = useAuth();
  const { 
    isModalOpen, setIsModalOpen,
    isOfferModalOpen, setIsOfferModalOpen,
    isDeleteOfferConfirmOpen, setIsDeleteOfferConfirmOpen,
    editingClient, handleSaveClient, handleDeleteClient,
    editingOffer, handleSaveOffer, handleDeleteOffer,
    offerToDelete, setOfferToDelete,
    onboardingQuestions, offers
  } = useCRM();

  if (!user) return null;

  return (
    <>
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClient}
        onDelete={handleDeleteClient}
        initialData={editingClient}
        onboardingQuestions={onboardingQuestions}
        user={user}
        offers={offers}
      />
      <OfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        onSave={handleSaveOffer}
        onDelete={handleDeleteOffer}
        initialData={editingOffer}
      />
      <ConfirmationModal
        isOpen={isDeleteOfferConfirmOpen}
        onClose={() => { setIsDeleteOfferConfirmOpen(false); setOfferToDelete(null); }}
        onConfirm={() => offerToDelete && handleDeleteOffer(offerToDelete)}
        title="Excluir Oferta"
        message="Tem certeza que deseja excluir esta oferta?"
        confirmText="Excluir"
        cancelText="Cancelar"
      />
      <EmployeeSurveyModal />
    </>
  );
}
