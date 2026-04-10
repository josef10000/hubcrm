import React, { useState, useEffect } from 'react';
import { Users, Mail, UserPlus, Shield, X, Check, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface Member {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: number;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: number;
}

const Clock = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export default function TeamManagementView() {
  const { user, userProfile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Invite form state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('Vendedor');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Remove member state
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [deleteAllData, setDeleteAllData] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isCancellingInvite, setIsCancellingInvite] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      const res = await fetch('/api/team/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMembers(data.members);
        setInvites(data.invites);
      } else {
        toast.error(data.error || 'Erro ao carregar equipe');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          collaboratorName: inviteName
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Convite enviado com sucesso!');
        setIsInviteModalOpen(false);
        setInviteEmail('');
        setInviteName('');
        fetchData();
      } else {
        toast.error(data.error || 'Erro ao enviar convite');
      }
    } catch (error) {
      toast.error('Erro ao processar convite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!window.confirm('Deseja cancelar este convite pendente?')) return;
    
    setIsCancellingInvite(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/team/cancel-invite', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inviteId })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Convite cancelado com sucesso!');
        fetchData();
      } else {
        toast.error(data.error || 'Erro ao cancelar convite');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setIsCancellingInvite(false);
    }
  };
  
  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    
    setIsRemoving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/team/remove', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUid: memberToRemove.uid,
          deleteAllData: deleteAllData
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(deleteAllData ? 'Acesso cancelado e dados apagados com sucesso!' : 'Acesso cancelado com sucesso!');
        setIsRemoveModalOpen(false);
        setMemberToRemove(null);
        setDeleteAllData(false);
        fetchData();
      } else {
        toast.error(data.error || 'Erro ao remover membro');
      }
    } catch (error) {
      toast.error('Erro ao processar remoção');
    } finally {
      setIsRemoving(false);
    }
  };

  if (userProfile?.role !== 'Administrador' && userProfile?.role !== 'Gerente') {
    return (
      <div className="p-12 text-center">
        <Shield size={48} className="mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Acesso Restrito</h2>
        <p className="text-gray-500">Apenas administradores e gerentes podem gerenciar a equipe.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Equipe</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerencie os membros da sua organização e suas permissões.</p>
          </div>
          {userProfile.role === 'Administrador' && (
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white px-5 py-3 rounded-2xl transition-all font-medium shadow-xl shadow-primary-500/20"
            >
              <UserPlus size={18} />
              <span>Convidar Membro</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Members List */}
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center bg-gray-50/50 dark:bg-white/5">
                <Users size={20} className="text-primary-500 mr-2" />
                <h2 className="font-bold text-gray-900 dark:text-white">Membros Ativos ({members.length})</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-white/10">
                {members.map(member => (
                  <div key={member.uid} className="px-6 py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
                        {member.displayName?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{member.displayName}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        member.role === 'Administrador' ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                        member.role === 'Gerente' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                        member.role === 'Atendimento' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                        'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                      }`}>
                        {member.role}
                      </span>
                      {userProfile.role === 'Administrador' && member.uid !== user?.uid && (
                        <button 
                          onClick={() => { setMemberToRemove(member); setIsRemoveModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Remover Acesso"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Invites */}
            {invites.length > 0 && (
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl border-dashed">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center bg-gray-50/50 dark:bg-white/5">
                  <Mail size={20} className="text-orange-500 mr-2" />
                  <h2 className="font-bold text-gray-900 dark:text-white">Convites Pendentes ({invites.length})</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-white/10">
                  {invites.map(invite => (
                    <div key={invite.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-400">
                          <Clock size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{invite.email}</p>
                          <p className="text-xs text-gray-500 italic">Válido até {new Date(invite.expiresAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-white/10 rounded-lg text-gray-500">{invite.role}</span>
                        <div className="text-xs text-orange-400 font-medium px-2 py-1 bg-orange-400/10 rounded-lg animate-pulse">Aguardando...</div>
                        {userProfile.role === 'Administrador' && (
                          <button 
                            onClick={() => handleCancelInvite(invite.id)}
                            disabled={isCancellingInvite}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Cancelar Convite"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invite Modal */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                  <UserPlus size={20} className="text-primary-500 mr-2" /> Convidar Membro
                </h3>
                <button onClick={() => setIsInviteModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleInvite} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Nome do Colaborador</label>
                  <input 
                    type="text" required value={inviteName} onChange={e => setInviteName(e.target.value)}
                    className="w-full bg-gray-200/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-gray-900 dark:text-white"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">E-mail</label>
                  <input 
                    type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    className="w-full bg-gray-200/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-gray-900 dark:text-white"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Cargo / Permissões</label>
                  <select 
                    value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="w-full bg-gray-200/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-gray-900 dark:text-white"
                  >
                    <option value="Gerente">Gerente (Gestão total, sem usuários)</option>
                    <option value="Vendedor">Vendedor (Apenas Leads próprios)</option>
                    <option value="Atendimento">Atendimento (Agenda e Suporte)</option>
                    <option value="Financeiro">Financeiro (Aplicações financeiras)</option>
                    <option value="Só Leitura">Só Leitura (Observador)</option>
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsInviteModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm font-bold">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl bg-primary-500 text-gray-900 dark:text-white font-bold text-sm shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 disabled:opacity-50 flex items-center justify-center">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Enviar Convite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Remove Member Modal */}
        {isRemoveModalOpen && memberToRemove && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-red-500/20 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-red-500/10">
                <h3 className="font-bold text-red-600 dark:text-red-400 flex items-center">
                  <Trash2 size={20} className="mr-2" /> Cancelar Acesso
                </h3>
                <button onClick={() => setIsRemoveModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={20} /></button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-gray-900 dark:text-white font-medium mb-1">Deseja remover o acesso de {memberToRemove.displayName}?</p>
                  <p className="text-sm text-gray-500">Este usuário não poderá mais acessar o CRM.</p>
                </div>

                <div className="bg-gray-100 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={deleteAllData} 
                        onChange={e => setDeleteAllData(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 bg-white/50 dark:bg-black/20"
                      />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium group-hover:text-red-500 transition-colors">
                      Apagar tudo o que ele fez (Leads e Clientes)
                    </span>
                  </label>
                  {deleteAllData && (
                    <p className="mt-2 text-[10px] text-red-400 font-bold uppercase tracking-widest leading-tight">⚠️ ATENÇÃO: Esta ação é irreversível e removerá todos os registros vinculados a este usuário.</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsRemoveModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-sm font-bold">Cancelar</button>
                  <button 
                    onClick={handleRemoveMember}
                    disabled={isRemoving}
                    className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/30 hover:shadow-red-600/50 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isRemoving ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Remoção'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
