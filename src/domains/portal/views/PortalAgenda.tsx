import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, Clock, Coffee, Plus, Trash2, Edit2, Check, X, Phone, DollarSign, Settings, Scissors
} from 'lucide-react';
import { toast } from 'sonner';

interface PortalAgendaProps {
  orgId: string;
  clientId: string;
}

export default function PortalAgenda({ orgId, clientId }: PortalAgendaProps) {
  // Abas internas: 'timeline' | 'services' | 'settings'
  const [subTab, setSubTab] = useState<'timeline' | 'services' | 'settings'>('timeline');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Estados dos dados
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [expediente, setExpediente] = useState<any>({
    businessHours: {
      monday: { open: "08:00", close: "18:00", active: true },
      tuesday: { open: "08:00", close: "18:00", active: true },
      wednesday: { open: "08:00", close: "18:00", active: true },
      thursday: { open: "08:00", close: "18:00", active: true },
      friday: { open: "08:00", close: "18:00", active: true },
      saturday: { open: "09:00", close: "13:00", active: false },
      sunday: { open: "00:00", close: "00:00", active: false }
    },
    slotIntervalMinutes: 30
  });

  // Estados dos formulários de CRUD de Serviços
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDuration, setServiceDuration] = useState(30);
  const [servicePrice, setServicePrice] = useState('');
  const [isSubmittingService, setIsSubmittingService] = useState(false);

  // Estados do Agendamento Manual
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [newDate, setNewDate] = useState(selectedDate);
  const [newTime, setNewTime] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState<'unpaid' | 'paid'>('unpaid');
  const [isSubmittingAppointment, setIsSubmittingAppointment] = useState(false);

  // Mantém a data do formulário sincronizada ao abrir
  useEffect(() => {
    setNewDate(selectedDate);
  }, [selectedDate, isModalOpen]);

  const handleServiceChange = (srvId: string) => {
    setNewServiceId(srvId);
    const selectedSrv = services.find(s => s.id === srvId);
    if (selectedSrv) {
      setNewPrice(selectedSrv.price.toString());
    } else {
      setNewPrice('');
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim() || !newTime || !newServiceId || !orgId) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const selectedSrv = services.find(s => s.id === newServiceId);
    if (!selectedSrv) {
      toast.error('Selecione um serviço válido.');
      return;
    }

    setIsSubmittingAppointment(true);
    try {
      await addDoc(collection(db, 'organizations', orgId, 'appointments'), {
        clientName: newClientName.trim(),
        clientPhone: newClientPhone.trim(),
        clientEmail: newClientEmail.trim(),
        serviceId: newServiceId,
        serviceName: selectedSrv.name,
        date: newDate,
        time: newTime,
        price: Number(newPrice.replace(',', '.')),
        status: 'confirmed', // Confirmado por padrão
        paymentStatus: newPaymentStatus,
        createdAt: serverTimestamp()
      });

      toast.success('Agendamento realizado com sucesso!');
      setIsModalOpen(false);
      
      // Limpa os campos
      setNewClientName('');
      setNewClientPhone('');
      setNewClientEmail('');
      setNewServiceId('');
      setNewTime('');
      setNewPrice('');
      setNewPaymentStatus('unpaid');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao realizar o agendamento.');
    } finally {
      setIsSubmittingAppointment(false);
    }
  };

  // Escuta Agendamentos
  useEffect(() => {
    if (!orgId) return;
    const appointmentsRef = collection(db, 'organizations', orgId, 'appointments');
    const q = query(appointmentsRef, orderBy('time', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAppointments(list);
    });
    return () => unsub();
  }, [orgId]);

  // Escuta Serviços do Cliente
  useEffect(() => {
    if (!orgId) return;
    const servicesRef = collection(db, 'organizations', orgId, 'client_services');
    const q = query(servicesRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setServices(list);
    });
    return () => unsub();
  }, [orgId]);

  // Escuta Configuração de Expediente
  useEffect(() => {
    if (!orgId) return;
    const docRef = doc(db, 'organizations', orgId, 'settings', 'scheduling');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setExpediente(docSnap.data());
      }
    });
    return () => unsub();
  }, [orgId]);

  // Ações de CRUD de Serviços
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !servicePrice.trim() || !orgId) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    setIsSubmittingService(true);
    try {
      const payload = {
        name: serviceName.trim(),
        durationMinutes: Number(serviceDuration),
        price: Number(servicePrice.replace(',', '.')),
        isActive: true,
        updatedAt: serverTimestamp()
      };

      if (editingServiceId) {
        // Atualizar
        await updateDoc(doc(db, 'organizations', orgId, 'client_services', editingServiceId), payload);
        toast.success('Serviço atualizado com sucesso!');
      } else {
        // Criar novo
        await addDoc(collection(db, 'organizations', orgId, 'client_services'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success('Serviço criado com sucesso!');
      }

      setServiceName('');
      setServicePrice('');
      setServiceDuration(30);
      setEditingServiceId(null);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar serviço.');
    } finally {
      setIsSubmittingService(false);
    }
  };

  const handleEditService = (srv: any) => {
    setEditingServiceId(srv.id);
    setServiceName(srv.name);
    setServiceDuration(srv.durationMinutes);
    setServicePrice(srv.price.toString());
  };

  const handleDeleteService = async (srvId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'client_services', srvId));
      toast.success('Serviço excluído!');
    } catch (e) {
      toast.error('Erro ao excluir serviço.');
    }
  };

  // Salvar Regras de Expediente
  const handleSaveExpediente = async () => {
    if (!orgId) return;
    try {
      await setDoc(doc(db, 'organizations', orgId, 'settings', 'scheduling'), expediente, { merge: true });
      toast.success('Configurações de expediente salvas!');
    } catch (e) {
      toast.error('Erro ao salvar configurações.');
    }
  };

  // Ações de Agendamento (Mudar Status)
  const handleUpdateAppointmentStatus = async (appId: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    try {
      await updateDoc(doc(db, 'organizations', orgId, 'appointments', appId), { status });
      toast.success(`Status atualizado para: ${status === 'confirmed' ? 'Confirmado' : status === 'cancelled' ? 'Cancelado' : 'Concluído'}`);
    } catch (e) {
      toast.error('Erro ao atualizar agendamento.');
    }
  };

  // Filtragem de agendamentos do dia selecionado
  const appointmentsToday = appointments.filter(app => app.date === selectedDate);

  return (
    <div className="space-y-6">
      {/* Abas Superiores com Efeito Glass */}
      <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl w-fit">
        <button
          onClick={() => setSubTab('timeline')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            subTab === 'timeline' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock size={14} />
          Linha do Tempo
        </button>
        <button
          onClick={() => setSubTab('services')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            subTab === 'services' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Scissors size={14} />
          Gerenciar Serviços
        </button>
        <button
          onClick={() => setSubTab('settings')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
            subTab === 'settings' ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings size={14} />
          Expediente Comercial
        </button>
      </div>

      {/* ABA 1: LINHA DO TEMPO */}
      {subTab === 'timeline' && (
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarIcon className="text-primary-400" size={20} />
                Agenda Diária
              </h2>
              <p className="text-xs text-gray-400">Gerencie os horários marcados pelos clientes do seu site e WhatsApp.</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Seletor de Data */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2.5 bg-black/40 border border-white/15 hover:border-white/30 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all outline-none font-bold"
              />
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-1.5 shadow-lg shadow-primary-500/20 active:scale-95"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Novo Agendamento</span>
              </button>
            </div>
          </div>

          <div className="w-full h-[1px] bg-white/15" />

          {/* Timeline da Agenda */}
          {appointmentsToday.length === 0 ? (
            <div className="py-20 text-center bg-black/20 rounded-2xl border border-white/5">
              <CalendarIcon size={48} className="mx-auto mb-4 text-gray-600" />
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Nenhum Agendamento Hoje</p>
              <p className="text-xs text-gray-500 mt-1">Sua agenda de {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')} está livre.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-primary-500/20 ml-4 pl-8 space-y-8 py-2">
              {appointmentsToday.map((app) => (
                <div key={app.id} className="relative group">
                  {/* Ponto / Indicador na Timeline */}
                  <div className={`absolute -left-[39px] top-1.5 w-4.5 h-4.5 rounded-full border-4 border-[#050505] shadow-md transition-colors ${
                    app.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' :
                    app.status === 'cancelled' ? 'bg-rose-500' : 'bg-primary-500 animate-pulse'
                  }`} />

                  {/* Card do Agendamento */}
                  <div className="bg-black/20 hover:bg-black/30 border border-white/5 hover:border-white/10 rounded-2xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-black text-primary-400 font-mono flex items-center gap-1.5 bg-primary-500/10 px-2.5 py-1 rounded-lg">
                          <Clock size={12} />
                          {app.time}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          app.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          {app.paymentStatus === 'paid' ? 'PAGO' : 'NÃO PAGO'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{app.clientName}</h3>
                      <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Scissors size={12} className="text-gray-600" />
                        Serviço: <span className="text-white font-medium">{app.serviceName}</span> &bull; 
                        <DollarSign size={12} className="text-gray-600 ml-1" /> Valor: <span className="text-white font-medium">R$ {app.price?.toFixed(2).replace('.', ',')}</span>
                      </p>
                    </div>

                    {/* Botões de Ação do Atendente */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {app.clientPhone && (
                        <a
                          href={`https://wa.me/${app.clientPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                        >
                          <Phone size={14} />
                          Contatar
                        </a>
                      )}
                      
                      {app.status !== 'completed' && app.status !== 'cancelled' && (
                        <>
                          <button
                            onClick={() => handleUpdateAppointmentStatus(app.id, 'completed')}
                            className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                          >
                            <Check size={14} />
                            Finalizar
                          </button>
                          <button
                            onClick={() => handleUpdateAppointmentStatus(app.id, 'cancelled')}
                            className="p-2.5 bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <X size={14} />
                            Cancelar
                          </button>
                        </>
                      )}
                      {app.status === 'completed' && (
                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 rounded-xl">
                          <Check size={14} /> Concluído
                        </span>
                      )}
                      {app.status === 'cancelled' && (
                        <span className="text-rose-400 text-xs font-bold flex items-center gap-1 bg-rose-500/5 border border-rose-500/20 px-3 py-2 rounded-xl">
                          <X size={14} /> Cancelado
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: CRUD DE SERVIÇOS */}
      {subTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de Cadastro/Edição */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl h-fit">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Scissors className="text-primary-400" size={18} />
              {editingServiceId ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>
            <form onSubmit={handleSaveService} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome do Serviço</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: Corte Degradê, Consulta Médica..."
                  className="w-full px-4 py-3 bg-black/40 border border-white/15 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all placeholder-gray-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duração (minutos)</label>
                  <select
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-black/40 border border-white/15 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preço (R$)</label>
                  <input
                    type="text"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="Ex: 85,00"
                    className="w-full px-4 py-3 bg-black/40 border border-white/15 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all placeholder-gray-600 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingService}
                  className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-600/50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-primary-500/10 flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  Salvar
                </button>
                {editingServiceId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingServiceId(null);
                      setServiceName('');
                      setServicePrice('');
                      setServiceDuration(30);
                    }}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de Serviços Cadastrados */}
          <div className="lg:col-span-2 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Serviços Cadastrados</h3>
              <p className="text-xs text-gray-400">Estes itens estarão visíveis para os clientes escolherem no seu site e na IA do WhatsApp.</p>
            </div>

            {services.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
                <Scissors size={36} className="mx-auto mb-3 text-gray-600" />
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Nenhum Serviço Encontrado</p>
                <p className="text-[11px] text-gray-600 mt-1">Adicione seu primeiro serviço ao lado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map((srv) => (
                  <div key={srv.id} className="bg-black/20 border border-white/5 hover:border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4 transition-all">
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-bold text-white truncate text-sm">{srv.name}</h4>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <span>{srv.durationMinutes} min</span> &bull; 
                        <span className="text-primary-400 font-bold">R$ {srv.price?.toFixed(2).replace('.', ',')}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditService(srv)}
                        className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-lg transition-all"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteService(srv.id)}
                        className="p-2 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 rounded-lg transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: EXPEDIENTE COMERCIAL */}
      {subTab === 'settings' && (
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="text-primary-400" size={20} />
              Expediente Comercial
            </h2>
            <p className="text-xs text-gray-400">Configure os horários em que seu estabelecimento está aberto e aceita novos agendamentos.</p>
          </div>

          <div className="w-full h-[1px] bg-white/15" />

          {/* Grid de Dias da Semana */}
          <div className="space-y-3 max-w-xl">
            {Object.keys(expediente.businessHours || {}).map((day) => {
              const dayConfig = expediente.businessHours[day];
              const translate: Record<string, string> = {
                monday: 'Segunda-feira',
                tuesday: 'Terça-feira',
                wednesday: 'Quarta-feira',
                thursday: 'Quinta-feira',
                friday: 'Sexta-feira',
                saturday: 'Sábado',
                sunday: 'Domingo'
              };

              return (
                <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={dayConfig.active}
                      onChange={(e) => {
                        const newConfig = { ...expediente };
                        newConfig.businessHours[day].active = e.target.checked;
                        setExpediente(newConfig);
                      }}
                      className="w-4 h-4 rounded border-white/10 text-primary-500 bg-black/40 focus:ring-primary-500 focus:ring-offset-black"
                    />
                    <span className="text-xs font-bold text-white w-28">{translate[day] || day}</span>
                  </div>

                  {dayConfig.active ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={dayConfig.open}
                        onChange={(e) => {
                          const newConfig = { ...expediente };
                          newConfig.businessHours[day].open = e.target.value;
                          setExpediente(newConfig);
                        }}
                        className="px-3 py-1.5 bg-black/40 border border-white/10 text-white rounded-lg text-xs outline-none font-mono"
                      />
                      <span className="text-xs text-gray-500">às</span>
                      <input
                        type="time"
                        value={dayConfig.close}
                        onChange={(e) => {
                          const newConfig = { ...expediente };
                          newConfig.businessHours[day].close = e.target.value;
                          setExpediente(newConfig);
                        }}
                        className="px-3 py-1.5 bg-black/40 border border-white/10 text-white rounded-lg text-xs outline-none font-mono"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 italic">Fechado / Sem expediente</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="w-full h-[1px] bg-white/15" />

          {/* Intervalo de Slots */}
          <div className="space-y-2 max-w-xs">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Intervalo entre Agendamentos</label>
            <select
              value={expediente.slotIntervalMinutes}
              onChange={(e) => setExpediente({ ...expediente, slotIntervalMinutes: Number(e.target.value) })}
              className="w-full px-4 py-3 bg-black/40 border border-white/15 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all"
            >
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos</option>
            </select>
          </div>

          {/* Botão Salvar */}
          <button
            onClick={handleSaveExpediente}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-primary-500/10 flex items-center gap-1.5"
          >
            <Check size={14} />
            Salvar Expediente
          </button>
        </div>
      )}

      {/* Modal Glassmorphism de Novo Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-1">Novo Agendamento</h3>
              <p className="text-xs text-gray-400">Preencha os dados do cliente e selecione o serviço para registrar na agenda.</p>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              {/* Cliente */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nome do Cliente</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all placeholder-gray-600 focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>

              {/* Contatos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">WhatsApp / Tel</label>
                  <input
                    type="text"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="5511999999999"
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all placeholder-gray-600 focus:ring-1 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">E-mail (Opcional)</label>
                  <input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all placeholder-gray-600 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Serviço */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Serviço Ofertado</label>
                <select
                  value={newServiceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white rounded-xl text-sm outline-none transition-all focus:border-primary-500"
                  required
                >
                  <option value="" className="bg-[#050505] text-gray-500">Selecione um serviço...</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#050505]">{s.name} (R$ {s.price})</option>
                  ))}
                </select>
              </div>

              {/* Data / Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white rounded-xl text-sm outline-none transition-all focus:border-primary-500 font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Horário</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white rounded-xl text-sm outline-none transition-all focus:border-primary-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Valor / Pagamento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Valor Cobrado (R$)</label>
                  <input
                    type="text"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="Ex: 150,00"
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-primary-500 text-white rounded-xl text-sm outline-none transition-all placeholder-gray-600 focus:ring-1 focus:ring-primary-500 font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status do Pagamento</label>
                  <select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value as 'unpaid' | 'paid')}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 text-white rounded-xl text-sm outline-none transition-all focus:border-primary-500 font-bold"
                  >
                    <option value="unpaid" className="bg-[#050505] text-amber-400">PENDENTE</option>
                    <option value="paid" className="bg-[#050505] text-emerald-400">PAGO</option>
                  </select>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmittingAppointment}
                  className="flex-1 py-3.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-600/50 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all active:scale-[0.98] shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2"
                >
                  {isSubmittingAppointment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Agendar Cliente</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
