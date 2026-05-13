import React from 'react';
import { useNexusStore } from '@store/useNexusStore';
import type { LinkFolder, PersonalLink } from '@store/useNexusStore';
import { toast } from 'sonner';

interface VaultTabProps {
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  setModalConfig: (config: any) => void;
  confirm: (options: any) => Promise<boolean>;
}

// Componente de Card Memoizado para links
const LinkCard = React.memo(({ 
  link, 
  onCopy, 
  onEdit, 
  onDelete, 
  getUrlIcon 
}: { 
  link: PersonalLink; 
  onCopy: (url: string, e: React.MouseEvent) => void;
  onEdit: (link: PersonalLink) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  getUrlIcon: (url: string) => string;
}) => (
  <div
    className="p-6 bg-[#0a0c12]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] hover:border-primary-500/50 group transition-all relative overflow-hidden shadow-xl"
  >
    <div className="absolute top-2 right-2 p-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
      <button onClick={(e) => onCopy(link.url, e)} className="p-1.5 bg-white/5 rounded-lg hover:bg-primary-500/20 hover:text-primary-400 transition-all" title="Copiar"><i className="ph-bold ph-copy text-sm" /></button>
      <button onClick={(e) => { e.stopPropagation(); onEdit(link); }} className="p-1.5 bg-white/5 rounded-lg hover:bg-primary-500/20 hover:text-primary-400 transition-all"><i className="ph-bold ph-pencil-simple text-sm" /></button>
      <button onClick={(e) => onDelete(link.id, e)} className="p-1.5 bg-white/5 rounded-lg hover:bg-rose-500/20 hover:text-rose-400 transition-all"><i className="ph-bold ph-trash text-sm" /></button>
    </div>
    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-5 relative z-10 pr-32">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-lg group-hover:shadow-primary-500/20">
        <i className={`ph-duotone ${link.icon || getUrlIcon(link.url)} text-primary-400`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-white group-hover:text-primary-400 transition-colors leading-tight">{link.label}</h4>
        <p className="text-[10px] text-gray-500 font-mono mt-1 break-all">{link.url}</p>
      </div>
    </a>
  </div>
));

export const VaultTab: React.FC<VaultTabProps> = ({ 
  selectedFolderId, 
  setSelectedFolderId, 
  setModalConfig,
  confirm
}) => {
  const folders = useNexusStore(state => state.folders);
  const links = useNexusStore(state => state.links);
  const setFolders = useNexusStore(state => state.setFolders);
  const setLinks = useNexusStore(state => state.setLinks);

  const getUrlIcon = React.useCallback((url: string) => {
    const u = url.toLowerCase();
    if (u.includes('google')) return 'ph-google-logo';
    if (u.includes('figma')) return 'ph-figma-logo';
    if (u.includes('whatsapp')) return 'ph-whatsapp-logo';
    if (u.includes('github')) return 'ph-github-logo';
    if (u.includes('slack')) return 'ph-slack-logo';
    if (u.includes('notion')) return 'ph-notepad';
    if (u.includes('trello')) return 'ph-trello-logo';
    if (u.includes('facebook')) return 'ph-facebook-logo';
    if (u.includes('instagram')) return 'ph-instagram-logo';
    if (u.includes('linkedin')) return 'ph-linkedin-logo';
    if (u.includes('youtube')) return 'ph-youtube-logo';
    if (u.includes('spotify')) return 'ph-spotify-logo';
    if (u.includes('drive.google')) return 'ph-hard-drive';
    if (u.includes('meet.google')) return 'ph-video-camera';
    if (u.includes('zoom')) return 'ph-video-camera';
    return 'ph-link';
  }, []);

  const copyToClipboard = React.useCallback((text: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success('Link copiado para a área de transferência!');
  }, []);

  const handleDeleteFolder = React.useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: 'Excluir Pasta',
      message: 'Deseja excluir esta pasta? Os links dentro dela não serão apagados, mas ficarão sem categoria.',
      variant: 'danger',
      confirmText: 'Excluir'
    });
    if (ok) {
      setFolders(folders.filter(f => f.id !== id));
      if (selectedFolderId === id) setSelectedFolderId(null);
      toast.success('Pasta removida');
    }
  }, [folders, setFolders, selectedFolderId, setSelectedFolderId, confirm]);

  const handleDeleteLink = React.useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = await confirm({
      title: 'Excluir Link',
      message: 'Deseja remover este atalho do seu cofre?',
      variant: 'danger',
      confirmText: 'Excluir'
    });
    if (ok) {
      setLinks(links.filter(l => l.id !== id));
      toast.success('Link removido');
    }
  }, [links, setLinks, confirm]);

  const filteredLinks = React.useMemo(() => (
    selectedFolderId 
      ? links.filter(l => l.folderId === selectedFolderId)
      : links
  ), [links, selectedFolderId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* LISTA DE PASTAS */}
      <div className="lg:col-span-1 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Categorias</h3>
          {selectedFolderId && (
            <button 
              onClick={() => setSelectedFolderId(null)}
              className="text-[10px] font-black uppercase tracking-widest text-primary-400 hover:text-white"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="space-y-3">
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all group border ${
                selectedFolderId === folder.id 
                ? 'bg-primary-500/20 border-primary-500/40 text-white' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl bg-primary-500/20 flex items-center justify-center text-primary-400 border border-primary-500/30 group-hover:scale-110 transition-transform`}>
                  <i className={`ph-duotone ${folder.icon} text-xl`} />
                </div>
                <span className="font-bold group-hover:translate-x-1 transition-transform">{folder.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black opacity-40 mr-2">{links.filter(l => l.folderId === folder.id).length}</span>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setModalConfig({ isOpen: true, type: 'folder', mode: 'edit', data: folder }); }} className="p-1.5 hover:text-primary-400 transition-all"><i className="ph-bold ph-pencil-simple" /></button>
                  <button onClick={(e) => handleDeleteFolder(folder.id, e)} className="p-1.5 hover:text-rose-400 transition-all"><i className="ph-bold ph-trash" /></button>
                </div>
              </div>
            </button>
          ))}
          <button onClick={() => setModalConfig({ isOpen: true, type: 'folder', mode: 'add' })} className="w-full p-4 border border-dashed border-white/10 rounded-3xl text-gray-500 hover:text-white hover:border-primary-500/50 transition-all font-bold text-sm flex items-center justify-center gap-2">
            <i className="ph-bold ph-plus" /> Nova Pasta
          </button>
        </div>
      </div>

      {/* GRID DE LINKS */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">
            {selectedFolderId ? `Links em ${folders.find(f => f.id === selectedFolderId)?.label}` : 'Todos os Recursos'}
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{filteredLinks.length} Itens</span>
        </div>
        <div className="flex flex-col gap-4">
          {filteredLinks.map(link => (
            <LinkCard 
              key={link.id}
              link={link}
              onCopy={copyToClipboard}
              onEdit={(l) => setModalConfig({ isOpen: true, type: 'link', mode: 'edit', data: l })}
              onDelete={handleDeleteLink}
              getUrlIcon={getUrlIcon}
            />
          ))}
          <button onClick={() => setModalConfig({ isOpen: true, type: 'link', mode: 'add' })} className="p-6 border border-dashed border-white/10 rounded-[2rem] flex items-center justify-center gap-3 text-gray-500 hover:text-primary-400 hover:border-primary-500/50 transition-all group min-h-[80px]">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg group-hover:rotate-90 transition-transform"><i className="ph-bold ph-plus" /></div>
            <span className="text-xs font-black uppercase tracking-widest">Adicionar Link</span>
          </button>
        </div>
      </div>
    </div>
  );
};
