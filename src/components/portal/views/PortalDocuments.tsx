import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Files, 
  FileText, 
  Download, 
  ShieldCheck,
  FolderOpen,
  Clock,
  CheckCircle,
  FileSignature,
  X,
  Loader2,
  FileUp,
  AlertCircle
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Client, ClientContract, ClientLog } from '../../../types';
import { toast } from 'sonner';

interface PortalDocumentsProps {
  client: Client;
  orgId: string;
}

export default function PortalDocuments({ client, orgId }: PortalDocumentsProps) {
  const [selectedContract, setSelectedContract] = useState<ClientContract | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  const contracts = client.contracts || [];

  const handleSign = async () => {
    if (!agreed || !selectedContract) {
      toast.error('Você precisa declarar ciência dos termos marcando a caixa indicativa.');
      return;
    }
    setSigning(true);
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      const ipAddress = ipData.ip || '0.0.0.0';
      const userAgent = navigator.userAgent;
      const timestamp = Date.now();

      const updatedContracts = (client.contracts || []).map(c => {
        if (c.id === selectedContract.id) {
          return {
            ...c,
            status: 'signed',
            signedAt: timestamp,
            signedIp: ipAddress,
            signedUserAgent: userAgent
          } as ClientContract;
        }
        return c;
      });

      const newLog: ClientLog = {
        id: Date.now().toString(36),
        text: `Contrato assinado digitalmente via Portal do Cliente sob o IP ${ipAddress}.`,
        date: timestamp
      };

      const clientRef = doc(db, 'organizations', orgId, 'clients', client.id);
      await updateDoc(clientRef, {
        contracts: updatedContracts,
        logs: [...(client.logs || []), newLog]
      });

      toast.success('Contrato Assinado com Sucesso!', { description: 'Sua assinatura com validade de IP foi registrada.' });
      setSelectedContract(null);
      setAgreed(false);
    } catch (e) {
      console.error(e);
      toast.error('Ocorreu um erro ao assinar. Tente novamente ou contate o provedor.');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Files className="text-blue-400 w-6 h-6" />
            </div>
            Repositório de Documentos
          </h3>
          <p className="text-gray-500 text-sm mt-1">Acesse seus contratos, manuais e arquivos do projeto.</p>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-20 rounded-[3rem] flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/10">
            <FolderOpen className="text-gray-600 w-10 h-10" />
          </div>
          <h4 className="text-xl font-bold text-white mb-2">Sua pasta está sendo organizada</h4>
          <p className="text-gray-500 max-w-sm leading-relaxed">
            Nossa equipe está finalizando a organização dos seus documentos. Em breve você encontrará aqui seus contratos e arquivos técnicos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contracts.map((contract) => (
            <motion.div
              key={contract.id}
              whileHover={{ scale: 1.02 }}
              className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col gap-4 group transition-all hover:bg-white/[0.05]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${contract.status === 'signed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary-500/10 text-primary-400'}`}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-white font-bold truncate max-w-[150px] md:max-w-xs">{contract.title || 'Contrato de Serviços'}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                      {contract.type === 'pdf' ? 'Arquivo PDF' : 'Contrato de Texto'} • {new Date(contract.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${contract.status === 'signed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-primary-500/10 text-primary-400 border-primary-500/20'}`}>
                  {contract.status === 'signed' ? 'Assinado' : 'Pendente'}
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setSelectedContract(contract)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${
                    contract.status === 'signed' 
                    ? 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5' 
                    : 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/20'
                  }`}
                >
                  {contract.status === 'signed' ? (
                    <>
                      <ShieldCheck size={18} />
                      Visualizar
                    </>
                  ) : (
                    <>
                      <FileSignature size={18} />
                      Assinar Agora
                    </>
                  )}
                </button>
                {contract.type === 'pdf' && (
                  <a
                    href={contract.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-gray-400 hover:text-white transition-all"
                    title="Baixar Original"
                  >
                    <Download size={20} />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Signature / View Modal */}
      <AnimatePresence>
        {selectedContract && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedContract(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedContract.status === 'signed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary-500/10 text-primary-400'}`}>
                    <FileSignature size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white leading-tight">{selectedContract.title || 'Contrato de Serviços'}</h2>
                    <p className="text-xs text-gray-500 font-medium">Documento com validade jurídica via autenticação de IP</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
                {selectedContract.status === 'signed' && (
                  <div className="mb-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-4">
                    <ShieldCheck size={32} className="text-emerald-500 shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-emerald-400 mb-1">Documento Autenticado</h3>
                      <p className="text-emerald-500/70 text-sm mb-4">Este contrato foi assinado digitalmente e possui validade jurídica.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black/40 rounded-xl p-3 border border-emerald-500/10">
                          <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-bold">Assinado em</p>
                          <p className="font-mono text-xs text-gray-300">{selectedContract.signedAt ? new Date(selectedContract.signedAt).toLocaleString('pt-BR') : 'N/A'}</p>
                        </div>
                        <div className="bg-black/40 rounded-xl p-3 border border-emerald-500/10">
                          <p className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider font-bold">Endereço IP</p>
                          <p className="font-mono text-xs text-gray-300">{selectedContract.signedIp || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-black/40 border border-white/10 rounded-3xl overflow-hidden">
                  {selectedContract.type === 'pdf' ? (
                    <div className="w-full h-[500px] flex flex-col">
                      <div className="p-4 bg-white/5 flex items-center justify-between border-b border-white/5">
                        <span className="text-xs text-gray-400 flex items-center gap-2"><FileUp size={14}/> Visualização do PDF</span>
                        <a href={selectedContract.content} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-400 hover:text-primary-300 transition-colors underline">Download Original</a>
                      </div>
                      <iframe src={selectedContract.content} className="w-full flex-1" title="Contrato PDF" />
                    </div>
                  ) : (
                    <div className="p-8 md:p-12 max-h-[500px] overflow-y-auto custom-scrollbar">
                      <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {selectedContract.content}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer (Signature Action) */}
              {selectedContract.status === 'pending' && (
                <div className="p-6 md:p-8 border-t border-white/5 bg-white/5">
                  <div className="max-w-3xl mx-auto">
                    <label className="flex items-start gap-4 p-4 rounded-2xl bg-black/40 border border-white/10 cursor-pointer hover:bg-black/60 transition-colors group mb-6">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-1 h-5 w-5 rounded border-gray-600 bg-gray-900/50 text-primary-500 focus:ring-primary-500 focus:ring-offset-gray-900 transition-all cursor-pointer"
                      />
                      <div className="flex-1 text-sm text-gray-400 leading-relaxed">
                        Declaro que li e concordo com os termos acima. Entendo que esta assinatura digital registra meu <strong className="text-white">IP e Timestamp</strong> como prova jurídica de aceite.
                      </div>
                    </label>

                    <button
                      onClick={handleSign}
                      disabled={!agreed || signing}
                      className="w-full py-4 rounded-2xl text-lg font-bold transition-all flex items-center justify-center gap-3 disabled:cursor-not-allowed group relative overflow-hidden bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-800 disabled:text-gray-500"
                    >
                      {signing ? (
                        <>
                          <Loader2 size={24} className="animate-spin" /> Processando Assinatura...
                        </>
                      ) : (
                        <>
                          <FileSignature size={24} /> Assinar Documento Agora
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
