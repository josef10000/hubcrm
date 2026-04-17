import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, BookOpen, Star, Clock, 
  ChevronRight, Sparkles, Layout, HelpCircle,
  Briefcase, Code, Headphones, Settings, Info
} from 'lucide-react';
import { useCRM } from '../contexts/CRMContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { WikiArticle, WikiCategory } from '../types';
import WikiEditorModal from '../components/wiki/WikiEditorModal';
import WikiArticleDetail from '../components/wiki/WikiArticleDetail';
import Pagination from '../components/common/Pagination';

const ITEMS_PER_PAGE = 12;

const CATEGORY_MAP = [
  { id: 'RH', icon: Briefcase, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { id: 'Vendas', icon: Layout, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  { id: 'Técnico', icon: Code, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { id: 'Atendimento', icon: Headphones, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  { id: 'Suporte', icon: HelpCircle, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'Geral', icon: Info, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
];

export default function WikiView() {
  const { 
    wikiArticles, loading, userProfile, beginnerGuideArticleId, 
    handleMarkWikiArticleAsRead 
  } = useCRM();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<WikiArticle | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const canCreate = userProfile?.role === 'Administrador' || userProfile?.role === 'Gerente' || userProfile?.role === 'People & Culture';

  // Filtro de visibilidade e busca
  const filteredArticles = useMemo(() => {
    return wikiArticles.filter(article => {
      // 1. RBAC Check
      const hasRole = !article.allowedRoles || article.allowedRoles.length === 0 || article.allowedRoles.includes(userProfile?.role);
      const isUserAllowed = !article.allowedUserIds || article.allowedUserIds.length === 0 || article.allowedUserIds.includes(userProfile?.uid);
      const isAdmin = userProfile?.role === 'Administrador';
      
      const isVisible = isAdmin || hasRole || isUserAllowed;
      if (!isVisible) return false;

      // 2. Category Filter
      if (selectedCategory && article.category !== selectedCategory) return false;

      // 3. Search Filter
      const search = searchTerm.toLowerCase();
      return (
        article.title.toLowerCase().includes(search) ||
        article.content.toLowerCase().includes(search) ||
        article.category.toLowerCase().includes(search)
      );
    });
  }, [wikiArticles, userProfile, selectedCategory, searchTerm]);

  // Reset page when filtering
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const totalPages = Math.ceil(filteredArticles.length / ITEMS_PER_PAGE);
  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredArticles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredArticles, currentPage]);

  const popularArticles = useMemo(() => {
    return wikiArticles
      .filter(a => a.isPopular)
      .slice(0, 3);
  }, [wikiArticles]);
  const selectedArticle = useMemo(() => 
    wikiArticles.find(a => a.id === selectedArticleId), 
    [wikiArticles, selectedArticleId]
  );

  const handleSelectArticle = (articleId: string) => {
    setSelectedArticleId(articleId);
    handleMarkWikiArticleAsRead(articleId);
  };

  if (selectedArticle) {
    return (
      <div className="p-6 md:p-12">
        <WikiArticleDetail 
          article={selectedArticle} 
          onBack={() => setSelectedArticleId(null)}
          onEdit={() => {
            setEditingArticle(selectedArticle);
            setIsEditorOpen(true);
          }}
        />
        <WikiEditorModal 
          isOpen={isEditorOpen} 
          onClose={() => setIsEditorOpen(false)} 
          initialData={editingArticle}
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-10">
      {/* Header & Search */}
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 text-primary-500 rounded-full text-xs font-bold uppercase tracking-widest border border-primary-500/20">
          <BookOpen className="w-4 h-4" /> Hub Knowledge Base
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
          Como podemos te ajudar hoje?
        </h1>
        <div className="relative group max-w-2xl mx-auto">
          <div className="absolute inset-0 bg-primary-500/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative flex items-center bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden focus-within:border-primary-500/50 transition-all">
            <Search className="ml-6 w-6 h-6 text-gray-500" />
            <input 
              type="text" 
              placeholder="Pesquisar manuais, processos ou guias..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-6 py-5 bg-transparent text-white outline-none placeholder-gray-500 text-lg"
            />
            {canCreate && (
                <button 
                  onClick={() => { setEditingArticle(null); setIsEditorOpen(true); }}
                  className="mr-3 flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-2xl transition-all shadow-xl shadow-primary-500/30 whitespace-nowrap active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  Novo Artigo
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {CATEGORY_MAP.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
            className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border transition-all duration-300 group ${selectedCategory === cat.id ? 'bg-primary-500/20 border-primary-500 scale-95' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:scale-105'}`}
          >
            <div className={`p-4 rounded-2xl mb-4 ${cat.bg} ${cat.color} transition-transform group-hover:rotate-6 shadow-xl`}>
              <cat.icon className="w-6 h-6" />
            </div>
            <span className={`text-sm font-bold uppercase tracking-wider ${selectedCategory === cat.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
              {cat.id}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-10">
        {/* Main List - Now Full Width */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              {selectedCategory ? `Artigos de ${selectedCategory}` : 'Todos os Artigos'}
            </h2>
            
            <button 
              onClick={() => {
                const cleanId = beginnerGuideArticleId?.trim();
                if (cleanId) {
                  const articleExists = wikiArticles.some(a => a.id === cleanId);
                  if (articleExists) {
                    handleSelectArticle(cleanId);
                  } else {
                    toast.error('O Guia de Iniciante não foi encontrado.', {
                      description: 'Verifique se o ID está correto nas configurações.'
                    });
                  }
                } else {
                  toast.info('Nenhum guia configurado.', {
                    description: 'Configure o ID do guia nas configurações da Wiki.'
                  });
                }
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-primary-500/20 active:scale-95 border border-white/10"
            >
              <Sparkles className="w-4 h-4" /> Ver Guia de Iniciante
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedArticles.map(article => (
              <div 
                key={article.id}
                onClick={() => handleSelectArticle(article.id)}
                className="group p-8 bg-white/5 border border-white/10 rounded-[2.5rem] hover:bg-white/10 transition-all cursor-pointer hover:border-primary-500/30 relative overflow-hidden flex flex-col justify-between min-h-[220px]"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 blur-3xl -z-10 rounded-full group-hover:bg-primary-500/20 transition-all"></div>
                
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-primary-400 uppercase tracking-widest">
                      {article.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs font-bold">
                      <Star className="w-4 h-4 fill-gray-500" />
                      {article.stars?.length || 0}
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-white group-hover:text-primary-400 transition-colors line-clamp-2 leading-tight">
                    {article.title}
                  </h3>
                </div>

                <div className="mt-8 flex items-center justify-between text-xs text-gray-500 pt-6 border-t border-white/5">
                   <div className="flex items-center gap-2 font-medium">
                      <Clock className="w-4 h-4" />
                      {new Date(article.updatedAt).toLocaleDateString()}
                   </div>
                   <div className="p-2 bg-white/5 rounded-full group-hover:bg-primary-500 group-hover:text-white transition-all">
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                   </div>
                </div>
              </div>
            ))}
            {filteredArticles.length === 0 && (
              <div className="col-span-full py-32 text-center space-y-6 bg-white/5 border border-dashed border-white/10 rounded-[4rem]">
                 <div className="p-6 bg-white/5 rounded-full inline-flex text-gray-700 animate-pulse">
                    <BookOpen size={64} />
                 </div>
                 <div className="space-y-2">
                    <p className="text-xl font-bold text-gray-400">Silêncio no Hub...</p>
                    <p className="text-gray-600">Nenhum artigo encontrado nesta categoria ou busca.</p>
                 </div>
              </div>
            )}
          </div>

          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            totalItems={filteredArticles.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
          
          {/* Most Useful Section integrated at bottom */}
          {popularArticles.length > 0 && (
            <div className="mt-20 pt-10 border-t border-white/5">
               <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-8 uppercase tracking-widest text-gray-400">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Artigos Mais Úteis
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {popularArticles.map(art => (
                    <div 
                      key={art.id} 
                      onClick={() => handleSelectArticle(art.id)}
                      className="flex items-center gap-5 p-4 bg-white/5 border border-white/10 rounded-3xl cursor-pointer hover:bg-white/10 hover:border-primary-500/30 transition-all group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-500 shrink-0 group-hover:bg-primary-500 group-hover:text-white transition-all shadow-lg">
                          <Star className="w-6 h-6" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors truncate">{art.title}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">{art.category}</p>
                        </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      </div>

      <WikiEditorModal 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
        initialData={editingArticle}
      />
    </div>
  );
}
