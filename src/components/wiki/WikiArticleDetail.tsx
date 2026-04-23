import React, { useEffect } from 'react';
import { 
  ArrowLeft, Calendar, User, Eye, Star, Share2, 
  Tag as TagIcon, MoreVertical, Edit2, Trash2, Copy 
} from 'lucide-react';
import { WikiArticle } from '../../types';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import WikiCommentSection from './WikiCommentSection';
import { usePermissions } from '../../hooks/usePermissions';

interface WikiArticleDetailProps {
  article: WikiArticle;
  onBack: () => void;
  onEdit: () => void;
}

export default function WikiArticleDetail({ article, onBack, onEdit }: WikiArticleDetailProps) {
  const { user, userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const { handleToggleWikiStar, handleDeleteWikiArticle, handleSaveWikiArticle } = useCRM();

  const isStarred = article.stars?.includes(user?.uid || '');
  const canManage = hasPermission('MANAGE_WIKI') || article.authorId === user?.uid;

  useEffect(() => {
    // Incrementar view count (simples client-side)
    const timer = setTimeout(() => {
        handleSaveWikiArticle({ ...article, viewCount: (article.viewCount || 0) + 1 });
    }, 5000); // 5 segundos de leitura para contar view
    return () => clearTimeout(timer);
  }, [article.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          <div className="p-2 rounded-xl group-hover:bg-white/10 transition-all border border-transparent group-hover:border-white/10">
            <ArrowLeft className="w-5 h-5" />
          </div>
          <span className="font-medium">Voltar para Wiki</span>
        </button>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleToggleWikiStar(article.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all border font-medium ${isStarred ? 'bg-primary-500/20 border-primary-500/50 text-primary-500' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}`}
          >
            <Star className={`w-5 h-5 ${isStarred ? 'fill-primary-500' : ''}`} />
            <span>{article.stars?.length || 0}</span>
          </button>
          
          <button className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-2xl transition-all">
            <Share2 className="w-5 h-5" />
          </button>

          {canManage && (
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/10">
              <button 
                onClick={onEdit}
                className="p-3 bg-white/5 hover:bg-primary-500/20 border border-white/10 text-gray-400 hover:text-primary-500 rounded-2xl transition-all"
                title="Editar Artigo"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                   if(confirm('Tem certeza que deseja excluir este artigo?')) {
                       handleDeleteWikiArticle(article.id);
                       onBack();
                   }
                }}
                className="p-3 bg-white/5 hover:bg-red-500/20 border border-white/10 text-gray-400 hover:text-red-500 rounded-2xl transition-all"
                title="Excluir Artigo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Article Header */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap gap-2">
            {(article.categories || []).map(cat => (
              <span key={cat} className="px-4 py-1.5 bg-primary-500/20 text-primary-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-primary-500/30">
                {cat}
              </span>
            ))}
          </div>
          <div className="h-1 w-1 rounded-full bg-gray-600"></div>
          <div className="flex items-center gap-1.5 text-gray-500 text-sm">
            <Eye className="w-4 h-4" />
            {article.viewCount || 0} visualizações
          </div>
        </div>

        <div className="flex items-center gap-3">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
            {article.title}
          </h1>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(article.id);
              toast.success('ID do artigo copiado!', {
                description: 'Use este ID nas configurações do Guia de Iniciante.'
              });
            }}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-500 hover:text-primary-500 rounded-xl transition-all shadow-lg"
            title="Copiar ID do Artigo"
          >
            <Copy size={20} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-6 py-4 border-y border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold border border-white/20 shadow-lg capitalize">
              {article.authorName[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{article.authorName}</p>
              <p className="text-xs text-gray-500">Autor do Artigo</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-gray-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {format(article.updatedAt, "dd 'de' MMMM, yyyy", { locale: ptBR })}
              </p>
              <p className="text-xs text-gray-500">Última atualização</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <article className="relative">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 blur-[80px] -z-10 rounded-full"></div>
        
        <div 
          className="prose prose-invert prose-primary max-w-none text-gray-300 leading-relaxed text-lg
            prose-headings:text-white prose-headings:font-bold
            prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white prose-strong:font-semibold
            prose-img:rounded-[2rem] prose-img:shadow-2xl prose-img:my-12 prose-img:w-full
            prose-ul:list-disc prose-ol:list-decimal
          "
          dangerouslySetInnerHTML={{ 
            __html: article.content.replace(/src="http:\/\//g, 'src="https://') 
          }}
        />
      </article>

      {/* Tags Section */}
      <div className="flex items-center gap-3 pt-8 border-t border-white/10">
        <TagIcon className="w-5 h-5 text-gray-500" />
        <div className="flex flex-wrap gap-2">
           <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400">#conhecimento</span>
           <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400">#procedimentos</span>
           {(article.categories || []).map(cat => (
             <span key={cat} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 font-medium">#{cat.toLowerCase()}</span>
           ))}
        </div>
      </div>

      {/* Comments Section */}
      <div className="mt-20 pt-12 border-t border-white/10">
        <WikiCommentSection articleId={article.id} />
      </div>
    </div>
  );
}
