import React, { useState } from 'react';
import { FileText, Sparkles, Wand2, Download, Copy, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { OnboardingQuestion } from '../../types';

interface OnboardingTabProps {
  onboardingAnswers: Record<string, any> | undefined;
  onboardingQuestions: OnboardingQuestion[];
}

export default function OnboardingTab({ onboardingAnswers, onboardingQuestions }: OnboardingTabProps) {
  const [showPromptModal, setShowPromptModal] = useState(false);

  const generateGPTPrompt = () => {
    if (!onboardingAnswers) return "";
    let prompt = "Aja como um especialista em Copywriting e Web Design. Com base nas respostas do briefing abaixo, gere um prompt detalhado para a criação de uma Landing Page de alta conversão:\n\n";
    Object.entries(onboardingAnswers).forEach(([questionId, answer]) => {
      const question = onboardingQuestions.find(q => q.id === questionId);
      const questionText = question ? question.text : questionId;
      if (question?.type === 'file') {
        prompt += `[${questionText}]: (Arquivo Anexado)\n`;
      } else {
        prompt += `[${questionText}]: ${answer}\n`;
      }
    });
    return prompt;
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="mb-4 border-b border-gray-200 dark:border-white/10 pb-2 flex justify-between items-end">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Respostas do Briefing</h3>
            <p className="text-sm text-gray-500 mt-1">Informações preenchidas pelo cliente no formulário de onboarding.</p>
          </div>
          {onboardingAnswers && (
            <button
              type="button"
              onClick={() => setShowPromptModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 rounded-lg text-xs font-bold transition-all border border-primary-500/20"
            >
              <Sparkles size={14} />
              Gerar Prompt GPT
            </button>
          )}
        </div>
        {onboardingAnswers ? (
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
            {Object.entries(onboardingAnswers).map(([questionId, answer]) => {
              const question = onboardingQuestions.find(q => q.id === questionId);
              const questionText = question ? question.text : questionId;
              return (
                <div key={questionId} className="bg-black/20 border border-white/5 p-4 rounded-xl">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm opacity-80">{questionText}</h4>
                  
                  {question?.type === 'file' && typeof answer === 'string' && (answer.startsWith('data:image') || answer.startsWith('http')) ? (
                    <div className="mt-2 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {answer.split(',').map((url, idx) => (
                          <div key={idx} className="group relative">
                            <img 
                              src={url.trim()} 
                              alt={`Anexo ${idx + 1}`} 
                              className="w-full h-48 object-contain rounded-lg border border-white/10 bg-black/40 transition-transform hover:scale-[1.02]"
                              referrerPolicy="no-referrer" 
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg gap-3">
                              <a 
                                href={url.trim()} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                                title="Ver em tamanho real"
                              >
                                <ImageIcon size={20} />
                              </a>
                              <a 
                                href={url.trim()} 
                                download={`anexo-${questionId}-${idx}`} 
                                className="p-2 bg-primary-500 hover:bg-primary-600 rounded-full text-white transition-colors"
                                title="Baixar"
                              >
                                <Download size={20} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-500 italic">O cliente enviou {answer.split(',').length} imagem(ns).</p>
                    </div>
                  ) : (
                    <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">{String(answer)}</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-gray-200 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="text-gray-400" size={32} />
            </div>
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aguardando Respostas</h4>
            <p className="text-gray-500 max-w-xs">O cliente ainda não preencheu o formulário de briefing enviado.</p>
          </div>
        )}
      </div>

      {showPromptModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#1a1c23] border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-xl">
                  <Wand2 className="text-primary-500" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Prompt para GPT</h3>
                  <p className="text-sm text-gray-400">Copie este texto e cole no seu GPT personalizado.</p>
                </div>
              </div>
              <button onClick={() => setShowPromptModal(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-black/40 border border-white/5 rounded-2xl p-6 custom-scrollbar mb-6">
              <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {generateGPTPrompt()}
              </pre>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPromptModal(false)} className="px-6 py-3 rounded-2xl text-sm font-medium text-gray-400 hover:bg-white/5 transition-all">
                Fechar
              </button>
              <button 
                onClick={() => { navigator.clipboard.writeText(generateGPTPrompt()); toast.success("Prompt copiado com sucesso!"); }}
                className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <Copy size={18} />
                Copiar Prompt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
