import React, { useState } from 'react';
import { 
  FileText, CheckCircle, Clock, Eye, X, Printer, Shield, ArrowRight 
} from 'lucide-react';
import { UserContract, UserProfile } from '@/types';

interface ProfileContractsTabProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  isAdmin: boolean;
}

export default function ProfileContractsTab({ 
  profile, 
  isOwnProfile, 
  isAdmin 
}: ProfileContractsTabProps) {
  const [selectedContract, setSelectedContract] = useState<UserContract | null>(null);
  const [subTab, setSubTab] = useState<'work' | 'assets'>('work');

  const contracts = profile.contracts || [];
  
  // Separar contratos por tipo
  const workContracts = contracts.filter(c => c.type === 'work_contract' || !c.type);
  const assetTerms = contracts.filter(c => c.type === 'asset_term');

  const activeList = subTab === 'work' ? workContracts : assetTerms;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl gap-4 text-left">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Central de Documentos</h3>
          <p className="text-xs text-gray-500">Consulte seus termos assinados e documentos contratuais eletrônicos.</p>
        </div>
      </div>

      {/* Sub Navegação de Abas */}
      <div className="flex bg-black/40 border border-white/10 rounded-2xl p-1 shadow-inner self-start w-fit">
        <button
          onClick={() => setSubTab('work')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'work' 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Contratos de Trabalho ({workContracts.length})
        </button>
        <button
          onClick={() => setSubTab('assets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            subTab === 'assets' 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Termos de Equipamentos ({assetTerms.length})
        </button>
      </div>

      {activeList.length === 0 ? (
        <div className="bg-white/50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-3xl p-12 text-center space-y-3">
          <FileText size={40} className="mx-auto text-gray-400" />
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
            {subTab === 'work' ? 'Nenhum contrato de trabalho registrado' : 'Nenhum termo de equipamento registrado'}
          </p>
          <p className="text-xs text-gray-400">
            {subTab === 'work' 
              ? 'Não há contratos de trabalho ou aditivos vinculados a este perfil atualmente.' 
              : 'Não há termos de responsabilidade de equipamentos pendentes ou assinados vinculados a este perfil atualmente.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeList.map(contract => (
            <div 
              key={contract.id} 
              className="bg-white/50 dark:bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-3xl flex flex-col justify-between hover:border-primary-500/20 transition-all group text-left"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    contract.status === 'signed' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {contract.status === 'signed' ? <CheckCircle size={8} /> : <Clock size={8} />}
                    <span>{contract.status === 'signed' ? 'Assinado' : 'Pendente'}</span>
                  </span>
                  
                  <span className="text-[10px] text-gray-400 font-medium">
                    {new Date(contract.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{contract.title}</h4>
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                    {contract.bodyText.substring(0, 100)}...
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-6 pt-3 border-t border-gray-200 dark:border-white/5 shrink-0">
                <span className="text-[10px] font-mono text-gray-500 truncate max-w-[150px]">
                  {contract.hash ? `SHA: ${contract.hash.substring(0, 12)}...` : 'Sem chave de validação'}
                </span>

                <button
                  onClick={() => setSelectedContract(contract)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-lg text-xs font-bold transition-all active:scale-95"
                >
                  <Eye size={12} />
                  <span>Visualizar</span>
                  <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DO VISUALIZADOR DE CONTRATO ASSINADO COM O CARIMBO DIGITAL DE AUTENTICIDADE */}
      {selectedContract && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5 shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center text-sm gap-2">
                <FileText size={18} className="text-primary-500" />
                Documento Eletrônico: {selectedContract.title}
              </h3>
              <button 
                onClick={() => setSelectedContract(null)} 
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Estilo próprio para impressão (print media) */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-zinc-950/20 font-sans text-gray-800 dark:text-gray-200 leading-relaxed text-sm print:bg-white print:text-black">
              {/* Corpo do Contrato */}
              <div className="whitespace-pre-line border-b border-gray-200 dark:border-white/10 pb-8 text-justify print:border-black">
                {selectedContract.bodyText}
              </div>

              {selectedContract.status === 'signed' ? (
                /* CARIMBO HOLOGRÁFICO DIGITAL DE AUTENTICIDADE */
                <div className="bg-emerald-500/5 border-2 border-dashed border-emerald-500/25 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 print:border-black print:bg-transparent">
                  <div className="space-y-3 relative z-10 text-left">
                    <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:border-black print:text-black">
                      <CheckCircle size={10} />
                      <span>Autenticado por HubCRM Legals</span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-tight print:text-black">Metadados da Assinatura</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400 print:text-black">
                      <p><strong>Assinante:</strong> {selectedContract.signatureText}</p>
                      <p><strong>IP:</strong> {selectedContract.ip}</p>
                      <p><strong>Data/Hora:</strong> {new Date(selectedContract.signedAt || 0).toLocaleString('pt-BR')}</p>
                      <p><strong>RG / CPF:</strong> {selectedContract.rg || 'Não informado'} / {selectedContract.cpfCnpj || 'Não informado'}</p>
                      <p className="md:col-span-2 line-clamp-1 font-mono text-[9px] print:text-black"><strong>Fingerprint (SHA-256):</strong> {selectedContract.hash}</p>
                    </div>
                    <p className="text-[9px] text-gray-500 italic mt-2 print:text-black">
                      Autenticidade digital em conformidade com a MP nº 2.200-2/2001. A integridade deste documento está garantida criptograficamente.
                    </p>
                  </div>

                  {/* Grafia da Assinatura Simulada cursiva */}
                  <div className="relative z-10 flex flex-col items-center justify-center border-l-0 md:border-l border-gray-200 dark:border-white/10 pl-0 md:pl-8 text-center shrink-0 print:border-black">
                    <div className="font-serif italic text-2xl text-emerald-400 dark:text-emerald-300 font-extrabold select-none mb-1 tracking-wider print:text-black" style={{ fontFamily: "'Dancing Script', 'Caveat', cursive, serif" }}>
                      {selectedContract.signatureText}
                    </div>
                    <div className="w-32 h-[1px] bg-emerald-500/20 mb-1 print:bg-black" />
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-500 print:text-black">Assinatura Eletrônica</span>
                  </div>

                  {/* Efeito visual holográfico de selo */}
                  <div className="absolute right-[-10px] bottom-[-20px] opacity-[0.03] pointer-events-none scale-150 rotate-12 print:hidden">
                    <CheckCircle size={180} className="text-emerald-500" />
                  </div>
                </div>
              ) : (
                /* Card de pendente de assinatura */
                <div className="bg-amber-500/5 border border-dashed border-amber-500/20 rounded-3xl p-6 flex items-center justify-center gap-3">
                  <Clock size={20} className="text-amber-500 animate-pulse shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Aguardando Assinatura</p>
                    <p className="text-xs text-gray-500">Este documento já foi enviado e está bloqueando o acesso do colaborador até que seja assinado eletronicamente.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-gray-50 dark:bg-white/5 print:hidden">
              <button
                onClick={() => setSelectedContract(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-gray-400"
              >
                Fechar
              </button>
              {selectedContract.status === 'signed' && (
                <button
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs flex items-center space-x-1.5"
                >
                  <Printer size={14} />
                  <span>Imprimir PDF</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
