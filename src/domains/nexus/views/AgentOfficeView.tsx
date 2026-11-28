import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Bot, Check, CircleHelp, Layers, Maximize2, Minimize2, MessageCircle, Pause, Pencil, Play, Plus, Save, Sparkles, Trash2, X, PartyPopper, CalendarDays, DoorOpen, Armchair, Users, Gamepad2, Presentation, Move, LayoutGrid, RotateCw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@auth/contexts/AuthContext';
import { useTransactions } from '@/hooks/queries/useFinance';
import { agentPose, HabblaudCharacter } from '../officeArt/HabblaudCharacter';
import { consumeOfficeRoomSync, getOfficeRoomSyncEventName } from '../officeRoomSync';
import './AgentOfficeView.css';

type AgentStatus = 'idle' | 'working' | 'review';
type OfficeRoomKind = 'bay' | 'meeting' | 'presentation' | 'lounge' | 'game';
type OfficeOperationKind = 'general' | 'product' | 'niche' | 'blog';
type OfficeFloorStyle = 'oak' | 'walnut' | 'stone' | 'carpet' | 'sage';
type OfficePropKind = 'desk' | 'meeting-table' | 'sofa' | 'plant' | 'stairs' | 'chair' | 'coffee-table' | 'bookshelf' | 'whiteboard';

const roomKinds: { id: OfficeRoomKind; label: string; icon: typeof DoorOpen }[] = [
  { id: 'bay', label: 'Baia de trabalho', icon: DoorOpen },
  { id: 'meeting', label: 'Sala de reunião', icon: Users },
  { id: 'presentation', label: 'Sala de apresentação', icon: Presentation },
  { id: 'lounge', label: 'Sala de descanso', icon: Armchair },
  { id: 'game', label: 'Sala de jogos', icon: Gamepad2 },
];

const operationKinds: { id: OfficeOperationKind; label: string }[] = [
  { id: 'general', label: 'Operação geral' },
  { id: 'product', label: 'Produto' },
  { id: 'niche', label: 'Nicho' },
  { id: 'blog', label: 'Blog ou canal' },
];

interface OfficeProp { id: string; kind: OfficePropKind; name: string; x: number; y: number; size: number }
interface OfficeMilestone { id: string; name: string; metric: 'sales' | 'profit'; target: number; enabled: boolean }
interface OfficeSeason { name: string; start: string; end: string; enabled: boolean }
type CelebrationTheme = 'spark' | 'gold' | 'confetti';
type CelebrationDuration = 'midnight' | '2' | '6' | '12' | '24';
interface OfficeCelebration { title: string; until: number; milestoneId?: string; theme?: CelebrationTheme }
interface OfficeEventSettings { milestones: OfficeMilestone[]; season: OfficeSeason; celebration?: OfficeCelebration; seasonPreviewUntil?: number; celebrationTheme?: CelebrationTheme; celebrationDuration?: CelebrationDuration; triggeredMilestones?: Record<string, string>; simulatedCompleted?: number; completedDate?: string }
interface OfficeMeeting { floorId: string; areaId: string; participants: string[]; previous: Array<Pick<OfficeAgent, 'id' | 'status' | 'update'>>; arrived: boolean }

interface OfficeArea {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  kind?: OfficeRoomKind;
}

interface OfficeOperation { id: string; name: string; kind: OfficeOperationKind; sourceId?: string }

interface OfficeFloor {
  id: string;
  name: string;
  purpose?: string;
  operationId: string;
  floorStyle: OfficeFloorStyle;
  floorColor: string;
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
  walking?: boolean;
}

const STORAGE_VERSION = 7;
const PREVIOUS_STORAGE_VERSION = 6;
const OLDER_STORAGE_VERSION = 5;
const OLDER_SUPPORTED_STORAGE_VERSION = 4;
const LEGACY_STORAGE_VERSION = 1;
const MAIN_FLOOR_ID = 'floor-main';
const MAIN_OPERATION_ID = 'operation-main';
const furniture = '/assets/agent-office/furniture';
const starterAreas: OfficeArea[] = [
  { id: 'ops', name: 'Operações', x: 22, y: 31, color: '#67c9c0', kind: 'bay' },
  { id: 'finance', name: 'Financeiro', x: 75, y: 31, color: '#7dbb82', kind: 'bay' },
  { id: 'content', name: 'Conteúdo', x: 24, y: 71, color: '#d48dc1', kind: 'bay' },
  { id: 'development', name: 'Desenvolvimento', x: 74, y: 71, color: '#dfa950', kind: 'bay' },
  { id: 'meeting-room', name: 'Sala de reunião', x: 50, y: 50, color: '#8dbeb6', kind: 'meeting' },
];
function createDefaultFurnitureProps(floorId: string, areas: OfficeArea[]): OfficeProp[] {
  const meetingRoom = areas.find(area => area.kind === 'meeting') ?? { x: 50, y: 50 };
  return [
    { id: `${floorId}-meeting-table`, kind: 'meeting-table', name: 'Mesa de reunião', x: meetingRoom.x, y: Math.min(88, meetingRoom.y + 3), size: 140 },
    { id: `${floorId}-stairs`, kind: 'stairs', name: 'Escada para os andares', x: 91, y: 82, size: 70 },
    { id: `${floorId}-sofa`, kind: 'sofa', name: 'Sofá', x: 47, y: 53, size: 112 },
    { id: `${floorId}-coffee-table`, kind: 'coffee-table', name: 'Mesa de centro', x: 51, y: 37, size: 50 },
    { id: `${floorId}-bookshelf`, kind: 'bookshelf', name: 'Estante', x: 6, y: 57, size: 62 },
    { id: `${floorId}-whiteboard`, kind: 'whiteboard', name: 'Quadro branco', x: 94, y: 57, size: 60 },
    { id: `${floorId}-plant-left`, kind: 'plant', name: 'Planta de canto', x: 6, y: 35, size: 44 },
    { id: `${floorId}-plant-right`, kind: 'plant', name: 'Planta de canto', x: 94, y: 35, size: 44 },
  ];
}
const starterOperations: OfficeOperation[] = [{ id: MAIN_OPERATION_ID, name: 'Operação principal', kind: 'general' }];
const starterFloors: OfficeFloor[] = [{ id: MAIN_FLOOR_ID, operationId: MAIN_OPERATION_ID, name: 'Andar principal', purpose: 'Operação geral', floorStyle: 'oak', floorColor: '#d9ae72', areas: starterAreas, props: createDefaultFurnitureProps(MAIN_FLOOR_ID, starterAreas) }];

function createOperationFloor(operationId: string, operationName: string, floorName = 'Andar térreo', floorStyle: OfficeFloorStyle = 'sage'): OfficeFloor {
  const id = crypto.randomUUID();
  const areas: OfficeArea[] = [
    { id: crypto.randomUUID(), name: operationName.slice(0, 32), x: 28, y: 35, color: '#70c7bd', kind: 'bay' },
    { id: crypto.randomUUID(), name: 'Planejamento', x: 72, y: 35, color: '#82aee2', kind: 'presentation' },
    { id: crypto.randomUUID(), name: 'Reunião', x: 31, y: 72, color: '#d2a579', kind: 'meeting' },
    { id: crypto.randomUUID(), name: 'Pausa', x: 72, y: 72, color: '#c38fbd', kind: 'lounge' },
  ];
  const colors: Record<OfficeFloorStyle, string> = { oak: '#d9ae72', walnut: '#76513e', stone: '#a6a6a0', carpet: '#8e8298', sage: '#95ad88' };
  return { id, operationId, name: floorName, purpose: 'Operação geral', floorStyle, floorColor: colors[floorStyle], areas, props: createDefaultFurnitureProps(id, areas) };
}

type OfficeFloorTemplate = 'operations' | 'content' | 'campaigns' | 'product' | 'meeting';
const floorTemplates: { id: OfficeFloorTemplate; name: string; purpose: string; areas: Array<{ name: string; kind: OfficeRoomKind; color: string }> }[] = [
  { id: 'operations', name: 'Operações', purpose: 'Operação geral', areas: [{ name: 'Equipe', kind: 'bay', color: '#67c9c0' }, { name: 'Planejamento', kind: 'presentation', color: '#82aee2' }, { name: 'Reunião', kind: 'meeting', color: '#d2a579' }, { name: 'Pausa', kind: 'lounge', color: '#c38fbd' }] },
  { id: 'content', name: 'Conteúdo', purpose: 'Conteúdo', areas: [{ name: 'Redação', kind: 'bay', color: '#d48dc1' }, { name: 'Revisão', kind: 'presentation', color: '#82aee2' }, { name: 'Brainstorm', kind: 'meeting', color: '#d2a579' }, { name: 'Pausa', kind: 'lounge', color: '#c38fbd' }] },
  { id: 'campaigns', name: 'Campanhas', purpose: 'Campanhas', areas: [{ name: 'Planejamento', kind: 'presentation', color: '#82aee2' }, { name: 'Criativos', kind: 'bay', color: '#d48dc1' }, { name: 'Revisão', kind: 'meeting', color: '#d2a579' }] },
  { id: 'product', name: 'Produto', purpose: 'Produto', areas: [{ name: 'Desenvolvimento', kind: 'bay', color: '#67c9c0' }, { name: 'Testes', kind: 'presentation', color: '#82aee2' }, { name: 'Reunião', kind: 'meeting', color: '#d2a579' }] },
  { id: 'meeting', name: 'Reuniões', purpose: 'Reuniões', areas: [{ name: 'Sala principal', kind: 'meeting', color: '#d2a579' }, { name: 'Apresentação', kind: 'presentation', color: '#82aee2' }, { name: 'Descanso', kind: 'lounge', color: '#c38fbd' }] },
];

function createTemplateFloor(operationId: string, index: number, templateId: OfficeFloorTemplate, style: OfficeFloorStyle): OfficeFloor {
  const template = floorTemplates.find(item => item.id === templateId) ?? floorTemplates[0];
  const colors: Record<OfficeFloorStyle, string> = { oak: '#d9ae72', walnut: '#76513e', stone: '#a6a6a0', carpet: '#8e8298', sage: '#95ad88' };
  const id = crypto.randomUUID();
  const areas: OfficeArea[] = template.areas.map((item, areaIndex) => ({ id: crypto.randomUUID(), name: item.name, kind: item.kind, color: item.color, x: [28, 72, 31, 72][areaIndex % 4], y: areaIndex < 2 ? 35 : 72 }));
  return { id, operationId, name: `Andar ${index}`, purpose: template.purpose, floorStyle: style, floorColor: colors[style], areas, props: createDefaultFurnitureProps(id, areas) };
}
const defaultEventSettings: OfficeEventSettings = {
  milestones: [
    { id: 'sales-50', name: '50 vendas no dia', metric: 'sales', target: 50, enabled: true },
    { id: 'profit-1000', name: 'R$ 1.000 de resultado financeiro hoje', metric: 'profit', target: 1000, enabled: true },
  ],
  season: { name: 'Natal', start: '12-20', end: '12-26', enabled: true },
  celebrationTheme: 'spark',
  celebrationDuration: 'midnight',
  triggeredMilestones: {},
};

function normalizeOfficeEvents(settings?: OfficeEventSettings): OfficeEventSettings {
  if (!settings?.season || !Array.isArray(settings.milestones)) return defaultEventSettings;
  const activeMilestone = settings.celebration?.milestoneId
    ? settings.milestones.find(item => item.id === settings.celebration?.milestoneId)
    : settings.milestones.find(item => item.name === settings.celebration?.title);
  const celebration = settings.celebration && activeMilestone?.enabled ? settings.celebration : undefined;
  return { ...defaultEventSettings, ...settings, celebration: celebration ? { ...celebration, theme: celebration.theme ?? settings.celebrationTheme ?? 'spark' } : undefined, seasonPreviewUntil: settings.season.enabled ? settings.seasonPreviewUntil : undefined, triggeredMilestones: settings.triggeredMilestones ?? {} };
}

const starterAgents: OfficeAgent[] = [
  { id: 'ops', name: 'Nina', role: 'Operações', task: 'Organizar as prioridades da semana', floorId: MAIN_FLOOR_ID, areaId: 'ops', color: '#45c5d8', look: 0, status: 'idle', update: 'Disponível para receber uma tarefa' },
  { id: 'finance', name: 'Caio', role: 'Financeiro', task: 'Preparar o fechamento semanal', floorId: MAIN_FLOOR_ID, areaId: 'finance', color: '#54bb82', look: 1, status: 'idle', update: 'Disponível para receber uma tarefa' },
  { id: 'content', name: 'Lia', role: 'Conteúdo', task: 'Revisar o calendário de conteúdo', floorId: MAIN_FLOOR_ID, areaId: 'content', color: '#cc83d8', look: 2, status: 'idle', update: 'Disponível para receber uma tarefa' },
  { id: 'development', name: 'Theo', role: 'Desenvolvimento', task: 'Revisar uma melhoria do Hub', floorId: MAIN_FLOOR_ID, areaId: 'development', color: '#d7a44c', look: 3, status: 'idle', update: 'Disponível para receber uma tarefa' },
  { id: 'meeting-host', name: 'Maya', role: 'Facilitadora', task: 'Preparar a próxima conversa do time', floorId: MAIN_FLOOR_ID, areaId: 'meeting-room', color: '#ec806e', look: 4, status: 'idle', update: 'Aguardando a equipe na sala de reunião' },
];

type OfficeViewMode = 'floor' | 'all-floors' | 'rotate-floors';

function makeRoomAgent(area: OfficeArea, floorId: string, role = 'Equipe da operação', operationName = area.name): OfficeAgent {
  const palette = ['#45c5d8', '#54bb82', '#cc83d8', '#d7a44c', '#ec806e', '#668ce0', '#e59db2', '#94b56c'];
  const kindLabel = roomKinds.find(item => item.id === area.kind)?.label ?? role;
  return { id: crypto.randomUUID(), name: ['Nina', 'Caio', 'Lia', 'Theo', 'Maya', 'Ravi', 'Bia', 'Noah'][Math.floor(Math.random() * 8)], role: kindLabel === 'Baia de trabalho' ? role : kindLabel, task: `Acompanhar a operação de ${operationName}`, floorId, areaId: area.id, color: palette[Math.floor(Math.random() * palette.length)], look: crypto.getRandomValues(new Uint32Array(1))[0], status: 'idle', update: 'Entrou na operação na simulação' };
}

function ensureOperationAgents(operationList: OfficeOperation[], floors: OfficeFloor[], agents: OfficeAgent[]) {
  const operationIds = new Set(operationList.map(operation => operation.id));
  const extras = Array.from(operationIds).filter(operationId => !agents.some(agent => floors.some(floor => floor.operationId === operationId && floor.id === agent.floorId))).map(operationId => {
    const floor = floors.find(item => item.operationId === operationId)!;
    const area = floor.areas[0] ?? starterAreas[0];
    const operation = operationList.find(item => item.id === operationId);
    return makeRoomAgent(area, floor.id, 'Equipe da operação', operation?.name ?? 'sua operação');
  });
  return [...agents, ...extras];
}

function migrateLegacyOperations(rawFloors: OfficeFloor[], rawAgents: OfficeAgent[]) {
  const floors = rawFloors.map(floor => ({ ...floor, operationId: MAIN_OPERATION_ID, purpose: floor.purpose ?? 'Operação geral', floorStyle: floor.floorStyle ?? 'oak', floorColor: floor.floorColor ?? '#d9ae72', areas: [...floor.areas] }));
  const agents: OfficeAgent[] = rawAgents.map(agent => ({ ...agent, status: 'idle' as AgentStatus, walking: false, update: 'Disponível para receber uma tarefa' }));
  const operations = [...starterOperations];
  const generatedFloors: OfficeFloor[] = [];
  const linkedAreas = new Map<string, { kind: OfficeOperationKind; sourceId: string; area: OfficeArea; floorId: string }>();
  for (const floor of floors) for (const area of floor.areas) {
    const legacy = area as OfficeArea & { syncedKind?: 'product' | 'niche'; sourceId?: string };
    if (legacy.syncedKind && legacy.sourceId) linkedAreas.set(`${legacy.syncedKind}:${legacy.sourceId}`, { kind: legacy.syncedKind, sourceId: legacy.sourceId, area, floorId: floor.id });
  }
  for (const linked of linkedAreas.values()) {
    const operationId = `operation-${linked.kind}-${linked.sourceId}`;
    const operation: OfficeOperation = { id: operationId, name: linked.area.name, kind: linked.kind, sourceId: linked.sourceId };
    operations.push(operation);
    const floor = createOperationFloor(operationId, operation.name, 'Andar térreo', linked.kind === 'product' ? 'stone' : 'sage');
    floor.areas[0] = { ...floor.areas[0], id: linked.area.id, name: linked.area.name };
    floor.props = createDefaultFurnitureProps(floor.id, floor.areas);
    generatedFloors.push(floor);
    const existingAgents = agents.filter(agent => agent.floorId === linked.floorId && agent.areaId === linked.area.id);
    for (const agent of existingAgents) { agent.floorId = floor.id; agent.areaId = floor.areas[0].id; agent.task = `Acompanhar a operação de ${operation.name}`; agent.update = 'Transferido para sua operação'; }
    if (!existingAgents.length) agents.push(makeRoomAgent(floor.areas[0], floor.id, 'Equipe da operação', operation.name));
  }
  for (const floor of floors) {
    floor.areas = floor.areas.filter(area => !linkedAreas.has(`${(area as OfficeArea & { syncedKind?: string }).syncedKind}:${(area as OfficeArea & { sourceId?: string }).sourceId}`));
    if (!floor.areas.length) floor.areas = [{ ...starterAreas[0], id: crypto.randomUUID(), name: 'Área de trabalho' }];
  }
  const allFloors = [...floors, ...generatedFloors];
  return { operations, floors: allFloors, agents: ensureOperationAgents(operations, allFloors, agents) };
}

const statusLabel: Record<AgentStatus, string> = { idle: 'Disponível', working: 'Trabalhando', review: 'Precisa da sua revisão' };
const statusColor: Record<AgentStatus, string> = { idle: '#9ca3af', working: '#63c5da', review: '#f2bd64' };
interface OfficeMetrics { sales: number; income: number; generatedIncome: number; pendingSales: number; expenses: number; result: number; completed: number; reviews: number }
const currency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const activityStamp = (date = new Date()) => date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
function celebrationEnds(duration: CelebrationDuration | undefined, now = new Date()) {
  if (!duration || duration === 'midnight') return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  return now.getTime() + Number(duration) * 60 * 60 * 1000;
}
const propCatalog: { kind: OfficePropKind; name: string; src?: string }[] = [
  { kind: 'desk', name: 'Mesa de trabalho', src: `${furniture}/DESK/DESK_FRONT.png` },
  { kind: 'meeting-table', name: 'Mesa de reunião', src: `${furniture}/TABLE_FRONT/TABLE_FRONT.png` },
  { kind: 'sofa', name: 'Sofá', src: `${furniture}/SOFA/SOFA_FRONT.png` },
  { kind: 'plant', name: 'Planta', src: `${furniture}/LARGE_PLANT/LARGE_PLANT.png` },
  { kind: 'stairs', name: 'Escada' },
  { kind: 'chair', name: 'Cadeira', src: `${furniture}/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png` },
  { kind: 'coffee-table', name: 'Mesa de centro', src: `${furniture}/COFFEE_TABLE/COFFEE_TABLE.png` },
  { kind: 'bookshelf', name: 'Estante', src: `${furniture}/BOOKSHELF/BOOKSHELF.png` },
  { kind: 'whiteboard', name: 'Quadro branco', src: `${furniture}/WHITEBOARD/WHITEBOARD.png` },
];

function Sprite({ agent, working, poseOverride }: { agent: OfficeAgent; working: boolean; poseOverride?: 'walk' | 'sit' }) {
  const pose = poseOverride ?? (working ? 'type' : agentPose(agent.status));
  return <HabblaudCharacter seed={agent.look} outfit={agent.color} pose={pose} className={working ? 'office-sprite-working' : ''} />;
}

function OfficeRoom({ agents, areas, props = [], floorId, floorStyle, floorColor, meeting, selectedId, simulation, fullscreen, editingLayout, onMoveProp, onSelect, onExitFullscreen, reviewIds, celebration, season, metrics }: {
  agents: OfficeAgent[]; areas: OfficeArea[]; props?: OfficeProp[]; floorId: string; floorStyle: OfficeFloorStyle; floorColor: string; meeting?: OfficeMeeting | null; selectedId: string; simulation: boolean; fullscreen: boolean; editingLayout: boolean; onMoveProp: (propId: string, x: number, y: number) => void; onSelect: (agent: OfficeAgent) => void; onExitFullscreen: () => void; reviewIds: Set<string>; celebration?: OfficeCelebration; season?: string; metrics: OfficeMetrics;
}) {
  const prefersReducedMotion = useReducedMotion();
  const roomRef = useRef<HTMLDivElement>(null);
  const draggingPropId = useRef<string | null>(null);
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});
  const seasonalClass = season?.toLowerCase().includes('natal') || season?.toLowerCase().includes('christmas') ? 'theme-christmas' : season?.toLowerCase().includes('junina') || season?.toLowerCase().includes('são joão') ? 'theme-junina' : '';
  const getDragPosition = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = roomRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return { x: Math.max(4, Math.min(96, Math.round((event.clientX - bounds.left) / bounds.width * 100))), y: Math.max(18, Math.min(92, Math.round((event.clientY - bounds.top) / bounds.height * 100))) };
  };
  const updateDragPosition = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingPropId.current) return;
    const position = getDragPosition(event);
    if (position) setDragPositions(current => ({ ...current, [draggingPropId.current!]: position }));
  };
  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const id = draggingPropId.current;
    if (!id) return;
    const position = getDragPosition(event) ?? dragPositions[id];
    if (position) onMoveProp(id, position.x, position.y);
    draggingPropId.current = null;
    setDragPositions(current => { const next = { ...current }; delete next[id]; return next; });
  };
  const meetingSeat = (agent: OfficeAgent) => {
    const area = areas.find(item => item.id === meeting?.areaId);
    const seatIndex = meeting?.participants.indexOf(agent.id) ?? -1;
    if (!area || seatIndex < 0) return { x: area?.x ?? 50, y: area?.y ?? 50, angle: 0 };
    const angle = (Math.PI * 2 * seatIndex / Math.max(1, meeting?.participants.length ?? 1)) - Math.PI / 2;
    const radiusX = meeting.participants.length <= 3 ? 8 : 13;
    const radiusY = meeting.participants.length <= 3 ? 7 : 11;
    return { x: Math.max(14, Math.min(86, area.x + Math.cos(angle) * radiusX)), y: Math.max(24, Math.min(80, area.y + Math.sin(angle) * radiusY)), angle: angle * 180 / Math.PI + 90 };
  };
  const sceneProps = meeting?.floorId === floorId ? props.filter(prop => prop.kind !== 'sofa' && prop.kind !== 'coffee-table') : props;
  return <div ref={roomRef} className={`office-room floor-${floorStyle} ${editingLayout ? 'is-layout-editing' : ''} ${meeting?.floorId === floorId ? 'is-office-meeting' : ''} ${celebration ? `has-celebration celebration-${celebration.theme ?? 'spark'}` : ''} ${season ? 'has-season-theme' : ''} ${seasonalClass}`} style={{ '--floor-tint': floorColor } as CSSProperties} aria-label="Mapa 2D do escritório">
    {(celebration || season) && <div className={`office-event-banner ${celebration ? 'is-milestone' : 'is-season'}`}><PartyPopper size={15}/><span><strong>{celebration?.title ?? season}</strong><small>{celebration ? `Comemoração até ${new Date(celebration.until).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Tema especial do escritório'}</small></span></div>}
    {editingLayout && <div className="office-layout-hint"><Move size={14}/> Arraste os móveis para reposicioná-los. Solte para salvar.</div>}
    {meeting?.floorId === floorId && <div className="office-meeting-banner"><Users size={14}/><span>Reunião simulada com {meeting.participants.length} agentes</span></div>}
    <div className="office-back-wall"><div className="office-window"><span /><span /><span /></div><div className="office-wall-art"><img src={`${furniture}/LARGE_PAINTING/LARGE_PAINTING.png`} alt="" /></div><div className="office-tv-monitor" aria-label="Resumo diário da operação com dados financeiros reais"><div className="office-tv-top"><span>HUB · PAINEL DO DIA</span><i/></div><div className="office-tv-metrics"><span><small>VENDAS PAGAS</small><strong>{metrics.sales}</strong></span><span><small>FATURAMENTO</small><strong>{currency(metrics.income)}</strong></span><span><small>PENDENTES</small><strong>{metrics.pendingSales}</strong></span><span><small>ETAPAS*</small><strong>{metrics.completed}</strong></span><span><small>REVISÕES*</small><strong>{metrics.reviews}</strong></span></div><div className="office-tv-foot">Financeiro real · *atividade dos personagens simulada</div></div><div className="office-clock">HUB&nbsp; · &nbsp;OFFICE</div><div className="office-window office-window-small"><span /><span /></div><span className="office-wall-lamp office-wall-lamp-left"/><span className="office-wall-lamp office-wall-lamp-right"/></div>
    {seasonalClass === 'theme-christmas' && <div className="office-christmas-garland" aria-hidden="true">{Array.from({ length: 13 }, (_, index) => <i key={index} style={{ left: `${index * 8.1}%`, top: `${index % 2 ? 10 : 0}px`, animationDelay: `${index * -.19}s` }}/>)}</div>}
    {seasonalClass === 'theme-junina' && <div className="office-junina-bunting" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ left: `${index * 11}%` }}/>)}</div>}
    <div className="office-floor" />
    <div className="office-sunbeam office-sunbeam-left"/><div className="office-sunbeam office-sunbeam-right"/>
    <div className="office-rug office-rug-center" />
    <div className="office-rug office-rug-right" />
    {sceneProps.map(prop => { const item = propCatalog.find(entry => entry.kind === prop.kind); const position = dragPositions[prop.id] ?? prop; return <div key={prop.id} className={`office-custom-prop prop-${prop.kind}`} style={{ left: `${position.x}%`, top: `${position.y}%`, width: `clamp(${Math.max(22, prop.size * .55)}px, ${prop.size * .1}vw, ${prop.size}px)` } as CSSProperties} title={editingLayout ? `Arraste para reposicionar ${prop.name}` : prop.name} onPointerDown={event => { if (!editingLayout) return; event.preventDefault(); event.stopPropagation(); draggingPropId.current = prop.id; event.currentTarget.setPointerCapture(event.pointerId); updateDragPosition(event); }} onPointerMove={updateDragPosition} onPointerUp={finishDrag} onPointerCancel={finishDrag}>{item?.src ? <img src={item.src} alt={prop.name} draggable="false"/> : <span className="office-stairs-art" aria-label="Escada">↗<small>ACESSO AOS ANDARES</small></span>}</div>; })}
    {areas.filter(area => area.kind && area.kind !== 'bay').map(area => <div key={`boundary-${area.id}`} className={`office-room-boundary room-${area.kind}`} style={{ left: `${area.x}%`, top: `${area.y}%`, '--area-accent': area.color } as CSSProperties}><span /></div>)}
    {areas.map((area, index) => <div key={area.id} className={`office-zone room-${area.kind ?? 'bay'}`} style={{ left: `${Math.max(3, area.x - 10)}%`, top: `${Math.max(16, area.y - 16)}%`, '--area-accent': area.color } as CSSProperties}><span>{String(index + 1).padStart(2, '0')}</span>{area.name}<small>{roomKinds.find(kind => kind.id === area.kind)?.label ?? 'Baia'}</small></div>)}
    <div className="office-divider office-divider-horizontal" /><div className="office-divider office-divider-vertical" />
    {agents.filter(agent => agent.floorId === floorId).map(agent => {
      const base = areas.find(area => area.id === agent.areaId) ?? areas[0] ?? { x: 50, y: 55, color: '#67c9c0' };
      return <div key={`desk-${agent.id}`} className="office-fixed-desk" style={{ left: `${base.x}%`, top: `${base.y}%` }}><img src={`${furniture}/DESK/DESK_FRONT.png`} alt=""/><img className={agent.status === 'working' ? 'office-computer-on' : ''} src={`${furniture}/PC/PC_FRONT_ON_1.png`} alt=""/></div>;
    })}
    {meeting?.floorId === floorId && agents.filter(agent => meeting.participants.includes(agent.id)).map(agent => { const seat = meetingSeat(agent); return <div key={`meeting-seat-${agent.id}`} className="office-meeting-seat" style={{ left: `${seat.x}%`, top: `${seat.y + 5}%`, '--seat-angle': `${seat.angle}deg` } as CSSProperties}><img src={`${furniture}/WOODEN_CHAIR/WOODEN_CHAIR_FRONT.png`} alt=""/></div>; })}
    {agents.map((agent, index) => {
      const atMeeting = !!meeting && meeting.participants.includes(agent.id) && meeting.floorId === floorId;
      const homeArea = agent.floorId === floorId ? areas.find(area => area.id === agent.areaId) : undefined;
      const base = homeArea ?? { x: 91, y: 83, color: agent.color };
      const destination = atMeeting ? areas.find(area => area.id === meeting?.areaId) : undefined;
      const seat = atMeeting ? meetingSeat(agent) : undefined;
      const target = seat ?? destination ?? base;
      const inAreaIndex = agents.filter(item => item.areaId === agent.areaId).findIndex(item => item.id === agent.id);
      const spots = [
        { x: 0, y: 0 }, { x: 7, y: 3 }, { x: -7, y: 6 }, { x: 7, y: 9 }, { x: -7, y: 11 },
      ][Math.max(0, inAreaIndex) % 5];
      const walkingToMeeting = atMeeting && !meeting?.arrived;
      const moving = agent.walking === true || (simulation && agent.status === 'working' && !atMeeting) || walkingToMeeting;
      const wander = [
        { x: [0, 18, 42, 52, 24, -7, 0], y: [0, -4, 5, 15, 21, 8, 0] },
        { x: [0, -16, -38, -52, -27, 4, 0], y: [0, 5, 13, 2, -12, -8, 0] },
        { x: [0, 14, 34, 48, 19, -12, 0], y: [0, 9, 18, 11, -8, -14, 0] },
        { x: [0, -18, -41, -53, -22, 9, 0], y: [0, -8, -14, -4, 14, 9, 0] },
      ][index % 4];
      return <motion.button key={agent.id} type="button" className={`office-agent ${agent.id === selectedId ? 'is-selected' : ''}`} style={{ left: `calc(${base.x}% + ${spots.x}px)`, top: `calc(${base.y}% + ${spots.y}px)`, '--agent-accent': agent.color } as CSSProperties} animate={atMeeting ? { left: `${target.x}%`, top: `${target.y}%` } : { left: `calc(${base.x}% + ${spots.x}px)`, top: `calc(${base.y}% + ${spots.y}px)` }} transition={{ duration: atMeeting ? 2.2 : agent.walking ? 5.2 : .5, ease: 'easeInOut' }}
        onClick={() => onSelect(agent)} aria-label={`${agent.name}, ${agent.role}, ${statusLabel[agent.status]}`}>
        <motion.span className="office-walker" animate={moving && !prefersReducedMotion && !walkingToMeeting ? wander : { x: 0, y: 0 }} transition={moving && !prefersReducedMotion && !walkingToMeeting ? { duration: 8 + index, repeat: Infinity, ease: 'easeInOut' } : { duration: .6 }}><Sprite agent={agent} working={agent.status === 'working' && !atMeeting} poseOverride={walkingToMeeting || agent.walking ? 'walk' : atMeeting && meeting?.arrived ? 'sit' : undefined} /></motion.span>
        <span className="office-agent-tag" title={`${agent.task} · ${agent.update}`}><i style={{ background: statusColor[agent.status] }} />{agent.name}<small>{agent.role}</small>{agent.status !== 'idle' && <em>{agent.status === 'working' ? 'Em tarefa' : 'Revisão'}</em>}</span>
        {reviewIds.has(agent.id) && <span className="office-review-dot">Revisar</span>}
      </motion.button>;
    })}
    <div className="office-pixel-note"><Sparkles size={13} /> um espaço de trabalho para o que vem a seguir</div>
    {fullscreen && <button type="button" className="office-exit-fullscreen" onClick={onExitFullscreen} aria-label="Sair da tela cheia"><Minimize2 size={18}/></button>}
  </div>;
}

function FullscreenFloorBoard({ floors, agents, activeFloorId, simulation, meeting, selectedId, reviewIds, celebration, season, metrics, onSelectFloor, onSelectAgent }: {
  floors: OfficeFloor[]; agents: OfficeAgent[]; activeFloorId: string; simulation: boolean; meeting?: OfficeMeeting | null; selectedId: string; reviewIds: Set<string>; celebration?: OfficeCelebration; season?: string; metrics: OfficeMetrics; onSelectFloor: (id: string) => void; onSelectAgent: (agent: OfficeAgent) => void;
}) {
  return <section className="office-floor-board" aria-label="Todos os andares desta operação">
    <header><div><span className="office-kicker">VISÃO DA OPERAÇÃO</span><h2>Todos os andares</h2></div><span>{floors.length} {floors.length === 1 ? 'andar' : 'andares'} · {agents.length} personagens</span></header>
    <div className="office-floor-board-grid">{floors.map((floor, index) => {
      const floorAgents = agents.filter(agent => agent.floorId === floor.id);
      return <article key={floor.id} className={`office-floor-tile ${activeFloorId === floor.id ? 'is-active' : ''}`}>
        <button type="button" className="office-floor-tile-heading" onClick={() => onSelectFloor(floor.id)}><span><i>{String(index + 1).padStart(2, '0')}</i><strong>{floor.name}<small>{floor.purpose ?? 'Operação geral'}</small></strong></span><small>{floorAgents.filter(agent => agent.status === 'working').length} trabalhando · {floorAgents.filter(agent => agent.status === 'review').length} revisões</small></button>
        <div className="office-floor-preview"><OfficeRoom agents={floorAgents} areas={floor.areas} props={floor.props ?? []} floorId={floor.id} floorStyle={floor.floorStyle} floorColor={floor.floorColor} meeting={meeting} selectedId={selectedId} simulation={simulation} fullscreen={false} editingLayout={false} onMoveProp={() => undefined} onSelect={onSelectAgent} onExitFullscreen={() => undefined} reviewIds={reviewIds} celebration={celebration} season={season} metrics={metrics}/></div>
      </article>;
    })}</div>
  </section>;
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

function SpaceEditor({ operations, activeOperationId, floors, selectedFloorId, onSelectOperation, onAddOperation, onRenameOperation, onDeleteOperation, onSelectFloor, onAddFloor, onRenameFloor, onDeleteFloor, onUpdateFloor, onAddArea, onUpdateArea, onDeleteArea, onAddProp, onUpdateProp, onDeleteProp, onClose }: {
  operations: OfficeOperation[];
  activeOperationId: string;
  floors: OfficeFloor[];
  selectedFloorId: string;
  onSelectOperation: (id: string) => void;
  onAddOperation: (name: string, kind: OfficeOperationKind) => void;
  onRenameOperation: (id: string, name: string) => void;
  onDeleteOperation: (id: string) => void;
  onSelectFloor: (id: string) => void;
  onAddFloor: (template: OfficeFloorTemplate) => void;
  onRenameFloor: (id: string, name: string) => void;
  onDeleteFloor: (id: string) => void;
  onUpdateFloor: (id: string, values: Partial<OfficeFloor>) => void;
  onAddArea: (floorId: string, name: string, kind: OfficeRoomKind) => void;
  onUpdateArea: (floorId: string, areaId: string, values: Partial<OfficeArea>) => void;
  onDeleteArea: (floorId: string, areaId: string) => void;
  onAddProp: (floorId: string, kind: OfficePropKind) => void;
  onUpdateProp: (floorId: string, propId: string, values: Partial<OfficeProp>) => void;
  onDeleteProp: (floorId: string, propId: string) => void;
  onClose: () => void;
}) {
  const operation = operations.find(item => item.id === activeOperationId) ?? operations[0];
  const operationFloors = floors.filter(item => item.operationId === operation?.id);
  const floor = operationFloors.find(item => item.id === selectedFloorId) ?? operationFloors[0];
  const [areaName, setAreaName] = useState('');
  const [newRoomKind, setNewRoomKind] = useState<OfficeRoomKind>('bay');
  const [operationName, setOperationName] = useState('');
  const [operationKind, setOperationKind] = useState<OfficeOperationKind>('blog');
  const [floorTemplate, setFloorTemplate] = useState<OfficeFloorTemplate>('operations');
  function addArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!floor || !areaName.trim()) return;
    onAddArea(floor.id, areaName.trim(), newRoomKind);
    setAreaName('');
  }
  return <div className="office-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="office-space-editor" role="dialog" aria-modal="true" aria-labelledby="office-space-title">
      <div className="office-editor-heading"><div><span className="office-kicker">PERSONALIZE SUAS OPERAÇÕES</span><h2 id="office-space-title">Operações e andares</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={19}/></button></div>
      <div className="office-operation-tabs">{operations.map(item => <button type="button" key={item.id} className={item.id === operation?.id ? 'is-active' : ''} onClick={() => onSelectOperation(item.id)}><Layers size={14}/>{item.name}<small>{operationKinds.find(kind => kind.id === item.kind)?.label}</small></button>)}</div>
      <form className="office-add-operation-form" onSubmit={event => { event.preventDefault(); if (!operationName.trim()) return; onAddOperation(operationName.trim(), operationKind); setOperationName(''); }}><input value={operationName} onChange={event => setOperationName(event.target.value)} maxLength={36} placeholder="Nome da nova operação" required/><select value={operationKind} onChange={event => setOperationKind(event.target.value as OfficeOperationKind)} aria-label="Tipo de operação">{operationKinds.map(kind => <option key={kind.id} value={kind.id}>{kind.label}</option>)}</select><button type="submit" className="office-secondary"><Plus size={14}/> Nova operação</button></form>
      <div className="office-floor-tabs">{operationFloors.map(item => <button type="button" key={item.id} className={item.id === floor?.id ? 'is-active' : ''} onClick={() => onSelectFloor(item.id)}><Layers size={14}/>{item.name}</button>)}<label className="office-template-select">Modelo<select value={floorTemplate} onChange={event => setFloorTemplate(event.target.value as OfficeFloorTemplate)}>{floorTemplates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label><button type="button" className="office-add-floor" onClick={() => onAddFloor(floorTemplate)}><Plus size={15}/> Novo andar</button></div>
      {floor && <div className="office-space-content">
        <div className="office-operation-name-row"><label className="office-space-name">Nome da operação<input value={operation?.name ?? ''} onChange={event => operation && onRenameOperation(operation.id, event.target.value)} maxLength={36} /></label><button type="button" className="office-delete-space" disabled={operations.length <= 1} onClick={() => operation && onDeleteOperation(operation.id)}><Trash2 size={14}/> Excluir operação</button></div>
        <div className="office-floor-identity"><label className="office-space-name">Nome do andar<input value={floor.name} onChange={event => onRenameFloor(floor.id, event.target.value)} maxLength={40} /></label><label className="office-space-name">Função deste andar<input value={floor.purpose ?? ''} onChange={event => onUpdateFloor(floor.id, { purpose: event.target.value })} maxLength={40} placeholder="Ex.: Conteúdo, Campanhas, Suporte" /></label></div>
        <div className="office-floor-style-row"><label>Textura do piso<select value={floor.floorStyle} onChange={event => onUpdateFloor(floor.id, { floorStyle: event.target.value as OfficeFloorStyle })}><option value="oak">Carvalho claro</option><option value="walnut">Madeira escura</option><option value="stone">Pedra</option><option value="carpet">Carpete</option><option value="sage">Madeira verde</option></select></label><label>Tom base<input type="color" value={floor.floorColor} onChange={event => onUpdateFloor(floor.id, { floorColor: event.target.value })}/></label></div>
        <div className="office-space-list-heading"><div><h3>Áreas deste andar</h3><p>Esta operação pode ter vários andares; cada andar tem suas próprias áreas e móveis.</p></div><button type="button" className="office-delete-space" disabled={operationFloors.length <= 1} onClick={() => onDeleteFloor(floor.id)}><Trash2 size={14}/> Excluir andar</button></div>
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

function EventSettingsEditor({ settings, metrics, onUpdate, onPreview, onPreviewSeason, onClose }: { settings: OfficeEventSettings; metrics: OfficeMetrics; onUpdate: (settings: OfficeEventSettings) => void; onPreview: (milestone: OfficeMilestone) => void; onPreviewSeason: () => void; onClose: () => void }) {
  const setMilestone = (id: string, values: Partial<OfficeMilestone>) => onUpdate({ ...settings, milestones: settings.milestones.map(item => item.id === id ? { ...item, ...values } : item) });
  const addMilestone = () => onUpdate({ ...settings, milestones: [...settings.milestones, { id: crypto.randomUUID(), name: 'Nova meta', metric: 'sales', target: 100, enabled: true }] });
  const removeMilestone = (id: string) => onUpdate({ ...settings, milestones: settings.milestones.filter(item => item.id !== id) });
  return <div className="office-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="office-space-editor office-event-editor" role="dialog" aria-modal="true" aria-labelledby="office-event-title">
    <div className="office-editor-heading"><div><span className="office-kicker">METAS E CELEBRAÇÕES</span><h2 id="office-event-title">Deixe o escritório comemorar</h2></div><button type="button" onClick={onClose} aria-label="Fechar"><X size={19}/></button></div>
    <p className="office-editor-note">Vendas, faturamento e pendências são atualizados a partir das transações reais do checkout/ADMS no Hub. Só a movimentação dos personagens, tarefas e etapas concluídas é simulada.</p>
    <div className="office-event-section"><div className="office-space-list-heading"><div><h3>Indicadores reais de hoje</h3><p>Os monitores dos andares acompanham o feed financeiro do checkout/ADMS em tempo real.</p></div></div><div className="office-daily-metrics"><span>Vendas pagas<strong>{metrics.sales}</strong></span><span>Faturamento pago<strong>{currency(metrics.income)}</strong></span><span>Cobranças pendentes<strong>{metrics.pendingSales}</strong></span><span>Receita gerada<strong>{currency(metrics.generatedIncome)}</strong></span></div></div>
    <div className="office-event-section"><div className="office-space-list-heading"><div><h3>Metas da operação</h3><p>Uma meta alcançada ativa a comemoração pela duração escolhida.</p></div></div>
      {settings.milestones.map(item => <div className="office-milestone-row" key={item.id}><input aria-label="Nome da meta" value={item.name} onChange={event => setMilestone(item.id, { name: event.target.value })}/><select aria-label="Indicador" value={item.metric} onChange={event => setMilestone(item.id, { metric: event.target.value as OfficeMilestone['metric'] })}><option value="sales">Vendas pagas hoje</option><option value="profit">Resultado financeiro</option></select><input aria-label="Meta" type="number" min="1" value={item.target} onChange={event => setMilestone(item.id, { target: Math.max(1, Number(event.target.value)) })}/><label className="office-switch"><input type="checkbox" checked={item.enabled} onChange={event => setMilestone(item.id, { enabled: event.target.checked })}/><span>Ativa</span></label><button type="button" className="office-secondary office-preview-celebration" onClick={() => onPreview(item)} disabled={!item.enabled}><PartyPopper size={14}/> Testar</button><button type="button" className="office-icon-button office-remove-area" onClick={() => removeMilestone(item.id)} aria-label={`Excluir meta ${item.name}`}><Trash2 size={14}/></button></div>)}
      <button type="button" className="office-add-milestone" onClick={addMilestone}><Plus size={14}/> Nova meta</button>
      <div className="office-celebration-options"><label>Visual<select value={settings.celebrationTheme ?? 'spark'} onChange={event => onUpdate({ ...settings, celebrationTheme: event.target.value as CelebrationTheme })}><option value="spark">Brilho festivo</option><option value="gold">Dourado</option><option value="confetti">Confetes</option></select></label><label>Duração<select value={settings.celebrationDuration ?? 'midnight'} onChange={event => onUpdate({ ...settings, celebrationDuration: event.target.value as CelebrationDuration })}><option value="midnight">Até meia-noite</option><option value="2">2 horas</option><option value="6">6 horas</option><option value="12">12 horas</option><option value="24">24 horas</option></select></label></div>
    </div>
    <div className="office-event-section"><div className="office-space-list-heading"><div><h3>Temas sazonais</h3><p>O tema da meta tem prioridade; depois o sazonal volta até a data final.</p></div></div>
      <div className="office-season-row"><label>Ocasião<input value={settings.season.name} maxLength={32} onChange={event => onUpdate({ ...settings, season: { ...settings.season, name: event.target.value } })} placeholder="Ex.: Festa Junina"/></label><label>Começa<input type="date" value={`2026-${settings.season.start}`} onChange={event => onUpdate({ ...settings, season: { ...settings.season, start: event.target.value.slice(5) } })}/></label><label>Termina<input type="date" value={`2026-${settings.season.end}`} onChange={event => onUpdate({ ...settings, season: { ...settings.season, end: event.target.value.slice(5) } })}/></label><label className="office-switch"><input type="checkbox" checked={settings.season.enabled} onChange={event => onUpdate({ ...settings, season: { ...settings.season, enabled: event.target.checked } })}/><span>Ativo</span></label></div>
      <div className="office-season-actions"><p className="office-editor-note">O calendário se repete anualmente. Você também pode ligar e testar a decoração agora; ao desativar, ela some imediatamente.</p><button type="button" className="office-secondary office-season-preview" onClick={onPreviewSeason}><PartyPopper size={14}/> Ver tema agora</button></div>
    </div><div className="office-editor-actions"><button type="button" className="office-primary" onClick={onClose}><Save size={15}/> Concluir</button></div>
  </section></div>;
}

export default function AgentOfficeView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: transactions = [] } = useTransactions();
  const pageRef = useRef<HTMLDivElement>(null);
  const storageKey = `hub-agent-office:v${STORAGE_VERSION}:${user?.uid ?? 'local'}`;
  const [operations, setOperations] = useState<OfficeOperation[]>(starterOperations);
  const [activeOperationId, setActiveOperationId] = useState(MAIN_OPERATION_ID);
  const [floors, setFloors] = useState<OfficeFloor[]>(starterFloors);
  const [eventSettings, setEventSettings] = useState<OfficeEventSettings>(defaultEventSettings);
  const [activeFloorId, setActiveFloorId] = useState(MAIN_FLOOR_ID);
  const [agents, setAgents] = useState<OfficeAgent[]>(starterAgents);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState('ops');
  const [editingAgent, setEditingAgent] = useState<OfficeAgent | null | undefined>(undefined);
  const [editingSpaces, setEditingSpaces] = useState(false);
  const [editingEvents, setEditingEvents] = useState(false);
  const [editingLayout, setEditingLayout] = useState(false);
  const [simulation, setSimulation] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenControlsOpen, setFullscreenControlsOpen] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState<OfficeViewMode>('floor');
  const [rotationSeconds, setRotationSeconds] = useState(12);
  const [rotationOrder, setRotationOrder] = useState<'random' | 'sequence'>('random');
  const rotationIndex = useRef(0);
  const [focusedFloorId, setFocusedFloorId] = useState(MAIN_FLOOR_ID);
  const [simulationLocations, setSimulationLocations] = useState<Record<string, string>>({});
  const [simulationFloorLocations, setSimulationFloorLocations] = useState<Record<string, string>>({});
  const [eventLog, setEventLog] = useState<string[]>(['O escritório está pronto para configurar os agentes.']);
  const [reviewIds, setReviewIds] = useState<Set<string>>(new Set());
  const [meeting, setMeeting] = useState<OfficeMeeting | null>(null);
  const meetingTimer = useRef<number | undefined>(undefined);
  const meetingArrivalTimer = useRef<number | undefined>(undefined);
  const [calendarTick, setCalendarTick] = useState(0);
  const previousStorageKey = `hub-agent-office:v${PREVIOUS_STORAGE_VERSION}:${user?.uid ?? 'local'}`;
  const olderStorageKey = `hub-agent-office:v${OLDER_STORAGE_VERSION}:${user?.uid ?? 'local'}`;
  const olderSupportedStorageKey = `hub-agent-office:v${OLDER_SUPPORTED_STORAGE_VERSION}:${user?.uid ?? 'local'}`;
  const oldestStorageKey = `hub-agent-office:v${LEGACY_STORAGE_VERSION}:${user?.uid ?? 'local'}`;
  const activeOperation = operations.find(operation => operation.id === activeOperationId) ?? operations[0];
  const operationFloors = useMemo(() => floors.filter(floor => floor.operationId === activeOperation?.id), [floors, activeOperation?.id]);
  const todayKey = localDateKey();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const todayTransactions = transactions.filter(transaction => {
    const rawTime = transaction.paymentDate || transaction.date;
    const timestamp = typeof rawTime === 'number' ? rawTime : new Date(rawTime as string).getTime();
    return timestamp >= todayStart.getTime() && timestamp < tomorrowStart.getTime() && String(transaction.status ?? '').toUpperCase() !== 'CANCELLED';
  });
  const metrics = useMemo<OfficeMetrics>(() => {
    const incomeTransactions = todayTransactions.filter(transaction => String(transaction.type).toUpperCase() === 'INCOME');
    const paidTransactions = incomeTransactions.filter(transaction => String(transaction.status).toUpperCase() === 'PAID');
    const pendingTransactions = incomeTransactions.filter(transaction => String(transaction.status).toUpperCase() === 'PENDING');
    const income = paidTransactions.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    const generatedIncome = incomeTransactions.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    const expenses = todayTransactions.filter(transaction => String(transaction.type).toUpperCase() === 'EXPENSE').reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0);
    const completed = eventSettings.completedDate === todayKey ? eventSettings.simulatedCompleted ?? 0 : 0;
    return { sales: paidTransactions.length, income, generatedIncome, pendingSales: pendingTransactions.length, expenses, result: income - expenses, completed, reviews: reviewIds.size };
  }, [todayTransactions, eventSettings.completedDate, eventSettings.simulatedCompleted, todayKey, reviewIds]);

  function migrateFloorFurniture(floor: OfficeFloor): OfficeFloor {
    const existing = Array.isArray(floor.props) ? [...floor.props] : [];
    const defaults = createDefaultFurnitureProps(floor.id, floor.areas);
    for (const prop of defaults) {
      if (existing.some(item => item.id === prop.id)) continue;
      if (prop.kind === 'plant') {
        const existingPlants = existing.filter(item => item.kind === 'plant').length;
        const targetPlantCount = defaults.filter(item => item.kind === 'plant').length;
        if (existingPlants >= targetPlantCount) continue;
      } else if (existing.some(item => item.kind === prop.kind)) continue;
      existing.push(prop);
    }
    return { ...floor, operationId: floor.operationId ?? MAIN_OPERATION_ID, floorStyle: floor.floorStyle ?? 'oak', floorColor: floor.floorColor ?? '#d9ae72', props: existing, areas: floor.areas.map(area => ({ ...area, kind: area.kind ?? 'bay' })) };
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved) as { operations?: OfficeOperation[]; activeOperationId?: string; agents?: OfficeAgent[]; floors?: OfficeFloor[]; activeFloorId?: string; eventSettings?: OfficeEventSettings; activityLog?: string[] };
        if (Array.isArray(data.agents) && Array.isArray(data.floors) && data.floors.every(floor => typeof floor.id === 'string' && Array.isArray(floor.areas))) {
          if (Array.isArray(data.operations) && data.operations.length) {
            const normalizedFloors = data.floors.map(floor => ({ ...floor, operationId: floor.operationId ?? MAIN_OPERATION_ID, purpose: floor.purpose ?? 'Operação geral', floorStyle: floor.floorStyle ?? 'oak', floorColor: floor.floorColor ?? '#d9ae72', props: Array.isArray(floor.props) ? floor.props : [], areas: floor.areas.map(area => ({ ...area, kind: area.kind ?? 'bay' })) }));
            setOperations(data.operations);
            setFloors(normalizedFloors);
            setAgents(ensureOperationAgents(data.operations, normalizedFloors, data.agents.map(agent => ({ ...agent, status: 'idle', walking: false, update: 'Disponível para receber uma tarefa' }))));
            const restoredFloor = normalizedFloors.find(floor => floor.id === data.activeFloorId) ?? normalizedFloors[0];
            setActiveOperationId(data.operations.some(item => item.id === data.activeOperationId) ? data.activeOperationId! : restoredFloor?.operationId ?? MAIN_OPERATION_ID);
            setActiveFloorId(restoredFloor?.id ?? MAIN_FLOOR_ID);
          } else {
            const migrated = migrateLegacyOperations(data.floors, data.agents);
            setOperations(migrated.operations); setFloors(migrated.floors); setAgents(migrated.agents);
            setActiveOperationId(MAIN_OPERATION_ID);
            setActiveFloorId(migrated.floors.find(floor => floor.id === data.activeFloorId && floor.operationId === MAIN_OPERATION_ID)?.id ?? migrated.floors.find(floor => floor.operationId === MAIN_OPERATION_ID)?.id ?? MAIN_FLOOR_ID);
          }
          if (data.eventSettings) setEventSettings(normalizeOfficeEvents(data.eventSettings));
          if (Array.isArray(data.activityLog)) setEventLog(data.activityLog.slice(0, 40));
        } else {
          throw new Error('Formato local inválido');
        }
      } else {
        const previous = localStorage.getItem(previousStorageKey);
        const older = previous ? null : localStorage.getItem(olderStorageKey);
        const olderSupported = previous || older ? null : localStorage.getItem(olderSupportedStorageKey);
        const priorData = previous ?? older ?? olderSupported;
        if (priorData) {
          const data = JSON.parse(priorData) as { operations?: OfficeOperation[]; activeOperationId?: string; agents?: OfficeAgent[]; floors?: OfficeFloor[]; activeFloorId?: string; eventSettings?: OfficeEventSettings; activityLog?: string[] };
          if (Array.isArray(data.agents) && Array.isArray(data.floors)) {
            if (Array.isArray(data.operations) && data.operations.length) {
              const normalizedFloors = data.floors.map(floor => ({ ...migrateFloorFurniture(floor), operationId: floor.operationId ?? MAIN_OPERATION_ID, purpose: floor.purpose ?? 'Operação geral' }));
              setOperations(data.operations); setFloors(normalizedFloors); setAgents(ensureOperationAgents(data.operations, normalizedFloors, data.agents.map(agent => ({ ...agent, status: 'idle', walking: false }))));
              const restoredFloor = normalizedFloors.find(floor => floor.id === data.activeFloorId) ?? normalizedFloors[0];
              setActiveOperationId(data.operations.some(item => item.id === data.activeOperationId) ? data.activeOperationId! : restoredFloor?.operationId ?? MAIN_OPERATION_ID);
              setActiveFloorId(restoredFloor?.id ?? MAIN_FLOOR_ID);
            } else {
              const migrated = migrateLegacyOperations(data.floors.map(migrateFloorFurniture), data.agents);
              setOperations(migrated.operations); setFloors(migrated.floors); setAgents(migrated.agents);
              setActiveOperationId(MAIN_OPERATION_ID);
              setActiveFloorId(migrated.floors.find(floor => floor.id === data.activeFloorId && floor.operationId === MAIN_OPERATION_ID)?.id ?? migrated.floors.find(floor => floor.operationId === MAIN_OPERATION_ID)?.id ?? MAIN_FLOOR_ID);
            }
            if (data.eventSettings) setEventSettings(normalizeOfficeEvents({ ...data.eventSettings, season: { ...data.eventSettings.season, enabled: data.eventSettings.season.name === 'Natal' ? true : data.eventSettings.season.enabled } }));
            if (Array.isArray(data.activityLog)) setEventLog(data.activityLog.slice(0, 40));
          }
        }
        const legacy = priorData ? null : localStorage.getItem(oldestStorageKey);
        if (legacy) {
          const data = JSON.parse(legacy) as Array<OfficeAgent & { zone?: string }>;
          if (Array.isArray(data)) setAgents(data.map(agent => ({ ...agent, floorId: MAIN_FLOOR_ID, areaId: agent.areaId ?? agent.zone ?? 'ops', status: 'idle', update: 'Disponível para receber uma tarefa' })));
        }
      }
    } catch { /* Dados locais inválidos voltam à configuração inicial. */ }
    setLoaded(true);
  }, [storageKey, previousStorageKey, olderStorageKey, olderSupportedStorageKey, oldestStorageKey]);

  useEffect(() => {
    if (loaded) localStorage.setItem(storageKey, JSON.stringify({ operations, activeOperationId, agents, floors, activeFloorId, eventSettings, activityLog: eventLog.slice(0, 40) }));
  }, [operations, activeOperationId, agents, floors, activeFloorId, eventSettings, eventLog, loaded, storageKey]);

  useEffect(() => {
    if (!loaded || !user?.uid) return;
    const applyQueuedRooms = () => {
      const requests = consumeOfficeRoomSync(user.uid);
      if (!requests.length) return;
      const updatedOperations = operations.map(operation => ({ ...operation }));
      const updatedFloors = [...floors];
      const newAgents: OfficeAgent[] = [];
      let newestOperation: OfficeOperation | undefined;
      let newestFloor: OfficeFloor | undefined;
      for (const request of requests) {
        const existing = updatedOperations.find(operation => operation.kind === request.kind && operation.sourceId === request.sourceId);
        if (existing) {
          existing.name = request.name.slice(0, 36);
          continue;
        }
        const operation: OfficeOperation = { id: `operation-${request.kind}-${crypto.randomUUID()}`, name: request.name.slice(0, 36), kind: request.kind, sourceId: request.sourceId };
        const floor = createOperationFloor(operation.id, operation.name, 'Andar térreo', request.kind === 'product' ? 'stone' : 'sage');
        updatedOperations.push(operation); updatedFloors.push(floor); newestOperation = operation; newestFloor = floor;
        newAgents.push(makeRoomAgent(floor.areas[0], floor.id, operationKinds.find(item => item.id === request.kind)?.label ?? 'Equipe da operação', operation.name));
      }
      setOperations(updatedOperations);
      setFloors(updatedFloors);
      setAgents(current => ensureOperationAgents(updatedOperations, updatedFloors, [...current, ...newAgents]).map(agent => {
        const operation = updatedOperations.find(item => item.id === updatedFloors.find(floor => floor.id === agent.floorId)?.operationId);
        return operation?.sourceId ? { ...agent, task: `Acompanhar a operação de ${operation.name}` } : agent;
      }));
      if (newestOperation && newestFloor) { setActiveOperationId(newestOperation.id); setActiveFloorId(newestFloor.id); }
    };
    applyQueuedRooms();
    const eventName = getOfficeRoomSyncEventName();
    const onSync = () => applyQueuedRooms();
    const onStorage = (event: StorageEvent) => { if (event.key?.endsWith(`:${user.uid}`)) applyQueuedRooms(); };
    window.addEventListener(eventName, onSync);
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener(eventName, onSync); window.removeEventListener('storage', onStorage); };
  }, [loaded, user?.uid, floors, operations]);

  useEffect(() => {
    if (!simulation || !loaded) return;
    let step = 0;
    const interval = window.setInterval(() => {
      step++;
      const index = (step - 1) % agents.length;
      const agent = agents[index];
      if (!agent) return;
      const status: AgentStatus = step % 5 === 0 ? 'review' : step % 2 === 0 ? 'idle' : 'working';
      const homeFloor = floors.find(item => item.id === agent.floorId);
      const buildingFloors = floors.filter(item => item.operationId === homeFloor?.operationId);
      const currentFloorId = simulationFloorLocations[agent.id] ?? agent.floorId;
      const otherFloors = buildingFloors.filter(item => item.id !== currentFloorId);
      const targetFloor = otherFloors.length && step % 3 === 0 ? otherFloors[(step + index) % otherFloors.length] : floors.find(item => item.id === currentFloorId) ?? homeFloor;
      const destinations = targetFloor?.areas.filter(area => area.id !== (targetFloor.id === currentFloorId ? simulationLocations[agent.id] ?? agent.areaId : '')) ?? [];
      const destination = destinations.length ? destinations[(step + index) % destinations.length] : targetFloor?.areas[0];
      if (destination && targetFloor) { setSimulationLocations(current => ({ ...current, [agent.id]: destination.id })); setSimulationFloorLocations(current => ({ ...current, [agent.id]: targetFloor.id })); }
      const destinationLabel = destination && targetFloor ? `${targetFloor.name} · ${destination.name}` : undefined;
      setAgents(current => current.map(item => item.id === agent.id ? { ...item, status, walking: Boolean(destination), update: destinationLabel ? `Caminhando para ${destinationLabel}` : status === 'working' ? `Simulando: ${item.task}` : status === 'review' ? 'Resultado demonstrativo pronto para revisar' : 'Fazendo uma pausa breve' } : item));
      if (status === 'review') setReviewIds(current => new Set(current).add(agent.id));
      setEventLog(current => [`${activityStamp()} · ${agent.name} ${destinationLabel ? `foi para ${destinationLabel}` : status === 'working' ? `iniciou: ${agent.task}` : status === 'review' ? 'preparou uma etapa demonstrativa para revisão' : 'fez uma pausa'}.`, ...current].slice(0, 40));
    }, 7200);
    return () => window.clearInterval(interval);
  }, [simulation, loaded, agents.length, floors]);

  useEffect(() => {
    if (!fullscreen || fullscreenMode !== 'rotate-floors' || operationFloors.length < 2) return;
    const timer = window.setInterval(() => setFocusedFloorId(current => {
      if (rotationOrder === 'sequence') {
        rotationIndex.current = (operationFloors.findIndex(floor => floor.id === current) + 1) % operationFloors.length;
        return operationFloors[rotationIndex.current]?.id ?? operationFloors[0]?.id ?? '';
      }
      const choices = operationFloors.filter(floor => floor.id !== current);
      return choices[Math.floor(Math.random() * choices.length)]?.id ?? operationFloors[0]?.id ?? '';
    }), rotationSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [fullscreen, fullscreenMode, operationFloors, rotationOrder, rotationSeconds]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === pageRef.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  useEffect(() => {
    if (!fullscreen) setFullscreenControlsOpen(false);
  }, [fullscreen]);

  useEffect(() => () => {
    if (meetingTimer.current) window.clearTimeout(meetingTimer.current);
    if (meetingArrivalTimer.current) window.clearTimeout(meetingArrivalTimer.current);
  }, []);

  const activeFloor = operationFloors.find(floor => floor.id === activeFloorId) ?? operationFloors[0];
  const displayAgents = agents.map(agent => {
    const simulatedFloorId = simulationFloorLocations[agent.id];
    const currentFloorId = simulatedFloorId ?? agent.floorId;
    const simulatedArea = floors.find(floor => floor.id === currentFloorId)?.areas.find(area => area.id === simulationLocations[agent.id]);
    return simulatedArea && (simulatedArea.id !== agent.areaId || currentFloorId !== agent.floorId) ? { ...agent, floorId: currentFloorId, areaId: simulatedArea.id, walking: true } : { ...agent, walking: false };
  });
  const focusedFloor = operationFloors.find(floor => floor.id === focusedFloorId) ?? activeFloor;
  const viewFloor = fullscreen && fullscreenMode === 'rotate-floors' ? focusedFloor : activeFloor;
  const visibleAgents = displayAgents.filter(agent => agent.floorId === viewFloor?.id || (meeting?.floorId === viewFloor?.id && meeting.participants.includes(agent.id)));
  const selected = useMemo(() => visibleAgents.find(agent => agent.id === selectedId) ?? visibleAgents[0], [visibleAgents, selectedId]);
  const reviewAgents = visibleAgents.filter(agent => reviewIds.has(agent.id));
  const workingCount = visibleAgents.filter(agent => agent.status === 'working').length;
  const activeCelebration = eventSettings.celebration && eventSettings.celebration.until > Date.now() ? eventSettings.celebration : undefined;
  const today = new Date();
  const monthDayKey = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const withinSeasonDates = eventSettings.season.start <= eventSettings.season.end
    ? monthDayKey >= eventSettings.season.start && monthDayKey <= eventSettings.season.end
    : monthDayKey >= eventSettings.season.start || monthDayKey <= eventSettings.season.end;
  const seasonalActive = eventSettings.season.enabled && (withinSeasonDates || Boolean(eventSettings.seasonPreviewUntil && eventSettings.seasonPreviewUntil > Date.now()));

  useEffect(() => {
    if (!loaded) return;
    const triggeredToday = eventSettings.triggeredMilestones ?? {};
    const completed = eventSettings.milestones.find(item => {
      if (!item.enabled || triggeredToday[item.id] === todayKey) return false;
      const value = item.metric === 'sales' ? metrics.sales : metrics.result;
      return value >= item.target;
    });
    if (!completed) return;
    const now = new Date();
    const until = celebrationEnds(eventSettings.celebrationDuration, now);
    setEventSettings(current => ({ ...current, celebration: { title: current.milestones.find(item => item.id === completed.id)?.name || completed.name, until, milestoneId: completed.id, theme: current.celebrationTheme ?? 'spark' }, triggeredMilestones: { ...current.triggeredMilestones, [completed.id]: todayKey } }));
    setEventLog(current => [`${activityStamp(now)} · meta alcançada: ${completed.name}. A comemoração começou.`, ...current].slice(0, 40));
    toast.success(`Meta alcançada: ${completed.name}`);
  }, [loaded, eventSettings.milestones, eventSettings.triggeredMilestones, eventSettings.celebrationDuration, eventSettings.celebrationTheme, metrics, todayKey]);

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
    const previewUntil = eventSettings.seasonPreviewUntil;
    if (!previewUntil) return;
    const delay = previewUntil - Date.now();
    if (delay <= 0) {
      setEventSettings(current => current.seasonPreviewUntil === previewUntil ? { ...current, seasonPreviewUntil: undefined } : current);
      return;
    }
    const timer = window.setTimeout(() => setEventSettings(current => current.seasonPreviewUntil === previewUntil ? { ...current, seasonPreviewUntil: undefined } : current), delay + 100);
    return () => window.clearTimeout(timer);
  }, [eventSettings.seasonPreviewUntil]);

  useEffect(() => {
    const now = new Date();
    const untilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime() + 1000;
    const timer = window.setTimeout(() => setCalendarTick(value => value + 1), untilMidnight);
    return () => window.clearTimeout(timer);
  }, [calendarTick]);

  function toggleSimulation() {
    if (!simulation) {
      setSimulationLocations({});
      setSimulationFloorLocations({});
      setSimulation(true);
      setEventLog(current => [`${activityStamp()} · simulação local iniciada; movimentos e tarefas são demonstrativos.`, ...current].slice(0, 40));
      return;
    }
    setSimulation(false);
    setSimulationLocations({});
    setSimulationFloorLocations({});
    setAgents(current => current.map(agent => ({ ...agent, walking: false, status: agent.status === 'working' ? 'idle' : agent.status, update: agent.status === 'working' ? 'Simulação pausada nesta estação' : agent.update })));
    setEventLog(current => [`${activityStamp()} · simulação local pausada.`, ...current].slice(0, 40));
  }

  async function toggleFullscreen() {
    if (!pageRef.current) return;
    if (!focusedFloorId && activeFloor) setFocusedFloorId(activeFloor.id);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (fullscreen) setFullscreen(false);
      else await pageRef.current.requestFullscreen();
    } catch {
      setFullscreen(true);
    }
  }

  function focusFloor(floorId: string) {
    const floor = floors.find(item => item.id === floorId);
    if (floor) setActiveOperationId(floor.operationId);
    setFocusedFloorId(floorId);
    setActiveFloorId(floorId);
    setSelectedId(displayAgents.find(agent => agent.floorId === floorId)?.id ?? '');
    setFullscreenMode('floor');
  }

  function saveAgent(agent: OfficeAgent) {
    const floor = floors.find(item => item.id === agent.floorId);
    setAgents(current => current.some(item => item.id === agent.id) ? current.map(item => item.id === agent.id ? agent : item) : [...current, agent]);
    if (floor) setActiveOperationId(floor.operationId);
    setActiveFloorId(agent.floorId);
    setSelectedId(agent.id);
    toast.success('Agente salvo neste navegador.');
  }

  function addFloor(template: OfficeFloorTemplate = 'operations') {
    const index = operationFloors.length + 1;
    const floorStyles: OfficeFloorStyle[] = ['oak', 'walnut', 'stone', 'carpet', 'sage'];
    const floorStyle = floorStyles[operationFloors.length % floorStyles.length];
    const floor = createTemplateFloor(activeOperation?.id ?? MAIN_OPERATION_ID, index, template, floorStyle);
    setFloors(current => [...current, floor]);
    setAgents(current => [...current, makeRoomAgent(floor.areas[0], floor.id, 'Equipe da operação', activeOperation?.name ?? 'Operação principal')]);
    setActiveOperationId(floor.operationId);
    setActiveFloorId(floor.id);
    setSelectedId('');
    toast.success(`${floor.name} criado pelo modelo ${floorTemplates.find(item => item.id === template)?.name ?? 'Operações'}.`);
  }

  function renameFloor(floorId: string, name: string) {
    setFloors(current => current.map(floor => floor.id === floorId ? { ...floor, name } : floor));
  }

  function deleteFloor(floorId: string) {
    const floorsInOperation = floors.filter(floor => floor.operationId === activeOperationId);
    if (floorsInOperation.length <= 1) return;
    const nextFloor = floorsInOperation.find(floor => floor.id !== floorId);
    if (!nextFloor) return;
    const destinationAreaId = nextFloor.areas[0]?.id;
    setFloors(current => current.filter(floor => floor.id !== floorId));
    setAgents(current => current.map(agent => agent.floorId === floorId ? { ...agent, floorId: nextFloor.id, areaId: destinationAreaId ?? '' } : agent));
    setActiveFloorId(nextFloor.id);
    setFocusedFloorId(nextFloor.id);
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

  function selectOperation(operationId: string) {
    const firstFloor = floors.find(floor => floor.operationId === operationId);
    setActiveOperationId(operationId);
    if (firstFloor) setActiveFloorId(firstFloor.id);
    setSelectedId(agents.find(agent => agent.floorId === firstFloor?.id)?.id ?? '');
    setFocusedFloorId(firstFloor?.id ?? '');
  }

  function addOperation(name: string, kind: OfficeOperationKind) {
    const operation: OfficeOperation = { id: `operation-${kind}-${crypto.randomUUID()}`, name: name.slice(0, 36), kind };
    const floor = createOperationFloor(operation.id, operation.name, 'Andar térreo', kind === 'product' ? 'stone' : kind === 'niche' ? 'sage' : 'oak');
    setOperations(current => [...current, operation]);
    setFloors(current => [...current, floor]);
    setAgents(current => [...current, makeRoomAgent(floor.areas[0], floor.id, operationKinds.find(item => item.id === kind)?.label ?? 'Equipe da operação', operation.name)]);
    setActiveOperationId(operation.id); setActiveFloorId(floor.id); setFocusedFloorId(floor.id); setSelectedId('');
    toast.success(`Operação “${operation.name}” criada com seu primeiro andar.`);
  }

  function renameOperation(operationId: string, name: string) {
    setOperations(current => current.map(operation => operation.id === operationId ? { ...operation, name: name.slice(0, 36) } : operation));
    setAgents(current => current.map(agent => floors.find(floor => floor.id === agent.floorId)?.operationId === operationId ? { ...agent, task: `Acompanhar a operação de ${name}` } : agent));
  }

  function deleteOperation(operationId: string) {
    if (operations.length <= 1) return;
    const destinationOperation = operations.find(operation => operation.id !== operationId);
    const destinationFloor = floors.find(floor => floor.operationId === destinationOperation?.id);
    if (!destinationOperation || !destinationFloor) return;
    const destinationArea = destinationFloor.areas[0]?.id ?? '';
    const deletedFloorIds = new Set(floors.filter(floor => floor.operationId === operationId).map(floor => floor.id));
    setOperations(current => current.filter(operation => operation.id !== operationId));
    setFloors(current => current.filter(floor => floor.operationId !== operationId));
    setAgents(current => current.map(agent => deletedFloorIds.has(agent.floorId) ? { ...agent, floorId: destinationFloor.id, areaId: destinationArea } : agent));
    setActiveOperationId(destinationOperation.id); setActiveFloorId(destinationFloor.id); setFocusedFloorId(destinationFloor.id); setSelectedId('');
    toast.success('Operação excluída; os personagens foram movidos para outra operação.');
  }

  function updateFloor(floorId: string, values: Partial<OfficeFloor>) {
    setFloors(current => current.map(floor => floor.id === floorId ? { ...floor, ...values } : floor));
  }

  function updateArea(floorId: string, areaId: string, values: Partial<OfficeArea>) {
    setFloors(current => current.map(floor => floor.id === floorId ? { ...floor, areas: floor.areas.map(area => area.id === areaId ? { ...area, ...values } : area) } : floor));
  }

  function deleteArea(floorId: string, areaId: string) {
    const floor = floors.find(item => item.id === floorId);
    const destinationArea = floor?.areas.find(area => area.id !== areaId);
    if (!floor || !destinationArea || floor.areas.length <= 1) return;
    setFloors(current => current.map(item => item.id === floorId ? { ...item, areas: item.areas.filter(area => area.id !== areaId) } : item));
    setAgents(current => current.map(agent => agent.floorId === floorId && agent.areaId === areaId ? { ...agent, areaId: destinationArea.id, walking: false } : agent));
    setSimulationLocations(current => { const next = { ...current }; for (const agent of agents) if (agent.floorId === floorId && (agent.areaId === areaId || next[agent.id] === areaId)) delete next[agent.id]; return next; });
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

  function moveProp(propId: string, x: number, y: number) {
    if (!activeFloor) return;
    updateProp(activeFloor.id, propId, { x, y });
  }

  function updateEventSettings(next: OfficeEventSettings) {
    setEventSettings(current => {
      const turnedOff = current.milestones.filter(previous => !next.milestones.some(item => item.id === previous.id && item.enabled));
      const activeCelebrationWasDisabled = Boolean(current.celebration && turnedOff.some(item => current.celebration?.milestoneId === item.id || (!current.celebration?.milestoneId && current.celebration?.title === item.name)));
      const seasonTurnedOff = current.season.enabled && !next.season.enabled;
      return {
        ...next,
        celebration: activeCelebrationWasDisabled ? undefined : next.celebration,
        seasonPreviewUntil: seasonTurnedOff ? undefined : next.seasonPreviewUntil,
      };
    });
  }

  function previewCelebration(milestone: OfficeMilestone) {
    const now = new Date();
    const until = celebrationEnds(eventSettings.celebrationDuration, now);
    setEventSettings(current => ({ ...current, celebration: { title: milestone.name || (milestone.metric === 'sales' ? `${milestone.target} vendas no dia` : `${currency(milestone.target)} de resultado`), until, milestoneId: milestone.id, theme: current.celebrationTheme ?? 'spark' } }));
    setEventLog(current => [`${activityStamp(now)} · prévia da comemoração “${milestone.name}” ativada.`, ...current].slice(0, 40));
    toast.success(`Comemoração ativada até ${new Date(until).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`);
  }

  function previewSeason() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    setEventSettings(current => ({ ...current, season: { ...current.season, enabled: true }, seasonPreviewUntil: midnight }));
    toast.success(`Tema ${eventSettings.season.name} ativado para visualização até meia-noite.`);
  }

  function callTeamMeeting() {
    const room = activeFloor?.areas.find(area => area.kind === 'meeting');
    if (!activeFloor || !room) {
      toast.info('Crie ou transforme uma sala em “Sala de reunião” nas opções de espaços.');
      setEditingSpaces(true);
      return;
    }
    const operationFloorIds = new Set(operationFloors.map(floor => floor.id));
    const teamAgents = agents.filter(agent => operationFloorIds.has(agent.floorId));
    if (!teamAgents.length) { toast.info('Adicione agentes antes de iniciar uma reunião.'); return; }
    if (meeting) { toast.info('A reunião simulada atual ainda está em andamento.'); return; }
    const participants = teamAgents.map(agent => agent.id);
    const previous = teamAgents.map(({ id, status, update }) => ({ id, status, update }));
    const meetingTable = activeFloor.props?.find(prop => prop.kind === 'meeting-table') ?? { id: crypto.randomUUID(), kind: 'meeting-table' as const, name: 'Mesa de reunião', x: room.x, y: room.y + 3, size: 140 };
    setFloors(current => current.map(floor => floor.id === activeFloor.id ? {
      ...floor,
      props: [
        ...(floor.props ?? []).filter(prop => prop.kind !== 'meeting-table'),
        { ...meetingTable, x: room.x, y: Math.min(88, room.y + 3) },
      ],
    } : floor));
    setMeeting({ floorId: activeFloor.id, areaId: room.id, participants, previous, arrived: false });
    if (meetingArrivalTimer.current) window.clearTimeout(meetingArrivalTimer.current);
    meetingArrivalTimer.current = window.setTimeout(() => setMeeting(current => current ? { ...current, arrived: true } : current), 2200);
    setAgents(current => current.map(agent => participants.includes(agent.id) ? { ...agent, status: 'working', update: 'Participando de uma reunião simulada com DaVinci' } : agent));
    setEventLog(current => [`${activityStamp()} · DaVinci reuniu ${participants.length} personagens simulados na sala ${room.name}.`, ...current].slice(0, 40));
    toast.success('Reunião simulada iniciada; os sprites estão indo para a sala.');
    meetingTimer.current = window.setTimeout(() => {
      setMeeting(null);
      if (meetingArrivalTimer.current) window.clearTimeout(meetingArrivalTimer.current);
      setAgents(current => current.map(agent => { const old = previous.find(item => item.id === agent.id); return old ? { ...agent, status: old.status, update: 'Reunião demonstrativa concluída' } : agent; }));
      setEventLog(current => [`${activityStamp()} · a reunião simulada terminou; os personagens voltaram às estações.`, ...current].slice(0, 40));
    }, 14000);
  }

  function selectFloor(floorId: string) {
    const floor = floors.find(item => item.id === floorId);
    if (floor) setActiveOperationId(floor.operationId);
    setActiveFloorId(floorId);
    setFocusedFloorId(floorId);
    setSelectedId(agents.find(agent => agent.floorId === floorId)?.id ?? '');
  }

  function completeReview(agentId: string) {
    setReviewIds(current => { const next = new Set(current); next.delete(agentId); return next; });
    const agent = agents.find(item => item.id === agentId);
    setAgents(current => current.map(item => item.id === agentId ? { ...item, status: 'idle', update: 'Revisão demonstrativa concluída' } : item));
    setEventSettings(current => ({ ...current, simulatedCompleted: (current.completedDate === todayKey ? current.simulatedCompleted ?? 0 : 0) + 1, completedDate: todayKey }));
    setEventLog(current => [`${activityStamp()} · etapa simulada de ${agent?.name ?? 'um agente'} aprovada na revisão.`, ...current].slice(0, 40));
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

  return <div ref={pageRef} className={`agent-office-page ${fullscreen ? 'agent-office-fullscreen' : ''}`} onMouseMove={event => { if (fullscreen && event.clientY <= 28) setFullscreenControlsOpen(true); }}>
    <header className="agent-office-header">
      <div className="agent-office-brand"><button type="button" className="agent-office-back" onClick={() => navigate('/workspace')} aria-label="Voltar ao Hub Office"><ArrowLeft size={18}/></button><div className="agent-office-mark"><Bot size={20}/></div><div><span className="office-kicker">HUB OFFICE</span><h1>Escritório de agentes</h1></div></div>
      <div className="agent-office-controls"><span className="office-live-badge"><i/> {simulation ? 'Simulação local ativa' : 'Simulação local pausada'}</span><button type="button" className="office-toolbar-button" onClick={() => setEditingAgent(null)}><Plus size={16}/> Novo agente</button><button type="button" className="office-toolbar-button" onClick={() => setEditingEvents(true)}><CalendarDays size={16}/> Metas e temas</button><button type="button" className="office-toolbar-button" onClick={callTeamMeeting}><Users size={16}/> Chamar reunião</button><button type="button" className="office-toolbar-button" onClick={toggleSimulation}>{simulation ? <Pause size={16}/> : <Play size={16}/>} {simulation ? 'Pausar simulação' : 'Simular atividade'}</button><button type="button" className="office-toolbar-button office-all-rooms-button" onClick={() => { setFullscreenMode('all-floors'); void toggleFullscreen(); }}><LayoutGrid size={16}/> Todos os andares</button><button type="button" className="office-fullscreen-button" onClick={toggleFullscreen} title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>{fullscreen ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}<span>{fullscreen ? 'Sair da tela cheia' : 'Focar no monitor'}</span></button></div>
    </header>
    {fullscreen && <div className={`office-fullscreen-controls ${fullscreenControlsOpen ? 'is-open' : ''}`} onMouseEnter={() => setFullscreenControlsOpen(true)} onMouseLeave={() => setFullscreenControlsOpen(false)}>
      <div className="office-fullscreen-edge"><button type="button" onClick={() => setFullscreenControlsOpen(value => !value)} aria-label={fullscreenControlsOpen ? 'Ocultar opções do escritório' : 'Mostrar opções do escritório'} aria-expanded={fullscreenControlsOpen}><Eye size={13}/><span>Opções</span></button></div>
      <nav className="office-fullscreen-toolbar" aria-label="Visualizações em tela cheia"><div><span className="office-live-badge"><i/> {simulation ? 'Simulação ativa' : 'Simulação pausada'}</span><label className="office-fullscreen-operation"><Layers size={14}/><select value={activeOperation?.id ?? ''} onChange={event => selectOperation(event.target.value)} aria-label="Selecionar operação">{operations.map(operation => <option key={operation.id} value={operation.id}>{operation.name}</option>)}</select></label><button type="button" className={fullscreenMode === 'floor' ? 'is-active' : ''} onClick={() => setFullscreenMode('floor')}><Eye size={15}/> Um andar</button><button type="button" className={fullscreenMode === 'all-floors' ? 'is-active' : ''} onClick={() => setFullscreenMode('all-floors')}><LayoutGrid size={15}/> Todos os andares</button><button type="button" className={fullscreenMode === 'rotate-floors' ? 'is-active' : ''} onClick={() => { setFocusedFloorId(activeFloor?.id ?? ''); setFullscreenMode('rotate-floors'); }}><RotateCw size={15}/> Alternar andares</button>{fullscreenMode === 'rotate-floors' && <><label className="office-rotation-control"><span>Ordem</span><select value={rotationOrder} onChange={event => setRotationOrder(event.target.value as 'random' | 'sequence')}><option value="random">Aleatória</option><option value="sequence">Sequencial</option></select></label><label className="office-rotation-control"><span>Troca</span><select value={rotationSeconds} onChange={event => setRotationSeconds(Number(event.target.value))}><option value={8}>8 s</option><option value={12}>12 s</option><option value={20}>20 s</option></select></label></>}<button type="button" onClick={toggleSimulation}>{simulation ? <Pause size={15}/> : <Play size={15}/>} {simulation ? 'Pausar' : 'Simular'}</button></div><button type="button" className="office-fullscreen-exit" onClick={toggleFullscreen}><Minimize2 size={16}/> Sair</button></nav>
    </div>}
    <div className="agent-office-body">
      {fullscreen && fullscreenMode === 'all-floors' ? <FullscreenFloorBoard floors={operationFloors} agents={displayAgents.filter(agent => operationFloors.some(floor => floor.id === agent.floorId))} activeFloorId={activeFloor?.id ?? ''} simulation={simulation} meeting={meeting} selectedId={selected?.id ?? ''} reviewIds={reviewIds} celebration={activeCelebration} season={seasonalActive && !activeCelebration ? eventSettings.season.name : undefined} metrics={metrics} onSelectFloor={focusFloor} onSelectAgent={agent => setSelectedId(agent.id)}/> : <>
      <section className="agent-office-map-column">
        {!fullscreen && <div className="agent-office-map-title"><div><p className="office-kicker">{activeOperation?.name ?? 'Operação'} <span>·</span> {activeFloor?.name ?? 'Andar'} · {activeFloor?.purpose ?? 'Operação geral'} · {visibleAgents.length} pessoas · {operationFloors.length} andares</p><h2>Esta operação em movimento</h2></div><div className="office-map-actions"><label className="office-floor-select-label"><Layers size={15}/><select value={activeOperation?.id ?? ''} onChange={event => selectOperation(event.target.value)} aria-label="Selecionar operação">{operations.map(operation => <option key={operation.id} value={operation.id}>{operation.name}</option>)}</select></label><label className="office-floor-select-label"><Layers size={15}/><select value={activeFloor?.id ?? ''} onChange={event => selectFloor(event.target.value)} aria-label="Selecionar andar">{operationFloors.map(floor => <option key={floor.id} value={floor.id}>{floor.name}</option>)}</select></label><button className={`office-edit-layout ${editingLayout ? 'is-active' : ''}`} type="button" onClick={() => setEditingLayout(value => !value)}><Move size={15}/>{editingLayout ? 'Concluir posição' : 'Mover móveis'}</button><button className="office-edit-layout" type="button" onClick={() => setEditingSpaces(true)}><Pencil size={15}/> Operações e andares</button><button className="office-edit-layout" type="button" onClick={() => setEditingAgent(null)}><Plus size={15}/> Novo agente</button></div></div>}
        <OfficeRoom agents={visibleAgents} areas={viewFloor?.areas ?? []} props={viewFloor?.props ?? []} floorId={viewFloor?.id ?? MAIN_FLOOR_ID} floorStyle={viewFloor?.floorStyle ?? 'oak'} floorColor={viewFloor?.floorColor ?? '#d9ae72'} meeting={meeting} selectedId={selected?.id ?? ''} simulation={simulation} fullscreen={fullscreen} editingLayout={editingLayout} onMoveProp={moveProp} onExitFullscreen={toggleFullscreen} reviewIds={reviewIds} celebration={activeCelebration} season={seasonalActive && !activeCelebration ? eventSettings.season.name : undefined} metrics={metrics} onSelect={agent => setSelectedId(agent.id)}/>
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
          <div className="office-agent-list">{agents.map(agent => <button type="button" key={agent.id} className={`office-agent-row ${selected?.id === agent.id ? 'is-selected' : ''}`} onClick={() => { const floor = floors.find(item => item.id === agent.floorId); if (floor) setActiveOperationId(floor.operationId); setActiveFloorId(agent.floorId); setFocusedFloorId(agent.floorId); setSelectedId(agent.id); }}><span className="office-row-avatar" style={{ '--agent-accent': agent.color } as CSSProperties}><Sprite agent={agent} working={false}/></span><span className="office-row-copy"><strong>{agent.name}</strong><small>{operations.find(operation => operation.id === floors.find(floor => floor.id === agent.floorId)?.operationId)?.name ?? 'Operação'} · {floors.find(floor => floor.id === agent.floorId)?.name ?? 'Andar'} · {agent.role}</small></span><i className="office-row-status" style={{ backgroundColor: statusColor[agent.status] }}/><span className="office-row-edit" role="button" aria-label={`Editar ${agent.name}`} onClick={event => { event.stopPropagation(); setEditingAgent(agent); }}><Pencil size={14}/></span></button>)}</div>
        </section>
        <section className="office-side-card office-activity-card"><div className="office-side-heading"><div><span className="office-kicker">ACOMPANHAMENTO</span><h2>Atividade recente</h2></div><span className="office-log-indicator"><i/></span></div><div className="office-activity-list">{eventLog.map((entry,index) => <p key={`${entry}-${index}`}><i/>{entry}</p>)}</div><div className="office-connection-note"><span className="office-connection-icon"><Sparkles size={15}/></span><span><strong>Modo demonstrativo</strong><small>A VPS e os agentes ainda não estão conectados.</small></span></div></section>
      </aside>
      </>}
    </div>
    <AnimatePresence>{editingAgent !== undefined && <motion.div key="agent-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><AgentEditor agent={editingAgent ?? undefined} floors={floors} defaultFloorId={activeFloor?.id ?? MAIN_FLOOR_ID} onSave={saveAgent} onClose={() => setEditingAgent(undefined)}/></motion.div>}</AnimatePresence>
    <AnimatePresence>{editingSpaces && <motion.div key="space-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><SpaceEditor operations={operations} activeOperationId={activeOperation?.id ?? MAIN_OPERATION_ID} floors={floors} selectedFloorId={activeFloor?.id ?? MAIN_FLOOR_ID} onSelectOperation={selectOperation} onAddOperation={addOperation} onRenameOperation={renameOperation} onDeleteOperation={deleteOperation} onSelectFloor={selectFloor} onAddFloor={addFloor} onRenameFloor={renameFloor} onDeleteFloor={deleteFloor} onUpdateFloor={updateFloor} onAddArea={addArea} onUpdateArea={updateArea} onDeleteArea={deleteArea} onAddProp={addProp} onUpdateProp={updateProp} onDeleteProp={deleteProp} onClose={() => setEditingSpaces(false)}/></motion.div>}</AnimatePresence>
    <AnimatePresence>{editingEvents && <motion.div key="event-editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><EventSettingsEditor settings={eventSettings} metrics={metrics} onUpdate={updateEventSettings} onPreview={previewCelebration} onPreviewSeason={previewSeason} onClose={() => setEditingEvents(false)}/></motion.div>}</AnimatePresence>
  </div>;
}
