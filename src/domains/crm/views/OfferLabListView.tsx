import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Search, Plus, Trash2, Edit3 } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { offerService } from '@/services/offerService';
import { OfferBlueprint } from '../../shared/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  validating: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  archived: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const STATUS_LABELS = {
  draft: 'Rascunho',
  validating: 'Em Teste',
  active: 'Ativa',
  archived: 'Arquivada',
};

export default function OfferLabListView() {
  const [offers, setOffers] = useState<OfferBlueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();
  const { userProfile, user } = useAuth();
  const { confirm, alert } = useDialog();
  const orgId = userProfile?.orgId;

  useEffect(() => {
    if (orgId) {
      loadOffers();
    }
  }, [orgId]);

  const loadOffers = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await offerService.getOffers(orgId);
      setOffers(data);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffer = async () => {
    if (!orgId) return;
    try {
      const newId = await offerService.createOffer(orgId, {
        title: 'Nova Oferta ' + new Date().toLocaleDateString(),
        status: 'draft',
        productId: '',
        icpId: '',
        promise: '',
        mechanism: '',
        deliverables: '',
        bonuses: '',
        guarantee: '',
        pricingAnchoring: '',
        scratchpad: '',
        createdBy: user?.uid,
      });

      navigate(`/offers/${newId}`);
    } catch (error) {
      console.error('Error creating offer:', error);
      await alert({
        title: 'Erro',
        message: 'Ocorreu um erro ao criar a oferta.',
        variant: 'danger'
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    if (!orgId) return;
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Excluir Oferta',
      message: 'Tem certeza que deseja excluir esta oferta? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      variant: 'danger'
    });
    
    if (confirmed) {
      try {
        await offerService.deleteOffer(orgId, id);
        setOffers(prev => prev.filter(o => o.id !== id));
      } catch (error) {
        console.error('Error deleting offer:', error);
      }
    }
  };

  const filteredOffers = offers.filter(o => 
    o.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-indigo-600" />
              Laboratório de Ofertas
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Prancheta de ideação e estruturação de ofertas e bônus.
            </p>
          </div>
          
          <button
            onClick={handleCreateOffer}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Novo Experimento
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 relative max-w-md">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar ofertas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <FlaskConical className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Sua bancada está vazia</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Inicie um novo experimento para estruturar ofertas irresistíveis.
            </p>
            <button
              onClick={handleCreateOffer}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Criar meu primeiro experimento
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredOffers.map((offer) => (
              <div
                key={offer.id}
                onClick={() => navigate(`/offers/${offer.id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:shadow-md transition-shadow group flex flex-col h-48 relative"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[offer.status]}`}>
                    {STATUS_LABELS[offer.status]}
                  </span>
                  
                  <button 
                    onClick={(e) => handleDelete(e, offer.id!)}
                    className="text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Excluir Oferta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                  {offer.title}
                </h3>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                  {offer.promise || 'Sem promessa definida.'}
                </p>
                
                <div className="mt-auto flex items-center justify-between text-xs text-gray-400">
                  <span>
                    Atualizado em {offer.updatedAt ? format(offer.updatedAt, "dd MMM yyyy", { locale: ptBR }) : 'Recentemente'}
                  </span>
                  <Edit3 className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
