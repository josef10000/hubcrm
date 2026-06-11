import React, { useState, useRef } from 'react';
import { Upload, Trash2, Plus, Link as LinkIcon, Loader2, Palette, Type } from 'lucide-react';
import { Client, BrandAssets, BrandAssetLink } from '@/types';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { toast } from 'sonner';

interface BrandAssetsTabProps {
  client: Partial<Client>;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export default function BrandAssetsTab({ client, setFormData }: BrandAssetsTabProps) {
  const brandAssets: BrandAssets = client.brandAssets || {
    logoUrl: '',
    colors: [],
    typography: '',
    customCanvaLinks: []
  };

  const [uploading, setUploading] = useState(false);
  const [newColor, setNewColor] = useState('#6366f1');
  const [newColorText, setNewColorText] = useState('#6366f1');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateBrandAssets = (updatedFields: Partial<BrandAssets>) => {
    setFormData((prev: any) => ({
      ...prev,
      brandAssets: {
        ...brandAssets,
        ...updatedFields
      }
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem da logo deve ter no máximo 5MB');
      return;
    }

    setUploading(true);
    try {
      const secureUrl = await uploadToCloudinary(file);
      updateBrandAssets({ logoUrl: secureUrl });
      toast.success('Logo enviada com sucesso!');
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast.error(`Falha ao enviar a logo: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    updateBrandAssets({ logoUrl: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Logo removida.');
  };

  const handleAddColor = () => {
    const colorHex = newColorText.trim();
    const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(colorHex);

    if (!isValidHex) {
      toast.error('Por favor, digite um código HEX válido (ex: #FFFFFF ou #6366F1)');
      return;
    }

    const currentColors = brandAssets.colors || [];
    if (currentColors.includes(colorHex)) {
      toast.error('Esta cor já foi adicionada.');
      return;
    }

    updateBrandAssets({ colors: [...currentColors, colorHex] });
    toast.success('Cor adicionada!');
  };

  const handleRemoveColor = (colorToRemove: string) => {
    const currentColors = brandAssets.colors || [];
    updateBrandAssets({ colors: currentColors.filter(c => c !== colorToRemove) });
  };

  const handleAddCanvaLink = () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
      toast.error('Preencha o título e a URL do link.');
      return;
    }

    // Validação básica de URL
    if (!newLinkUrl.startsWith('http://') && !newLinkUrl.startsWith('https://')) {
      toast.error('A URL deve começar com http:// ou https://');
      return;
    }

    const currentLinks = brandAssets.customCanvaLinks || [];
    const newLink: BrandAssetLink = {
      title: newLinkLabel.trim(),
      url: newLinkUrl.trim()
    };

    updateBrandAssets({ customCanvaLinks: [...currentLinks, newLink] });
    setNewLinkLabel('');
    setNewLinkUrl('');
    toast.success('Link adicionado!');
  };

  const handleRemoveCanvaLink = (indexToRemove: number) => {
    const currentLinks = brandAssets.customCanvaLinks || [];
    updateBrandAssets({ customCanvaLinks: currentLinks.filter((_, index) => index !== indexToRemove) });
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Cofre da Marca (Brand Assets)</h3>
        <p className="text-xs text-gray-500">Configure os ativos visuais individuais que serão exibidos no portal deste cliente.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 dark:border-white/10 pt-6">
        
        {/* Lado Esquerdo: Logo, Tipografia e Cores */}
        <div className="space-y-6">
          
          {/* Sessão Logo */}
          <div className="p-4 bg-black/20 border border-white/5 rounded-2xl space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Upload size={16} className="text-primary-400" />
              Logo da Marca
            </h4>
            
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border border-gray-200 dark:border-white/10 bg-white/5 flex items-center justify-center overflow-hidden shrink-0 relative">
                {brandAssets.logoUrl ? (
                  <img src={brandAssets.logoUrl} alt="Logo do Cliente" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-[10px] text-gray-500 italic text-center p-2">Sem Logo</span>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-gray-900 dark:text-white text-xs font-bold rounded-xl transition-all"
                >
                  Fazer Upload da Logo
                </button>
                {brandAssets.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 justify-center"
                  >
                    <Trash2 size={12} />
                    Remover Logo
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-gray-500 leading-normal">Tamanho recomendado: formato PNG ou SVG transparente com fundo contrastante.</p>
          </div>

          {/* Sessão Paleta de Cores */}
          <div className="p-4 bg-black/20 border border-white/5 rounded-2xl space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Palette size={16} className="text-primary-400" />
              Paleta de Cores (HEX)
            </h4>

            {/* Input e Add de Cor */}
            <div className="flex gap-2 items-center">
              <div className="relative w-12 h-10 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                <input 
                  type="color" 
                  value={newColor} 
                  onChange={(e) => {
                    setNewColor(e.target.value);
                    setNewColorText(e.target.value.toUpperCase());
                  }} 
                  className="absolute inset-[-4px] w-[200%] h-[200%] cursor-pointer border-0" 
                />
              </div>
              <input 
                type="text" 
                value={newColorText} 
                onChange={(e) => {
                  setNewColorText(e.target.value);
                  setNewColor(e.target.value);
                }} 
                placeholder="#6366F1"
                maxLength={7}
                className="flex-1 px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-mono"
              />
              <button
                type="button"
                onClick={handleAddColor}
                className="p-2.5 bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white rounded-xl transition-all shrink-0"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Listagem de Cores */}
            <div className="flex flex-wrap gap-3">
              {brandAssets.colors?.map((color) => (
                <div 
                  key={color} 
                  className="flex items-center gap-1.5 bg-white/5 border border-white/10 pl-2 pr-1.5 py-1 rounded-xl shadow-sm"
                >
                  <span 
                    className="w-4 h-4 rounded-full border border-black/20 shadow-sm shrink-0" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">{color}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(color)}
                    className="p-1 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {(!brandAssets.colors || brandAssets.colors.length === 0) && (
                <p className="text-[11px] text-gray-500 italic py-1">Nenhuma cor adicionada à paleta.</p>
              )}
            </div>
          </div>

          {/* Sessão Tipografia */}
          <div className="p-4 bg-black/20 border border-white/5 rounded-2xl space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Type size={16} className="text-primary-400" />
              Tipografia Oficial
            </h4>
            <input 
              type="text" 
              value={brandAssets.typography || ''}
              onChange={(e) => updateBrandAssets({ typography: e.target.value })}
              placeholder="Ex: Inter, Montserrat, Outfit..."
              className="w-full px-4 py-2.5 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
            <p className="text-[10px] text-gray-500 leading-normal">Defina a fonte principal utilizada na identidade visual da marca do cliente.</p>
          </div>

        </div>

        {/* Lado Direito: Links do Canva Customizados */}
        <div className="space-y-4">
          <div className="p-4 bg-black/20 border border-white/5 rounded-2xl space-y-4 h-full flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                <LinkIcon size={16} className="text-primary-400" />
                Templates Customizados (Canva / Outros)
              </h4>

              {/* Form de Adicionar Link */}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Título do Template</label>
                  <input 
                    type="text" 
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="Ex: Identidade Visual / Post de Vendas"
                    className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Link do Documento / Template</label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://canva.com/design/..."
                      className="flex-1 px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddCanvaLink}
                      className="px-3 bg-primary-500 hover:bg-primary-600 text-gray-900 dark:text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Listagem de Links */}
            <div className="flex-1 overflow-y-auto max-h-[220px] custom-scrollbar border-t border-white/5 pt-3 space-y-2">
              {brandAssets.customCanvaLinks?.map((link, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{link.title}</p>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[10px] text-primary-400 hover:underline truncate block flex items-center gap-1 mt-0.5"
                    >
                      <LinkIcon size={10} />
                      {link.url}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCanvaLink(idx)}
                    className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {(!brandAssets.customCanvaLinks || brandAssets.customCanvaLinks.length === 0) && (
                <div className="text-center py-6 text-xs text-gray-500 italic">
                  Nenhum link ou template customizado adicionado para este cliente.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
