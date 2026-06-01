import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Edit3, Trash2, Send, CheckCircle, Clock, 
  HelpCircle, ChevronRight, ArrowLeft, Loader2, Info, Eye, X, RefreshCw
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { 
  collection, doc, getDocs, setDoc, deleteDoc, 
  query, where, updateDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { toast } from 'sonner';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { ContractTemplate, UserProfile, UserContract } from '@/types';
import { authFetch } from '@/lib/authFetch';

interface ContractManagerProps {
  effectiveOrgId: string;
}

export default function ContractManager({ effectiveOrgId }: ContractManagerProps) {
  const { user } = useAuth();
  const { confirm } = useDialog();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'templates' | 'status'>('templates');

  // Estados de Edição/Criação de Template
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<ContractTemplate> | null>(null);
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [associatedRoleId, setAssociatedRoleId] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Estados de Disparo
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [sendingContract, setSendingContract] = useState(false);

  // Modal para ver Contrato Assinado
  const [viewingContract, setViewingContract] = useState<{
    contract: UserContract;
    memberName: string;
  } | null>(null);

  // Lista de cargos disponíveis na empresa
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  const fetchTemplatesAndMembers = async () => {
    try {
      setLoading(true);
      // 1. Carregar Templates
      const templatesRef = collection(db, 'organizations', effectiveOrgId, 'contract_templates');
      const templatesSnap = await getDocs(templatesRef);
      const templatesList: ContractTemplate[] = [];
      templatesSnap.forEach(d => {
        templatesList.push({ id: d.id, ...d.data() } as ContractTemplate);
      });
      setTemplates(templatesList);

      // 2. Carregar Cargos (Roles) da Org
      const rolesRef = collection(db, 'organizations', effectiveOrgId, 'roles');
      const rolesSnap = await getDocs(rolesRef);
      const rolesList: { id: string; name: string }[] = [];
      rolesSnap.forEach(d => {
        rolesList.push({ id: d.id, name: d.data().name });
      });
      setRoles(rolesList);

      // 3. Carregar Colaboradores (da API de equipe)
      const res = await authFetch('/api/team/list');
      const data = await res.json();
      if (data.success) {
        setMembers(data.members || []);
      } else {
        // Fallback caso a API dê algum erro
        const membersRef = collection(db, 'profiles');
        const q = query(membersRef, where('orgId', '==', effectiveOrgId));
        const snap = await getDocs(q);
        const list: UserProfile[] = [];
        snap.forEach(d => list.push({ uid: d.id, ...d.data() } as UserProfile));
        setMembers(list);
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar dados de contratos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (effectiveOrgId) {
      fetchTemplatesAndMembers();
    }
  }, [effectiveOrgId]);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !bodyText.trim()) {
      toast.error('Preencha o título e o conteúdo do modelo.');
      return;
    }

    setSavingTemplate(true);
    try {
      const templateId = currentTemplate?.id || doc(collection(db, 'tmp')).id;
      const templateData: ContractTemplate = {
        id: templateId,
        title,
        bodyText,
        associatedRoleId: associatedRoleId || undefined,
        createdAt: currentTemplate?.createdAt || Date.now(),
        updatedAt: Date.now(),
        createdBy: currentTemplate?.createdBy || user?.uid || 'admin'
      };

      await setDoc(doc(db, 'organizations', effectiveOrgId, 'contract_templates', templateId), templateData);
      toast.success(currentTemplate?.id ? 'Modelo de contrato atualizado!' : 'Novo modelo de contrato criado!');
      setIsEditing(false);
      setCurrentTemplate(null);
      setTitle('');
      setBodyText('');
      setAssociatedRoleId('');
      fetchTemplatesAndMembers();
    } catch (error) {
      toast.error('Erro ao salvar modelo de contrato');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const ok = await confirm({
      title: 'Excluir Modelo',
      message: 'Tem certeza que deseja excluir permanentemente este modelo de contrato? Colaboradores que já assinaram contratos baseados nele não perderão suas cópias assinadas.',
      confirmText: 'Excluir Modelo',
      variant: 'danger'
    } as any);

    if (!ok) return;

    try {
      await deleteDoc(doc(db, 'organizations', effectiveOrgId, 'contract_templates', templateId));
      toast.success('Modelo excluído com sucesso!');
      fetchTemplatesAndMembers();
    } catch (e) {
      toast.error('Erro ao excluir modelo');
    }
  };

  const handleSendContract = async () => {
    if (!selectedTemplateId || !selectedMemberId) {
      toast.error('Selecione um modelo de contrato e um colaborador.');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplateId);
    const member = members.find(m => m.uid === selectedMemberId);

    if (!template || !member) return;

    const ok = await confirm({
      title: 'Enviar Contrato',
      message: `Deseja enviar o contrato "${template.title}" para ${member.displayName}? O acesso ao CRM deste colaborador será bloqueado no próximo login/atualização até que ele assine o termo digital.`,
      confirmText: 'Enviar Contrato',
      variant: 'warning'
    } as any);

    if (!ok) return;

    setSendingContract(true);
    try {
      const contractId = doc(collection(db, 'tmp')).id;
      
      // Criar a assinatura no formato de pendente
      const newContract: UserContract = {
        id: contractId,
        templateId: template.id,
        title: template.title,
        bodyText: template.bodyText, // Texto base original. As variáveis serão resolvidas no momento de renderizar no gate
        status: 'pending',
        createdAt: Date.now()
      };

      // Adicionar na lista de contratos do colaborador
      const memberRef = doc(db, 'profiles', member.uid);
      await updateDoc(memberRef, {
        contracts: arrayUnion(newContract)
      });

      toast.success(`Contrato enviado com sucesso para ${member.displayName}!`);
      setSelectedMemberId('');
      setSelectedTemplateId('');
      fetchTemplatesAndMembers();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar contrato para o colaborador');
    } finally {
      setSendingContract(false);
    }
  };

  const handleAnulContract = async (memberId: string, contract: UserContract) => {
    const member = members.find(m => m.uid === memberId);
    if (!member) return;

    const ok = await confirm({
      title: 'Anular Contrato',
      message: `Tem certeza que deseja anular e remover o contrato "${contract.title}" de ${member.displayName}? Isso removerá a assinatura ou a pendência de bloqueio deste colaborador.`,
      confirmText: 'Anular/Excluir',
      variant: 'danger'
    } as any);

    if (!ok) return;

    try {
      const memberRef = doc(db, 'profiles', member.uid);
      await updateDoc(memberRef, {
        contracts: arrayRemove(contract)
      });
      toast.success('Contrato anulado com sucesso!');
      fetchTemplatesAndMembers();
    } catch (e) {
      toast.error('Erro ao anular contrato');
    }
  };

  const insertVariable = (tag: string) => {
    setBodyText(prev => prev + tag);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="animate-spin text-primary-500" size={32} />
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando ecossistema legal...</p>
      </div>
    );
  }

  // Contratos Ativos/Pendentes enviados a colaboradores
  const activeSentContracts = members.flatMap(member => {
    const userContracts = member.contracts || [];
    return userContracts.map(c => ({
      ...c,
      memberId: member.uid,
      memberName: member.displayName,
      memberEmail: member.email,
      memberRole: member.jobTitle || (member.role as any)?.name || 'Colaborador'
    }));
  }).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="w-full space-y-6">
      {!isEditing ? (
        <>
          {/* Sub Navegação Premium */}
          <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-2 max-w-md">
            <button
              onClick={() => setActiveSubTab('templates')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${
                activeSubTab === 'templates'
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/10'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileText size={14} />
              <span>Modelos Padrões</span>
            </button>
            <button
              onClick={() => setActiveSubTab('status')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-xl text-xs font-bold uppercase transition-all duration-300 ${
                activeSubTab === 'status'
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/10'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Send size={14} />
              <span>Status de Assinaturas ({activeSentContracts.length})</span>
            </button>
          </div>

          {activeSubTab === 'templates' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Seção 1: Lista de Modelos */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText size={18} className="text-primary-500" />
                    Modelos de Contratos da Organização
                  </h3>
                  <button
                    onClick={() => {
                      setCurrentTemplate(null);
                      setTitle('');
                      setBodyText('');
                      setAssociatedRoleId('');
                      setIsEditing(true);
                    }}
                    className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl transition-all font-bold text-xs shadow-lg shadow-primary-500/20"
                  >
                    <Plus size={14} />
                    <span>Novo Modelo</span>
                  </button>
                </div>

                {templates.length === 0 ? (
                  <div className="border border-dashed border-gray-200 dark:border-white/10 p-8 rounded-2xl text-center space-y-2">
                    <FileText size={32} className="mx-auto text-gray-400" />
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Nenhum contrato cadastrado</p>
                    <p className="text-xs text-gray-400">Crie seu primeiro modelo de contrato clicando no botão acima.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map(tmpl => {
                      const associatedRoleName = roles.find(r => r.id === tmpl.associatedRoleId)?.name || 'Todos';
                      return (
                        <div key={tmpl.id} className="bg-black/30 border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex flex-col justify-between hover:border-primary-500/20 transition-all group">
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors text-sm line-clamp-1">{tmpl.title}</h4>
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mt-2">Gatilho de Cargo</p>
                            <span className="inline-block px-2 py-0.5 mt-1 text-[9px] font-extrabold uppercase bg-primary-500/10 text-primary-500 rounded-md">
                              {associatedRoleName}
                            </span>
                          </div>
                          <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-gray-200 dark:border-white/5">
                            <button
                              onClick={() => {
                                setCurrentTemplate(tmpl);
                                setTitle(tmpl.title);
                                setBodyText(tmpl.bodyText);
                                setAssociatedRoleId(tmpl.associatedRoleId || '');
                                setIsEditing(true);
                              }}
                              className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
                              title="Editar Modelo"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(tmpl.id)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Excluir Modelo"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Seção 2: Disparo Rápido de Contrato */}
              <div className="bg-black/30 border border-gray-200 dark:border-white/10 p-6 rounded-3xl space-y-4 h-fit">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Send size={16} className="text-primary-500" />
                  Enviar Contrato p/ Colaborador
                </h3>
                <p className="text-xs text-gray-500">
                  Selecione um colaborador e um modelo de contrato para bloquear seu CRM com a solicitação de assinatura eletrônica imediata.
                </p>

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">1. Selecionar Colaborador</label>
                    <select
                      value={selectedMemberId}
                      onChange={e => setSelectedMemberId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                    >
                      <option value="">Escolher membro da equipe...</option>
                      {members.map(m => (
                        <option key={m.uid} value={m.uid}>
                          {m.displayName} ({m.jobTitle || 'Sem cargo'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">2. Escolher Modelo de Contrato</label>
                    <select
                      value={selectedTemplateId}
                      onChange={e => setSelectedTemplateId(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                    >
                      <option value="">Escolher modelo...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleSendContract}
                    disabled={sendingContract || !selectedMemberId || !selectedTemplateId}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary-500/20"
                  >
                    {sendingContract ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Disparar Contrato Digital</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Tab de Status de Assinaturas */
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Send size={18} className="text-primary-500" />
                Histórico de Contratos Enviados & Status
              </h3>

              {activeSentContracts.length === 0 ? (
                <div className="border border-dashed border-gray-200 dark:border-white/10 p-8 rounded-2xl text-center space-y-2">
                  <Send size={32} className="mx-auto text-gray-400" />
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Nenhum contrato disparado</p>
                  <p className="text-xs text-gray-400">Quando você disparar um contrato para um membro ativo, ele aparecerá aqui.</p>
                </div>
              ) : (
                <div className="bg-black/40 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/5 border-b border-gray-200 dark:border-white/10 text-gray-400 font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">Colaborador</th>
                          <th className="px-6 py-4">Título do Contrato</th>
                          <th className="px-6 py-4">Data Envio</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right font-bold">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-white/5 text-gray-300">
                        {activeSentContracts.map(item => (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-bold text-white text-sm">{item.memberName}</p>
                                <p className="text-[10px] text-gray-400">{item.memberEmail} • {item.memberRole}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold text-white">{item.title}</td>
                            <td className="px-6 py-4 text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              {item.status === 'signed' ? (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-bold tracking-tight uppercase bg-emerald-500/20 text-emerald-400 rounded-full">
                                  <CheckCircle size={10} />
                                  <span>Assinado</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-[10px] font-bold tracking-tight uppercase bg-amber-500/20 text-amber-400 rounded-full animate-pulse">
                                  <Clock size={10} />
                                  <span>Pendente</span>
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end items-center gap-2">
                                {item.status === 'signed' && (
                                  <button
                                    onClick={() => setViewingContract({ contract: item, memberName: item.memberName })}
                                    className="p-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-lg transition-all"
                                    title="Visualizar Contrato Assinado"
                                  >
                                    <Eye size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAnulContract(item.memberId, item as any)}
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                                  title="Anular/Deletar Contrato"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Editor de Criação/Edição de Modelo */
        <div className="bg-black/30 border border-gray-200 dark:border-white/10 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-white transition-all"
            >
              <ArrowLeft size={16} />
              <span>Voltar para Lista</span>
            </button>
            <span className="text-xs font-extrabold uppercase bg-primary-500/10 text-primary-500 px-3 py-1 rounded-full">
              {currentTemplate?.id ? 'Editando Modelo' : 'Novo Modelo'}
            </span>
          </div>

          <form onSubmit={handleSaveTemplate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Título do Modelo</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Contrato de Prestação de Serviços PJ"
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Associar ao Cargo (Gatilho Automático - Opcional)</label>
                <select
                  value={associatedRoleId}
                  onChange={e => setAssociatedRoleId(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all text-sm text-white"
                >
                  <option value="">Nenhum cargo associado (Somente envio manual)</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  Se associado, qualquer colaborador convidado para este cargo receberá o contrato automaticamente no primeiro login.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Caixa de Texto do Contrato */}
              <div className="lg:col-span-2 space-y-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Texto do Contrato (Markdown Suportado)</label>
                <textarea
                  required
                  value={bodyText}
                  onChange={e => setBodyText(e.target.value)}
                  placeholder="Redija o texto do contrato aqui..."
                  className="w-full h-96 px-4 py-3 bg-black/40 border border-white/10 rounded-xl resize-none outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 transition-all text-sm text-white font-mono"
                />
              </div>

              {/* Dicas de Variáveis Dinâmicas */}
              <div className="bg-black/40 border border-white/5 p-6 rounded-2xl h-fit space-y-4">
                <h4 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle size={16} className="text-primary-500" />
                  Variáveis Dinâmicas
                </h4>
                <p className="text-[11px] text-gray-400">
                  Clique nas variáveis abaixo para inseri-las automaticamente no texto. O CRM irá substituí-las pelos dados do colaborador em tempo real.
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  {[
                    { label: 'Nome Colaborador', tag: '{NOME_COLABORADOR}' },
                    { label: 'Cargo', tag: '{CARGO}' },
                    { label: 'Departamento', tag: '{DEPARTAMENTO}' },
                    { label: 'Salário Base', tag: '{SALARIO}' },
                    { label: 'Tipo Contrato', tag: '{TIPO_CONTRATO}' },
                    { label: 'Nome Empresa', tag: '{EMPRESA_NOME}' },
                  ].map(item => (
                    <button
                      key={item.tag}
                      type="button"
                      onClick={() => insertVariable(item.tag)}
                      className="px-2.5 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 border border-primary-500/15 rounded-lg text-[10px] font-black tracking-tight uppercase transition-all active:scale-95"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="bg-primary-500/5 border border-primary-500/10 rounded-2xl p-4 mt-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary-500 uppercase">
                    <Info size={14} />
                    Dica de Markdown
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    Você pode usar `**negrito**`, `*itálico*`, `- tópicos` e `# Títulos` para formatar e deixar seu contrato profissional no HubCRM.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setCurrentTemplate(null);
                }}
                className="flex-1 max-w-[200px] px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm font-bold active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingTemplate}
                className="flex-1 max-w-[200px] px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm active:scale-95 transition-all shadow-lg shadow-primary-500/20"
              >
                {savingTemplate ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Salvar Modelo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL PARA VISUALIZAR CONTRATO ASSINADO COM O CARIMBO DIGITAL DE AUTENTICIDADE */}
      {viewingContract && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5 shrink-0">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center text-sm gap-2">
                <FileText size={18} className="text-primary-500" />
                Contrato Assinado: {viewingContract.contract.title}
              </h3>
              <button 
                onClick={() => setViewingContract(null)} 
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-zinc-950/20 font-sans text-gray-800 dark:text-gray-200 leading-relaxed text-sm">
              {/* Corpo do Contrato */}
              <div className="whitespace-pre-line border-b border-gray-200 dark:border-white/10 pb-8 text-justify">
                {viewingContract.contract.bodyText}
              </div>

              {/* CARIMBO HOLOGRÁFICO DIGITAL DE AUTENTICIDADE */}
              <div className="bg-emerald-500/5 border-2 border-dashed border-emerald-500/25 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 relative z-10">
                  <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle size={10} />
                    <span>Autenticado por HubCRM Legals</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-tight">Metadados da Assinatura</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <p><strong>Assinante:</strong> {viewingContract.contract.signatureText}</p>
                    <p><strong>IP:</strong> {viewingContract.contract.ip}</p>
                    <p><strong>Data/Hora:</strong> {new Date(viewingContract.contract.signedAt || 0).toLocaleString('pt-BR')}</p>
                    <p><strong>RG / CPF:</strong> {viewingContract.contract.rg || 'Não informado'} / {viewingContract.contract.cpfCnpj || 'Não informado'}</p>
                    <p className="md:col-span-2 line-clamp-1 font-mono text-[9px]"><strong>Fingerprint (SHA-256):</strong> {viewingContract.contract.hash}</p>
                  </div>
                  <p className="text-[9px] text-gray-500 italic mt-2">
                    Autenticidade digital em conformidade com a MP nº 2.200-2/2001. A integridade deste documento está garantida criptograficamente.
                  </p>
                </div>

                {/* Grafia da Assinatura Simulada cursiva */}
                <div className="relative z-10 flex flex-col items-center justify-center border-l-0 md:border-l border-gray-200 dark:border-white/10 pl-0 md:pl-8 text-center shrink-0">
                  <div className="font-serif italic text-2xl text-emerald-400 dark:text-emerald-300 font-extrabold select-none mb-1 tracking-wider" style={{ fontFamily: "'Dancing Script', 'Caveat', cursive, serif" }}>
                    {viewingContract.contract.signatureText}
                  </div>
                  <div className="w-32 h-[1px] bg-emerald-500/20 mb-1" />
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-gray-500">Assinatura Eletrônica</span>
                </div>

                {/* Efeito visual holográfico de selo */}
                <div className="absolute right-[-10px] bottom-[-20px] opacity-[0.03] pointer-events-none scale-150 rotate-12">
                  <CheckCircle size={180} className="text-emerald-500" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 bg-gray-50 dark:bg-white/5 shrink-0">
              <button
                onClick={() => setViewingContract(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-gray-400"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs"
              >
                Imprimir Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
