import React, { useState, useMemo } from 'react';
import { Layout, CheckSquare, Clock, Search, Filter, ArrowRight, AlertTriangle, CheckCircle2, User, Kanban, List, LayoutTemplate, FileText } from 'lucide-react';
import { useCRM } from '@crm/contexts/CRMContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProductionTemplatesView from './ProductionTemplatesView';
import { Table, Avatar, Chip, Meter } from '@heroui/react';

type ProjectTab = 'running' | 'delivered' | 'overdue';
type ActiveSection = 'projects' | 'templates' | 'prompts';

export default function ProjectsView() {
  const { clients, teamProfiles, setEditingClient } = useCRM();
  const [activeSection, setActiveSection] = useState<ActiveSection>('projects');
  const [activeTab, setActiveTab] = useState<ProjectTab>('running');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();
  
  const [sortDescriptor, setSortDescriptor] = useState<{column: string, direction: 'ascending' | 'descending'}>({
    column: 'name',
    direction: 'ascending'
  });

  // Lógica de SLA: Consideramos atrasado se estiver "Em Desenvolvimento" há mais de 20 dias
  // ou se não houver movimentação nos logs/estágios recentemente (simplificado para v4.0)
  const isOverdue = (createdAt: number) => {
    const days = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
    return days > 20;
  };

  const filteredProjects = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'running') return client.status === 'Em Desenvolvimento' && !isOverdue(client.createdAt);
    if (activeTab === 'overdue') return client.status === 'Em Desenvolvimento' && isOverdue(client.createdAt);
    if (activeTab === 'delivered') return client.status === 'Ativo';
    return false;
  });

  const sortedProjects = useMemo(() => {
    const list = [...filteredProjects];
    list.sort((a, b) => {
      const col = sortDescriptor.column;
      let first = a[col as keyof typeof a];
      let second = b[col as keyof typeof b];

      if (col === 'progress') {
        first = calculateProgress(a.stages || []) as any;
        second = calculateProgress(b.stages || []) as any;
      }

      if (first === undefined || first === null) return 1;
      if (second === undefined || second === null) return -1;

      let cmp = 0;
      if (typeof first === 'string' && typeof second === 'string') {
        cmp = first.localeCompare(second);
      } else {
        cmp = (first as any) < (second as any) ? -1 : (first as any) > (second as any) ? 1 : 0;
      }
      return sortDescriptor.direction === 'descending' ? -cmp : cmp;
    });
    return list;
  }, [filteredProjects, sortDescriptor]);

  const calculateProgress = (stages: any[]) => {
    if (!stages || stages.length === 0) return 0;
    const completed = stages.filter(s => s.completed).length;
    return Math.round((completed / stages.length) * 100);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Estratégico de Produção */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400">
                <LayoutTemplate size={24} />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">Fábrica de Sites & Projetos</h2>
            </div>
            <p className="text-gray-400">Central de Produção, Templates White Label e Prompts Otimizados</p>
          </div>

          {activeSection === 'projects' && (
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors" size={18} />
                <input 
                  type="text"
                  placeholder="Buscar projeto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 w-full md:w-64 backdrop-blur-xl transition-all"
                />
              </div>
              <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Kanban size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Alternador de Módulos Unificado */}
        <div className="flex gap-6 border-b border-white/5 pb-2 font-bold text-xs uppercase tracking-wider">
          <button
            onClick={() => setActiveSection('projects')}
            className={`pb-2 transition-all border-b-2 flex items-center gap-1.5 ${
              activeSection === 'projects'
                ? 'border-primary-500 text-white font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <Layout size={14} />
            Acompanhamento de Projetos
          </button>
          <button
            onClick={() => setActiveSection('templates')}
            className={`pb-2 transition-all border-b-2 flex items-center gap-1.5 ${
              activeSection === 'templates'
                ? 'border-primary-500 text-white font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <LayoutTemplate size={14} />
            Templates de Sites
          </button>
          <button
            onClick={() => setActiveSection('prompts')}
            className={`pb-2 transition-all border-b-2 flex items-center gap-1.5 ${
              activeSection === 'prompts'
                ? 'border-primary-500 text-white font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <FileText size={14} />
            Biblioteca de Prompts IA
          </button>
        </div>

        {activeSection === 'projects' ? (
          <>
            {/* Status Hub (Tabs) */}
            <div className="flex items-center gap-2 p-1 bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl w-fit">
              <StatusTab 
                active={activeTab === 'running'} 
                onClick={() => setActiveTab('running')}
                icon={<Clock size={16} />}
                label="Em Execução"
                count={clients.filter(c => c.status === 'Em Desenvolvimento' && !isOverdue(c.createdAt)).length}
                color="primary"
              />
              <StatusTab 
                active={activeTab === 'overdue'} 
                onClick={() => setActiveTab('overdue')}
                icon={<AlertTriangle size={16} />}
                label="Críticos / SLA"
                count={clients.filter(c => c.status === 'Em Desenvolvimento' && isOverdue(c.createdAt)).length}
                color="red"
              />
              <StatusTab 
                active={activeTab === 'delivered'} 
                onClick={() => setActiveTab('delivered')}
                icon={<CheckCircle2 size={16} />}
                label="Entregues"
                count={clients.filter(c => c.status === 'Ativo').length}
                color="green"
              />
            </div>

            {/* Dashboard de Projetos */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + viewMode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                {filteredProjects.length > 0 ? (
                  viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredProjects.map((project) => {
                        const progress = calculateProgress(project.stages || []);
                        const assigned = teamProfiles.find(p => p.uid === project.assignedTo);
                        
                        return (
                          <motion.div
                            key={project.id}
                            layout
                            className={`group p-6 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-3xl backdrop-blur-xl transition-all duration-500 ${activeTab === 'overdue' ? 'ring-1 ring-red-500/20' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${activeTab === 'overdue' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'} rounded-xl flex items-center justify-center`}>
                                  {activeTab === 'delivered' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest block mb-0.5">Responsável</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-gray-300">{assigned?.displayName || 'Sem atribuição'}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className={`px-3 py-1 bg-black/20 rounded-full border border-white/5 text-[10px] font-bold ${activeTab === 'overdue' ? 'text-red-400 italic animate-pulse' : 'text-gray-500'}`}>
                                {formatDistanceToNow(project.createdAt, { locale: ptBR, addSuffix: true })}
                              </div>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary-400 transition-colors truncate">
                              {project.name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-6 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-primary-500" />
                              {project.plan}
                            </p>

                            <div className="space-y-4">
                              <div className="flex justify-between items-end">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status da Entrega</span>
                                <span className={`text-lg font-bold ${activeTab === 'overdue' ? 'text-red-400' : 'text-primary-400'}`}>{progress}%</span>
                              </div>
                              <Meter value={progress} color={activeTab === 'overdue' ? 'danger' : 'success'} className="w-full">
                                <Meter.Track className="h-2 bg-white/5 rounded-full overflow-hidden w-full mt-2">
                                  <Meter.Fill className={`h-full rounded-full ${activeTab === 'overdue' ? 'bg-red-500' : 'bg-primary-500'}`} />
                                </Meter.Track>
                              </Meter>
                              <div className="flex items-center justify-between text-[11px] text-gray-500 bg-black/10 p-2.5 rounded-xl border border-white/5 font-medium">
                                <span className="flex items-center gap-2">
                                  <CheckSquare size={14} className="text-primary-500" />
                                  {project.stages?.find(s => !s.completed)?.name || 'Projeto Concluído'}
                                </span>
                                <ArrowRight size={12} className="opacity-50" />
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setEditingClient(project);
                                navigate('/clients');
                              }}
                              className="mt-8 w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/5 transition-all text-sm font-bold flex items-center justify-center gap-2 group/btn"
                            >
                              Gerenciar Projeto
                              <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-all" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <Table>
                      <Table.Content 
                        aria-label="Tabela de Projetos"
                        sortDescriptor={sortDescriptor}
                        onSortChange={(desc) => setSortDescriptor(desc as any)}
                        className="bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-xl w-full"
                      >
                        <Table.Header>
                          <Table.Column id="name" allowsSorting>PROJETO</Table.Column>
                          <Table.Column id="plan" allowsSorting>PLANO</Table.Column>
                          <Table.Column id="assignedTo" allowsSorting>RESPONSÁVEL</Table.Column>
                          <Table.Column id="progress" allowsSorting>PROGRESSO</Table.Column>
                          <Table.Column id="createdAt" allowsSorting>CRIADO EM</Table.Column>
                          <Table.Column id="actions">AÇÕES</Table.Column>
                        </Table.Header>
                        <Table.Body>
                          {sortedProjects.map((project) => {
                            const progress = calculateProgress(project.stages || []);
                            const assigned = teamProfiles.find(p => p.uid === project.assignedTo);
                            
                            return (
                              <Table.Row key={project.id}>
                                <Table.Cell className="font-bold text-white py-3">{project.name}</Table.Cell>
                                <Table.Cell>
                                  <Chip size="sm" variant="flat" color="primary">{project.plan}</Chip>
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="flex items-center gap-2">
                                    <Avatar size="sm" className="w-6 h-6 text-[10px]">
                                      <Avatar.Fallback className="bg-primary-500 text-white font-bold uppercase text-[9px] flex items-center justify-center w-full h-full">
                                        {assigned?.displayName ? assigned.displayName.substring(0, 2) : 'S'}
                                      </Avatar.Fallback>
                                    </Avatar>
                                    <span className="text-xs text-gray-300 font-semibold">{assigned?.displayName || 'Sem atribuição'}</span>
                                  </div>
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="flex items-center gap-2 w-32">
                                    <Meter value={progress} color={activeTab === 'overdue' ? 'danger' : 'success'} className="w-full">
                                      <Meter.Track className="h-1.5 bg-gray-700 rounded-full overflow-hidden w-full">
                                        <Meter.Fill className={`h-full rounded-full ${activeTab === 'overdue' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                      </Meter.Track>
                                    </Meter>
                                    <span className="text-xs font-bold text-gray-400">{progress}%</span>
                                  </div>
                                </Table.Cell>
                                <Table.Cell className="text-xs text-gray-400">
                                  {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                                </Table.Cell>
                                <Table.Cell>
                                  <button
                                    onClick={() => {
                                      setEditingClient(project);
                                      navigate('/clients');
                                    }}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/5 text-xs font-bold transition-all"
                                  >
                                    Gerenciar
                                  </button>
                                </Table.Cell>
                              </Table.Row>
                            );
                          })}
                        </Table.Body>
                      </Table.Content>
                    </Table>
                  )
                ) : (
                  <EmptyProjects tab={activeTab} />
                )}
              </motion.div>
            </AnimatePresence>
          </>
        ) : (
          <ProductionTemplatesView viewMode={activeSection === 'templates' ? 'templates' : 'prompts'} />
        )}
      </div>
    </div>
  );
}

function StatusTab({ active, onClick, icon, label, count, color }: any) {
  const getColors = () => {
    if (!active) return 'text-gray-400 hover:text-white hover:bg-white/5';
    switch (color) {
      case 'red': return 'bg-red-500 text-white shadow-lg shadow-red-500/20';
      case 'green': return 'bg-green-500 text-white shadow-lg shadow-green-500/20';
      default: return 'bg-primary-500 text-white shadow-lg shadow-primary-500/20';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl transition-all duration-300 font-semibold text-sm ${getColors()}`}
    >
      {icon}
      {label}
      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${active ? 'bg-black/20 text-white' : 'bg-white/5 text-gray-500'}`}>
        {count}
      </span>
    </button>
  );
}

function EmptyProjects({ tab }: { tab: ProjectTab }) {
  const data = {
    running: { title: "Nenhum projeto rodando", desc: "Tudo entregue ou aguardando início." },
    overdue: { title: "Nenhum atraso crítico", desc: "Parabéns! Todas as entregas estão no prazo." },
    delivered: { title: "Sem histórico de entregas", desc: "Os projetos finalizados aparecerão aqui." },
  }[tab];

  return (
    <div className="col-span-full py-32 flex flex-col items-center justify-center text-center opacity-60">
      <div className="p-8 bg-black/20 rounded-full mb-6 border border-white/5">
        <Layout size={48} className="text-gray-700" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">{data.title}</h3>
      <p className="text-gray-500 max-w-sm">{data.desc}</p>
    </div>
  );
}
