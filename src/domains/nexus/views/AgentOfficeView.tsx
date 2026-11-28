import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Bot, Check, CircleHelp, Maximize2, Minimize2, MessageCircle, Pause, Pencil, Play, Plus, Save, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@auth/contexts/AuthContext';
import './AgentOfficeView.css';

type AgentStatus = 'idle' | 'working' | 'review';
type AgentZone = 'ops' | 'finance' | 'content' | 'development';

interface OfficeAgent {
  id: string;
  name: string;
  role: string;
  task: string;
  zone: AgentZone;
  color: string;
  look: number;
  status: AgentStatus;
  update: string;
}

const STORAGE_VERSION = 1;
const zones: Record<AgentZone, { label: string; x: number; y: number; accent: string }> = {
  ops: { label: 'Operações', x: 22, y: 28, accent: '#67e8f9' },
  finance: { label: 'Financeiro', x: 75, y: 29, accent: '#86efac' },
  content: { label: 'Conteúdo', x: 24, y: 68, accent: '#f0abfc' },
  development: { label: 'Desenvolvimento', x: 74, y: 68, accent: '#fcd34d' },
};

const starterAgents: OfficeAgent[] = [
  { id: 'ops', name: 'Nina', role: 'Operações', task: 'Organizar as prioridades da semana', zone: 'ops', color: '#45c5d8', look: 0, status: 'idle', update: 'Disponível para receber uma tarefa' },
  { id: 'finance', name: 'Caio', role: 'Financeiro', task: 'Preparar o fechamento semanal', zone: 'finance', color: '#54bb82', look: 1, status: 'idle', update: 'Disponível para receber uma tarefa' },
  { id: 'content', name: 'Lia', role: 'Conteúdo', task: 'Revisar o calendário de conteúdo', zone: 'content', color: '#cc83d8', look: 2, status: 'idle', update: 'Disponível para receber uma tarefa' },
  { id: 'development', name: 'Theo', role: 'Desenvolvimento', task: 'Revisar uma melhoria do Hub', zone: 'development', color: '#d7a44c', look: 3, status: 'idle', update: 'Disponível para receber uma tarefa' },
];

const statusLabel: Record<AgentStatus, string> = { idle: 'Disponível', working: 'Trabalhando', review: 'Precisa da sua revisão' };
const statusColor: Record<AgentStatus, string> = { idle: '#9ca3af', working: '#63c5da', review: '#f2bd64' };
const furniture = '/assets/agent-office/furniture';

function Sprite({ agent, working }: { agent: OfficeAgent; working: boolean }) {
  const hair = ['#394454', '#674a36', '#704f7f', '#58462d'][agent.look % 4];
  const skin = ['#efc5a0', '#bb805d', '#f0d0a6', '#9b624d'][agent.look % 4];
  return <svg viewBox="0 0 48 56" className={working ? 'office-sprite office-sprite-working' : 'office-sprite'} shapeRendering="crispEdges" aria-hidden="true">
    <ellipse cx="24" cy="51" rx="13" ry="3" fill="#172125" opacity=".22" />
    <rect x="13" y="20" width="22" height="18" rx="4" fill={agent.color} />
    <rect x="11" y="35" width="10" height="12" rx="3" fill="#334155" />
    <rect x="27" y="35" width="10" height="12" rx="3" fill="#334155" />
    <rect x="10" y="44" width="11" height="4" rx="2" fill="#263443" />
    <rect x="27" y="44" width="11" height="4" rx="2" fill="#263443" />
    <rect x="8" y="24" width="7" height="13" rx="3" fill={skin} />
    <rect x="33" y="24" width="7" height="13" rx="3" fill={skin} />
    <rect x="14" y="5" width="20" height="20" rx="8" fill={skin} />
    <path d={agent.look % 2 ? 'M13 15V11a11 11 0 0 1 22 0v5h-4v-5H17v5z' : 'M13 16V11a11 11 0 0 1 22 0v3l-4-3-2 3-4-3-4 3-4-2z'} fill={hair} />
    <rect x="18" y="15" width="2.5" height="2.5" rx=".5" fill="#24313b" />
    <rect x="28" y="15" width="2.5" height="2.5" rx=".5" fill="#24313b" />
    <path d="M21 20q3 2 6 0" fill="none" stroke="#a75249" strokeWidth="1.4" />
    {working && <><rect x="32" y="2" width="12" height="10" rx="3" fill="#e8fbfd" /><path d="M35 5h6M35 8h4" stroke="#1d8ea2" strokeWidth="1.2" /></>}
  </svg>;
}

function OfficeRoom({ agents, selectedId, simulation, onSelect, reviewIds }: {
  agents: OfficeAgent[]; selectedId: string; simulation: boolean; onSelect: (agent: OfficeAgent) => void; reviewIds: Set<string>;
}) {
  const prefersReducedMotion = useReducedMotion();
  return <div className="office-room" aria-label="Mapa 2D do escritório">
    <div className="office-back-wall"><div className="office-window"><span /><span /><span /></div><div className="office-wall-art"><img src={`${furniture}/LARGE_PAINTING/LARGE_PAINTING.png`} alt="" /></div><div className="office-clock">HUB&nbsp; · &nbsp;OFFICE</div><div className="office-window office-window-small"><span /><span /></div><span className="office-wall-lamp office-wall-lamp-left"/><span className="office-wall-lamp office-wall-lamp-right"/></div>
    <div className="office-floor" />
    <div className="office-sunbeam office-sunbeam-left"/><div className="office-sunbeam office-sunbeam-right"/>
    <div className="office-rug office-rug-center" />
    <div className="office-rug office-rug-right" />
    <div className="office-furniture office-bookshelf"><img src={`${furniture}/BOOKSHELF/BOOKSHELF.png`} alt="" /></div>
    <div className="office-furniture office-whiteboard"><img src={`${furniture}/WHITEBOARD/WHITEBOARD.png`} alt="" /></div>
    <div className="office-furniture office-sofa"><img src={`${furniture}/SOFA/SOFA_FRONT.png`} alt="" /></div>
    <div className="office-furniture office-coffee"><img src={`${furniture}/COFFEE_TABLE/COFFEE_TABLE.png`} alt="" /></div>
    <div className="office-plant office-plant-left"><img src={`${furniture}/LARGE_PLANT/LARGE_PLANT.png`} alt="" /></div>
    <div className="office-plant office-plant-right"><img src={`${furniture}/LARGE_PLANT/LARGE_PLANT.png`} alt="" /></div>
    <div className="office-zone office-zone-ops"><span>01</span> Operações</div>
    <div className="office-zone office-zone-finance"><span>02</span> Financeiro</div>
    <div className="office-zone office-zone-content"><span>03</span> Conteúdo</div>
    <div className="office-zone office-zone-development"><span>04</span> Desenvolvimento</div>
    <div className="office-divider office-divider-horizontal" /><div className="office-divider office-divider-vertical" />
    {agents.map((agent, index) => {
      const base = zones[agent.zone];
      const spots = [
        { x: base.x, y: base.y },
        { x: Math.min(base.x + 7, 86), y: base.y + 1 },
        { x: base.x, y: Math.min(base.y + 7, 79) },
        { x: Math.min(base.x + 7, 86), y: Math.min(base.y + 7, 79) },
      ];
      const moving = simulation && agent.status === 'working';
      const wander = [
        { x: [0, 9, 18, 12, -3, 0], y: [0, -2, 1, 5, 2, 0] },
        { x: [0, -8, -15, -7, 4, 0], y: [0, 3, 1, -4, -2, 0] },
        { x: [0, 6, 14, 8, -5, 0], y: [0, 2, 5, -2, -4, 0] },
        { x: [0, -7, -16, -9, 3, 0], y: [0, -3, -1, 4, 3, 0] },
      ][index % 4];
      return <button key={agent.id} type="button" className={`office-agent office-agent-${agent.zone} ${agent.id === selectedId ? 'is-selected' : ''}`} style={{ left: `${spots[index % 4].x}%`, top: `${spots[index % 4].y}%`, '--agent-accent': agent.color } as CSSProperties}
        onClick={() => onSelect(agent)} aria-label={`${agent.name}, ${agent.role}, ${statusLabel[agent.status]}`}>
        <span className="office-desk"><img src={`${furniture}/DESK/DESK_FRONT.png`} alt=""/><img className={moving ? 'office-computer-on' : ''} src={`${furniture}/PC/PC_FRONT_ON_1.png`} alt="" /></span>
        <motion.span className="office-walker" animate={moving && !prefersReducedMotion ? wander : { x: 0, y: 0 }} transition={moving && !prefersReducedMotion ? { duration: 8 + index, repeat: Infinity, ease: 'easeInOut' } : { duration: .6 }}><Sprite agent={agent} working={agent.status === 'working'} /></motion.span>
        <span className="office-agent-tag"><i style={{ background: statusColor[agent.status] }} />{agent.name}<small>{agent.role}</small></span>
        {reviewIds.has(agent.id) && <span className="office-review-dot">Revisar</span>}
      </button>;
    })}
    <div className="office-pixel-note"><Sparkles size={13} /> um espaço de trabalho para o que vem a seguir</div>
  </div>;
}

function AgentEditor({ agent, onSave, onClose }: { agent?: OfficeAgent; onSave: (agent: OfficeAgent) => void; onClose: () => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({ ...(agent ?? starterAgents[0]), id: agent?.id ?? crypto.randomUUID(), name: String(form.get('name')).trim(), role: String(form.get('role')).trim(), task: String(form.get('task')).trim(), zone: String(form.get('zone')) as AgentZone, color: String(form.get('color')), look: agent?.look ?? Math.floor(Math.random() * 4), status: agent?.status ?? 'idle', update: agent?.update ?? 'Disponível para receber uma tarefa' });
    onClose();
  }
  return <div className="office-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="office-editor" onSubmit={submit}>
      <div className="office-editor-heading"><div><span className="office-kicker">CONFIGURAÇÃO DO ESCRITÓRIO</span><h2>{agent ? 'Editar agente' : 'Adicionar agente'}</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={19}/></button></div>
      <label>Nome<input name="name" defaultValue={agent?.name} required maxLength={36} placeholder="Ex. Nina" /></label>
      <label>Especialidade<input name="role" defaultValue={agent?.role} required maxLength={48} placeholder="Ex. Pesquisa de mercado" /></label>
      <label>Tarefa de demonstração<input name="task" defaultValue={agent?.task} required maxLength={100} placeholder="O que este agente fará" /></label>
      <div className="office-form-row"><label>Área<select name="zone" defaultValue={agent?.zone ?? 'ops'}>{Object.entries(zones).map(([key, zone]) => <option key={key} value={key}>{zone.label}</option>)}</select></label><label>Cor<input name="color" type="color" defaultValue={agent?.color ?? '#45c5d8'} /></label></div>
      <p className="office-editor-note">Esta configuração fica salva neste navegador. A conexão com um executor real poderá preencher o status e as tarefas depois.</p>
      <div className="office-editor-actions"><button type="button" className="office-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="office-primary"><Save size={16}/> Salvar agente</button></div>
    </form>
  </div>;
}

export default function AgentOfficeView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  const storageKey = `hub-agent-office:v${STORAGE_VERSION}:${user?.uid ?? 'local'}`;
  const [agents, setAgents] = useState<OfficeAgent[]>(starterAgents);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState('ops');
  const [editingAgent, setEditingAgent] = useState<OfficeAgent | null | undefined>(undefined);
  const [simulation, setSimulation] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [eventLog, setEventLog] = useState<string[]>(['O escritório está pronto para configurar os agentes.']);
  const [reviewIds, setReviewIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (Array.isArray(data) && data.every(agent => agent && typeof agent.id === 'string' && typeof agent.name === 'string')) setAgents(data.map(agent => ({ ...agent, status: 'idle', update: 'Disponível para receber uma tarefa' }))); 
      }
    } catch { /* Dados locais inválidos voltam à configuração inicial. */ }
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify(agents));
  }, [agents, loaded, storageKey]);

  useEffect(() => {
    if (!simulation) return;
    let step = 0;
    const interval = window.setInterval(() => {
      step++;
      const index = (step - 1) % agents.length;
      const agent = agents[index];
      if (!agent) return;
      const status: AgentStatus = step % 3 === 0 ? 'review' : step % 3 === 1 ? 'working' : 'idle';
      setAgents(current => current.map(item => item.id === agent.id ? { ...item, status, update: status === 'working' ? `Simulando: ${item.task}` : status === 'review' ? 'Resultado demonstrativo pronto para revisar' : 'Simulação pausada nesta estação' } : item));
      if (status === 'review') setReviewIds(current => new Set(current).add(agent.id));
      setEventLog(current => [`${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${agent.name} ${status === 'working' ? 'começou' : status === 'review' ? 'preparou' : 'pausou'} uma atividade demonstrativa.`, ...current].slice(0, 6));
    }, 2600);
    return () => window.clearInterval(interval);
  }, [simulation, agents.length]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === pageRef.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  const selected = useMemo(() => agents.find(agent => agent.id === selectedId) ?? agents[0], [agents, selectedId]);
  const reviewAgents = agents.filter(agent => reviewIds.has(agent.id));
  const workingCount = agents.filter(agent => agent.status === 'working').length;

  function toggleSimulation() {
    if (!simulation) {
      setSimulation(true);
      setEventLog(current => ['Simulação iniciada para demonstrar o fluxo dos agentes.', ...current].slice(0, 6));
      return;
    }
    setSimulation(false);
    setAgents(current => current.map(agent => agent.status === 'working' ? { ...agent, status: 'idle', update: 'Simulação pausada nesta estação' } : agent));
    setEventLog(current => ['Simulação pausada.', ...current].slice(0, 6));
  }

  async function toggleFullscreen() {
    if (!pageRef.current) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (fullscreen) setFullscreen(false);
      else await pageRef.current.requestFullscreen();
    } catch {
      setFullscreen(true);
    }
  }

  function saveAgent(agent: OfficeAgent) {
    setAgents(current => current.some(item => item.id === agent.id) ? current.map(item => item.id === agent.id ? agent : item) : [...current, agent]);
    setSelectedId(agent.id);
    toast.success('Agente salvo neste navegador.');
  }

  function completeReview(agentId: string) {
    setReviewIds(current => { const next = new Set(current); next.delete(agentId); return next; });
    setAgents(current => current.map(agent => agent.id === agentId ? { ...agent, status: 'idle', update: 'Revisão demonstrativa concluída' } : agent));
  }

  function openAgentChat() {
    if (!selected) return;
    sessionStorage.setItem('hub-office-chat-context-v1', JSON.stringify({
      agentName: selected.name,
      role: selected.role,
      task: selected.task,
    }));
    navigate('/chat?mode=davinci&officeContext=1');
  }

  return <div ref={pageRef} className={`agent-office-page ${fullscreen ? 'agent-office-fullscreen' : ''}`}>
    <header className="agent-office-header">
      <div className="agent-office-brand"><button type="button" className="agent-office-back" onClick={() => navigate('/workspace')} aria-label="Voltar ao Hub Office"><ArrowLeft size={18}/></button><div className="agent-office-mark"><Bot size={20}/></div><div><span className="office-kicker">HUB OFFICE</span><h1>Escritório de agentes</h1></div></div>
      <div className="agent-office-controls"><span className="office-live-badge"><i/> {simulation ? 'Demonstração ativa' : 'Agentes simulados'}</span><button type="button" className="office-toolbar-button" onClick={() => setEditingAgent(null)}><Plus size={16}/> Novo agente</button><button type="button" className="office-toolbar-button" onClick={toggleSimulation}>{simulation ? <Pause size={16}/> : <Play size={16}/>} {simulation ? 'Pausar simulação' : 'Simular atividade'}</button><button type="button" className="office-fullscreen-button" onClick={toggleFullscreen} title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>{fullscreen ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}<span>{fullscreen ? 'Sair da tela cheia' : 'Focar no monitor'}</span></button></div>
    </header>
    <div className="agent-office-body">
      <section className="agent-office-map-column">
        <div className="agent-office-map-title"><div><p className="office-kicker">SALA PRINCIPAL <span>·</span> {agents.length} estações</p><h2>Seu time, em um só lugar</h2></div><button className="office-edit-layout" type="button" onClick={() => setEditingAgent(selected ?? null)} disabled={!selected}><Pencil size={15}/> Editar selecionado</button></div>
        <OfficeRoom agents={agents} selectedId={selectedId} simulation={simulation} reviewIds={reviewIds} onSelect={agent => setSelectedId(agent.id)}/>
        <div className="agent-office-map-footer"><span><i className="office-dot office-dot-working"/> {workingCount} trabalhando</span><span><i className="office-dot office-dot-review"/> {reviewAgents.length} para revisar</span><span className="office-map-credit">Móveis e pisos: Pixel Agents, licença MIT</span></div>
      </section>
      <aside className="agent-office-sidebar">
        <section className="office-side-card office-selected-card">
          <div className="office-side-heading"><div><span className="office-kicker">ESTAÇÃO SELECIONADA</span><h2>Atividade</h2></div><CircleHelp size={17}/></div>
          {selected ? <><div className="office-selected-agent"><span className="office-mini-sprite" style={{ '--agent-accent': selected.color } as CSSProperties}><Sprite agent={selected} working={selected.status === 'working'}/></span><div><h3>{selected.name}</h3><p>{selected.role}</p></div><span className="office-state" style={{ '--state-color': statusColor[selected.status] } as CSSProperties}><i/>{statusLabel[selected.status]}</span></div>
            <div className="office-task-card"><span>ATIVIDADE ATUAL</span><strong>{selected.task}</strong><p>{selected.update}</p></div>
            {reviewIds.has(selected.id) && <div className="office-review-card"><div><strong>Resultado demonstrativo pronto</strong><p>O agente concluiu uma etapa simulada. Revise antes de marcar como concluída.</p></div><button type="button" onClick={() => completeReview(selected.id)}><Check size={15}/> Revisar</button></div>}
            <button type="button" className="office-chat-button" onClick={openAgentChat}><MessageCircle size={16}/> Levar contexto ao chat do Davinci</button>
          </> : <p className="office-empty-note">Adicione seu primeiro agente para começar.</p>}
        </section>
        <section className="office-side-card office-team-card"><div className="office-side-heading"><div><span className="office-kicker">SEU ESPAÇO</span><h2>Estações</h2></div><button className="office-icon-button" type="button" aria-label="Adicionar agente" onClick={() => setEditingAgent(null)}><Plus size={17}/></button></div>
          <div className="office-agent-list">{agents.map(agent => <button type="button" key={agent.id} className={`office-agent-row ${selectedId === agent.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(agent.id)}><span className="office-row-avatar" style={{ '--agent-accent': agent.color } as CSSProperties}><Sprite agent={agent} working={false}/></span><span className="office-row-copy"><strong>{agent.name}</strong><small>{zones[agent.zone].label} · {agent.role}</small></span><i className="office-row-status" style={{ backgroundColor: statusColor[agent.status] }}/><span className="office-row-edit" role="button" aria-label={`Editar ${agent.name}`} onClick={event => { event.stopPropagation(); setEditingAgent(agent); }}><Pencil size={14}/></span></button>)}</div>
        </section>
        <section className="office-side-card office-activity-card"><div className="office-side-heading"><div><span className="office-kicker">ACOMPANHAMENTO</span><h2>Atividade recente</h2></div><span className="office-log-indicator"><i/></span></div><div className="office-activity-list">{eventLog.map((entry,index) => <p key={`${entry}-${index}`}><i/>{entry}</p>)}</div><div className="office-connection-note"><span className="office-connection-icon"><Sparkles size={15}/></span><span><strong>Modo demonstrativo</strong><small>A VPS e os agentes ainda não estão conectados.</small></span></div></section>
      </aside>
    </div>
    <AnimatePresence>{editingAgent !== undefined && <motion.div key="agent-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AgentEditor agent={editingAgent ?? undefined} onSave={saveAgent} onClose={() => setEditingAgent(undefined)}/></motion.div>}</AnimatePresence>
  </div>;
}
