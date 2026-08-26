import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, Clock, FileText, Sparkles, Copy, 
  Download, Play, Pause, RotateCcw, CheckCircle2, ChevronUp, ChevronDown, 
  HelpCircle, Sliders, ExternalLink, Zap, AlertCircle, Maximize2, X, Check
} from 'lucide-react';
import { useAuth } from '@auth/contexts/AuthContext';
import { funnelService } from '@/services/funnelService';
import { FunnelBlueprint, VSLScriptBlock, VSLBlockType, VSLBlueprintData } from '@/types';
import { VSL_BLOCK_DEFINITIONS, DEFAULT_VSL_BLOCKS } from '../constants/vslPageTemplates';
import { toast } from 'sonner';

export default function VSLStudioEditorView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.orgId;

  const [blueprint, setBlueprint] = useState<FunnelBlueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Parâmetros de Copy & Minutagem
  const [targetWPM, setTargetWPM] = useState<number>(140);
  const [blocks, setBlocks] = useState<VSLScriptBlock[]>(DEFAULT_VSL_BLOCKS);

  // Teleprompter Integrado
  const [isTeleprompterOpen, setIsTeleprompterOpen] = useState(false);
  const [teleprompterPlaying, setTeleprompterPlaying] = useState(false);
  const [teleprompterSpeed, setTeleprompterSpeed] = useState(2);
  const [teleprompterFontSize, setTeleprompterFontSize] = useState(36);
  const teleprompterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (orgId && id) {
      loadVSL();
    }
  }, [orgId, id]);

  const loadVSL = async () => {
    if (!orgId || !id) return;
    setLoading(true);
    try {
      const data = await funnelService.getFunnel(orgId, id);
      if (data) {
        setBlueprint(data);
        if (data.vslData?.blocks && data.vslData.blocks.length > 0) {
          setBlocks(data.vslData.blocks);
          setTargetWPM(data.vslData.targetWPM || 140);
        }
      } else {
        toast.error('Roteiro de VSL não encontrado.');
        navigate('/funnels');
      }
    } catch (err) {
      console.error('Erro ao carregar VSL:', err);
      toast.error('Erro ao carregar roteiro.');
    } finally {
      setLoading(false);
    }
  };

  // Contagem de palavras e cálculo de tempo dinâmico
  const countWords = (text: string): number => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const calculatedBlocks = useMemo(() => {
    let cumulativeSeconds = 0;
    return blocks.map(block => {
      const words = countWords(block.scriptText);
      const durationSeconds = Math.round((words / targetWPM) * 60);
      const startTime = cumulativeSeconds;
      cumulativeSeconds += durationSeconds;
      return {
        ...block,
        wordCount: words,
        targetDurationSeconds: durationSeconds,
        startTimeSeconds: startTime,
        endTimeSeconds: cumulativeSeconds
      };
    });
  }, [blocks, targetWPM]);

  const totalWords = useMemo(() => {
    return calculatedBlocks.reduce((acc, b) => acc + (b.wordCount || 0), 0);
  }, [calculatedBlocks]);

  const totalDurationSeconds = useMemo(() => {
    return Math.round((totalWords / targetWPM) * 60);
  }, [totalWords, targetWPM]);

  const pitchPointBlock = useMemo(() => {
    return calculatedBlocks.find(b => b.isPitchPoint);
  }, [calculatedBlocks]);

  const formatSecondsToMinutes = (totalSec: number) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}m ${sec < 10 ? '0' : ''}${sec}s`;
  };

  const handleUpdateBlockText = (blockId: string, text: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, scriptText: text } : b));
  };

  const handleUpdateBlockTitle = (blockId: string, title: string) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, title } : b));
  };

  const handleTogglePitchPoint = (blockId: string) => {
    setBlocks(prev => prev.map(b => ({
      ...b,
      isPitchPoint: b.id === blockId ? !b.isPitchPoint : false
    })));
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    setBlocks(newBlocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    if (blocks.length <= 1) {
      toast.error('O roteiro deve ter pelo menos um bloco.');
      return;
    }
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  const handleAddBlock = (type: VSLBlockType) => {
    const def = VSL_BLOCK_DEFINITIONS[type];
    const newBlock: VSLScriptBlock = {
      id: `vsl-blk-${Date.now()}`,
      type,
      title: def ? def.title : 'Novo Bloco de Copy',
      scriptText: '',
      bulletPoints: def ? [...def.defaultBulletPoints] : []
    };
    setBlocks(prev => [...prev, newBlock]);
    toast.success(`Bloco adicionado: ${newBlock.title}`);
  };

  const handleSave = async () => {
    if (!orgId || !id || !blueprint) return;
    setSaving(true);
    try {
      const vslData: VSLBlueprintData = {
        targetWPM,
        totalWords,
        estimatedDurationSeconds: totalDurationSeconds,
        pitchDelaySeconds: pitchPointBlock?.startTimeSeconds || 0,
        blocks
      };

      await funnelService.updateFunnel(orgId, id, {
        ...blueprint,
        vslData
      });
      toast.success('Roteiro de VSL salvo com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar VSL:', err);
      toast.error('Erro ao salvar roteiro.');
    } finally {
      setSaving(false);
    }
  };

  // Compilação das instruções / Briefing formatado
  const generateInstructionsText = () => {
    let doc = `# DOSSIÊ DE GRAVAÇÃO & ROTEIRO DE VSL: ${blueprint?.title || 'VSL de Alta Conversão'}\n`;
    doc += `Data de Geração: ${new Date().toLocaleDateString('pt-BR')}\n`;
    doc += `Duração Estimada: ${formatSecondsToMinutes(totalDurationSeconds)} (${totalWords} palavras a ${targetWPM} WPM)\n`;
    if (pitchPointBlock) {
      doc += `PONTO DE DELAY DO BOTÃO DE CHECKOUT: ${formatSecondsToMinutes(pitchPointBlock.startTimeSeconds)} (${pitchPointBlock.startTimeSeconds} segundos)\n`;
    }
    doc += `\n=================================================================\n`;
    doc += `ESTRUTURA DA NARRATIVA PASSO A PASSO:\n`;
    doc += `=================================================================\n\n`;

    calculatedBlocks.forEach((b, idx) => {
      doc += `--- [PARTE ${idx + 1}: ${b.title}] ---\n`;
      doc += `⏰ Minutagem: ${formatSecondsToMinutes(b.startTimeSeconds)} até ${formatSecondsToMinutes(b.endTimeSeconds)} (~${b.wordCount} palavras)\n`;
      if (b.isPitchPoint) {
        doc += `🔥 [PONTO DO PITCH / LIBERAÇÃO DO BOTÃO NO PLAYER]\n`;
      }
      doc += `\nSCRIPT NARRADO:\n"${b.scriptText}"\n\n`;
      if (b.bulletPoints && b.bulletPoints.length > 0) {
        doc += `Argumentos-Chave:\n`;
        b.bulletPoints.forEach(pt => doc += `  • ${pt}\n`);
        doc += `\n`;
      }
    });

    return doc;
  };

  const handleCopyInstructions = () => {
    const text = generateInstructionsText();
    navigator.clipboard.writeText(text);
    toast.success('Instruções completas da VSL copiadas para a área de transferência!');
  };

  const handleExportText = () => {
    const content = generateInstructionsText();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${blueprint?.title || 'Roteiro_VSL'}.txt`;
    link.click();
    toast.success('Roteiro exportado com sucesso!');
  };

  // Efeito do Teleprompter
  useEffect(() => {
    let animationFrame: number;
    const scrollTeleprompter = () => {
      if (teleprompterPlaying && teleprompterRef.current) {
        teleprompterRef.current.scrollTop += teleprompterSpeed;
        animationFrame = requestAnimationFrame(scrollTeleprompter);
      }
    };

    if (teleprompterPlaying) {
      animationFrame = requestAnimationFrame(scrollTeleprompter);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [teleprompterPlaying, teleprompterSpeed]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#050914] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Carregando Estúdio de VSL...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050914] text-white overflow-hidden">
      
      {/* ── CABEÇALHO DO ESTÚDIO DE VSL ─────────────────────────────────────── */}
      <header className="h-16 bg-[#080e21]/95 border-b border-white/10 px-6 flex items-center justify-between z-30 shrink-0 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/funnels')}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors"
            title="Voltar para Fluxos"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                🎬 Estúdio de VSL
              </span>
              <span className="text-xs text-gray-500">•</span>
              <input
                type="text"
                value={blueprint?.title || ''}
                onChange={(e) => setBlueprint(prev => prev ? { ...prev, title: e.target.value } : null)}
                className="bg-transparent font-black text-sm lg:text-base text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                placeholder="Título da VSL..."
              />
            </div>
          </div>
        </div>

        {/* Métricas e Controles de Minutagem */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-xl text-xs">
            <div className="flex items-center gap-1.5 text-gray-300">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span><strong>{totalWords}</strong> palavras</span>
            </div>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-1.5 text-gray-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Duração: <strong className="text-emerald-300">{formatSecondsToMinutes(totalDurationSeconds)}</strong></span>
            </div>
            {pitchPointBlock && (
              <>
                <span className="text-gray-600">|</span>
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Delay: <strong>{formatSecondsToMinutes(pitchPointBlock.startTimeSeconds)}</strong></span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTeleprompterPlaying(false);
                setIsTeleprompterOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-indigo-500/40 shadow-sm"
              title="Abrir Teleprompter em tela cheia para gravar"
            >
              <Play className="w-3.5 h-3.5 text-indigo-400" />
              <span>Teleprompter</span>
            </button>

            <button
              onClick={handleCopyInstructions}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10"
              title="Copiar todas as instruções formatadas"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copiar Instruções</span>
            </button>

            <button
              onClick={handleExportText}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10"
              title="Exportar roteiro completo em arquivo .txt"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Baixar .TXT</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/25 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── CORPO PRINCIPAL: TIMELINE & EDITOR DE BLOCOS ────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Painel Central: Linha do Tempo e Script */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Barra de Calibração de Ritmo */}
            <div className="bg-[#090f24] border border-white/10 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Velocidade de Fala do Locutor (WPM)</h4>
                  <p className="text-[11px] text-gray-400">Padrão para VSLs de alta retenção: 130 a 150 palavras por minuto</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={100}
                  max={200}
                  step={5}
                  value={targetWPM}
                  onChange={(e) => setTargetWPM(Number(e.target.value))}
                  className="w-32 accent-indigo-500"
                />
                <span className="text-xs font-black text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                  {targetWPM} WPM
                </span>
              </div>
            </div>

            {/* Lista Ordenada de Blocos de Copy da VSL */}
            <div className="space-y-4">
              {calculatedBlocks.map((block, index) => {
                const def = VSL_BLOCK_DEFINITIONS[block.type];
                const isPitch = block.isPitchPoint;

                return (
                  <div
                    key={block.id}
                    className={`rounded-2xl border transition-all ${
                      isPitch
                        ? 'bg-[#101733] border-amber-500/40 shadow-xl shadow-amber-500/10'
                        : 'bg-[#090e1f] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Cabeçalho do Bloco */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-white/5 text-gray-400 text-xs font-black flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>

                        <input
                          type="text"
                          value={block.title}
                          onChange={(e) => handleUpdateBlockTitle(block.id, e.target.value)}
                          className="bg-transparent font-bold text-xs lg:text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 w-full"
                        />
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Timestamp Estimado do Bloco */}
                        <span className="text-[11px] font-bold text-gray-400 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                          ⏱️ {formatSecondsToMinutes(block.startTimeSeconds)} - {formatSecondsToMinutes(block.endTimeSeconds)}
                        </span>

                        {/* Botão de Pitch Point */}
                        <button
                          onClick={() => handleTogglePitchPoint(block.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 border ${
                            isPitch
                              ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/30'
                              : 'bg-white/5 text-gray-400 hover:text-amber-300 border-white/10'
                          }`}
                          title="Marcar este bloco como o momento em que a oferta é apresentada (Delay do botão de compra)"
                        >
                          <Zap className="w-3 h-3" />
                          <span>{isPitch ? 'Ponto de Pitch (Delay)' : 'Marcar Pitch'}</span>
                        </button>

                        {/* Reordenar */}
                        <button
                          onClick={() => handleMoveBlock(index, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveBlock(index, 'down')}
                          disabled={index === blocks.length - 1}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Excluir */}
                        <button
                          onClick={() => handleDeleteBlock(block.id)}
                          className="p-1 rounded-lg bg-white/5 hover:bg-rose-500 hover:text-white text-gray-400 transition-colors"
                          title="Excluir Bloco"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Guia Rápido & Regras de Ouro */}
                    {def && (
                      <div className="px-4 py-2 bg-white/[0.01] border-b border-white/5 text-[11px] text-gray-400 flex items-center justify-between">
                        <span>💡 <strong>Dica:</strong> {def.description}</span>
                        <span className="text-gray-500 font-bold">{block.wordCount} palavras (~{block.targetDurationSeconds}s)</span>
                      </div>
                    )}

                    {/* Campo de Escrita do Roteiro */}
                    <div className="p-4">
                      <textarea
                        value={block.scriptText}
                        onChange={(e) => handleUpdateBlockText(block.id, e.target.value)}
                        placeholder="Escreva aqui o script narrado desta parte do vídeo..."
                        rows={4}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs lg:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 leading-relaxed custom-scrollbar resize-y"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Barra Lateral Direita: Biblioteca de Blocos para Inserir */}
        <div className="w-80 bg-[#080d1e] border-l border-white/10 p-5 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar">
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Adicionar Bloco de VSL
            </h3>
            <p className="text-[11px] text-gray-400 mt-1">
              Clique em qualquer bloco para inserir no roteiro:
            </p>
          </div>

          <div className="space-y-2">
            {(Object.keys(VSL_BLOCK_DEFINITIONS) as VSLBlockType[]).map(typeKey => {
              const def = VSL_BLOCK_DEFINITIONS[typeKey];
              return (
                <button
                  key={typeKey}
                  onClick={() => handleAddBlock(typeKey)}
                  className="w-full p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-indigo-500/40 text-left transition-all group flex items-start justify-between gap-2"
                >
                  <div>
                    <h5 className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors">
                      {def.title}
                    </h5>
                    <p className="text-[10px] text-gray-400 line-clamp-2 mt-0.5">
                      {def.description}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 shrink-0 mt-0.5" />
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── 📜 MODAL DE TELEPROMPTER NATIVO EM TELA CHEIA ─────────────────── */}
      {isTeleprompterOpen && (
        <div className="fixed inset-0 z-[99999] bg-black flex flex-col text-white animate-in fade-in select-none">
          {/* Barra de Controle Superior do Teleprompter */}
          <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between z-20 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase text-indigo-400 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-500/30">
                🎬 Teleprompter Ao Vivo
              </span>
              <span className="text-sm font-bold text-gray-300">
                {formatSecondsToMinutes(totalDurationSeconds)} • {totalWords} palavras
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Botão Play / Pause */}
              <button
                onClick={() => setTeleprompterPlaying(prev => !prev)}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                  teleprompterPlaying 
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30' 
                    : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                }`}
              >
                {teleprompterPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{teleprompterPlaying ? 'Pausar (Espaço)' : 'Iniciar Leitura'}</span>
              </button>

              <button
                onClick={() => {
                  setTeleprompterPlaying(false);
                  if (teleprompterRef.current) teleprompterRef.current.scrollTop = 0;
                }}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                title="Reiniciar do Início"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Ajuste de Velocidade */}
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-zinc-400">Velocidade:</span>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={0.5}
                  value={teleprompterSpeed}
                  onChange={(e) => setTeleprompterSpeed(Number(e.target.value))}
                  className="w-20 accent-indigo-500"
                />
                <span className="font-bold text-indigo-400">{teleprompterSpeed}x</span>
              </div>

              {/* Ajuste de Tamanho de Fonte */}
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
                <span className="text-zinc-400">Fonte:</span>
                <button
                  onClick={() => setTeleprompterFontSize(prev => Math.max(24, prev - 4))}
                  className="px-2 py-0.5 bg-zinc-800 rounded font-bold hover:bg-zinc-700"
                >
                  -
                </button>
                <span className="font-bold text-white">{teleprompterFontSize}px</span>
                <button
                  onClick={() => setTeleprompterFontSize(prev => Math.min(64, prev + 4))}
                  className="px-2 py-0.5 bg-zinc-800 rounded font-bold hover:bg-zinc-700"
                >
                  +
                </button>
              </div>

              <button
                onClick={() => {
                  setTeleprompterPlaying(false);
                  setIsTeleprompterOpen(false);
                }}
                className="p-2 text-zinc-400 hover:text-white rounded-xl bg-zinc-900 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Linha Guia do Olhar do Locutor */}
          <div className="absolute top-1/3 left-0 right-0 h-px bg-indigo-500/30 z-10 pointer-events-none flex items-center justify-between px-4">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest bg-black px-2">Linha do Olhar</span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest bg-black px-2">Fixe os Olhos Aqui</span>
          </div>

          {/* Área de Rolagem do Texto */}
          <div 
            ref={teleprompterRef}
            className="flex-1 overflow-y-auto px-12 lg:px-32 py-40 custom-scrollbar text-center"
            style={{ fontSize: `${teleprompterFontSize}px` }}
          >
            <div className="max-w-4xl mx-auto space-y-16">
              {calculatedBlocks.map((block, idx) => (
                <div key={block.id} className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 inline-block">
                    Parte {idx + 1}: {block.title}
                  </span>
                  <p className="font-semibold text-zinc-100 leading-relaxed">
                    {block.scriptText}
                  </p>
                </div>
              ))}
              <div className="py-40 text-sm text-zinc-500 font-bold uppercase">
                [ Fim da Apresentação ]
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
