import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rocket, 
  Palette, 
  LayoutGrid, 
  MessageSquareCode, 
  Play, 
  Download, 
  Copy, 
  Check, 
  Link as LinkIcon, 
  Video, 
  ExternalLink,
  ChevronRight,
  Type
} from 'lucide-react';
import { Client, GrowthAsset, BrandAssets, BrandAssetLink } from '@/types';
import { toast } from 'sonner';

interface PortalGrowthHubProps {
  client: Client;
  growthAssets: GrowthAsset[];
}

type TabType = 'brand' | 'templates' | 'scripts' | 'videos';

export default function PortalGrowthHub({ client, growthAssets = [] }: PortalGrowthHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<TabType>('brand');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const brandAssets: BrandAssets = client.brandAssets || {
    logoUrl: '',
    colors: [],
    typography: '',
    customCanvaLinks: []
  };

  // 1. Filtragens de Ativos
  // Templates: Links específicos do cliente + Ativos globais do tipo 'template'
  const customTemplates = brandAssets.customCanvaLinks || [];
  const globalTemplates = growthAssets.filter(a => a.type === 'template');
  const allTemplates = [
    ...customTemplates.map(t => ({ title: t.title, url: t.url, isCustom: true })),
    ...globalTemplates.map(t => ({ title: t.title, url: t.url, isCustom: false }))
  ];

  // Scripts de Vendas
  const salesScripts = growthAssets.filter(a => a.type === 'script');

  // Vídeos
  const videoTrainings = growthAssets.filter(a => a.type === 'video');

  // Helper para copiar HEX
  const handleCopyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    toast.success('HEX copiado!', { description: `A cor ${hex} foi copiada para sua área de transferência.` });
    setTimeout(() => setCopiedColor(null), 2000);
  };

  // Helper para copiar texto
  const handleCopyText = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Script copiado!', { description: `O script "${title}" está pronto para envio.` });
  };

  // Extrair ID do YouTube
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const tabs = [
    { id: 'brand', label: 'Cofre da Marca', icon: Palette },
    { id: 'templates', label: 'Templates Rápidos', icon: LayoutGrid },
    { id: 'scripts', label: 'Arsenal de Vendas', icon: MessageSquareCode },
    { id: 'videos', label: 'Treinamentos', icon: Play },
  ] as const;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header da Tela */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-xl">
              <Rocket className="text-primary-400 w-6 h-6" />
            </div>
            Hub de Crescimento
          </h3>
          <p className="text-gray-500 text-sm mt-1">Acesse sua identidade visual, scripts de vendas e treinamentos exclusivos.</p>
        </div>
      </div>

      {/* Navegação por Sub-abas */}
      <div className="flex bg-white/[0.03] backdrop-blur-md p-1.5 rounded-2xl border border-white/5 overflow-x-auto scrollbar-hide max-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Renderizador de Abas com Framer Motion */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          
          {/* Aba: Cofre da Marca */}
          {activeSubTab === 'brand' && (
            <motion.div
              key="brand"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Logo Card */}
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between items-center text-center">
                <div className="w-full">
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 text-left mb-6">Logo Oficial</h4>
                  <div className="w-full aspect-square max-w-[200px] mx-auto bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden p-4 relative group">
                    {brandAssets.logoUrl ? (
                      <img src={brandAssets.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-gray-600 italic">Nenhuma logo enviada</span>
                    )}
                  </div>
                </div>
                {brandAssets.logoUrl && (
                  <a
                    href={brandAssets.logoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all mt-6"
                  >
                    <Download size={14} />
                    Download / Visualizar
                  </a>
                )}
              </div>

              {/* Cores Card */}
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6">Paleta de Cores</h4>
                  <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                    {brandAssets.colors?.map((color) => (
                      <div 
                        key={color} 
                        className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/[0.08] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-8 h-8 rounded-full border border-black/40 shadow-sm shrink-0" 
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs font-mono font-bold text-gray-300">{color}</span>
                        </div>
                        <button
                          onClick={() => handleCopyColor(color)}
                          className="p-2 hover:bg-primary-500/10 text-gray-400 hover:text-primary-400 rounded-xl transition-all shrink-0"
                          title="Copiar código HEX"
                        >
                          {copiedColor === color ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    ))}
                    {(!brandAssets.colors || brandAssets.colors.length === 0) && (
                      <div className="text-center py-10 text-xs text-gray-600 italic">
                        Nenhuma cor de paleta definida.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tipografia & Informações */}
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 font-bold">Tipografia Oficial</h4>
                  
                  <div className="bg-black/30 border border-white/5 p-6 rounded-2xl flex flex-col justify-center min-h-[120px] mb-6">
                    <span className="text-[10px] text-gray-500 uppercase font-black block mb-2">Fonte Primária</span>
                    <span 
                      className="text-2xl font-bold text-white truncate"
                      style={brandAssets.typography ? { fontFamily: `'${brandAssets.typography}', sans-serif` } : {}}
                    >
                      {brandAssets.typography || 'Não especificada'}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Estas informações de marca ajudam o time de design e desenvolvimento a manter o branding da sua empresa unificado e consistente em toda a web.
                  </p>
                </div>

                {(!brandAssets.logoUrl && (!brandAssets.colors || brandAssets.colors.length === 0) && !brandAssets.typography) && (
                  <div className="bg-primary-500/5 border border-primary-500/10 rounded-2xl p-4 mt-6">
                    <p className="text-[11px] text-primary-400 leading-relaxed italic">
                      ℹ️ Sua identidade visual está sendo processada por nossa equipe. Em breve seu Cofre da Marca estará completo!
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Aba: Templates Rápidos */}
          {activeSubTab === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {allTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allTemplates.map((template, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.01 }}
                      className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col justify-between gap-4 group transition-all hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${template.isCustom ? 'bg-primary-500/10 text-primary-400' : 'bg-blue-500/10 text-blue-400'}`}>
                            <LayoutGrid size={22} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-bold truncate pr-2" title={template.title}>{template.title}</p>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                              {template.isCustom ? 'Template da sua Marca' : 'Material Global'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <a
                        href={template.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-white/5 hover:bg-primary-500 hover:text-white border border-white/5 rounded-2xl text-xs font-bold text-gray-300 transition-all flex items-center justify-center gap-1.5"
                      >
                        Acessar Template
                        <ExternalLink size={12} />
                      </a>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-20 rounded-[3rem] flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 text-gray-600">
                    <LayoutGrid size={28} />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">Sem Templates Disponíveis</h4>
                  <p className="text-gray-500 max-w-sm text-xs leading-relaxed">
                    Nenhum template ou link do Canva foi disponibilizado no momento. Quando nossa equipe criar templates de postagens ou artes para sua empresa, eles aparecerão aqui.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Aba: Arsenal de Vendas (Scripts) */}
          {activeSubTab === 'scripts' && (
            <motion.div
              key="scripts"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {salesScripts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {salesScripts.map((script) => (
                    <div 
                      key={script.id}
                      className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col gap-4 justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-white text-base truncate pr-3">{script.title}</h4>
                          {script.category && (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md bg-white/5 border border-white/5 text-gray-400 shrink-0">
                              {script.category}
                            </span>
                          )}
                        </div>
                        
                        <div className="bg-black/30 border border-white/5 p-4 rounded-2xl text-xs text-gray-400 font-mono whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto custom-scrollbar">
                          {script.content}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopyText(script.content || '', script.title)}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all border border-white/5 flex items-center justify-center gap-1.5"
                      >
                        <Copy size={12} />
                        Copiar Script
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-20 rounded-[3rem] flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 text-gray-600">
                    <MessageSquareCode size={28} />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">Nenhum Script Cadastrado</h4>
                  <p className="text-gray-500 max-w-sm text-xs leading-relaxed">
                    Não existem scripts de vendas cadastrados na sua organização. Eles servem como copys padrão e roteiros comerciais prontos para copiar.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Aba: Treinamentos */}
          {activeSubTab === 'videos' && (
            <motion.div
              key="videos"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {videoTrainings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {videoTrainings.map((video) => {
                    const ytId = getYouTubeId(video.url || '');
                    return (
                      <div 
                        key={video.id}
                        className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden flex flex-col justify-between group hover:border-white/20 transition-all"
                      >
                        {ytId ? (
                          <div className="w-full aspect-video bg-black/60 relative">
                            <iframe 
                              src={`https://www.youtube.com/embed/${ytId}`}
                              className="w-full h-full border-0"
                              title={video.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="w-full aspect-video bg-black/40 flex flex-col items-center justify-center text-center p-6 border-b border-white/5">
                            <Video className="w-12 h-12 text-gray-600 mb-3" />
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Vídeo Externo</span>
                          </div>
                        )}

                        <div className="p-6 space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              {video.category && (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md bg-primary-500/10 text-primary-400 border border-primary-500/10 shrink-0">
                                  {video.category}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-white text-base line-clamp-1 group-hover:text-primary-400 transition-colors" title={video.title}>
                              {video.title}
                            </h4>
                          </div>

                          {!ytId && video.url && (
                            <a
                              href={video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-3 bg-primary-500 text-white hover:bg-primary-600 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary-500/20"
                            >
                              Assistir Vídeo
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-20 rounded-[3rem] flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 text-gray-600">
                    <Play size={28} />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">Sem Treinamentos Disponíveis</h4>
                  <p className="text-gray-500 max-w-sm text-xs leading-relaxed">
                    Nenhum vídeo de treinamento ou instrução comercial foi compartilhado no momento.
                  </p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
