import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LifeBuoy, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  MessageSquare,
  X,
  Send,
  Zap,
  Shield,
  HelpCircle,
  Lightbulb,
  DollarSign,
  Image as ImageIcon,
  Paperclip,
  Download
} from 'lucide-react';
import { usePortalSupport } from '@/hooks/usePortalSupport';
import { useParams } from 'react-router-dom';
import { uploadImageToImgBB } from '@/lib/imgbb';

interface PortalSupportProps {
  client: any;
}

export default function PortalSupport({ client }: PortalSupportProps) {
  const { orgId, clientId } = useParams<{ orgId: string; clientId: string }>();
  const { requests, loading, createRequest } = usePortalSupport(orgId, clientId);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  // Form State
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('media');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const categories = [
    { id: 'Financeiro', label: 'Financeiro', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'Suporte Técnico', label: 'Suporte Técnico', icon: LifeBuoy, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'Sugestão', label: 'Sugestão', icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { id: 'Solicitação de Serviço', label: 'Solicitação', icon: Zap, color: 'text-violet-400', bg: 'bg-violet-500/10' }
  ];

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'concluido': return { label: 'Concluído', color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: CheckCircle2 };
      case 'em_analise': return { label: 'Em Análise', color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Clock };
      default: return { label: 'Aberto', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: MessageSquare };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !message) return;

    setIsSubmitting(true);
    
    let imageUrl = '';
    if (selectedImage) {
      try {
        imageUrl = await uploadImageToImgBB(selectedImage);
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }

    const success = await createRequest({
      category,
      message,
      priority,
      clientName: client.name,
      imageUrl
    });

    if (success) {
      setIsModalOpen(false);
      setCategory('');
      setMessage('');
      setPriority('media');
      setSelectedImage(null);
      setImagePreview(null);
    }
    setIsSubmitting(false);
  };

  const openTickets = requests.filter(r => r.status !== 'concluido').length;
  const resolvedTickets = requests.filter(r => r.status === 'concluido').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-primary-500/10 rounded-xl">
              <LifeBuoy className="text-primary-400 w-6 h-6" />
            </div>
            Central de Atendimento
          </h3>
          <p className="text-gray-500 text-sm mt-1">Gerencie suas solicitações e tire suas dúvidas.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3.5 bg-white text-black font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-xl"
        >
          <Plus size={20} />
          Novo Chamado
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
            <MessageSquare size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Abertos</p>
            <p className="text-2xl font-black text-white">{openTickets}</p>
          </div>
        </div>
        
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Resolvidos</p>
            <p className="text-2xl font-black text-white">{resolvedTickets}</p>
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] flex items-center gap-5">
          <div className="w-12 h-12 bg-violet-500/20 rounded-2xl flex items-center justify-center text-violet-400">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tempo de Resposta</p>
            <p className="text-2xl font-black text-white">~4h Úteis</p>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="px-8 py-6 border-b border-white/10 bg-white/[0.02]">
          <h4 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
            <Clock size={16} className="text-primary-400" />
            Histórico de Chamados
          </h4>
        </div>
        
        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-20 text-center text-gray-500 italic">Carregando seus chamados...</div>
          ) : requests.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <HelpCircle className="text-gray-600" size={32} />
              </div>
              <p className="text-gray-500">Você ainda não possui nenhum chamado aberto.</p>
            </div>
          ) : (
            requests.map((ticket, index) => {
              const status = getStatusInfo(ticket.status);
              const cat = categories.find(c => c.id === ticket.category) || categories[1];
              
              return (
                <motion.div 
                  key={ticket.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedTicket(ticket)}
                  className="px-8 py-6 flex items-center justify-between hover:bg-white/[0.02] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 ${cat.bg} rounded-2xl flex items-center justify-center ${cat.color} group-hover:scale-110 transition-transform`}>
                      <cat.icon size={20} />
                    </div>
                    <div>
                      <h5 className="font-bold text-white mb-1 group-hover:text-primary-400 transition-colors">#{ticket.id.slice(-6).toUpperCase()} - {ticket.category}</h5>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-gray-600 group-hover:text-white transition-colors">
                    <span className="text-xs font-bold hidden sm:block">Ver Detalhes</span>
                    <ChevronRight size={20} />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setIsModalOpen(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[#0f0f0f] border border-white/10 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-primary-500/20 rounded-xl">
                    <Plus className="text-primary-400 w-5 h-5" />
                  </div>
                  Abrir Novo Chamado
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-4">Selecione o Assunto</label>
                  <div className="grid grid-cols-2 gap-4">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center group ${category === cat.id ? 'bg-primary-500/20 border-primary-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                      >
                        <cat.icon className={`w-6 h-6 ${category === cat.id ? 'text-primary-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                        <span className={`text-[10px] font-bold uppercase ${category === cat.id ? 'text-primary-400' : 'text-gray-500'}`}>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-4 text-right">Urgência</label>
                  <div className="flex items-center justify-end gap-3">
                    {['baixa', 'media', 'alta'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${
                          priority === p 
                            ? p === 'alta' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 
                              p === 'media' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 
                              'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : 'bg-white/5 border-white/10 text-gray-600 hover:text-gray-400'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-2">Descreva sua solicitação</label>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Detalhe o que você precisa..."
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-700 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-4">Anexar Imagem (Opcional)</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-all group">
                        <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center text-primary-400 group-hover:scale-110 transition-transform">
                          <Paperclip size={20} />
                        </div>
                        <span className="text-xs text-gray-500 font-bold">Clique para selecionar uma imagem</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageChange} 
                          className="hidden" 
                        />
                      </div>
                    </label>

                    {imagePreview && (
                      <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl group">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                          }}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting || !category || !message}
                  className="w-full py-5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-black rounded-2xl hover:shadow-lg hover:shadow-primary-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Enviando...' : 'Abrir Chamado'}
                  <Zap size={20} className="fill-current" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
              onClick={() => setSelectedTicket(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-[#0f0f0f] border border-white/10 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-8 py-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-3">
                    Chamado #{selectedTicket.id.slice(-6).toUpperCase()}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Status: {selectedTicket.status}</p>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {/* Initial Message */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold text-xs uppercase">
                      {client.name.charAt(0)}
                    </div>
                    <span className="text-xs font-bold text-white uppercase tracking-tighter">Sua Solicitação</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-5 rounded-2xl text-sm text-gray-200 leading-relaxed shadow-inner">
                    {selectedTicket.message}
                    
                    {selectedTicket.imageUrl && (
                      <div className="mt-6 space-y-3">
                        <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video flex items-center justify-center">
                          <img 
                            src={selectedTicket.imageUrl} 
                            alt="Anexo" 
                            className="max-h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(selectedTicket.imageUrl, '_blank')}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button 
                              onClick={() => window.open(selectedTicket.imageUrl, '_blank')}
                              className="p-3 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 text-white transition-all"
                              title="Visualizar"
                            >
                              <ImageIcon size={20} />
                            </button>
                            <a 
                              href={selectedTicket.imageUrl} 
                              download={`anexo-${selectedTicket.id}.jpg`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-3 bg-white/10 backdrop-blur-md rounded-xl hover:bg-white/20 text-white transition-all"
                              title="Baixar"
                            >
                              <Download size={20} />
                            </a>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                          <ImageIcon size={12} />
                          Anexo enviado pelo cliente
                        </p>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-600 font-bold uppercase">
                    {selectedTicket.createdAt?.toDate ? selectedTicket.createdAt.toDate().toLocaleString() : ''}
                  </span>
                </div>

                {/* Consultant Reply */}
                {selectedTicket.reply ? (
                  <div className="flex flex-col gap-3 items-end">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-primary-400 uppercase tracking-tighter text-right">Resposta do Consultor</span>
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-primary-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-lg shadow-primary-500/20">
                        <Shield size={14} />
                      </div>
                    </div>
                    <div className="bg-primary-500/10 border border-primary-500/20 p-5 rounded-2xl text-sm text-white leading-relaxed shadow-lg">
                      {selectedTicket.reply}
                    </div>
                    <span className="text-[10px] text-gray-600 font-bold uppercase">
                      {selectedTicket.repliedAt?.toDate ? selectedTicket.repliedAt.toDate().toLocaleString() : ''}
                    </span>
                  </div>
                ) : (
                  <div className="py-10 text-center border border-dashed border-white/10 rounded-[2rem]">
                    <Clock className="mx-auto mb-4 text-gray-600 animate-pulse" size={32} />
                    <p className="text-sm text-gray-500">Aguardando resposta do consultor...</p>
                    <p className="text-[10px] text-gray-600 uppercase font-bold mt-2 tracking-widest">SLA Estimado: 4 Horas Úteis</p>
                  </div>
                )}
              </div>

              {selectedTicket.status === 'concluido' && (
                <div className="p-8 border-t border-white/10 bg-emerald-500/5 text-center">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-xs mb-2">
                    <CheckCircle2 size={16} />
                    Chamado Finalizado
                  </div>
                  <p className="text-gray-500 text-xs">Este atendimento foi concluído. Se precisar de algo mais, abra um novo chamado.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
