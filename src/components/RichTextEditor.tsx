import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, Italic, List, ListOrdered, Image as ImageIcon, 
  Type, AlignLeft, AlignCenter, AlignRight, Link2, 
  ChevronDown, Maximize2, Minimize2 
} from 'lucide-react';
import { uploadImageToImgBB } from '../lib/imgbb';
import { toast } from 'sonner';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  const executeCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Salvar a posição atual do cursor antes de abrir o seletor de arquivos
    const selection = window.getSelection();
    let range: Range | null = null;
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }

    setIsUploading(true);
    try {
      const url = await uploadImageToImgBB(file);
      
      if (editorRef.current) {
        editorRef.current.focus();
        
        // Criar o elemento de imagem
        const img = document.createElement('img');
        img.src = url;
        img.alt = "Imagem do artigo";
        img.style.maxWidth = '100%';
        img.style.borderRadius = '1rem';
        img.style.margin = '1rem 0';
        img.style.display = 'block';

        // Tentar inserir na posição salva do cursor
        if (range && selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          range.deleteContents();
          range.insertNode(img);
          
          // Mover o cursor para depois da imagem
          range.setStartAfter(img);
          range.setEndAfter(img);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // Fallback: Adiciona ao final se perder a posição
          editorRef.current.appendChild(img);
          editorRef.current.appendChild(document.createElement('br'));
        }

        // Sincronizar o estado
        onChange(editorRef.current.innerHTML);
      }
      
      toast.success('Imagem carregada!');
    } catch (err) {
      console.error("[RichTextEditor] Upload/Insert Error:", err);
      toast.error('Erro ao carregar imagem.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className={`flex flex-col border border-gray-200 dark:border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl overflow-hidden active-ring-primary-500 transition-all ${isFullScreen ? 'fixed inset-4 z-[100]' : 'relative'}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
        <div className="flex items-center gap-1 pr-2 border-r border-gray-200 dark:border-white/10">
          <ToolbarButton onClick={() => executeCommand('bold')} icon={Bold} title="Negrito (Ctrl+B)" />
          <ToolbarButton onClick={() => executeCommand('italic')} icon={Italic} title="Itálico (Ctrl+I)" />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-white/10">
          <ToolbarButton onClick={() => executeCommand('insertUnorderedList')} icon={List} title="Lista Bullet" />
          <ToolbarButton onClick={() => executeCommand('insertOrderedList')} icon={ListOrdered} title="Lista Numerada" />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-white/10">
          <ToolbarButton onClick={() => executeCommand('justifyLeft')} icon={AlignLeft} title="Alinhar Esquerda" />
          <ToolbarButton onClick={() => executeCommand('justifyCenter')} icon={AlignCenter} title="Centralizar" />
          <ToolbarButton onClick={() => executeCommand('justifyRight')} icon={AlignRight} title="Alinhar Direita" />
        </div>

        <div className="flex items-center gap-1 px-2 border-r border-gray-200 dark:border-white/10">
            <label className="p-2 hover:bg-white/10 rounded-lg cursor-pointer transition-colors relative" title="Inserir Imagem">
                {isUploading ? (
                    <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent animate-spin rounded-full"></div>
                ) : (
                    <ImageIcon className="w-4 h-4 text-gray-400 hover:text-primary-500" />
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
            </label>
          <ToolbarButton onClick={() => {
            const url = prompt('Cole a URL do link:');
            if(url) executeCommand('createLink', url);
          }} icon={Link2} title="Inserir Link" />
        </div>

        <div className="flex-1"></div>

        <ToolbarButton 
          onClick={() => setIsFullScreen(!isFullScreen)} 
          icon={isFullScreen ? Minimize2 : Maximize2} 
          title={isFullScreen ? 'Sair da Tela Cheia' : 'Tela Cheia'} 
        />
      </div>

      {/* Editor Area */}
      <div className="relative flex-1 bg-white/5">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="w-full min-h-[300px] h-full p-6 outline-none text-gray-900 dark:text-gray-100 prose prose-invert max-w-none custom-scrollbar overflow-y-auto"
          style={{ 
            fontFamily: 'Inter, sans-serif',
            fontSize: '1rem',
            lineHeight: '1.6'
          }}
        />
        {!value && (
          <div className="absolute top-6 left-6 text-gray-500 pointer-events-none italic">
            {placeholder || 'Comece a escrever seu artigo...'}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        [contenteditable]:empty:before {
          content: attr(placeholder);
          color: #6b7280;
          font-style: italic;
        }
        .prose img {
          max-width: 100%;
          height: auto;
          display: block;
          border-radius: 1rem;
          margin: 1.5rem 0;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .prose ul { list-style-type: disc; padding-left: 1.5rem; }
        .prose ol { list-style-type: decimal; padding-left: 1.5rem; }
        .prose a { color: #3b82f6; text-decoration: underline; }
      `}} />
    </div>
  );
}

function ToolbarButton({ onClick, icon: Icon, title, active = false }: { onClick: () => void; icon: any; title: string; active?: boolean }) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); onClick(); }}
      className={`p-2 rounded-lg transition-all hover:bg-white/10 group ${active ? 'bg-primary-500/20 text-primary-500' : 'text-gray-400'}`}
      title={title}
    >
      <Icon className={`w-4 h-4 group-hover:scale-110 transition-transform ${active ? 'text-primary-500' : ''}`} />
    </button>
  );
}
