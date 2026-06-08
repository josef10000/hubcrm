import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  Coins, Hourglass, Plus, Trash2, Save, RotateCcw, HelpCircle, Calculator, Percent
} from 'lucide-react';
import { toast } from 'sonner';

interface PortalCalculatorProps {
  orgId: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
}

interface SelectedMaterial {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
}

export default function PortalCalculator({ orgId }: PortalCalculatorProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Parâmetros de cálculo
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [additionalCosts, setAdditionalCosts] = useState('0');
  const [laborHours, setLaborHours] = useState('0');
  const [hourlyRate, setHourlyRate] = useState('0');
  const [margin, setMargin] = useState(30); // 30% padrão

  // Estado da seleção atual de insumo
  const [currentMaterialId, setCurrentMaterialId] = useState('');
  const [currentMaterialQty, setCurrentMaterialQty] = useState('');

  // Salvar Orçamento
  const [isSaving, setIsSaving] = useState(false);
  const [budgetName, setBudgetName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  // Escuta inventário para alimentar o dropdown
  useEffect(() => {
    if (!orgId) return;
    const inventoryRef = collection(db, 'organizations', orgId, 'inventory');
    const q = query(inventoryRef, orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setInventory(list);
    });
    return () => unsub();
  }, [orgId]);

  // Ações de gerenciamento dos materiais do orçamento
  const handleAddMaterial = () => {
    if (!currentMaterialId || !currentMaterialQty || Number(currentMaterialQty) <= 0) {
      toast.error('Selecione um insumo e informe uma quantidade válida.');
      return;
    }

    const item = inventory.find(i => i.id === currentMaterialId);
    if (!item) return;

    // Se o insumo já estiver na lista, atualiza a quantidade
    const exists = selectedMaterials.find(m => m.itemId === currentMaterialId);
    if (exists) {
      setSelectedMaterials(selectedMaterials.map(m => 
        m.itemId === currentMaterialId 
          ? { ...m, quantity: m.quantity + Number(currentMaterialQty) }
          : m
      ));
    } else {
      setSelectedMaterials([...selectedMaterials, {
        itemId: item.id,
        name: item.name,
        quantity: Number(currentMaterialQty),
        unit: item.unit,
        costPerUnit: item.costPerUnit
      }]);
    }

    setCurrentMaterialId('');
    setCurrentMaterialQty('');
    toast.success('Insumo adicionado ao orçamento!');
  };

  const handleRemoveMaterial = (itemId: string) => {
    setSelectedMaterials(selectedMaterials.filter(m => m.itemId !== itemId));
  };

  // Limpar simulação
  const handleClear = () => {
    setSelectedMaterials([]);
    setAdditionalCosts('0');
    setLaborHours('0');
    setHourlyRate('0');
    setMargin(30);
    setBudgetName('');
    toast.success('Simulador resetado!');
  };

  // Cálculos matemáticos de precificação
  const materialsCost = selectedMaterials.reduce((acc, m) => acc + (m.quantity * m.costPerUnit), 0);
  const laborCost = Number(laborHours) * Number(hourlyRate);
  const extraCost = Number(additionalCosts.replace(',', '.'));
  
  const totalCost = materialsCost + laborCost + extraCost;
  
  // Fórmula de Margem de Contribuição / Preço de Venda
  // Preço Sugerido = Custo Total / (1 - Margem %)
  const marginDecimal = margin / 100;
  const suggestedPrice = marginDecimal < 1 ? totalCost / (1 - marginDecimal) : totalCost;
  const netProfit = suggestedPrice - totalCost;

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetName.trim() || !orgId) {
      toast.error('Dê um nome para o orçamento.');
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'organizations', orgId, 'budgets'), {
        name: budgetName.trim(),
        materials: selectedMaterials,
        additionalCosts: extraCost,
        laborHours: Number(laborHours),
        hourlyRate: Number(hourlyRate),
        margin: margin,
        totalCost: totalCost,
        suggestedPrice: suggestedPrice,
        finalPrice: suggestedPrice, // Padrão
        createdAt: serverTimestamp()
      });
      toast.success('Orçamento salvo com sucesso!');
      setShowSaveModal(false);
      setBudgetName('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar o orçamento.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Inputs Section */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Materiais e Insumos */}
        <div className="bg-white/[0.03] border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl">
          <h4 className="text-sm font-bold text-gray-200 mb-6 flex items-center gap-2">
            <Coins className="text-primary-500 w-4 h-4" />
            Consumo de Insumos (Estoque)
          </h4>

          <div className="flex flex-col sm:flex-row gap-3 items-end mb-6">
            <div className="flex-1 w-full">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Insumo</label>
              <select
                value={currentMaterialId}
                onChange={(e) => setCurrentMaterialId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 text-sm text-white font-bold"
              >
                <option value="" className="bg-[#111] text-gray-400">Selecione um insumo...</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.id} className="bg-[#111]">
                    {item.name} (R$ {item.costPerUnit.toLocaleString('pt-BR')}/{item.unit})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="w-full sm:w-32">
              <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Quantidade</label>
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="0"
                  value={currentMaterialQty}
                  onChange={(e) => setCurrentMaterialQty(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3 outline-none focus:border-primary-500 text-sm text-white font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                  {inventory.find(i => i.id === currentMaterialId)?.unit || '-'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddMaterial}
              className="w-full sm:w-auto px-5 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1 active:scale-95 text-sm"
            >
              <Plus size={16} />
              Inserir
            </button>
          </div>

          {/* Selected Materials List */}
          {selectedMaterials.length === 0 ? (
            <p className="text-gray-500 text-xs italic text-center py-4 border border-dashed border-white/5 rounded-2xl">
              Nenhum insumo inserido no orçamento.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {selectedMaterials.map((m) => (
                <div key={m.itemId} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                  <div>
                    <span className="font-bold text-white block">{m.name}</span>
                    <span className="text-gray-500 font-mono">
                      {m.quantity} {m.unit} x R$ {m.costPerUnit.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-emerald-400">
                      R$ {(m.quantity * m.costPerUnit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => handleRemoveMaterial(m.itemId)}
                      className="p-1.5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mão de Obra e Custos Gerais */}
        <div className="bg-white/[0.03] border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="sm:col-span-3">
            <h4 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Hourglass className="text-primary-500 w-4 h-4" />
              Mão de Obra & Despesas Extras
            </h4>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Horas Estimadas</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={laborHours}
              onChange={(e) => setLaborHours(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Valor da Hora (R$)</label>
            <input
              type="number"
              min="0"
              placeholder="0,00"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 text-sm text-white font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Outros Custos (R$)</label>
            <input
              type="text"
              placeholder="0,00"
              value={additionalCosts}
              onChange={(e) => setAdditionalCosts(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 text-sm text-white font-mono"
            />
          </div>
        </div>

        {/* Margem de Lucro */}
        <div className="bg-white/[0.03] border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-xl space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-gray-200 flex items-center gap-2">
              <Percent className="text-primary-500 w-4 h-4" />
              Margem de Lucro Desejada
            </h4>
            <span className="text-xl font-black text-primary-400 font-mono">{margin}%</span>
          </div>

          <div className="flex items-center gap-6">
            <input
              type="range"
              min="0"
              max="95"
              step="1"
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="flex-1 accent-primary-500 bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <p className="text-[10px] text-gray-500 italic">
            * Margem aplicada sobre o preço de venda para cálculo de lucro líquido real (Custo / (1 - Margem)).
          </p>
        </div>
      </div>

      {/* Output / Results Panel (Premium UX Card) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-gradient-to-br from-indigo-600/10 to-primary-600/10 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[120%] bg-primary-500/10 rounded-full blur-[80px]" />

          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-xl">
                <Calculator className="text-primary-400 w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block">Painel de</span>
                <h3 className="text-lg font-bold text-white">Resultados da Proposta</h3>
              </div>
            </div>

            {/* Price Cards */}
            <div className="space-y-6 pt-4 border-t border-white/5">
              
              {/* Cost Price */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Custo Total de Produção:</span>
                <span className="text-lg font-bold text-white font-mono">
                  R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Sugested Sale Price */}
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-1">
                <span className="text-[10px] text-primary-400 font-black uppercase tracking-widest block">Preço de Venda Sugerido</span>
                <span className="text-3xl font-black text-white font-mono block">
                  R$ {suggestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Profit */}
              <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block">Lucro Líquido Real</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-black text-emerald-400 font-mono">
                  +{margin}%
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
              <button
                type="button"
                onClick={handleClear}
                className="py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl border border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <RotateCcw size={16} />
                Limpar
              </button>
              
              <button
                type="button"
                disabled={totalCost <= 0}
                onClick={() => setShowSaveModal(true)}
                className="py-4 bg-primary-500 hover:bg-primary-600 text-white font-black rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 text-sm shadow-xl shadow-primary-500/10"
              >
                <Save size={16} />
                Salvar
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111] border border-white/10 p-6 md:p-8 rounded-3xl max-w-sm w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
            
            <h3 className="text-lg font-bold mb-4 text-white">Salvar Orçamento</h3>
            <p className="text-xs text-gray-400 mb-6">Salve os dados desta simulação para referências ou relatórios operacionais futuros.</p>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Identificador do Orçamento *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Orçamento Action Figure Batman"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-primary-500 text-sm text-white"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white font-black rounded-xl transition-all active:scale-95 text-xs flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
