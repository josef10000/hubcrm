import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Client, ClientContract, ClientLog } from '../types';
import { FileSignature, ShieldCheck, CheckCircle, Clock, Loader2, FileUp, AlertCircle, FileText } from 'lucide-react';
import { toast, Toaster } from 'sonner';

export default function ContractSignView() {
  const { orgId, clientId, contractId } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [contract, setContract] = useState<ClientContract | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    async function fetchContract() {
      if (!orgId || !clientId || !contractId) {
        setLoading(false);
        return;
      }
      try {
        const clientRef = doc(db, 'organizations', orgId, 'clients', clientId);
        const snap = await getDoc(clientRef);
        if (snap.exists()) {
          const clientData = { id: snap.id, ...snap.data() } as Client;
          setClient(clientData);
          const found = (clientData.contracts || []).find(c => c.id === contractId);
          setContract(found || null);
        }
      } catch (error) {
        console.error("Error fetching contract:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchContract();
  }, [orgId, clientId, contractId]);

  const handleSign = async () => {
    if (!agreed) {
      toast.error('Você precisa declarar ciência dos termos marcando a caixa indicativa.');
      return;
    }
    setSigning(true);
    try {
      // Fetch IP
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      const ipAddress = ipData.ip || '0.0.0.0';

      const userAgent = navigator.userAgent;
      const timestamp = Date.now();

      // Ensure client and contract exist
      if (!client || !contract) throw new Error('Dados inválidos');

      const updatedContracts = (client.contracts || []).map(c => {
        if (c.id === contract.id) {
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
        text: `Contrato assinado digitalmente pelo cliente sob o IP ${ipAddress}.`,
        date: timestamp
      };

      const clientRef = doc(db, 'organizations', orgId!, 'clients', clientId!);
      await updateDoc(clientRef, {
        contracts: updatedContracts,
        logs: [...(client.logs || []), newLog]
      });

      setContract(prev => prev ? ({
        ...prev,
        status: 'signed',
        signedAt: timestamp,
        signedIp: ipAddress,
        signedUserAgent: userAgent
      }) : null);
      
      toast.success('Contrato Assinado com Sucesso!', { description: 'Sua assinatura com validade de IP foi registrada.', duration: 5000 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error(e);
      toast.error('Ocorreu um erro ao assinar. Tente novamente ou contate o provedor.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-primary-500 mb-4" size={48} />
        <h2 className="text-xl font-medium text-white">Carregando Contrato Seguro...</h2>
      </div>
    );
  }

  if (!client || !contract) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
          <AlertCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Contrato Inválido ou Não Localizado</h2>
        <p className="text-gray-400 text-center max-w-md">O link que você acessou pode estar expirado ou o contrato foi excluído. Por favor, solicite um novo link ao seu consultor.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] dark text-gray-100 py-12 px-4 selection:bg-primary-500/30">
      <Toaster position="top-center" theme="dark" />
      <div className="max-w-4xl mx-auto">
        {/* Header Visual */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 mb-4 shadow-[0_0_30px_rgba(234,88,12,0.15)]">
            <FileSignature size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Portal de Assinatura</h1>
          <p className="text-gray-400">Ambiente 100% Seguro. Documento criptografado.</p>
        </div>

        {contract.status === 'signed' && (
          <div className="mb-8 p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-4 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
            <ShieldCheck size={32} className="text-emerald-500 shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-emerald-400 mb-1">Este contrato já está devidamente assinado!</h3>
              <p className="text-emerald-500/80 mb-4">A validade jurídica foi atrelada ao seu clique com autenticação de metadados.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/40 rounded-xl p-3 border border-emerald-500/10">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Data e Hora (Timestamp)</p>
                  <p className="font-mono text-sm text-gray-300">{contract.signedAt ? new Date(contract.signedAt).toLocaleString('pt-BR') : 'N/A'}</p>
                </div>
                <div className="bg-black/40 rounded-xl p-3 border border-emerald-500/10">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Endereço IP Verificado</p>
                  <p className="font-mono text-sm text-gray-300">{contract.signedIp || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#111111] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} className="text-primary-500" />
              {contract.title || (contract.type === 'pdf' ? 'Contrato em PDF' : 'Contrato de Serviços')}
            </span>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500/30" />
              <div className="w-2 h-2 rounded-full bg-yellow-500/30" />
              <div className="w-2 h-2 rounded-full bg-emerald-500/30" />
            </div>
          </div>
          <div className="p-6 md:p-8 border-b border-white/5 bg-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary-500 mb-1">PARTES CONTRATANTES</p>
              <h2 className="text-xl font-bold text-white mb-1"><span className="text-gray-400 font-normal">Contratante: </span>{client.name}</h2>
              {client.cpfCnpj && <p className="text-gray-500 font-mono">Documento: {client.cpfCnpj}</p>}
            </div>
            <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${contract.status === 'signed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-primary-500/20 text-primary-400 border border-primary-500/20'}`}>
              {contract.status === 'signed' ? <CheckCircle size={16} /> : <Clock size={16} />}
              {contract.status === 'signed' ? 'Documento Autenticado' : 'Aguardando Assinatura'}
            </div>
          </div>

          <div className="bg-black/20 p-6 md:p-8">
            <h3 className="text-lg font-semibold text-white mb-4">Documento:</h3>
            
            {contract.type === 'pdf' ? (
              <div className="w-full h-[600px] bg-black/40 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                <div className="p-4 bg-white/5 flex items-center justify-between border-b border-white/10">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><FileUp size={16}/> Documento Original Anexado</span>
                  <a href={contract.content} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-400 hover:text-primary-300 transition-colors underline">Fazer Download Original</a>
                </div>
                <iframe src={contract.content} className="w-full flex-1" title="Contrato PDF" />
              </div>
            ) : (
              <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 md:p-8 max-h-[600px] overflow-y-auto custom-scrollbar">
                <pre className="font-mono text-sm md:text-base text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {contract.content}
                </pre>
              </div>
            )}
          </div>

          {contract.status === 'pending' && (
            <div className="p-6 md:p-8 bg-white/5 border-t border-white/5">
              <label className="flex items-start gap-4 p-4 rounded-xl bg-black/40 border border-white/5 cursor-pointer hover:bg-black/60 transition-colors group mb-6">
                <div className="relative flex items-start">
                  <div className="flex items-center h-6">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-600 bg-gray-900/50 text-primary-500 focus:ring-primary-500 focus:ring-offset-gray-900 transition-all cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex-1 text-sm text-gray-400 leading-relaxed">
                  Li, entendi e <strong className="text-white">declaro aceitar todos os termos e condições</strong> estipulados no documento acima. Compreendo que clicar no botão de assinatura registrará juridicamente meu Endereço de IP (<code className="bg-black text-gray-300 px-1 rounded">Rastreamento Ativo</code>) e Timestamp de navegação atestando para devidos fins legais meu aceite.
                </div>
              </label>

              <button
                onClick={handleSign}
                disabled={!agreed || signing}
                className="w-full py-4 rounded-2xl text-lg font-bold transition-all flex items-center justify-center gap-3 disabled:cursor-not-allowed group relative overflow-hidden bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-800 disabled:text-gray-500"
              >
                {!signing && !agreed && <ShieldCheck size={24} className="opacity-50" />}
                {signing ? (
                  <>
                    <Loader2 size={24} className="animate-spin" /> Processando Assinatura Segura...
                  </>
                ) : (
                  <>
                    <FileSignature size={24} className="group-disabled:opacity-50" /> Assinar Contrato Digitalmente
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <p className="text-xs text-gray-600">
            Powered by HubCRM - Sistema de Contratos e Assinaturas
          </p>
        </div>
      </div>
    </div>
  );
}
