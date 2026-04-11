import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User as UserIcon, Mail, Phone, Instagram, Linkedin, 
  ChevronLeft, Edit3, Save, X, Briefcase, Info, 
  Shield, Globe, MapPin, Loader2, Camera
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfileView() {
  const { uid } = useParams();
  const { user, userProfile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [superior, setSuperior] = useState<UserProfile | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    displayName: '',
    jobTitle: '',
    bio: '',
    phoneNumber: '',
    instagram: '',
    linkedin: '',
    photoURL: ''
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
            photoURL: data.photoURL || ''
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

    // Validações básicas
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
        console.log('[Profile] Imagem convertida para Base64 com sucesso');
        toast.success('Foto carregada! Clique em "Salvar Alterações" para confirmar.');
        setUploading(false);
      };
      
      reader.onerror = () => {
        console.error('[Profile] Erro ao ler arquivo com FileReader');
        toast.error('Erro ao processar a imagem');
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('[Profile] Erro Crítico no processamento Base64:', error);
      toast.error(`Erro ao processar imagem: ${error.message}`);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    console.log('[Profile] Iniciando salvamento do perfil...');
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

      console.log('[Profile] Resposta da API status:', res.status);
      const data = await res.json();
      
      if (data.success) {
        toast.success('Perfil atualizado!');
        setProfile(prev => prev ? { ...prev, ...formData } : null);
        setIsEditing(false);
      } else {
        console.warn('[Profile] Erro retornado pela API:', data.error);
        toast.error(data.error || 'Erro ao salvar no servidor');
      }
    } catch (error: any) {
      console.error('[Profile] Erro na requisição handleSave:', error);
      toast.error(`Erro de conexão: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-4xl mx-auto">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
            <span>Voltar</span>
          </button>
          
          {canEdit && (
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all border ${
                isEditing 
                  ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                  : 'bg-white/5 border-white/10 text-gray-900 dark:text-white hover:bg-white/10'
              }`}
            >
              {isEditing ? (
                <>
                  <X size={18} />
                  <span>Cancelar Edição</span>
                </>
              ) : (
                <>
                  <Edit3 size={18} />
                  <span>Editar Perfil</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Avatar & Summary */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-100 dark:bg-black/40 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 text-center shadow-xl"
            >
              <div className="relative inline-block mb-4">
                <div className="relative w-32 h-32 rounded-full mx-auto bg-gradient-to-br from-primary-500 to-primary-400 p-1 shadow-2xl shadow-primary-500/20 overflow-hidden group">
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt={profile.displayName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-900 dark:bg-black flex items-center justify-center text-3xl font-bold text-white uppercase">
                      {profile.displayName?.[0] || 'U'}
                    </div>
                  )}

                  {/* Upload Overlay */}
                  <AnimatePresence>
                    {uploading && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-full"
                      >
                        <Loader2 className="animate-spin text-white" size={24} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {isEditing && (
                  <>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute bottom-1 right-1 bg-white dark:bg-zinc-800 p-2 rounded-full shadow-lg border border-gray-200 dark:border-white/10 text-primary-500 hover:scale-110 transition-transform active:scale-95 disabled:opacity-50"
                    >
                      <Camera size={16} />
                    </button>
                  </>
                )}
              </div>
              
              <h1 className="text-xl font-bold text-gray-900 dark:text-white capitalize line-clamp-1">{profile.displayName}</h1>
              <p className="text-primary-500 font-medium text-sm mb-4">{profile.jobTitle || profile.role}</p>
              
              <div className="flex items-center justify-center space-x-3">
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-all">
                    <Linkedin size={18} />
                  </a>
                )}
                {profile.instagram && (
                  <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-all">
                    <Instagram size={18} />
                  </a>
                )}
                {profile.email && (
                  <a href={`mailto:${profile.email}`} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-all">
                    <Mail size={18} />
                  </a>
                )}
              </div>
            </motion.div>

            {/* Manager Info */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
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
                    {superior.photoURL ? <img src={superior.photoURL} alt={superior.displayName} /> : superior.displayName?.[0]}
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

          {/* Right Column: Details & Edit Form */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-100 dark:bg-white/5 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <UserIcon size={120} />
              </div>

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
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
