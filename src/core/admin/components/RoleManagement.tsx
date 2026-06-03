import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, CheckCircle, X, Loader2 } from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { useDialog } from '@auth/contexts/DialogContext';
import { usePermissions } from '@auth/hooks/usePermissions';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { CustomRole, AppPermission, defaultRoles } from '@/constants/permissions';
import { auditService } from '@/services/auditService';
import { SaveButton } from '@/shared/components/SaveButton';
import { toast } from 'sonner';

const PERMISSION_GROUPS: { name: string; keys: AppPermission[] }[] = [
  { name: 'Geral & Dashboard', keys: ['VIEW_DASHBOARD', 'VIEW_REPORTS', 'MANAGE_SETTINGS'] },
  { name: 'Comercial', keys: ['MANAGE_LEADS', 'MANAGE_CLIENTS'] },
  { name: 'Financeiro', keys: ['MANAGE_FINANCE'] },
  { name: 'Equipe & Cultura', keys: ['MANAGE_TEAM', 'MANAGE_WIKI', 'MANAGE_SUPPORT'] }
];

export default function RoleManagement() {
  const { userProfile } = useAuth();
  const { hasPermission } = usePermissions();
  const { confirm } = useDialog();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formData, setFormData] = useState<Partial<CustomRole>>({});

  useEffect(() => {
    fetchRoles();
  }, [userProfile?.orgId]);

  const fetchRoles = async () => {
    if (!userProfile?.orgId) return;
    try {
      setLoading(true);
      const rolesRef = collection(db, `organizations/${userProfile.orgId}/roles`);
      const snapshot = await getDocs(rolesRef);
      
      let loadedRoles = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CustomRole));
      
      // Se não tem roles, assume os defaults para UI
      if (loadedRoles.length === 0) {
        loadedRoles = [...defaultRoles];
      }
      
      setRoles(loadedRoles.sort((a,b) => a.level - b.level));
    } catch (error) {
      toast.error('Erro ao carregar cargos');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (perm: AppPermission) => {
    setFormData(prev => {
      const current = prev.permissions || [];
      const isSelected = current.includes(perm);
      return {
        ...prev,
        permissions: isSelected ? current.filter(p => p !== perm) : [...current, perm]
      };
    });
  };

  const handleSave = async () => {
    if (!userProfile?.orgId || !formData.name) return;
    
    const roleId = editingRole?.id || `ROLE_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const roleData: CustomRole = {
      id: roleId,
      name: formData.name,
      level: formData.level || 10,
      permissions: formData.permissions || [],
      isDefault: editingRole ? editingRole.isDefault : false,
      createdAt: editingRole?.createdAt || Date.now()
    };

    await setDoc(doc(db, `organizations/${userProfile.orgId}/roles`, roleId), roleData);
    
    auditService.logActivity(userProfile.orgId, {
      userId: userProfile.uid,
      userName: userProfile.displayName || 'Admin',
      action: editingRole ? 'ROLE_UPDATED' : 'ROLE_CREATED',
      targetId: roleId,
      targetType: 'role',
      details: `${editingRole ? 'Atualizado' : 'Criado'} cargo: ${roleData.name} com ${roleData.permissions.length} permissões.`
    });

    // Pequeno atraso para a animação do botão ser percebida
    setTimeout(() => {
      setIsModalOpen(false);
    }, 1000);
    
    fetchRoles();
  };

  const handleDelete = async (role: CustomRole) => {
    if (role.isDefault) {
      toast.error('Cargos padrão não podem ser excluídos');
      return;
    }
    
    try {
      const ok = await confirm({
        title: 'Excluir Cargo',
        message: `Deseja realmente excluir o cargo ${role.name}? Usuários com este cargo podem perder acesso.`,
        confirmText: 'Sim, excluir',
        variant: 'danger'
      });
      
      if (!ok) return;

      await deleteDoc(doc(db, `organizations/${userProfile!.orgId}/roles`, role.id));
      
      auditService.logActivity(userProfile!.orgId, {
        userId: userProfile!.uid,
        userName: userProfile!.displayName || 'Admin',
        action: 'ROLE_DELETED',
        targetId: role.id,
        targetType: 'role',
        details: `Excluído cargo: ${role.name}.`
      });

      toast.success('Cargo excluído com sucesso!');
      fetchRoles();
    } catch (error) {
      toast.error('Erro ao excluir cargo');
    }
  };

  if (!hasPermission('MANAGE_SETTINGS')) return null;

  return (
    <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Shield className="mr-2 text-primary-500" size={20} />
          Cargos e Permissões
        </h3>
        <button
          onClick={() => {
            setEditingRole(null);
            setFormData({ name: '', level: 10, permissions: ['VIEW_DASHBOARD'] });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors text-sm font-medium shadow-lg shadow-primary-500/20"
        >
          <Plus size={16} /> Novo Cargo
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <div key={role.id} className="p-5 border border-white/10 rounded-2xl bg-white/5 hover:border-primary-500/30 transition-all flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-white">{role.name}</h4>
                  {role.isDefault && <span className="px-2 py-0.5 bg-white/10 text-gray-400 rounded-md text-[10px] uppercase font-bold tracking-widest">Sistema</span>}
                </div>
                <p className="text-xs text-gray-400 mb-4">{role.permissions.length} permissões concedidas</p>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-white/5">
                 <button 
                   onClick={() => {
                     setEditingRole(role);
                     setFormData(role);
                     setIsModalOpen(true);
                   }}
                   className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all"
                 >
                   <Edit2 size={16} />
                 </button>
                 {!role.isDefault && (
                   <button 
                     onClick={() => handleDelete(role)}
                     className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                   >
                     <Trash2 size={16} />
                   </button>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl custom-scrollbar">
            <div className="sticky top-0 px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-zinc-900 z-10">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                <Shield size={20} className="text-primary-500 mr-2" /> 
                {editingRole ? `Editar Cargo: ${editingRole.name}` : 'Novo Cargo'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={e => e.preventDefault()} className="p-6 space-y-6">
               <div className="space-y-4">
                 <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nome do Cargo</label>
                   <input required type="text" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" placeholder="Ex: SDR Sênior" />
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase mb-4">Acessos Disponíveis</label>
                 <div className="space-y-6">
                   {PERMISSION_GROUPS.map(group => (
                     <div key={group.name} className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                       <h5 className="font-bold text-white mb-3 text-sm">{group.name}</h5>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {group.keys.map(permKey => {
                           const isSelected = formData.permissions?.includes(permKey);
                           return (
                             <div 
                               key={permKey} 
                               onClick={() => togglePermission(permKey)} 
                               className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${isSelected ? 'bg-primary-500/10 border-primary-500/30' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                             >
                               <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary-500 border-primary-500' : 'border-gray-500'}`}>
                                 {isSelected && <CheckCircle size={14} className="text-white" />}
                               </div>
                               <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>{permKey}</span>
                             </div>
                           );
                         })}
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

               <div className="pt-4 flex gap-3 sticky bottom-0 bg-zinc-900 border-t border-white/10 p-4 -mx-6 -mb-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl border border-white/10 text-gray-400 font-bold hover:bg-white/5 transition-all">Cancelar</button>
                  <SaveButton onClick={handleSave} className="flex-1 px-6 py-3 rounded-xl bg-primary-500 text-white font-bold shadow-lg shadow-primary-500/20 flex justify-center">
                    Salvar Permissões
                  </SaveButton>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
