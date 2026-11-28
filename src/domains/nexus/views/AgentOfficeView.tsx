import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Bot, Check, CircleHelp, Layers, Maximize2, Minimize2, MessageCircle, Pause, Pencil, Play, Plus, Save, Sparkles, Trash2, X, PartyPopper, CalendarDays, DoorOpen, Armchair, Users, Gamepad2, Presentation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@auth/contexts/AuthContext';
import { agentPose, HabblaudCharacter } from '../officeArt/HabblaudCharacter';
import './AgentOfficeView.css';

type AgentStatus = 'idle' | 'working' | 'review';
type OfficeRoomKind = 'bay' | 'meeting' | 'presentation' | 'lounge' | 'game';
type OfficePropKind = 'desk' | 'meeting-table' | 'sofa' | 'plant' | 'stairs';

const roomKinds: { id: OfficeRoomKind; label: string; icon: typeof DoorOpen }[] = [
  { id: 'bay', label: 'Baia de trabalho', icon: DoorOpen },
  { id: 'meeting', label: 'Sala de reunião', icon: Users },
  { id: 'presentation', label: 'Sala de apresentação', icon: Presentation },
  { id: 'lounge', label: 'Sala de descanso', icon: Armchair },
  { id: 'game', label: 'Sala de jogos', icon: Gamepad2 },
];

interface OfficeProp { id: string; kind: OfficePropKind; name: string; x: number; y: number; size: number }
interface OfficeMilestone { id: string; name: string; metric: 'sales' | 'profit'; target: number; enabled: boolean }
interface OfficeSeason { name: string; start: string; end: string; enabled: boolean }
interface OfficeCelebration { title: string; until: number }
interface OfficeEventSettings { milestones: OfficeMilestone[]; season: OfficeSeason; celebration?: OfficeCelebration }
interface OfficeMeeting { floorId: string; areaId: string; participants: string[]; previous: Array<Pick<OfficeAgent, 'id' | 'status' | 'update'>> }

interface OfficeArea {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  kind?: OfficeRoomKind;
}

interface OfficeFloor {
  id: string;
  name: string;
  areas: OfficeArea[];
  props?: OfficeProp[];
}

interface OfficeAgent {
  id: string;
  name: string;
  role: string;
  task: string;
  floorId: string;
  areaId: string;
  color: string;
  look: number;
  status: AgentStatus;
  update: string;
}

const STORAGE_VERSION = 3;
const PREVIOUS_STORAGE_VERSION = 2;
const LEGACY_STORAGE_VERSION = 1;
const MAIN_FLOOR_ID = 'floor-main';
const starterAreas: OfficeArea[] = [
  { id: 'ops', name: 'Operações', x: 22, y: 31, color: '#67c9c0', kind: 'bay' },
  { id: 'finance', name: 'Financeiro', x: 75, y: 31, color: '#7dbb82', kind: 'bay' },
  { id: 'content', name: 'Conteúdo', x: 24, y: 71, color: '#d48dc1', kind: 'bay' },
  { id: 'development', name: 'Desenvolvimento', x: 74, y: 71, color: '#dfa950', kind: 'bay' },
  { id: 'meeting-room', name: 'Sala de reunião', x: 50, y: 50, color: '#8dbeb6', kind: 'meeting' },
];
const starterFloors: OfficeFloor[] = [{ id: MAIN_FLOOR_ID, name: 'Andar principal', areas: starterAreas, props: [
  { id: 'meeting-table', kind: 'meeting-table', name: 'Mesa de reunião', x: 58, y: 57, size: 82 },
  { id: 'stairs-main', kind: 'stairs', name: 'Escada para os andares', x: 91, y: 82, size: 70 },
] }];
const defaultEventSettings: OfficeEventSettings = {
  milestones: [
    { id: 'sales-50', name: '50 vendas no dia', metric: 'sales', target: 50, enabled: true },
    { id: 'profit-1000', name: 'R$ 1.000 de lucro no dia', metric: 'profit', target: 1000, enabled: true },
  ],
  season: { name: 'Natal', start: '12-20', end: '12-26', enabled: false },
};

const starterAgents: OfficeAgent[] = [
  { id: 'ops', name: 'Nina', role: 'Operações', task: 'Organizar as prioridades da semana', floorId: MAIN_FLOOR_ID, areaId: 'ops', color: '#45c5d8', look: 0, status: 'idle', update: 'Disponível para receber uma tarefa' },
  { id: 'finance', name: 'Caio', role: 'Financeiro', task: 'Preparar o fechamento semanal', floorId: MAIN_FLOOR_ID, areaId: 'finance', color: '#54bb82', look: 1, status: 'idle', update: 'Disponível para receber uma tarefa' },
  { id: 'content', name: 'Lia', role: 'Conteúdo', task: 'Revisar o calendário de conteúdo', floorId: MAIN_FLOOR_ID, areaId: 'content', color: '#cc83d8', look: 2, status: 'idle', update: 'Disponível para receber uma tarefa' },
  { id: 'development', name: 'Theo', role: 'Desenvolvimento', task: 'Revisar uma melhoria do Hub', floorId: MAIN_FLOOR_ID, areaId: 'development', color: '#d7a44c', look: 3, status: 'idle', update: 'Disponível para receber uma tarefa' },
];

const statusLabel: Record<AgentStatus, string> = { idle: 'Disponível', working: 'Trabalhando', review: 'Precisa da sua revisão' };
const statusColor: Record<AgentStatus, string> = { idle: '#9ca3af', working: '#63c5da', review: '#f2bd64' };
const furniture = '/assets/agent-office/furniture';
const propCatalog: { kind: OfficePropKind; name: string; src?: string }[] = [
  { kind: 'desk', name: 'Mesa de trabalho', src: `${furniture}/DESK/DESK_FRONT.png` },
  { kind: 'meeting-table', name: 'Mesa de reunião', src: `${furniture}/TABLE_FRONT/TABLE_FRONT.png` },
  { kind: 'sofa', name: 'Sofá', src: `${furniture}/SOFA/SOFA_FRONT.png` },
  { kind: 'plant', name: 'Planta', src: `${furniture}/LARGE_PLANT/LARGE_PLANT.png` },
  { kind: 'stairs', name: 'Escada' },
];

function Sprite({ agent, working, poseOverride }: { agent: OfficeAgent; working: boolean; poseOverride?: 'walk' }) {
  const pose = poseOverride ?? (working ? 'type' : agentPose(agent.status));
  return <HabblaudCharacter seed={agent.look} outfit={agent.color} pose={pose} className={working ? 'office-sprite-working' : ''} />;
}

function OfficeRoom({ agents, areas, props = [], floorId, meeting, selectedId, simulation, fullscreen, onSelect, onExitFullscreen, reviewIds, celebration, season }: {
  agents: OfficeAgent[]; areas: OfficeArea[]; props?: OfficeProp[]; floorId: string; meeting?: OfficeMeeting | null; selectedId: string; simulation: boolean; fullscreen: boolean; onSelect: (agent: OfficeAgent) => void; onExitFullscreen: () => void; reviewIds: Set<string>; celebration?: OfficeCelebration; season?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  return <div className={`office-room ${celebration ? 'has-celebration' : ''} ${season ? 'has-season-theme' : ''}`} aria-label="Mapa 2D do escritório">
    {(celebration || season) && <div className={`office-event-banner ${celebration ? 'is-milestone' : 'is-season'}`}><PartyPopper size={15}/><span><strong>{celebration?.title ?? season}</strong><small>{celebration ? 'Celebração ativa até meia-noite' : 'Tema especial do escritório'}</small></span></div>}
    {meeting?.floorId === floorId && <div className="office-meeting-banner"><Users size={14}/><span>Reunião simulada com {meeting.participants.length} agentes</span></div>}
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
    {props.map(prop => { const item = propCatalog.find(entry => entry.kind === prop.kind); return <div key={prop.id} className={`office-custom-prop prop-${prop.kind}`} style={{ left: `${prop.x}%`, top: `${prop.y}%`, width: `clamp(${Math.max(22, prop.size * .55)}px, ${prop.size * .1}vw, ${prop.size}px)` } as CSSProperties} title={prop.name}>{item?.src ? <img src={item.src} alt={prop.name}/> : <span className="office-stairs-art" aria-label="Escada">↗<small>ACESSO AOS ANDARES</small></span>}</div>; })}
    {areas.filter(area => area.kind && area.kind !== 'bay').map(area => <div key={`boundary-${area.id}`} className={`office-room-boundary room-${area.kind}`} style={{ left: `${area.x}%`, top: `${area.y}%`, '--area-accent': area.color } as CSSProperties}><span /></div>)}
    {areas.map((area, index) => <div key={area.id} className={`office-zone room-${area.kind ?? 'bay'}`} style={{ left: `${Math.max(3, area.x - 10)}%`, top: `${Math.max(16, area.y - 16)}%`, '--area-accent': area.color } as CSSProperties}><span>{String(index + 1).padStart(2, '0')}</span>{area.name}<small>{roomKinds.find(kind => kind.id === area.kind)?.label ?? 'Baia'}</small></div>)}
    <div className="office-divider office-divider-horizontal" /><div className="office-divider office-divider-vertical" />
    {agents.filter(agent => agent.floorId === floorId).map(agent => {
      const base = areas.find(area => area.id === agent.areaId) ?? areas[0] ?? { x: 50, y: 55, color: '#67c9c0' };
      return <div key={`desk-${agent.id}`} className="office-fixed-desk" style={{ left: `${base.x}%`, top: `${base.y}%` }}><img src={`${furniture}/DESK/DESK_FRONT.png`} alt=""/><img className={agent.status === 'working' ? 'office-computer-on' : ''} src={`${furniture}/PC/PC_FRONT_ON_1.png`} alt=""/></div>;
    })}
    {agents.map((agent, index) => {
      const atMeeting = !!meeting && meeting.participants.includes(agent.id) && meeting.floorId === floorId;
      const homeArea = agent.floorId === floorId ? areas.find(area => area.id === agent.areaId) : undefined;
      const base = homeArea ?? { x: 91, y: 83, color: agent.color };
      const destination = atMeeting ? areas.find(area => area.id === meeting?.areaId) : undefined;
      const target = destination ?? base;
      const inAreaIndex = agents.filter(item => item.areaId === agent.areaId).findIndex(item => item.id === agent.id);
      const spots = [
        { x: 0, y: 0 }, { x: 7, y: 3 }, { x: -7, y: 6 }, { x: 7, y: 9 }, { x: -7, y: 11 },
      ][Math.max(0, inAreaIndex) % 5];
      const moving = (simulation && agent.status === 'working') || atMeeting;
      const wander = [
        { x: [0, 9, 18, 12, -3, 0], y: [0, -2, 1, 5, 2, 0] },
        { x: [0, -8, -15, -7, 4, 0], y: [0, 3, 1, -4, -2, 0] },
        { x: [0, 6, 14, 8, -5, 0], y: [0, 2, 5, -2, -4, 0] },
        { x: [0, -7, -16, -9, 3, 0], y: [0, -3, -1, 4, 3, 0] },
      ][index % 4];
      return <motion.button key={agent.id} type="button" className={`office-agent ${agent.id === selectedId ? 'is-selected' : ''}`} style={{ left: `calc(${base.x}% + ${spots.x}px)`, top: `calc(${base.y}% + ${spots.y}px)`, '--agent-accent': agent.color } as CSSProperties} animate={atMeeting ? { left: `${target.x}%`, top: `${target.y}%` } : { left: `calc(${base.x}% + ${spots.x}px)`, top: `calc(${base.y}% + ${spots.y}px)` }} transition={{ duration: atMeeting ? 2.2 : .5, ease: 'easeInOut' }}
        onClick={() => onSelect(agent)} aria-label={`${agent.name}, ${agent.role}, ${statusLabel[agent.status]}`}>
        <motion.span className="office-walker" animate={moving && !prefersReducedMotion ? wander : { x: 0, y: 0 }} transition={moving && !prefersReducedMotion ? { duration: 8 + index, repeat: Infinity, ease: 'easeInOut' } : { duration: .6 }}><Sprite agent={agent} working={agent.status === 'working'} poseOverride={moving ? 'walk' : undefined} /></motion.span>
        <span className="office-agent-tag"><i style={{ background: statusColor[agent.status] }} />{agent.name}<small>{agent.role}</small></span>
        {reviewIds.has(agent.id) && <span className="office-review-dot">Revisar</span>}
      </motion.button>;
    })}
    <div className="office-pixel-note"><Sparkles size={13} /> um espaço de trabalho para o que vem a seguir</div>
    {fullscreen && <button type="button" className="office-exit-fullscreen" onClick={onExitFullscreen} aria-label="Sair da tela cheia"><Minimize2 size={18}/></button>}
  </div>;
}

function AgentEditor({ agent, floors, defaultFloorId, onSave, onClose }: { agent?: OfficeAgent; floors: OfficeFloor[]; defaultFloorId: string; onSave: (agent: OfficeAgent) => void; onClose: () => void }) {
  const [randomLook] = useState(() => crypto.getRandomValues(new Uint32Array(1))[0]);
  const outfitPalette = ['#45c5d8', '#54bb82', '#cc83d8', '#d7a44c', '#ec806e', '#668ce0', '#e59db2', '#94b56c'];
  const [randomColor] = useState(() => outfitPalette[Math.floor(Math.random() * outfitPalette.length)]);
  const [floorId, setFloorId] = useState(agent?.floorId ?? defaultFloorId);
  const [areaId, setAreaId] = useState(agent?.areaId ?? floors.find(floor => floor.id === floorId)?.areas[0]?.id ?? '');
  const floor = floors.find(item => item.id === floorId) ?? floors[0];
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({ ...(agent ?? starterAgents[0]), id: agent?.id ?? crypto.randomUUID(), name: String(form.get('name')).trim(), role: String(form.get('role')).trim(), task: String(form.get('task')).trim(), floorId, areaId: String(form.get('areaId')), color: String(form.get('color')), look: agent?.look ?? randomLook, status: agent?.status ?? 'idle', update: agent?.update ?? 'Disponível para receber uma tarefa' });
    onClose();
  }
  return <div className="office-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="office-editor" onSubmit={submit}>
      <div className="office-editor-heading"><div><span className="office-kicker">CONFIGURAÇÃO DO ESCRITÓRIO</span><h2>{agent ? 'Editar agente' : 'Adicionar agente'}</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={19}/></button></div>
      <label>Nome<input name="name" defaultValue={agent?.name} required maxLength={36} placeholder="Ex. Nina" /></label>
      <label>Especialidade<input name="role" defaultValue={agent?.role} required maxLength={48} placeholder="Ex. Pesquisa de mercado" /></label>
      <label>Tarefa de demonstração<input name="task" defaultValue={agent?.task} required maxLength={100} placeholder="O que este agente fará" /></label>
      <label>Andar<select value={floor?.id ?? ''} onChange={event => { const nextId = event.target.value; setFloorId(nextId); setAreaId(floors.find(item => item.id === nextId)?.areas[0]?.id ?? ''); }} required>{floors.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="office-form-row"><label>Sala<select name="areaId" value={areaId} onChange={event => setAreaId(event.target.value)} required>{(floor?.areas ?? []).map(area => <option key={area.id} value={area.id}>{area.name} · {roomKinds.find(kind => kind.id === area.kind)?.label ?? 'Baia'}</option>)}</select></label><label>Cor da roupa<input name="color" type="color" defaultValue={agent?.color ?? randomColor} /></label></div>
      <p className="office-editor-note">Esta configuração fica salva neste navegador. A conexão com um executor real poderá preencher o status e as tarefas depois.</p>
      <div className="office-editor-actions"><button type="button" className="office-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="office-primary"><Save size={16}/> Salvar agente</button></div>
    </form>
  </div>;
}

function SpaceEditor({ floors, selectedFloorId, onSelectFloor, onAddFloor, onRenameFloor, onDeleteFloor, onAddArea, onUpdateArea, onDeleteArea, onAddProp, onUpdateProp, onDeleteProp, onClose }: {
  floors: OfficeFloor[];
  selectedFloorId: string;
  onSelectFloor: (id: string) => void;
  onAddFloor: () => void;
  onRenameFloor: (id: string, name: string) => void;
  onDeleteFloor: (id: string) => void;
  onAddArea: (floorId: string, name: string, kind: OfficeRoomKind) => void;
  onUpdateArea: (floorId: string, areaId: string, values: Partial<OfficeArea>) => void;
  onDeleteArea: (floorId: string, areaId: string) => void;
  onAddProp: (floorId: string, kind: OfficePropKind) => void;
  onUpdateProp: (floorId: string, propId: string, values: Partial<OfficeProp>) => void;
  onDeleteProp: (floorId: string, propId: string) => void;
  onClose: () => void;
}) {
  const floor = floors.find(item => item.id === selectedFloorId) ?? floors[0];
  const [areaName, setAreaName] = useState('');
  const [newRoomKind, setNewRoomKind] = useState<OfficeRoomKind>('bay');
  function addArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!floor || !areaName.trim()) return;
    onAddArea(floor.id, areaName.trim(), newRoomKind);
    setAreaName('');
  }
  return <div className="office-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="office-space-editor" role="dialog" aria-modal="true" aria-labelledby="office-space-title">
      <div className="office-editor-heading"><div><span className="office-kicker">PERSONALIZE SEU ESCRITÓRIO</span><h2 id="office-space-title">Andares e salas</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={19}/></button></div>
      <div className="office-floor-tabs">{floors.map(item => <button type="button" key={item.id} className={item.id === floor?.id ? 'is-active' : ''} onClick={() => onSelectFloor(item.id)}><Layers size={14}/>{item.name}</button>)}<button type="button" className="office-add-floor" onClick={onAddFloor}><Plus size={15}/> Novo andar</button></div>
      {floor && <div className="office-space-content">
        <label className="office-space-name">Nome do andar<input value={floor.name} onChange={event => onRenameFloor(floor.id, event.target.value)} maxLength={40} /></label>
        <div className="office-space-list-heading"><div><h3>Salas deste andar</h3><p>Crie baias, reuniões e espaços de descanso; ajuste posição e cor no mapa.</p></div><button type="button" className="office-delete-space" disabled={floors.length <= 1} onClick={() => onDeleteFloor(floor.id)}><Trash2 size={14}/> Excluir andar</button></div>
        <div className="office-area-editor-list">{floor.areas.map((area, index) => <div className="office-area-editor-row" key={area.id}>
          <span className="office-area-number" style={{ '--area-accent': area.color } as CSSProperties}>{String(index + 1).padStart(2, '0')}</span>
          <label className="office-area-name">Nome<input value={area.name} onChange={event => onUpdateArea(floor.id, area.id, { name: event.target.value })} maxLength={32}/></label>
          <label className="office-room-kind">Tipo<select value={area.kind ?? 'bay'} onChange={event => onUpdateArea(floor.id, area.id, { kind: event.target.value as OfficeRoomKind })}>{roomKinds.map(kind => <option key={kind.id} value={kind.id}>{kind.label}</option>)}</select></label>
          <label className="office-area-coordinate">X<input type="number" min={12} max={88} value={area.x} onChange={event => onUpdateArea(floor.id, area.id, { x: Math.max(12, Math.min(88, Number(event.target.value))) })}/></label>
          <label className="office-area-coordinate">Y<input type="number" min={25} max={75} value={area.y} onChange={event => onUpdateArea(floor.id, area.id, { y: Math.max(25, Math.min(75, Number(event.target.value))) })}/></label>
          <label className="office-area-color" title="Cor da área"><input type="color" value={area.color} onChange={event => onUpdateArea(floor.id, area.id, { color: event.target.value })}/></label>
          <button type="button" className="office-icon-button office-remove-area" disabled={floor.areas.length <= 1} onClick={() => onDeleteArea(floor.id, area.id)} aria-label={`Excluir área ${area.name}`}><Trash2 size={15}/></button>
        </div>)}</div>
        <form className="office-add-area-form" onSubmit={addArea}><input value={areaName} onChange={event => setAreaName(event.target.value)} maxLength={32} required placeholder="Nome da nova sala"/><select value={newRoomKind} onChange={event => setNewRoomKind(event.target.value as OfficeRoomKind)} aria-label="Tipo da nova sala">{roomKinds.map(kind => <option key={kind.id} value={kind.id}>{kind.label}</option>)}</select><button type="submit" className="office-primary"><Plus size={15}/> Criar sala</button></form>
        <div className="office-space-list-heading"><div><h3>Móveis e acessos</h3><p>Posicione os itens no mapa e redimensione as mesas de reunião.</p></div></div>
        <div className="office-prop-editor-list">{(floor.props ?? []).map(prop => <div key={prop.id} className="office-prop-editor-row"><strong>{prop.name}</strong><label>X<input type="number" min={4} max={96} value={prop.x} onChange={event => onUpdateProp(floor.id, prop.id, { x: Math.max(4, Math.min(96, Number(event.target.value))) })}/></label><label>Y<input type="number" min={18} max={92} value={prop.y} onChange={event => onUpdateProp(floor.id, prop.id, { y: Math.max(18, Math.min(92, Number(event.target.value))) })}/></label><label>Tamanho<input type="number" min={36} max={180} value={prop.size} onChange={event => onUpdateProp(floor.id, prop.id, { size: Math.max(36, Math.min(180, Number(event.target.value))) })}/></label><button type="button" className="office-icon-button office-remove-area" onClick={() => onDeleteProp(floor.id, prop.id)} aria-label={`Excluir ${prop.name}`}><Trash2 size={15}/></button></div>)}</div>
        <div className="office-prop-add-list">{propCatalog.map(item => <button type="button" key={item.kind} onClick={() => onAddProp(floor.id, item.kind)}><Plus size={13}/>{item.name}</button>)}</div>
        <p className="office-editor-note">As mudanças ficam salvas neste navegador. Agentes já vinculados a uma área são movidos automaticamente quando ela é removida.</p>
      </div>}
    </section>
  </div>;
}

function EventSettingsEditor({ settings, onUpdate, onPreview, onClose }: { settings: OfficeEventSettings; onUpdate: (settings: OfficeEventSettings) => void; onPreview: (milestone: OfficeMilestone) => void; onClose: () => void }) {
  const setMilestone = (id: string, values: Partial<OfficeMilestone>) => onUpdate({ ...settings, milestones: settings.milestones.map(item => item.id === id ? { ...item, ...values } : item) });
  const addMilestone = () => onUpdate({ ...settings, milestones: [...settings.milestones, { id: crypto.randomUUID(), name: 'Nova meta', metric: 'sales', target: 100, enabled: true }] });
  const removeMilestone = (id: string) => onUpdate({ ...settings, milestones: settings.milestones.filter(item => item.id !== id) });
  return <div className="office-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="office-space-editor office-event-editor" role="dialog" aria-modal="true" aria-labelledby="office-event-title">
    <div className="office-editor-heading"><div><span className="office-kicker">METAS E CELEBRAÇÕES</span><h2 id="office-event-title">Deixe o escritório comemorar</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={19}/></button></div>
    <p className="office-editor-note">As regras ficam neste navegador. Quando vendas e lucro estiverem conectados ao Hub, os mesmos eventos poderão ativar o tema automaticamente.</p>
    <div className="office-event-section"><div className="office-space-list-heading"><div><h3>Metas da operação</h3><p>Uma meta alcançada ocupa o tema até meia-noite local.</p></div></div>
      {settings.milestones.map(item => <div className="office-milestone-row" key={item.id}><input aria-label="Nome da meta" value={item.name} onChange={event => setMilestone(item.id, { name: event.target.value })}/><select aria-label="Indicador" value={item.metric} onChange={event => setMilestone(item.id, { metric: event.target.value as OfficeMilestone['metric'] })}><option value="sales">Vendas do dia</option><option value="profit">Lucro do dia</option></select><input aria-label="Meta" type="number" min="1" value={item.target} onChange={event => setMilestone(item.id, { target: Math.max(1, Number(event.target.value)) })}/><label className="office-switch"><input type="checkbox" checked={item.enabled} onChange={event => setMilestone(item.id, { enabled: event.target.checked })}/><span>Ativa</span></label><button type="button" className="office-secondary office-preview-celebration" onClick={() => onPreview(item)}><PartyPopper size={14}/> Testar</button><button type="button" className="office-icon-button office-remove-area" onClick={() => removeMilestone(item.id)} aria-label={`Excluir meta ${item.name}`}><Trash2 size={14}/></button></div>)}
      <button type="button" className="office-add-milestone" onClick={addMilestone}><Plus size={14}/> Nova meta</button>
    </div>
    <div className="office-event-section"><div className="office-space-list-heading"><div><h3>Temas sazonais</h3><p>O tema da meta tem prioridade; depois o sazonal volta até a data final.</p></div></div>
      <div className="office-season-row"><label>Ocasião<input value={settings.season.name} maxLength={32} onChange={event => onUpdate({ ...settings, season: { ...settings.season, name: event.target.value } })} placeholder="Ex.: Festa Junina"/></label><label>Começa<input type="date" value={`2026-${settings.season.start}`} onChange={event => onUpdate({ ...settings, season: { ...settings.season, start: event.target.value.slice(5) } })}/></label><label>Termina<input type="date" value={`2026-${settings.season.end}`} onChange={event => onUpdate({ ...settings, season: { ...settings.season, end: event.target.value.slice(5) } })}/></label><label className="office-switch"><input type="checkbox" checked={settings.season.enabled} onChange={event => onUpdate({ ...settings, season: { ...settings.season, enabled: event.target.checked } })}/><span>Ativo</span></label></div>
      <p className="office-editor-note">As datas se repetem todos os anos. Configure Natal, Festa Junina ou outra ocasião; uma comemoração de meta sempre aparece por cima.</p>
    </div><div className="office-editor-actions"><button type="button" className="office-primary" onClick={onClose}><Save size={15}/> Concluir</button></div>
  </section></div>;
}

export default function AgentOfficeView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const pageRef = useRef<HTMLDivElement>(null);
  const storageKey = `hub-agent-office:v${STORAGE_VERSION}:${user?.uid ?? 'local'}`;
  const legacyStorageKey = `hub-agent-office:v${LEGACY_STORAGE_VERSION}:${user?.uid ?? 'local'}`;
  const [floors, setFloors] = useState<OfficeFloor[]>(starterFloors);
  const [eventSettings, setEventSettings] = useState<OfficeEventSettings>(defaultEventSettings);
  const [activeFloorId, setActiveFloorId] = useState(MAIN_FLOOR_ID);
  const [agents, setAgents] = useState<OfficeAgent[]>(starterAgents);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState('ops');
  const [editingAgent, setEditingAgent] = useState<OfficeAgent | null | undefined>(undefined);
  const [editingSpaces, setEditingSpaces] = useState(false);
  const [editingEvents, setEditingEvents] = useState(false);
  const [simulation, setSimulation] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [eventLog, setEventLog] = useState<string[]>(['O escritório está pronto para configurar os agentes.']);
  const [reviewIds, setReviewIds] = useState<Set<string>>(new Set());
  const [meeting, setMeeting] = useState<OfficeMeeting | null>(null);
  const meetingTimer = useRef<number | undefined>(undefined);
  const [calendarTick, setCalendarTick] = useState(0);
  const previousStorageKey = `hub-agent-office:v${PREVIOUS_STORAGE_VERSION}:${user?.uid ?? 'local'}`;
  const oldestStorageKey = `hub-agent-office:v${LEGACY_STORAGE_VERSION}:${user?.uid ?? 'local'}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved) as { agents?: OfficeAgent[]; floors?: OfficeFloor[]; activeFloorId?: string; eventSettings?: OfficeEventSettings };
        if (Array.isArray(data.agents) && Array.isArray(data.floors) && data.floors.every(floor => typeof floor.id === 'string' && Array.isArray(floor.areas))) {
          setFloors(data.floors.map(floor => ({ ...floor, props: Array.isArray(floor.props) ? floor.props : [], areas: floor.areas.map(area => ({ ...area, kind: area.kind ?? 'bay' })) })));
          setAgents(data.agents.map(agent => ({ ...agent, status: 'idle', update: 'Disponível para receber uma tarefa' })));
          setActiveFloorId(data.floors.some(floor => floor.id === data.activeFloorId) ? data.activeFloorId! : data.floors[0]?.id ?? MAIN_FLOOR_ID);
          if (data.eventSettings) setEventSettings(data.eventSettings);
        } else {
          throw new Error('Formato local inválido');
        }
      } else {
        const previous = localStorage.getItem(previousStorageKey);
        if (previous) {
          const data = JSON.parse(previous) as { agents?: OfficeAgent[]; floors?: OfficeFloor[]; activeFloorId?: string };
          if (Array.isArray(data.agents) && Array.isArray(data.floors)) {
            setFloors(data.floors.map(floor => ({ ...floor, props: [], areas: floor.areas.map(area => ({ ...area, kind: area.kind ?? 'bay' })) })));
            setAgents(data.agents.map(agent => ({ ...agent, status: 'idle', update: 'Disponível para receber uma tarefa' })));
            setActiveFloorId(data.floors.some(floor => floor.id === data.activeFloorId) ? data.activeFloorId! : data.floors[0]?.id ?? MAIN_FLOOR_ID);
          }
        }
        const legacy = previous ? null : localStorage.getItem(oldestStorageKey);
        if (legacy) {
          const data = JSON.parse(legacy) as Array<OfficeAgent & { zone?: string }>;
          if (Array.isArray(data)) setAgents(data.map(agent => ({ ...agent, floorId: MAIN_FLOOR_ID, areaId: agent.areaId ?? agent.zone ?? 'ops', status: 'idle', update: 'Disponível para receber uma tarefa' })));
        }
      }
    } catch { /* Dados locais inválidos voltam à configuração inicial. */ }
    setLoaded(true);
  }, [storageKey, previousStorageKey, oldestStorageKey]);

  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify({ agents, floors, activeFloorId, eventSettings }));
  }, [agents, floors, activeFloorId, eventSettings, loaded, storageKey]);

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

  useEffect(() => () => { if (meetingTimer.current) window.clearTimeout(meetingTimer.current); }, []);

  const activeFloor = floors.find(floor => floor.id === activeFloorId) ?? floors[0];
  const visibleAgents = agents.filter(agent => agent.floorId === activeFloor?.id || (meeting?.floorId === activeFloor?.id && meeting.participants.includes(agent.id)));
  const selected = useMemo(() => visibleAgents.find(agent => agent.id === selectedId) ?? visibleAgents[0], [visibleAgents, selectedId]);
  const reviewAgents = visibleAgents.filter(agent => reviewIds.has(agent.id));
  const workingCount = visibleAgents.filter(agent => agent.status === 'working').length;
  const activeCelebration = eventSettings.celebration && eventSettings.celebration.until > Date.now() ? eventSettings.celebration : undefined;
  const today = new Date();
  const todayKey = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const seasonalActive = eventSettings.season.enabled && (eventSettings.season.start <= eventSettings.season.end
    ? todayKey >= eventSettings.season.start && todayKey <= eventSettings.season.end
    : todayKey >= eventSettings.season.start || todayKey <= eventSettings.season.end);

  useEffect(() => {
    const celebration = eventSettings.celebration;
    if (!celebration) return;
    const delay = celebration.until - Date.now();
    if (delay <= 0) {
      setEventSettings(current => current.celebration?.until === celebration.until ? { ...current, celebration: undefined } : current);
      return;
    }
    const timer = window.setTimeout(() => setEventSettings(current => current.celebration?.until === celebration.until ? { ...current, celebration: undefined } : current), delay + 100);
    return () => window.clearTimeout(timer);
  }, [eventSettings.celebration]);

  useEffect(() => {
    const now = new Date();
    const untilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime() + 1000;
    const timer = window.setTimeout(() => setCalendarTick(value => value + 1), untilMidnight);
    return () => window.clearTimeout(timer);
  }, [calendarTick]);

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
    setActiveFloorId(agent.floorId);
    setSelectedId(agent.id);
    toast.success('Agente salvo neste navegador.');
  }

  function addFloor() {
    const id = crypto.randomUUID();
    const index = floors.length + 1;
    const floor: OfficeFloor = { id, name: `Andar ${index}`, props: [{ id: crypto.randomUUID(), kind: 'stairs', name: 'Escada para os andares', x: 91, y: 82, size: 70 }], areas: [
      { id: crypto.randomUUID(), name: 'Baia de foco', x: 23, y: 35, color: '#67c9c0', kind: 'bay' },
      { id: crypto.randomUUID(), name: 'Reuniões', x: 75, y: 35, color: '#7dbb82', kind: 'meeting' },
      { id: crypto.randomUUID(), name: 'Criação', x: 24, y: 73, color: '#d48dc1', kind: 'presentation' },
      { id: crypto.randomUUID(), name: 'Descanso', x: 74, y: 73, color: '#dfa950', kind: 'lounge' },
    ] };
    setFloors(current => [...current, floor]);
    setActiveFloorId(id);
    setSelectedId('');
    toast.success(`${floor.name} criado com quatro áreas editáveis.`);
  }

  function renameFloor(floorId: string, name: string) {
    setFloors(current => current.map(floor => floor.id === floorId ? { ...floor, name } : floor));
  }

  function deleteFloor(floorId: string) {
    if (floors.length <= 1) return;
    const nextFloor = floors.find(floor => floor.id !== floorId);
    if (!nextFloor) return;
    const destinationAreaId = nextFloor.areas[0]?.id;
    setFloors(current => current.filter(floor => floor.id !== floorId));
    setAgents(current => current.map(agent => agent.floorId === floorId ? { ...agent, floorId: nextFloor.id, areaId: destinationAreaId ?? '' } : agent));
    setActiveFloorId(nextFloor.id);
    setSelectedId('');
    toast.success('Andar excluído; os agentes foram movidos para o primeiro andar.');
  }

  function addArea(floorId: string, name: string, kind: OfficeRoomKind = 'bay') {
    const floor = floors.find(item => item.id === floorId);
    if (!floor) return;
    const positions = [{ x: 49, y: 45 }, { x: 50, y: 68 }, { x: 34, y: 53 }, { x: 66, y: 53 }, { x: 50, y: 74 }];
    const position = positions[floor.areas.length % positions.length];
    const area: OfficeArea = { id: crypto.randomUUID(), name, ...position, color: ['#65c1bd', '#f0a96f', '#a695dc', '#df8eaa'][floor.areas.length % 4], kind };
    setFloors(current => current.map(item => item.id === floorId ? { ...item, areas: [...item.areas, area] } : item));
    toast.success(`Área “${name}” criada.`);
  }

  function updateArea(floorId: string, areaId: string, values: Partial<OfficeArea>) {
    setFloors(current => current.map(floor => floor.id === floorId ? { ...floor, areas: floor.areas.map(area => area.id === areaId ? { ...area, ...values } : area) } : floor));
  }

  function deleteArea(floorId: string, areaId: string) {
    const floor = floors.find(item => item.id === floorId);
    const destinationArea = floor?.areas.find(area => area.id !== areaId);
    if (!floor || !destinationArea || floor.areas.length <= 1) return;
    setFloors(current => current.map(item => item.id === floorId ? { ...item, areas: item.areas.filter(area => area.id !== areaId) } : item));
    setAgents(current => current.map(agent => agent.floorId === floorId && agent.areaId === areaId ? { ...agent, areaId: destinationArea.id } : agent));
    toast.success(`Agentes movidos para “${destinationArea.name}”; área excluída.`);
  }

  function addProp(floorId: string, kind: OfficePropKind) {
    const item = propCatalog.find(prop => prop.kind === kind);
    if (!item) return;
    const prop: OfficeProp = { id: crypto.randomUUID(), kind, name: item.name, x: 50, y: 60, size: kind === 'meeting-table' ? 118 : 76 };
    setFloors(current => current.map(floor => floor.id === floorId ? { ...floor, props: [...(floor.props ?? []), prop] } : floor));
    toast.success(`${item.name} adicionado ao mapa.`);
  }

  function updateProp(floorId: string, propId: string, values: Partial<OfficeProp>) {
    setFloors(current => current.map(floor => floor.id === floorId ? { ...floor, props: (floor.props ?? []).map(prop => prop.id === propId ? { ...prop, ...values } : prop) } : floor));
  }

  function deleteProp(floorId: string, propId: string) {
    setFloors(current => current.map(floor => floor.id === floorId ? { ...floor, props: (floor.props ?? []).filter(prop => prop.id !== propId) } : floor));
  }

  function previewCelebration(milestone: OfficeMilestone) {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    setEventSettings(current => ({ ...current, celebration: { title: milestone.name || (milestone.metric === 'sales' ? `${milestone.target} vendas no dia` : `R$ ${milestone.target} de lucro`), until: midnight } }));
    setEventLog(current => [`${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · comemoração demonstrativa ativada até meia-noite.`, ...current].slice(0, 6));
    toast.success('Comemoração ativada até meia-noite.');
  }

  function callTeamMeeting() {
    const room = activeFloor?.areas.find(area => area.kind === 'meeting');
    if (!activeFloor || !room) {
      toast.info('Crie ou transforme uma sala em “Sala de reunião” nas opções de espaços.');
      setEditingSpaces(true);
      return;
    }
    if (!agents.length) { toast.info('Adicione agentes antes de iniciar uma reunião.'); return; }
    if (meeting) { toast.info('A reunião simulada atual ainda está em andamento.'); return; }
    const participants = agents.map(agent => agent.id);
    const previous = agents.map(({ id, status, update }) => ({ id, status, update }));
    setMeeting({ floorId: activeFloor.id, areaId: room.id, participants, previous });
    setAgents(current => current.map(agent => participants.includes(agent.id) ? { ...agent, status: 'working', update: 'Participando de uma reunião simulada com DaVinci' } : agent));
    setEventLog(current => [`${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · DaVinci reuniu ${participants.length} agentes na sala ${room.name}.`, ...current].slice(0, 6));
    toast.success('Reunião simulada iniciada; os sprites estão indo para a sala.');
    meetingTimer.current = window.setTimeout(() => {
      setMeeting(null);
      setAgents(current => current.map(agent => { const old = previous.find(item => item.id === agent.id); return old ? { ...agent, status: old.status, update: 'Reunião demonstrativa concluída' } : agent; }));
      setEventLog(current => [`${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · a reunião simulada terminou; o time voltou às estações.`, ...current].slice(0, 6));
    }, 14000);
  }

  function selectFloor(floorId: string) {
    setActiveFloorId(floorId);
    setSelectedId(agents.find(agent => agent.floorId === floorId)?.id ?? '');
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
      <div className="agent-office-controls"><span className="office-live-badge"><i/> {simulation ? 'Demonstração ativa' : 'Agentes simulados'}</span><button type="button" className="office-toolbar-button" onClick={() => setEditingAgent(null)}><Plus size={16}/> Novo agente</button><button type="button" className="office-toolbar-button" onClick={() => setEditingEvents(true)}><CalendarDays size={16}/> Metas e temas</button><button type="button" className="office-toolbar-button" onClick={callTeamMeeting}><Users size={16}/> Chamar reunião</button><button type="button" className="office-toolbar-button" onClick={toggleSimulation}>{simulation ? <Pause size={16}/> : <Play size={16}/>} {simulation ? 'Pausar simulação' : 'Simular atividade'}</button><button type="button" className="office-fullscreen-button" onClick={toggleFullscreen} title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>{fullscreen ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}<span>{fullscreen ? 'Sair da tela cheia' : 'Focar no monitor'}</span></button></div>
    </header>
    <div className="agent-office-body">
      <section className="agent-office-map-column">
        <div className="agent-office-map-title"><div><p className="office-kicker">{activeFloor?.name ?? 'Escritório'} <span>·</span> {visibleAgents.length} pessoas · {activeFloor?.areas.length ?? 0} salas</p><h2>Seu time, em um só lugar</h2></div><div className="office-map-actions"><label className="office-floor-select-label"><Layers size={15}/><select value={activeFloor?.id ?? ''} onChange={event => selectFloor(event.target.value)} aria-label="Selecionar andar">{floors.map(floor => <option key={floor.id} value={floor.id}>{floor.name}</option>)}</select></label><button className="office-edit-layout" type="button" onClick={() => setEditingSpaces(true)}><Pencil size={15}/> Personalizar espaços</button><button className="office-edit-layout" type="button" onClick={() => setEditingAgent(null)}><Plus size={15}/> Novo agente</button></div></div>
        <OfficeRoom agents={visibleAgents} areas={activeFloor?.areas ?? []} props={activeFloor?.props ?? []} floorId={activeFloor?.id ?? MAIN_FLOOR_ID} meeting={meeting} selectedId={selected?.id ?? ''} simulation={simulation} fullscreen={fullscreen} onExitFullscreen={toggleFullscreen} reviewIds={reviewIds} celebration={activeCelebration} season={seasonalActive && !activeCelebration ? eventSettings.season.name : undefined} onSelect={agent => setSelectedId(agent.id)}/>
        <div className="agent-office-map-footer"><span><i className="office-dot office-dot-working"/> {workingCount} trabalhando</span><span><i className="office-dot office-dot-review"/> {reviewAgents.length} para revisar</span><span className="office-map-credit">Personagens: Habblaud · móveis: Pixel Agents (MIT)</span></div>
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
          <div className="office-agent-list">{agents.map(agent => <button type="button" key={agent.id} className={`office-agent-row ${selected?.id === agent.id ? 'is-selected' : ''}`} onClick={() => { setActiveFloorId(agent.floorId); setSelectedId(agent.id); }}><span className="office-row-avatar" style={{ '--agent-accent': agent.color } as CSSProperties}><Sprite agent={agent} working={false}/></span><span className="office-row-copy"><strong>{agent.name}</strong><small>{floors.find(floor => floor.id === agent.floorId)?.name ?? 'Andar'} · {floors.find(floor => floor.id === agent.floorId)?.areas.find(area => area.id === agent.areaId)?.name ?? 'Área'} · {agent.role}</small></span><i className="office-row-status" style={{ backgroundColor: statusColor[agent.status] }}/><span className="office-row-edit" role="button" aria-label={`Editar ${agent.name}`} onClick={event => { event.stopPropagation(); setEditingAgent(agent); }}><Pencil size={14}/></span></button>)}</div>
        </section>
        <section className="office-side-card office-activity-card"><div className="office-side-heading"><div><span className="office-kicker">ACOMPANHAMENTO</span><h2>Atividade recente</h2></div><span className="office-log-indicator"><i/></span></div><div className="office-activity-list">{eventLog.map((entry,index) => <p key={`${entry}-${index}`}><i/>{entry}</p>)}</div><div className="office-connection-note"><span className="office-connection-icon"><Sparkles size={15}/></span><span><strong>Modo demonstrativo</strong><small>A VPS e os agentes ainda não estão conectados.</small></span></div></section>
      </aside>
    </div>
    <AnimatePresence>{editingAgent !== undefined && <motion.div key="agent-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AgentEditor agent={editingAgent ?? undefined} floors={floors} defaultFloorId={activeFloor?.id ?? MAIN_FLOOR_ID} onSave={saveAgent} onClose={() => setEditingAgent(undefined)}/></motion.div>}</AnimatePresence>
    <AnimatePresence>{editingSpaces && <motion.div key="space-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><SpaceEditor floors={floors} selectedFloorId={activeFloor?.id ?? MAIN_FLOOR_ID} onSelectFloor={selectFloor} onAddFloor={addFloor} onRenameFloor={renameFloor} onDeleteFloor={deleteFloor} onAddArea={addArea} onUpdateArea={updateArea} onDeleteArea={deleteArea} onAddProp={addProp} onUpdateProp={updateProp} onDeleteProp={deleteProp} onClose={() => setEditingSpaces(false)}/></motion.div>}</AnimatePresence>
    <AnimatePresence>{editingEvents && <motion.div key="event-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><EventSettingsEditor settings={eventSettings} onUpdate={setEventSettings} onPreview={previewCelebration} onClose={() => setEditingEvents(false)}/></motion.div>}</AnimatePresence>
  </div>;
}
