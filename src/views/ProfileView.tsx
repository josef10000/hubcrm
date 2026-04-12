import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, Mail, Phone, Instagram, Linkedin, 
  ChevronLeft, Edit3, Save, X, Briefcase, Info, 
  Shield, Globe, MapPin, Loader2, Camera, Cake, Calendar,
  Target, ChevronDown, CheckCircle2, Circle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { PDICategory } from '../types/people';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function ProfileView() {
  const { uid } = useParams();
  const { user, userProfile: currentUserProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [superior, setSuperior] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'pdi'>('info');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    displayName: '',
    jobTitle: '',
    bio: '',
    phoneNumber: '',
    instagram: '',
    linkedin: '',
    photoURL: '',
    birthDate: '',
    startDate: ''
  });

  const isOwnProfile = user?.uid === uid;
  const isAdmin = currentUserProfile?.role === 'Administrador';
  const canEdit = isOwnProfile || isAdmin;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!uid) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'profiles', uid);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setProfile(data);
          setFormData({
            displayName: data.displayName || '',
            jobTitle: data.jobTitle || '',
            bio: data.bio || '',
            phoneNumber: data.phoneNumber || '',
            instagram: data.instagram || '',
            linkedin: data.linkedin || '',
            photoURL: data.photoURL || '',
            birthDate: data.birthDate || '',
            startDate: data.startDate || ''
          });

          // Buscar superior
          if (data.reportsTo) {
            const superiorRef = doc(db, 'profiles', data.reportsTo);
            const superiorSnap = await getDoc(superiorRef);
            if (superiorSnap.exists()) {
              setSuperior(superiorSnap.data() as UserProfile);
            }
          } else {
            setSuperior(null);
          }
        } else {
          toast.error('Perfil não encontrado');
          navigate('/team');
        }
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid, navigate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, photoURL: base64String }));
        toast.success('Foto carregada! Clique em "Salvar Alterações" para confirmar.');
        setUploading(false);
      };
      
      reader.onerror = () => {
        toast.error('Erro ao processar a imagem');
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error(`Erro ao processar imagem: ${error.message}`);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/team/update-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          targetUid: uid,
          profileData: formData
        })
      });

      if (!res.ok) throw new Error('Erro ao salvar perfil');
      
      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);
      if (isOwnProfile) refreshProfile();
      
      // Atualizar estado local
      setProfile(prev => prev ? { ...prev, ...formData } : null);
    } catch (error) {
      toast.error('Erro ao salvar alterações');
    } finally {
      setIsSaving(true); // Manter coerência com o original que setava true no finally também (bug original?)
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center justify-between p-2">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-primary-500 transition-colors bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10"
          >
            <ChevronLeft size={18} className="mr-1" />
            Voltar
          </button>
          
          {canEdit && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Edit3 size={18} />
              Editar Perfil
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Avatar & Basic Info */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-100 dark:bg-white/5 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-xl text-center relative overflow-hidden"
            >
              {/* Profile Image */}
              <div className="relative inline-block mb-6">
                <div className="w-40 h-40 rounded-full border-4 border-primary-500/20 p-1 bg-white/5 backdrop-blur-xl relative">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-white/5 flex items-center justify-center text-5xl font-bold font-display text-gray-900 dark:text-white">
                    {formData.photoURL ? (
                      <img src={formData.photoURL} alt={formData.displayName} className="w-full h-full object-cover" />
                    ) : (
                      formData.displayName?.[0] || <UserIcon />
                    )}
                  </div>
                  {isEditing && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute bottom-0 right-0 p-3 rounded-full bg-primary-500 text-white shadow-xl hover:bg-primary-600 transition-all active:scale-90"
                    >
                      {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
                    </button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>

              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{profile.displayName}</h2>
              <p className="text-sm font-bold text-primary-500 uppercase tracking-widest mb-4">{profile.jobTitle || profile.role}</p>
              
              <div className="flex items-center justify-center space-x-3 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                {profile.instagram && (
                  <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-2xl hover:bg-gradient-to-br from-purple-500 to-pink-500 text-gray-400 hover:text-white transition-all">
                    <Instagram size={20} />
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-2xl hover:bg-[#0077b5] text-gray-400 hover:text-white transition-all">
                    <Linkedin size={20} />
                  </a>
                )}
              </div>
            </motion.div>

            {/* Superior Imediato */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary-500/5 backdrop-blur-xl border border-primary-500/10 rounded-3xl p-6"
            >
              <h3 className="text-sm font-bold text-primary-500 uppercase tracking-widest mb-4 flex items-center">
                <Shield className="mr-2" size={16} />
                Superior Imediato
              </h3>
              {superior ? (
                <div 
                  onClick={() => navigate(`/profile/${superior.uid}`)}
                  className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-primary-500/30 cursor-pointer transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white overflow-hidden">
                    {superior.photoURL ? <img src={superior.photoURL} alt={superior.displayName} className="w-full h-full object-cover" /> : superior.displayName?.[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">{superior.displayName}</p>
                    <p className="text-[10px] text-gray-500">{superior.jobTitle || superior.role}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Não vinculado.</p>
              )}
            </motion.div>
          </div>

          {/* Right Column: Tabbed Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
              {/* Tabs */}
              <div className="flex gap-4 mb-8">
                <button 
                  onClick={() => setActiveTab('info')}
                  className={`px-6 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'info' ? 'bg-primary-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}
                >
                  Informações
                </button>
                <button 
                  onClick={() => setActiveTab('pdi')}
                  className={`px-6 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'pdi' ? 'bg-primary-500 text-white shadow-lg' : 'bg-white/5 text-gray-500'}`}
                >
                  Meu PDI
                </button>
              </div>

              {activeTab === 'info' && (
                <div className="animate-in fade-in duration-500">
                  {isEditing ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Nome Completo</label>
                          <input 
                            type="text" 
                            value={formData.displayName}
                            onChange={e => setFormData({...formData, displayName: e.target.value})}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Cargo / Título</label>
                          <input 
                            type="text" 
                            value={formData.jobTitle}
                            onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                            placeholder="Ex: Consultor de Vendas"
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Sobre Mim (Bio)</label>
                        <textarea 
                          value={formData.bio}
                          onChange={e => setFormData({...formData, bio: e.target.value})}
                          className="w-full h-32 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                          placeholder="Fale um pouco sobre você..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Data de Nascimento (Opcional)</label>
                          <input 
                            type="date" 
                            value={formData.birthDate}
                            onChange={e => setFormData({...formData, birthDate: e.target.value})}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Data de Contratação</label>
                          <input 
                            type="date" 
                            value={formData.startDate}
                            onChange={e => setFormData({...formData, startDate: e.target.value})}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Instagram (@usuario)</label>
                          <input 
                            type="text" 
                            value={formData.instagram}
                            onChange={e => setFormData({...formData, instagram: e.target.value})}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">LinkedIn (URL)</label>
                          <input 
                            type="text" 
                            value={formData.linkedin}
                            onChange={e => setFormData({...formData, linkedin: e.target.value})}
                            className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-4">
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-3 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-500 transition-all font-medium"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleSave}
                          disabled={isSaving}
                          className="px-8 py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-xl shadow-primary-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          <span>Salvar Alterações</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center">
                          <Info className="mr-2" size={16} />
                          Sobre o Colaborador
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {profile.bio || "Este colaborador ainda não preencheu sua biografia."}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center">
                            <MapPin className="mr-2" size={16} />
                            Informações Gerais
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Briefcase size={16} className="mr-3 opacity-50" />
                              <span>{profile.jobTitle || profile.role}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Globe size={16} className="mr-3 opacity-50" />
                              <span>Membro desde {new Date(profile.createdAt).toLocaleDateString()}</span>
                            </div>
                            {profile.birthDate && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Cake size={16} className="mr-3 opacity-50" />
                                <span>Aniversário em: {new Date(profile.birthDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                              </div>
                            )}
                            {profile.startDate && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Calendar size={16} className="mr-3 opacity-50" />
                                <span>Contratado em: {new Date(profile.startDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center">
                            <Mail className="mr-2" size={16} />
                            Contatos
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Mail size={16} className="mr-3 opacity-50" />
                              <span className="truncate">{profile.email}</span>
                            </div>
                            {profile.phoneNumber && (
                              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                <Phone size={16} className="mr-3 opacity-50" />
                                <span>{profile.phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pdi' && (
                <div className="animate-in slide-in-from-right duration-500">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                      <Target size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold">Meu Plano de Desenvolvimento</h4>
                      <p className="text-xs text-gray-500">Trilha de carreira e objetivos definidos pelo gestor.</p>
                    </div>
                  </div>

                  {(profile.pdiCategories || []).length > 0 ? (
                    <div className="space-y-6">
                      {profile.pdiCategories!.map(cat => (
                        <div key={cat.id} className="bg-white/30 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-3xl p-6">
                          <h5 className="font-bold text-sm mb-4 flex items-center gap-2 text-indigo-500">
                            <ChevronDown size={18} /> {cat.title}
                          </h5>
                          <div className="grid grid-cols-1 gap-2">
                             {cat.actions.map(action => (
                               <div key={action.id} className="flex items-center gap-3 p-4 bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-white/10 rounded-2xl">
                                  <div className={`shrink-0 ${action.completed ? 'text-indigo-500' : 'text-gray-300'}`}>
                                    {action.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                                  </div>
                                  <div className="flex-1">
                                    <p className={`text-sm ${action.completed ? 'line-through text-gray-400' : 'font-medium'}`}>
                                      {action.description}
                                    </p>
                                    {action.completedAt && (
                                      <p className="text-[10px] text-gray-400 mt-0.5">Validado em: {format(action.completedAt, 'dd/MM/yyyy')}</p>
                                    )}
                                  </div>
                               </div>
                             ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white/5 rounded-[2rem] border-2 border-dashed border-white/5">
                      <Target size={40} className="mx-auto text-gray-300 mb-4 opacity-20" />
                      <p className="text-gray-500 text-sm">Seu PDI ainda não foi iniciado pelo gestor.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
