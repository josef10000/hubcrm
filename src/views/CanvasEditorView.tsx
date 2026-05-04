import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { canvasService, CanvasDocument } from '../services/canvasService';
import { ArrowLeft, MonitorPlay, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Verifica se um objeto JSON parseado é um snapshot tldraw válido.
 * O snapshot da tldraw v3 deve conter pelo menos a key 'store'.
 */
function isValidTldrawSnapshot(obj: unknown): obj is { store: Record<string, unknown> } {
  if (!obj || typeof obj !== 'object') return false;
  const snap = obj as Record<string, unknown>;
  // O snapshot deve ter a key 'store' que é um objeto não-vazio
  if (!snap.store || typeof snap.store !== 'object') return false;
  return Object.keys(snap.store).length > 0;
}

export default function CanvasEditorView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.uid || 'admin-1';
  
  const [canvas, setCanvas] = useState<CanvasDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Ref para manter o document atualizado sem depender de re-render do useCallback
  const canvasDocRef = useRef<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCanvas(id);
    }
  }, [id]);

  // Cleanup: garantir que o debounce é cancelado ao desmontar o componente
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Atualizar a ref sempre que o canvas mudar
  useEffect(() => {
    canvasDocRef.current = canvas?.document ?? null;
  }, [canvas?.document]);

  const loadCanvas = async (canvasId: string) => {
    try {
      const data = await canvasService.getCanvas(canvasId);
      if (data) {
        setCanvas(data);
      } else {
        toast.error('Quadro não encontrado.');
        navigate('/canvas');
      }
    } catch (error) {
      console.error('Error loading canvas:', error);
      toast.error('Erro ao carregar o quadro.');
    } finally {
      setLoading(false);
    }
  };

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
    
    // Carregar dados iniciais do snapshot salvo
    const docString = canvasDocRef.current;
    if (docString && docString !== '{}') {
      try {
        const parsed = JSON.parse(docString);
        
        if (isValidTldrawSnapshot(parsed)) {
          editor.store.loadSnapshot(parsed);
        } else {
          console.warn('Hub Canvas: snapshot salvo não é válido, iniciando canvas limpo.', parsed);
        }
      } catch (e) {
        console.error('Hub Canvas: erro ao restaurar snapshot:', e);
        toast.error('Não foi possível restaurar o conteúdo anterior do quadro.');
      }
    }

    // Listen for changes and auto-save
    editor.store.listen(
      () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        setSaving(true);
        saveTimeoutRef.current = setTimeout(async () => {
          try {
            const snapshot = editor.store.getSnapshot();
            const json = JSON.stringify(snapshot);
            
            if (id) {
              await canvasService.updateCanvas(id, { document: json });
            }
          } catch (error) {
            console.error('Error auto-saving canvas:', error);
            toast.error('Erro ao salvar automaticamente o quadro.');
          } finally {
            setSaving(false);
          }
        }, 2000); // Debounce 2 seconds
      },
      { source: 'user', scope: 'document' } // Only trigger on user edits, not remote or state changes
    );
  }, [id]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!canvas) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header Panel */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/canvas')}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {canvas.title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              {saving ? (
                <span className="flex items-center gap-1 text-indigo-500">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                  Salvando...
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-500">
                  <Save className="w-3 h-3" />
                  Salvo
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg font-medium transition-colors"
            title="Modo Apresentação (Tela Cheia)"
          >
            <MonitorPlay className="w-4 h-4" />
            <span className="hidden sm:inline">Apresentar</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef} 
        className="flex-1 relative bg-[#F8F9FA] dark:bg-[#121212]"
        style={{ width: '100%', height: '100%' }}
      >
        <Tldraw 
          onMount={handleMount}
          inferDarkMode
        />
        
        {/* Floating exit fullscreen button when in fullscreen */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-[9999] bg-gray-900/80 text-white px-4 py-2 rounded-full hover:bg-gray-800 backdrop-blur shadow-lg flex items-center gap-2"
          >
            Sair da Apresentação (Esc)
          </button>
        )}
      </div>
    </div>
  );
}
