import React, { useState, useEffect } from 'react';
import { X, Target, Briefcase, Users, DollarSign, AlertCircle, Sparkles, Check, Plus, Trash2, Tag, BookOpen, Layers } from 'lucide-react';
import { ICP, Offer } from '@/types';

interface ICPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (icpData: Partial<ICP>) => Promise<void>;
  editingICP: ICP | null;
  offers: Offer[];
}

export default function ICPModal({ isOpen, onClose, onSave, editingICP, offers }: ICPModalProps) {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'CANVAS' | 'PITCH'>('GENERAL');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<ICP>>({
    name: '',
    targetType: 'B2B',
    niche: '',
    companySize: '',
    decisionMakerRole: '',
    avgTicket: 0,
    ageGroup: '',
    gender: 'Todos',
    incomeRange: '',
    lifestyleInterests: [],
    painPoints: [],
    desires: [],
    objections: [],
    channels: [],
    pitchNotes: '',
    linkedOfferIds: [],
    active: true
  });

  // Inputs temporários para tags
  const [newPainPoint, setNewPainPoint] = useState('');
  const [newDesire, setNewDesire] = useState('');
  const [newObjection, setNewObjection] = useState('');
  const [newChannel, setNewChannel] = useState('');

  useEffect(() => {
    if (editingICP) {
      setFormData({
        ...editingICP,
        targetType: editingICP.targetType || 'B2B',
        lifestyleInterests: editingICP.lifestyleInterests || [],
        painPoints: editingICP.painPoints || [],
        desires: editingICP.desires || [],
        objections: editingICP.objections || [],
        channels: editingICP.channels || [],
        linkedOfferIds: editingICP.linkedOfferIds || []
      });
    } else {
      setFormData({
        name: '',
        targetType: 'B2B',
        niche: '',
        companySize: '',
        decisionMakerRole: '',
        avgTicket: 0,
        ageGroup: '25 - 45 anos',
        gender: 'Todos',
        incomeRange: 'R$ 5.000 - R$ 15.000/mês',
        lifestyleInterests: [],
        painPoints: ['Pouco tempo para gerenciar processos', 'Baixa previsibilidade de receita'],
        desires: ['Escalar vendas com previsibilidade', 'Centralizar gestão da empresa'],
        objections: ['Já tenho outro sistema', 'Preço / Orçamento apertado'],
        channels: ['Outbound (Cold Call)', 'Meta Ads', 'Indicação'],
        pitchNotes: '',
        linkedOfferIds: [],
        active: true
      });
    }
  }, [editingICP, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    try {
      setSaving(true);
      await onSave(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addTagItem = (field: 'painPoints' | 'desires' | 'objections' | 'channels', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    const current = formData[field] || [];
    if (!current.includes(value.trim())) {
      setFormData(prev => ({ ...prev, [field]: [...current, value.trim()] }));
    }
    setter('');
  };

  const removeTagItem = (field: 'painPoints' | 'desires' | 'objections' | 'channels', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index)
    }));
  };

  const toggleOfferLink = (offerId: string) => {
    const current = formData.linkedOfferIds || [];
    const updated = current.includes(offerId)
      ? current.filter(id => id !== offerId)
      : [...current, offerId];
    setFormData(prev => ({ ...prev, linkedOfferIds: updated }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Target size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {editingICP ? 'Editar Perfil de Cliente Ideal (ICP)' : 'Novo Perfil de Cliente Ideal (ICP)'}
              </h3>
              <p className="text-xs text-gray-400">Mapeie as características do comprador ideal para guiar seus produtos e vendas.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-white/10 px-6 bg-black/40 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('GENERAL')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'GENERAL' 
                ? 'border-amber-500 text-amber-400 bg-white/5' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Briefcase size={14} />
            1. Dados Gerais & Firmografia
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CANVAS')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'CANVAS' 
                ? 'border-amber-500 text-amber-400 bg-white/5' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <AlertCircle size={14} />
            2. Dores, Desejos & Objeções
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PITCH')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'PITCH' 
                ? 'border-amber-500 text-amber-400 bg-white/5' 
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles size={14} />
            3. Pitch & Produtos Conectados
          </button>
        </div>

        {/* Corpo do Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* ABA 1: DADOS GERAIS */}
          {activeTab === 'GENERAL' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* TIPO DE PERFIL: B2B VS B2C */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">Tipo de Cliente Alvo *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, targetType: 'B2B' }))}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      formData.targetType === 'B2B'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-md'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <span>🏢 B2B (Empresarial)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, targetType: 'B2C' }))}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                      formData.targetType === 'B2C'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                        : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <span>👤 B2C (Consumidor Final)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Nome da Persona / ICP *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={formData.targetType === 'B2B' ? "Ex: Infoprodutor de Cursos Digitais (Scale)" : "Ex: Jovem Profissional em Busca de Especialização"}
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* CAMPOS ESPECÍFICOS B2B */}
              {formData.targetType === 'B2B' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Setor / Nicho de Atuação</label>
                      <input 
                        type="text"
                        value={formData.niche}
                        onChange={e => setFormData(prev => ({ ...prev, niche: e.target.value }))}
                        placeholder="Ex: Educação / E-learning / SaaS"
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Cargo do Decisor de Compra</label>
                      <input 
                        type="text"
                        value={formData.decisionMakerRole}
                        onChange={e => setFormData(prev => ({ ...prev, decisionMakerRole: e.target.value }))}
                        placeholder="Ex: CEO, Diretor de Marketing, Founder"
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Porte da Empresa / Faturamento</label>
                      <input 
                        type="text"
                        value={formData.companySize}
                        onChange={e => setFormData(prev => ({ ...prev, companySize: e.target.value }))}
                        placeholder="Ex: 5 a 20 funcionários / R$ 50k - R$ 200k/mês"
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Ticket Médio Estimado (R$)</label>
                      <input 
                        type="number"
                        value={formData.avgTicket || ''}
                        onChange={e => setFormData(prev => ({ ...prev, avgTicket: Number(e.target.value) }))}
                        placeholder="Ex: 2500"
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* CAMPOS ESPECÍFICOS B2C */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Faixa Etária / Idade Alvo</label>
                      <input 
                        type="text"
                        value={formData.ageGroup}
                        onChange={e => setFormData(prev => ({ ...prev, ageGroup: e.target.value }))}
                        placeholder="Ex: 25 - 40 anos"
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Gênero / Público</label>
                      <select 
                        value={formData.gender || 'Todos'}
                        onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-colors"
                      >
                        <option value="Todos">Todos os gêneros</option>
                        <option value="Feminino">Predominantemente Feminino</option>
                        <option value="Masculino">Predominantemente Masculino</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Faixa de Renda Estimada</label>
                      <input 
                        type="text"
                        value={formData.incomeRange}
                        onChange={e => setFormData(prev => ({ ...prev, incomeRange: e.target.value }))}
                        placeholder="Ex: R$ 4.000 - R$ 12.000/mês (Classe B)"
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Ticket Médio Estimado (R$)</label>
                      <input 
                        type="number"
                        value={formData.avgTicket || ''}
                        onChange={e => setFormData(prev => ({ ...prev, avgTicket: Number(e.target.value) }))}
                        placeholder="Ex: 297"
                        className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* CANAIS DE AQUISIÇÃO */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">Canais Principais de Aquisição</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newChannel}
                    onChange={e => setNewChannel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTagItem('channels', newChannel, setNewChannel); }}}
                    placeholder="Ex: Meta Ads, Outbound, Indicação..."
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-amber-500"
                  />
                  <button 
                    type="button" 
                    onClick={() => addTagItem('channels', newChannel, setNewChannel)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold rounded-xl text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(formData.channels || []).map((ch, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-medium">
                      {ch}
                      <button type="button" onClick={() => removeTagItem('channels', idx)} className="hover:text-red-400">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: DORES, DESEJOS & OBJEÇÕES */}
          {activeTab === 'CANVAS' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* DORES E DESAFIOS */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle size={14} /> Principais Dores & Desafios (Pain Points)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newPainPoint}
                    onChange={e => setNewPainPoint(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTagItem('painPoints', newPainPoint, setNewPainPoint); }}}
                    placeholder="Ex: Falta de tempo para gerenciar o suporte..."
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-red-500"
                  />
                  <button 
                    type="button" 
                    onClick={() => addTagItem('painPoints', newPainPoint, setNewPainPoint)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold border border-red-500/40 rounded-xl text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(formData.painPoints || []).map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-xs font-medium">
                      {item}
                      <button type="button" onClick={() => removeTagItem('painPoints', idx)} className="hover:text-red-100">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* OBJETIVOS E DESEJOS */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} /> Objetivos & Transformação Desejada (Gains)
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newDesire}
                    onChange={e => setNewDesire(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTagItem('desires', newDesire, setNewDesire); }}}
                    placeholder="Ex: Escalar receita previsível para R$ 100k/mês..."
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-emerald-500"
                  />
                  <button 
                    type="button" 
                    onClick={() => addTagItem('desires', newDesire, setNewDesire)}
                    className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 rounded-xl text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(formData.desires || []).map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium">
                      {item}
                      <button type="button" onClick={() => removeTagItem('desires', idx)} className="hover:text-emerald-100">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* OBJEÇÕES MAIS FREQUENTES */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag size={14} /> Objeções Frequentes na Venda
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newObjection}
                    onChange={e => setNewObjection(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTagItem('objections', newObjection, setNewObjection); }}}
                    placeholder="Ex: 'Preço alto' ou 'Minha equipe não vai usar'..."
                    className="w-full px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-purple-500"
                  />
                  <button 
                    type="button" 
                    onClick={() => addTagItem('objections', newObjection, setNewObjection)}
                    className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40 rounded-xl text-xs flex items-center gap-1 shrink-0"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(formData.objections || []).map((item, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-medium">
                      {item}
                      <button type="button" onClick={() => removeTagItem('objections', idx)} className="hover:text-purple-100">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ABA 3: PITCH & PRODUTOS CONECTADOS */}
          {activeTab === 'PITCH' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div>
                <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                  Argumentos de Venda / Pitch Recomendado
                </label>
                <textarea 
                  rows={4}
                  value={formData.pitchNotes}
                  onChange={e => setFormData(prev => ({ ...prev, pitchNotes: e.target.value }))}
                  placeholder="Escreva como a sua equipe deve abordar esse cliente (ex: 'Focar na automação de processos para economizar 10h/semana e mostrar a garantia de 7 dias')..."
                  className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-amber-500 leading-relaxed custom-scrollbar"
                />
              </div>

              {/* SELEÇÃO DE PRODUTOS VINCULADOS */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-amber-400" />
                  Vincular a Produtos/Ofertas Existentes do CRM:
                </label>

                {offers.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Nenhum produto cadastrado no CRM ainda.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar p-1">
                    {offers.map(offer => {
                      const isLinked = (formData.linkedOfferIds || []).includes(offer.id);
                      return (
                        <div
                          key={offer.id}
                          onClick={() => toggleOfferLink(offer.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between select-none ${
                            isLinked 
                              ? 'bg-amber-500/15 border-amber-500/60 text-white' 
                              : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/20'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="text-xs font-bold truncate">{offer.name}</p>
                            <p className="text-[10px] text-amber-400 font-medium">
                              R$ {(offer.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isLinked ? 'bg-amber-500 border-amber-400 text-gray-900' : 'border-white/20'
                          }`}>
                            {isLinked && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Rodapé de Ações */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs font-bold transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving || !formData.name?.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-gray-900 font-extrabold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Perfil de ICP'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
