import React, { useState } from 'react';
import { Settings, LogOut, Image as ImageIcon, Volume2, Crown } from 'lucide-react';
import { useCRM } from '@crm/contexts/CRMContext';
import { useUI } from '@/contexts/UIContext';
import { useAuth } from '@auth/contexts/AuthContext';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { SaveButton } from '@/shared/components/SaveButton';

export default function SettingsView() {
  const { themeColor, setThemeColor } = useUI();
  const {
    churnRiskDays,
    setChurnRiskDays,
    effectiveOrgId,
  } = useCRM();

  const { userProfile, user } = useAuth();
  
  const [wallpaperUrl, setWallpaperUrl] = useState(userProfile?.wallpaperUrl || '');
  const [soundTheme, setSoundTheme] = useState(userProfile?.soundTheme || 'none');
  const [avatarFrame, setAvatarFrame] = useState(userProfile?.avatarFrame || 'none');
  
  const savePersonalSettings = async () => {
    if (!user) return;
    await setDoc(doc(db, 'profiles', user.uid), {
      wallpaperUrl,
      soundTheme,
      avatarFrame
    }, { merge: true });
  };

  const colorThemes = [
    { id: 'orange', name: 'Laranja', color: 'bg-[#f97316]' },
    { id: 'blue', name: 'Azul', color: 'bg-[#3b82f6]' },
    { id: 'green', name: 'Verde', color: 'bg-[#22c55e]' },
    { id: 'purple', name: 'Roxo', color: 'bg-[#a855f7]' },
    { id: 'rose', name: 'Rosa', color: 'bg-[#f43f5e]' },
  ];

  const aestheticThemes = [
    { id: 'cyberpunk', name: 'Cyberpunk', color: 'bg-[#00f3ff]' },
    { id: 'minimalist', name: 'Minimalista', color: 'bg-[#111827]' },
    { id: 'forest', name: 'Forest', color: 'bg-[#10b981]' },
    { id: 'nordic', name: 'Nordic', color: 'bg-[#38bdf8]' },
    { id: 'midnight', name: 'Midnight', color: 'bg-[#8b5cf6]' },
    { id: 'barbie', name: 'Barbie', color: 'bg-[#f472b6]' },
    { id: 'branco-elite', name: 'Branco Elite', color: 'bg-[#ffffff] border border-gray-300' },
    { id: 'prata-platinum', name: 'Prata Platinum', color: 'bg-[#cbd5e1]' },
    { id: 'preto-absoluto', name: 'Preto Absoluto', color: 'bg-[#000000]' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Configurações</h2>

        {/* --- Personalização do Perfil (Privado do Usuário) --- */}
        <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <ImageIcon className="mr-2 text-cyan-400" size={20} />
            Meu Hub (Personalização)
          </h3>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Crown size={16}/> Moldura do Avatar
                </label>
                <select
                  value={avatarFrame}
                  onChange={e => setAvatarFrame(e.target.value as any)}
                  className="w-full bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                >
                  <option value="none">Nenhuma</option>
                  {Array.from(new Set(['none', ...(userProfile?.unlockedFrames || []), userProfile?.avatarFrame].filter(Boolean))).map(frameKey => {
                    const frameNames: Record<string, string> = {
                      none: 'Nenhuma',
                      neon: 'Neon Purple (Loja)',
                      gold: 'Gold Premium (Loja)',
                      cyberpunk: 'Cyberpunk Cyan (Loja)',
                      floral: 'Eco Floral (Loja)',
                      ruby: 'Ruby Red (Loja)',
                      ocean: 'Ocean Blue (Loja)',
                      dark: 'Dark Minimalist (Loja)',
                      rainbow: 'Rainbow Glow (Loja)',
                      silver: 'Silver Platinum (Loja)'
                    };
                    if (frameKey === 'none') return null;
                    return (
                      <option key={frameKey} value={frameKey}>
                        {frameNames[frameKey] || frameKey}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-white/10">
              <SaveButton
                onClick={savePersonalSettings}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold transition-all"
              >
                Salvar Meu Perfil
              </SaveButton>
            </div>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-8 shadow-lg mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
            <Settings className="mr-2 text-primary-500" size={20} />
            Aparência
          </h3>

          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-gray-900 dark:text-white font-medium mb-1">Risco de Cancelamento (Churn)</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Dias de atraso na fatura para alertar risco</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={churnRiskDays}
                  onChange={(e) => setChurnRiskDays(parseInt(e.target.value) || 15)}
                  className="w-20 px-3 py-2 bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-center"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">dias</span>
              </div>
            </div>

            <div className="h-px bg-gray-200 dark:bg-white/10 w-full"></div>

            <div>
              <h4 className="text-gray-900 dark:text-white font-medium mb-3">Cores de Destaque</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Escolha a cor principal do sistema</p>
              <div className="flex flex-wrap gap-3">
                {colorThemes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setThemeColor(t.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all ${themeColor === t.id ? 'border-primary-500 bg-primary-500/10' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${t.color}`}></div>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-gray-900 dark:text-white font-medium mb-3">Temas Estéticos</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Experiências visuais completas e imersivas</p>
              <div className="flex flex-wrap gap-3">
                {aestheticThemes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setThemeColor(t.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all ${themeColor === t.id ? 'border-primary-500 bg-primary-500/10' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${t.color}`}></div>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <SaveButton
                onClick={async () => {
                  if (!effectiveOrgId) return;
                  await setDoc(doc(db, 'organizations', effectiveOrgId, 'settings', 'preferences'), { churnRiskDays }, { merge: true });
                }}
                className="px-6 py-2 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-all"
              >
                Salvar Aparência
              </SaveButton>
            </div>
          </div>
        </div>

        <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 shadow-lg mb-8">
          <h3 className="text-lg font-semibold text-red-500 mb-6 flex items-center">
            <LogOut className="mr-2" size={20} />
            Conta
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 dark:text-white font-medium">Sair do Sistema</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Encerre sua sessão atual com segurança</p>
            </div>
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl transition-all font-bold shadow-lg shadow-red-500/20 active:scale-95"
            >
              <LogOut size={18} />
              Sair da Conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
