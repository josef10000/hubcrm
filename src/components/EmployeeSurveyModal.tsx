import React, { useState } from 'react';
import { Smile, Send, X, CheckCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useAuth } from '@auth/contexts/AuthContext';
import { useCRM } from '@crm/contexts/CRMContext';
import { differenceInDays } from 'date-fns';

export default function EmployeeSurveyModal() {
  const { userProfile } = useAuth();
  const { enpsQuestion, enpsFrequency, effectiveOrgId } = useCRM();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // Check if we should show the survey based on frequency
  const shouldShow = () => {
    if (!userProfile) return false;
    if (!enpsQuestion) return false;
    
    // New Rule: 30-day grace period for new collaborators
    if (userProfile.createdAt) {
      const daysInCompany = differenceInDays(new Date(), new Date(userProfile.createdAt));
      if (daysInCompany < 30) return false;
    }

    if (!userProfile.lastEnpsResponse) return true;

    const lastDate = (userProfile.lastEnpsResponse as any)?.toMillis ? 
      new Date((userProfile.lastEnpsResponse as any).toMillis()) : 
      new Date(userProfile.lastEnpsResponse as any);
    
    const daysSinceLast = differenceInDays(new Date(), lastDate);
    
    const frequencyDays = {
      'mensal': 30,
      'trimestral': 90,
      'semestral': 180
    }[enpsFrequency || 'mensal'] || 30;

    return daysSinceLast >= frequencyDays;
  };

  if (!isOpen || !shouldShow()) return null;

  const handleSubmit = async () => {
    if (score === null || !effectiveOrgId || !userProfile) return;

    setIsSubmitting(true);
    try {
      // 1. Save anonymous response in the organization's subcollection
      await addDoc(collection(db, 'organizations', effectiveOrgId, 'enps_results'), {
        score,
        comment,
        createdAt: serverTimestamp()
      });

      // 2. Update user profile to track response (without linking to the score)
      await updateDoc(doc(db, 'profiles', userProfile.uid), {
        lastEnpsResponse: serverTimestamp()
      });

      setSubmitted(true);
      toast.success('Obrigado pelo seu feedback!');
      
      // Close after 2.5 seconds
      setTimeout(() => setIsOpen(false), 2500);
    } catch (error) {
      console.error("Error submitting eNPS:", error);
      toast.error('Erro ao enviar feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl relative animate-in zoom-in duration-300">
        {!submitted && (
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"
          >
            <X size={24} />
          </button>
        )}

        <div className="flex flex-col items-center text-center">
          {submitted ? (
            <div className="py-8 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Feedback Enviado!</h3>
              <p className="text-gray-500 dark:text-gray-400">Sua opinião é fundamental para construirmos um ambiente melhor.</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mb-6">
                <Smile className="w-8 h-8 text-primary-500" />
              </div>
              
              <h3 className="text-2xl font-bold mb-4">Sua opinião importa!</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed font-medium">
                {enpsQuestion}
              </p>

              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScore(s)}
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border font-bold transition-all flex items-center justify-center ${
                      score === s 
                        ? 'bg-primary-500 border-primary-500 text-white scale-110 shadow-lg shadow-primary-500/30' 
                        : 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 hover:border-primary-500/50 hover:text-primary-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {score !== null && (
                <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-2">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="O que motivou sua nota? (Opcional e 100% anônimo)"
                    className="w-full h-24 px-4 py-3 bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none resize-none transition-all placeholder:text-gray-400 custom-scrollbar"
                  />
                  
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2 active:scale-95"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        Enviar Feedback Anônimo
                        <Send size={18} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
