import React, { useState } from 'react';
import { Star, X, Send } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

interface SupportSatisfactionModalProps {
  requestId: string;
  orgId: string;
  onClose: () => void;
}

export default function SupportSatisfactionModal({ requestId, orgId, onClose }: SupportSatisfactionModalProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (score === null) {
      toast.error('Por favor, selecione uma nota.');
      return;
    }

    setIsSubmitting(true);
    try {
      const requestRef = doc(db, 'organizations', orgId, 'supportRequests', requestId);
      await updateDoc(requestRef, {
        csatScore: score,
        csatComment: comment.trim() || null,
        csatAt: serverTimestamp()
      });
      toast.success('Obrigado! Sua avaliação foi enviada.');
      onClose();
    } catch (error) {
      console.error("Error submitting CSAT:", error);
      toast.error('Erro ao enviar avaliação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] border border-gray-200 dark:border-white/10 w-full max-w-md shadow-2xl overflow-hidden p-8 relative animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500/10 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star size={32} fill={score ? 'currentColor' : 'none'} />
          </div>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Avalie nosso suporte
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Sua opinião é fundamental para melhorarmos nosso atendimento.
          </p>
        </div>

        <div className="flex justify-between items-center mb-8 px-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoveredScore(star)}
              onMouseLeave={() => setHoveredScore(null)}
              onClick={() => setScore(star)}
              className="group transition-all duration-200 transform hover:scale-110"
            >
              <Star 
                size={40} 
                className={`${(hoveredScore || score || 0) >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-white/10'}`}
                fill={(hoveredScore || score || 0) >= star ? 'currentColor' : 'none'}
              />
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte-nos o que achou... (opcional)"
            className="w-full h-24 px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none text-sm"
          />

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || score === null}
            className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 group"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Enviar Avaliação
                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
