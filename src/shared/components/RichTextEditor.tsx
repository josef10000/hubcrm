import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { 
  Bold, Italic, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, Link2, 
  Maximize2, Minimize2 
} from 'lucide-react';
import { useDialog } from '@auth/contexts/DialogContext';
import { toast } from 'sonner';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface RichTextEditorHandle {
  getContent: () => string;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ value, onChange, placeholder }, ref) => {
  const { prompt } = useDialog();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Expor o conteúdo diretamente para evitar race conditions no salvamento
  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.innerHTML || ''
  }));

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

  return (
    <div className={`flex flex-col border border-gray-200 dark:border-white/10 rounded-2xl bg-white/5 backdrop-blur-xl overflow-hidden active-ring-primary-500 transition-all ${isFullScreen ? 'fixed inset-4 z-[100]' : 'relative'}`}>
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
          <ToolbarButton onClick={async () => {
            const url = await prompt({
              title: 'Inserir Link',
              message: 'Cole a URL do link:',
              placeholder: 'https://exemplo.com'
            });
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
        .prose ul { list-style-type: disc; padding-left: 1.5rem; }
        .prose ol { list-style-type: decimal; padding-left: 1.5rem; }
        .prose a { color: #3b82f6; text-decoration: underline; }
      `}} />
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;

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
