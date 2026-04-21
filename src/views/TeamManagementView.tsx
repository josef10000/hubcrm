import React, { useState, useEffect } from 'react';
import { Users, Mail, UserPlus, Shield, X, Check, Loader2, Trash2, GitGraph, List, ChevronRight, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCRM } from '../contexts/CRMContext';
import { usePermissions } from '../hooks/usePermissions';
import { toast } from 'sonner';
import { UserRole } from '../types';

interface Member {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: number;
  jobTitle?: string;
  photoURL?: string;
  reportsTo?: string;
  birthDate?: string;
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

const OrgNode = ({ member, members, navigate }: { member: Member, members: Member[], navigate: any }) => {
  const children = members.filter(m => m.reportsTo === member.uid);
  
  return (
    <div className="flex flex-col items-center group/node">
      <div 
        onClick={() => navigate(`/profile/${member.uid}`)}
        className="relative z-10 flex flex-col items-center p-4 bg-white dark:bg-white/5 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-3xl min-w-[160px] shadow-lg hover:shadow-primary-500/20 hover:border-primary-500/30 transition-all cursor-pointer group"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-400 p-0.5 mb-2 shadow-lg shadow-primary-500/10 overflow-hidden">
          {member.photoURL ? (
            <img src={member.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 dark:bg-black rounded-full text-white font-bold">
              {member.displayName?.[0]}
            </div>
          )}
        </div>
        <p className="font-bold text-gray-900 dark:text-white text-sm text-center line-clamp-1">{member.displayName}</p>
        <p className="text-[10px] text-primary-500 font-medium tracking-tight uppercase">{member.jobTitle || member.role}</p>
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight size={12} className="text-primary-500" />
        </div>
      </div>

      {children.length > 0 && (
        <div className="flex flex-col items-center mt-8 relative">
          {/* Vertical line from parent */}
          <div className="absolute -top-8 left-1/2 w-0.5 h-8 bg-gray-200 dark:bg-white/10 -translate-x-1/2" />
          
          <div className="flex gap-8 relative pt-4">
            {/* Horizontal connection line */}
            {children.length > 1 && (
              <div className="absolute top-4 left-[20%] right-[20%] h-0.5 bg-gray-200 dark:bg-white/10" />
            )}
            
            {children.map((child) => (
              <div key={child.uid} className="relative">
                {/* Connector to horizontal line */}
                <div className="absolute -top-4 left-1/2 w-0.5 h-4 bg-gray-200 dark:bg-white/10 -translate-x-1/2" />
                <OrgNode member={child} members={members} navigate={navigate} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function TeamManagementView() {
  const { user, userProfile } = useAuth();
  const { orgRoles = [] } = useCRM();
  const { hasPermission } = usePermissions();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'org'>('list');
  
  // Invite form state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Remove member state
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [deleteAllData, setDeleteAllData] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isCancellingInvite, setIsCancellingInvite] = useState(false);
  
  // Edit Profile/Hierarchy state
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editJobTitle, setEditJobTitle] = useState('');
  const [editReportsTo, setEditReportsTo] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');

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

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    
    setIsSubmitting(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/team/update-profile', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUid: editingMember.uid,
          profileData: {
            jobTitle: editJobTitle,
            roleId: editRole,
            reportsTo: editReportsTo || null,
            birthDate: editBirthDate || null
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Membro atualizado!');
        setIsEditModalOpen(false);
        fetchData();
      } else {
        toast.error(data.error || 'Erro ao atualizar');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigate = useNavigate();

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

  const { permissions, hasPermission, isLoadingPermissions } = usePermissions();

  if (isLoadingPermissions) {
    return (
      <div className="flex-1 overflow-y-auto p-12 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  if (!hasPermission('MANAGE_TEAM')) {
    return (
      <div className="p-12 text-center">
        <Shield size={48} className="mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Acesso Restrito</h2>
        <p className="text-gray-500">Você não tem permissão para gerenciar a equipe.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Equipe</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerencie os membros da sua organização e suas permissões.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex bg-gray-200 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10">
              <button 
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${viewMode === 'list' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                <List size={18} />
                <span>Lista</span>
              </button>
              <button 
                onClick={() => setViewMode('org')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all text-sm font-medium ${viewMode === 'org' ? 'bg-white dark:bg-white/10 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                <GitGraph size={18} />
                <span>Organograma</span>
              </button>
            </div>
            {hasPermission('MANAGE_TEAM') && (
              <button 
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white px-5 py-3 rounded-2xl transition-all font-medium shadow-xl shadow-primary-500/20 whitespace-nowrap"
              >
                <UserPlus size={18} />
                <span>Convidar</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
        ) : (
          viewMode === 'list' ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center bg-gray-50/50 dark:bg-white/5">
                  <Users size={20} className="text-primary-500 mr-2" />
                  <h2 className="font-bold text-gray-900 dark:text-white">Membros Ativos ({members.length})</h2>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-white/10">
                  {members.map(member => {
                    const superior = members.find(m => m.uid === member.reportsTo);
                    return (
                      <div key={member.uid} className="px-6 py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
                        <div 
                          onClick={() => navigate(`/profile/${member.uid}`)}
                          className="flex items-center space-x-4 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold overflow-hidden shadow-inner">
                            {member.photoURL ? <img src={member.photoURL} alt={member.displayName} /> : member.displayName?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors flex items-center gap-2">
                              {member.displayName}
                              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -ml-1" />
                            </p>
                            <p className="text-xs text-gray-500">{member.jobTitle || member.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="hidden lg:flex flex-col items-end text-right mr-4">
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Superior</p>
                            <p className="text-xs text-gray-500">{superior?.displayName || 'Ninguém'}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-tight uppercase ${
                            member.role.includes('Admin') ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                            member.role.includes('Gerente') ? 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400' :
                            member.role.includes('People') ? 'bg-pink-500/20 text-pink-600 dark:text-pink-400' :
                            member.role.includes('Success') ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' :
                            member.role.includes('Suporte') ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' :
                            member.role.includes('Vendas') || member.role.includes('SDR') ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                            member.role.includes('Financeiro') || member.role.includes('FinOps') ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                            'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                          }`}>
                            {member.role}
                          </span>
                          <div className="flex items-center gap-1">
                            {hasPermission('MANAGE_TEAM') && (
                              <button 
                                onClick={() => { 
                                  setEditingMember(member); 
                                  setEditJobTitle(member.jobTitle || '');
                                  setEditReportsTo(member.reportsTo || '');
                                  setEditRole(member.uid === user?.uid ? (member as any).roleId || member.role : (member as any).roleId || member.role);
                                  setEditBirthDate(member.birthDate || '');
                                  setIsEditModalOpen(true); 
                                }}
                                className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
                                title="Editar Hierarquia"
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                            {hasPermission('MANAGE_TEAM') && member.uid !== user?.uid && (
                              <button 
                                onClick={() => { setMemberToRemove(member); setIsRemoveModalOpen(true); }}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Remover Acesso"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {invites.length > 0 && (
                <div className="bg-white/30 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-xl border-dashed animate-in slide-in-from-bottom duration-500">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center bg-gray-50/50 dark:bg-white/5">
                    <Mail size={20} className="text-primary-500 mr-2" />
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
                            <p className="text-xs text-gray-500 italic">Expira em {new Date(invite.expiresAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-white/10 rounded-lg text-gray-500">{invite.role}</span>
                          <div className="text-xs text-orange-400 font-medium px-2 py-1 bg-orange-400/10 rounded-lg animate-pulse">Aguardando...</div>
                          {hasPermission('MANAGE_TEAM') && (
                            <button 
                              onClick={() => handleCancelInvite(invite.id)}
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
          ) : (
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-[3rem] p-4 md:p-12 overflow-x-auto custom-scrollbar animate-in zoom-in duration-500 min-h-[600px] flex justify-center">
              {(() => {
                const roots = members.filter(m => !m.reportsTo || !members.find(x => x.uid === m.reportsTo));
                return (
                  <div className="flex flex-col items-center">
                    <div className="flex gap-8 justify-center">
                      {roots.map(root => (
                        <OrgNode key={root.uid} member={root} members={members} navigate={navigate} />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )
        )}

        {/* Modals */}
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
                  <input type="text" required value={inviteName} onChange={e => setInviteName(e.target.value)} className="w-full bg-gray-200/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white" placeholder="Ex: João Silva" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">E-mail</label>
                  <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full bg-gray-200/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white" placeholder="email@exemplo.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Cargo / Permissões</label>
                  <select 
                    value={inviteRole} 
                    onChange={e => setInviteRole(e.target.value)} 
                    className="w-full bg-gray-200/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="">Selecionar cargo...</option>
                    {orgRoles.map(role => (
                      <option key={role.id} value={role.id || role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsInviteModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl bg-primary-500 text-white font-bold text-sm shadow-lg shadow-primary-500/30">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Enviar Convite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isEditModalOpen && editingMember && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center"><Edit2 size={20} className="text-primary-500 mr-2" /> Editar Membro</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateMember} className="p-6 space-y-4">
                <div className="flex items-center space-x-3 mb-6 p-3 bg-primary-500/5 rounded-2xl border border-primary-500/10">
                  <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold overflow-hidden">
                    {editingMember.photoURL ? <img src={editingMember.photoURL} alt="" /> : editingMember.displayName?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{editingMember.displayName}</p>
                    <p className="text-xs text-gray-500">{editingMember.email}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">Cargo / Título</label>
                  <input type="text" value={editJobTitle} onChange={e => setEditJobTitle(e.target.value)} className="w-full bg-gray-200/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">Permissões do Sistema (Cargo)</label>
                  <select 
                    value={editRole} 
                    onChange={e => setEditRole(e.target.value)} 
                    disabled={editingMember.uid === user?.uid} // Evita que o admin tire o próprio admin
                    className="w-full bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    {orgRoles.map(role => (
                      <option key={role.id} value={role.id || role.name}>{role.name}</option>
                    ))}
                  </select>
                  {editingMember.uid === user?.uid && <p className="text-[10px] text-amber-500 mt-1">Você não pode alterar seu próprio cargo por aqui.</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase">Superior Imediato</label>
                  <select value={editReportsTo} onChange={e => setEditReportsTo(e.target.value)} className="w-full bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white">
                    <option value="">Ninguém (Root)</option>
                    {members.filter(m => m.uid !== editingMember.uid).map(m => (
                      <option key={m.uid} value={m.uid}>{m.displayName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">Data de Nascimento (Opcional)</label>
                  <input 
                    type="date" 
                    value={editBirthDate} 
                    onChange={e => setEditBirthDate(e.target.value)} 
                    className="w-full bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm font-bold">Cancelar</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl bg-primary-500 text-white font-bold text-sm">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isRemoveModalOpen && memberToRemove && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-red-500/20 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-red-500/10 text-red-600">
                <h3 className="font-bold flex items-center"><Trash2 size={20} className="mr-2" /> Remover Membro</h3>
                <button onClick={() => setIsRemoveModalOpen(false)}><X size={20} /></button>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-gray-900 dark:text-white text-center">Deseja remover {memberToRemove.displayName}?</p>
                <div className="bg-gray-100 dark:bg-white/5 p-4 rounded-2xl border">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" checked={deleteAllData} onChange={e => setDeleteAllData(e.target.checked)} className="w-5 h-5" />
                    <span className="text-sm">Apagar todos os dados vinculados (Leads/Clientes)</span>
                  </label>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIsRemoveModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl border text-sm font-bold">Cancelar</button>
                  <button onClick={handleRemoveMember} disabled={isRemoving} className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold text-sm">
                    {isRemoving ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirmar'}
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
