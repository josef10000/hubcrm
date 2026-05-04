import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutTemplate, MoreVertical, Trash2, Globe, Lock, Search, X } from 'lucide-react';
import { canvasService, CanvasDocument } from '../services/canvasService';
import { useCRM } from '../contexts/CRMContext';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CanvasListView() {
  const [canvases, setCanvases] = useState<CanvasDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { confirm, alert } = useDialog();
  const currentUserId = user?.uid || 'admin-1';
  const orgId = userProfile?.orgId;

  useEffect(() => {
    if (orgId) {
      loadCanvases();
    }
  }, [orgId]);

  const loadCanvases = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await canvasService.getCanvases(orgId, currentUserId);
      setCanvases(data);
    } catch (error) {
      console.error('Error loading canvases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCanvas = async () => {
    if (!orgId) return;
    if (!newTitle.trim()) {
      await alert({ title: 'Atenção', message: 'O título do quadro é obrigatório.' });
      return;
    }

    setIsCreating(true);
    try {
      const emptyDoc = JSON.stringify({});
      const newId = await canvasService.createCanvas(orgId, {
        title: newTitle,
        document: emptyDoc,
        createdBy: currentUserId,
        isPublic: newIsPublic
      });

      setShowCreateModal(false);
      setNewTitle('');
      setNewIsPublic(false);

      navigate(`/canvas/${newId}`);
    } catch (error) {
      console.error('Error creating canvas:', error);
      await alert({
        title: 'Erro',
        message: 'Ocorreu um erro ao criar o quadro. Tente novamente.',
        variant: 'danger'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    if (!orgId) return;
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Excluir Quadro',
      message: 'Tem certeza que deseja excluir este quadro? Esta ação não pode ser desfeita.',
      confirmText: 'Excluir',
      variant: 'danger'
    });
    
    if (confirmed) {
      try {
        await canvasService.deleteCanvas(orgId, id);
        loadCanvases();
      } catch (error) {
        console.error('Error deleting canvas:', error);
      }
    }
  };

  const filteredCanvases = canvases.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LayoutTemplate className="w-6 h-6 text-indigo-600" />
              Hub Canvas
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Quadros estratégicos e mapas mentais
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Novo Quadro
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative max-w-md">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar quadros..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900 dark:text-white"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredCanvases.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <LayoutTemplate className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum quadro encontrado</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Comece criando seu primeiro quadro estratégico para planejar com a equipe.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Criar meu primeiro quadro
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCanvases.map((canvas) => (
              <div
                key={canvas.id}
                onClick={() => navigate(`/canvas/${canvas.id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:shadow-md transition-shadow group relative flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                    <LayoutTemplate className="w-6 h-6" />
                  </div>
                  
                  {canvas.createdBy === currentUserId && (
                    <button 
                      onClick={(e) => handleDelete(e, canvas.id!)}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Excluir quadro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                  {canvas.title}
                </h3>
                
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-auto pt-4">
                  {canvas.isPublic ? (
                    <Globe className="w-3.5 h-3.5" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>{canvas.isPublic ? 'Público' : 'Privado'}</span>
                  <span className="mx-1">•</span>
                  <span>
                    {canvas.updatedAt 
                      ? format(canvas.updatedAt, "dd MMM yyyy", { locale: ptBR })
                      : 'Recente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Criação de Quadro */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 p-4 flex items-center justify-center">
            <div 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
              onClick={() => setShowCreateModal(false)} 
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Novo Quadro Estratégico</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Quadro
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Mapa de Jornada do Cliente"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                    autoFocus
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="publicToggle"
                    checked={newIsPublic}
                    onChange={(e) => setNewIsPublic(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="publicToggle" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    Tornar público para a equipe
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCanvas}
                  disabled={isCreating || !newTitle.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isCreating ? 'Criando...' : 'Criar Quadro'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
