import React, { useState, useEffect } from 'react';
import { Send, Trash2, Star, User as UserIcon } from 'lucide-react';
import { WikiComment } from '../../types';
import { useCRM } from '../../contexts/CRMContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WikiCommentSectionProps {
  articleId: string;
}

export default function WikiCommentSection({ articleId }: WikiCommentSectionProps) {
  const { user, userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const { handleAddWikiComment, handleDeleteWikiComment, handleToggleWikiCommentLike, effectiveOrgId } = useCRM();
  const [comments, setComments] = useState<WikiComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!articleId || !effectiveOrgId) return;

    const q = query(
      collection(db, 'organizations', effectiveOrgId, 'wikiArticles', articleId, 'comments'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const loaded: WikiComment[] = [];
      snapshot.forEach(d => loaded.push({ ...d.data(), id: d.id } as WikiComment));
      setComments(loaded);
    });
  }, [articleId, effectiveOrgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await handleAddWikiComment(articleId, {
        userId: user?.uid || '',
        userName: userProfile?.displayName || user?.displayName || 'Anônimo',
        userPhoto: userProfile?.photoURL || '',
        text: newComment.trim()
      });
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        Comentários <span className="text-gray-500 font-normal">({comments.length})</span>
      </h3>

      {/* New Comment Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden border border-white/10 shadow-lg">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="Me" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="flex-1 relative group">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Adicione um comentário ou tire uma dúvida..."
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 outline-none transition-all min-h-[100px] resize-none pr-14"
            />
            <button
              disabled={!newComment.trim() || isSubmitting}
              className="absolute right-4 bottom-4 p-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:hover:bg-primary-500 text-white rounded-xl transition-all shadow-lg shadow-primary-500/20 active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map(comment => {
          const isLiked = comment.likedBy?.includes(user?.uid || '');
          
          return (
            <div key={comment.id} className="flex gap-4 group">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden border border-white/10 shadow-sm">
                {comment.userPhoto ? (
                  <img src={comment.userPhoto} alt={comment.userName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl rounded-tl-none group-hover:bg-white/[0.07] transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white text-sm">{comment.userName}</span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {comment.text}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 mt-2 ml-1">
                  <button 
                    onClick={() => handleToggleWikiCommentLike(articleId, comment.id)}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${isLiked ? 'text-primary-500 font-bold' : 'text-gray-500 hover:text-primary-500'}`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isLiked ? 'fill-primary-500' : ''}`} />
                    <span>{comment.likedBy?.length || 0}</span>
                    {isLiked ? 'Gostei' : 'Dar estrela'}
                  </button>
                  {/* Moderation */}
                  {(hasPermission('MANAGE_WIKI') || comment.userId === user?.uid) && (
                    <button 
                      onClick={() => {
                        if(confirm('Excluir este comentário?')) {
                          handleDeleteWikiComment(articleId, comment.id);
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {comments.length === 0 && (
          <div className="text-center py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl">
            <p className="text-gray-500 text-sm italic">Nenhum comentário ainda. Seja o primeiro!</p>
          </div>
        )}
      </div>
    </div>
  );
}
