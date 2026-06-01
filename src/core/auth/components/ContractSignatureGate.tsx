import React, { useState, useEffect, useRef } from 'react';
import { FileText, CheckCircle, ShieldAlert, Loader2, Sparkles } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { UserProfile, UserContract } from '@/types';

interface ContractSignatureGateProps {
  userProfile: UserProfile;
  pendingContracts: UserContract[];
  onSignSuccess: () => void;
}

export default function ContractSignatureGate({ 
  userProfile, 
  pendingContracts, 
  onSignSuccess 
}: ContractSignatureGateProps) {
  // Pegamos o primeiro contrato pendente da lista para assinar
  const currentContract = pendingContracts[0];

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [signatureText, setSignatureText] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [rg, setRg] = useState('');
  
  // Metadados obtidos no client
  const [ipAddress, setIpAddress] = useState('127.0.0.1');
  const [signing, setSigning] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 1. Buscar IP Real do usuário via API externa
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        if (data.ip) {
          setIpAddress(data.ip);
        }
      } catch (e) {
        // Fallback em caso de offline/bloqueio
        console.warn('Erro ao obter IP externo. Usando IP padrão.');
      }
    };
    fetchIp();
  }, []);

  // 2. Controlar detecção de scroll
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Margem de erro de 15px para garantir ativação mesmo em monitores de alta escala
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 15;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  // 3. Resolver variáveis dinâmicas no contrato em tempo real
  const resolveContractVariables = (text: string) => {
    if (!text) return '';
    const salaryFormatted = userProfile.salary 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(userProfile.salary)
      : 'R$ 0,00';

    return text
      .replace(/{NOME_COLABORADOR}/g, userProfile.displayName || 'Colaborador')
      .replace(/{CARGO}/g, userProfile.jobTitle || 'Membro')
      .replace(/{DEPARTAMENTO}/g, userProfile.department || 'Geral')
      .replace(/{SALARIO}/g, salaryFormatted)
      .replace(/{TIPO_CONTRATO}/g, userProfile.contractType || 'PJ')
      .replace(/{EMPRESA_NOME}/g, 'CRM Corp'); // Nome genérico/padrão da empresa
  };

  const solvedContractText = resolveContractVariables(currentContract?.bodyText || '');

  // 4. Algoritmo simples de Hash SHA-256 no client
  const generateSHA256 = async (message: string) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  // 5. Tratar assinatura eletrônica
  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signatureText.trim()) {
      toast.error('Digite seu nome completo para assinar.');
      return;
    }

    if (signatureText.trim().toLowerCase() !== userProfile.displayName.trim().toLowerCase()) {
      toast.error('O nome de assinatura deve ser exatamente igual ao seu nome de cadastro no CRM.');
      return;
    }

    if (!cpfCnpj.trim() || !rg.trim()) {
      toast.error('O preenchimento do CPF/CNPJ e RG é obrigatório para validade jurídica.');
      return;
    }

    setSigning(true);
    try {
      const userAgent = navigator.userAgent;
      const signedAt = Date.now();
      
      // Gerar Hash de Validade único usando texto resolvido + assinatura + metadados
      const payloadString = `${solvedContractText}|${signatureText}|${cpfCnpj}|${rg}|${ipAddress}|${userAgent}|${signedAt}`;
      const contractHash = await generateSHA256(payloadString);

      // Congelar contrato assinado
      const signedContractData: UserContract = {
        ...currentContract,
        bodyText: solvedContractText, // Salva o texto final resolvido (imutável)
        status: 'signed',
        signedAt,
        ip: ipAddress,
        userAgent,
        signatureText: signatureText.trim(),
        cpfCnpj: cpfCnpj.trim(),
        rg: rg.trim(),
        hash: contractHash
      };

      // Atualizar a lista de contratos no perfil no Firestore
      // Substituindo o contrato antigo (pendente) pelo novo (assinado)
      const userContracts = userProfile.contracts || [];
      const updatedContracts = userContracts.map(c => 
        c.id === currentContract.id ? signedContractData : c
      );

      const profileRef = doc(db, 'profiles', userProfile.uid);
      await updateDoc(profileRef, {
        contracts: updatedContracts
      });

      toast.success('Contrato assinado eletronicamente com sucesso! Acesso liberado.');
      
      // Pequena animação/timeout antes de liberar a tela
      setTimeout(() => {
        onSignSuccess();
      }, 1000);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao assinar contrato eletrônico.');
    } finally {
      setSigning(false);
    }
  };

  if (!currentContract) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-2xl overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden my-4 max-h-[90vh]">
        
        {/* Lado Esquerdo: O Contrato (Leitura) */}
        <div className="flex-1 p-6 md:p-8 flex flex-col min-h-0 border-r border-gray-200 dark:border-white/10">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2.5 bg-primary-500/10 rounded-2xl text-primary-500 shrink-0">
              <FileText size={24} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-primary-500 tracking-wider">Documento Pendente</span>
              <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{currentContract.title}</h2>
            </div>
          </div>

          {/* Painel de Visualização do Contrato com Rolagem */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-black/45 border border-gray-200 dark:border-white/5 rounded-3xl text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-line text-justify custom-scrollbar select-none"
          >
            {solvedContractText}
          </div>

          {/* Dica para ler até o fim */}
          {!hasScrolledToBottom && (
            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-500 dark:text-amber-400 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
              <ShieldAlert size={16} className="shrink-0" />
              <span>Por favor, role o contrato até o final para habilitar a assinatura eletrônica.</span>
            </div>
          )}
        </div>

        {/* Lado Direito: Formulário de Assinatura */}
        <div className="w-full md:w-[360px] p-6 md:p-8 bg-gray-50 dark:bg-white/5 flex flex-col justify-center shrink-0">
          <div className="mb-6 space-y-2">
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-1.5">
              Assinatura Eletrônica
              <Sparkles size={16} className="text-primary-500" />
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              O HubCRM gerará uma chave criptográfica baseada em seus documentos e nome. Este termo possui validade jurídica real.
            </p>
          </div>

          <form onSubmit={handleSignContract} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Nome Completo (Conforme Cadastro)
              </label>
              <input
                type="text"
                required
                disabled={!hasScrolledToBottom}
                value={signatureText}
                onChange={e => setSignatureText(e.target.value)}
                placeholder={userProfile.displayName}
                className="w-full px-4 py-3 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 disabled:opacity-40 transition-all font-semibold"
              />
              <p className="text-[9px] text-gray-500 mt-1">
                Digite exatamente: <strong>{userProfile.displayName}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  CPF ou CNPJ
                </label>
                <input
                  type="text"
                  required
                  disabled={!hasScrolledToBottom}
                  value={cpfCnpj}
                  onChange={e => setCpfCnpj(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-4 py-3 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 disabled:opacity-40 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                  Registro Geral (RG)
                </label>
                <input
                  type="text"
                  required
                  disabled={!hasScrolledToBottom}
                  value={rg}
                  onChange={e => setRg(e.target.value)}
                  placeholder="00.000.000-0"
                  className="w-full px-4 py-3 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 disabled:opacity-40 transition-all"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-tight">
                <span>Endereço de IP</span>
                <span className="font-mono text-white/50">{ipAddress}</span>
              </div>
              <div className="flex items-center justify-between text-[9px] text-gray-500 font-bold uppercase tracking-tight">
                <span>Browser/SO</span>
                <span className="truncate max-w-[180px] font-mono text-white/50">{navigator.userAgent.split(' ')[0]}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={signing || !hasScrolledToBottom}
              className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary-500/20 flex items-center justify-center space-x-2 active:scale-95"
            >
              {signing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle size={16} />
                  <span>Assinar Termo Eletrônico</span>
                </>
              )}
            </button>

            <p className="text-[8px] text-gray-500 text-center leading-relaxed">
              Ao assinar, você declara ter lido e aceito todos os termos. Este documento possui fé jurídica digital nos termos da Medida Provisória nº 2.200-2/2001.
            </p>
          </form>
        </div>

      </div>
    </div>
  );
}
