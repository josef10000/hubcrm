import React, { useMemo, useState } from 'react';
import { BarChart3, ChevronRight, CircleDot, Flag, Pencil, Save, Target, X, Users, Wallet, ShoppingCart } from 'lucide-react';
import type { Offer } from '@/types';
import { useTransactions } from '@/hooks/queries/useFinance';
import { useClients } from '@/hooks/queries/useClients';

type PortfolioOffer = Offer & {
  portfolioSegment?: 'B2B' | 'B2C' | 'OTHER';
  portfolioStatus?: 'IDEA' | 'VALIDATION' | 'DEVELOPMENT' | 'PRODUCTION' | 'PAUSED';
  portfolioProgress?: number;
  strategicObjective?: string;
  nextMilestone?: string;
};

interface Props {
  offers: PortfolioOffer[];
  canManage: boolean;
  onSave: (offer: any) => Promise<void>;
}

type Segment = 'B2B' | 'B2C' | 'OTHER';
type ProductStatus = 'IDEA' | 'VALIDATION' | 'DEVELOPMENT' | 'PRODUCTION' | 'PAUSED';

const statusMeta: Record<ProductStatus, { label: string; dot: string }> = {
  IDEA: { label: 'Ideia', dot: 'bg-gray-400' },
  VALIDATION: { label: 'Validação', dot: 'bg-sky-400' },
  DEVELOPMENT: { label: 'Desenvolvimento', dot: 'bg-amber-400' },
  PRODUCTION: { label: 'Produção', dot: 'bg-emerald-400' },
  PAUSED: { label: 'Pausado', dot: 'bg-gray-500' },
};

export default function ProductPortfolioPanel({ offers, canManage, onSave }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(offers[0]?.id || null);
  const [editing, setEditing] = useState(false);
  const selected = offers.find(o => o.id === selectedId) || offers[0];
  const { data: transactionsData = [] } = useTransactions();
  const { data: clientsData = [] } = useClients();

  const groups = useMemo(() => {
    const result: Record<Segment, PortfolioOffer[]> = { B2B: [], B2C: [], OTHER: [] };
    offers.forEach(offer => result[(offer.portfolioSegment || 'OTHER') as Segment].push(offer));
    return result;
  }, [offers]);

  const productMetrics = useMemo(() => {
    if (!selected) return { revenue: 0, sales: 0, clients: 0 };
    const productTransactions = transactionsData.filter(tx => tx.offerId === selected.id && tx.type === 'INCOME' && tx.status === 'PAID');
    const revenue = productTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const clientIds = new Set(productTransactions.map(tx => tx.clientId).filter(Boolean));
    const clients = clientsData.filter(client => client.offerId === selected.id || clientIds.has(client.id)).length;
    return { revenue, sales: productTransactions.length, clients };
  }, [selected, transactionsData, clientsData]);

  if (!offers.length) return null;

  const segmentLabel = (segment?: Segment) => segment === 'B2B' ? 'B2B' : segment === 'B2C' ? 'B2C' : 'Sem segmento';
  const selectedStatus = (selected?.portfolioStatus || 'PRODUCTION') as ProductStatus;

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await onSave({
      id: selected.id,
      portfolioSegment: (form.get('segment') as Segment) || 'OTHER',
      portfolioStatus: (form.get('status') as ProductStatus) || 'PRODUCTION',
      portfolioProgress: Math.max(0, Math.min(100, Number(form.get('progress') || 0))),
      strategicObjective: String(form.get('objective') || ''),
      nextMilestone: String(form.get('milestone') || ''),
    });
    setEditing(false);
  };

  return (
    <section className="mb-8 rounded-3xl border border-white/10 bg-black/20 backdrop-blur-xl p-6 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-primary-400 mb-1"><BarChart3 size={18} /><span className="text-[10px] font-black uppercase tracking-[0.18em]">Visão estratégica</span></div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white">Portfólio de Produtos</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Onde cada produto está, o que entrega hoje e qual é o próximo marco.</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Produção</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Desenvolvimento</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" /> Validação</span></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 mb-4 text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400"><Target size={14} /> Mapa da empresa</div>
          <div className="flex justify-center mb-5"><div className="px-5 py-2.5 rounded-2xl border border-primary-500/30 bg-primary-500/10 text-sm font-black text-primary-400">HUB SYMPLES</div></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['B2B', 'B2C'] as Segment[]).map(segment => (
              <div key={segment} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 mb-3"><CircleDot size={14} className={segment === 'B2B' ? 'text-indigo-400' : 'text-pink-400'} /><span className="font-black text-sm text-gray-900 dark:text-white">{segment}</span><span className="ml-auto text-[10px] font-bold text-gray-500">{groups[segment].length} produto(s)</span></div>
                <div className="space-y-2">
                  {groups[segment].map(offer => {
                    const status = (offer.portfolioStatus || 'PRODUCTION') as ProductStatus;
                    return <button key={offer.id} onClick={() => { setSelectedId(offer.id); setEditing(false); }} className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left border transition-all ${selected?.id === offer.id ? 'border-primary-500/40 bg-primary-500/10' : 'border-transparent bg-white/5 hover:bg-white/10'}`}><span className={`h-2 w-2 rounded-full ${statusMeta[status].dot}`} /><span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{offer.name}</span><ChevronRight size={13} className="ml-auto text-gray-500" /></button>;
                  })}
                  {!groups[segment].length && <p className="text-[11px] text-gray-500 py-2">Nenhum produto neste segmento.</p>}
                </div>
              </div>
            ))}
          </div>
          {!!groups.OTHER.length && <div className="mt-4 text-[11px] text-gray-500">{groups.OTHER.length} produto(s) ainda sem segmento B2B/B2C.</div>}
        </div>

        {selected && <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          {!editing ? <>
            <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 mb-1"><span className={`h-2.5 w-2.5 rounded-full ${statusMeta[selectedStatus].dot}`} /><span className="text-[10px] font-black uppercase tracking-wider text-gray-500">{statusMeta[selectedStatus].label}</span></div><h4 className="text-lg font-black text-gray-900 dark:text-white">{selected.name}</h4><span className="inline-flex mt-2 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-500 dark:text-gray-400">{segmentLabel(selected.portfolioSegment as Segment)}</span></div>{canManage && <button onClick={() => setEditing(true)} className="p-2 rounded-xl border border-white/10 text-gray-500 hover:text-primary-400 hover:bg-white/5"><Pencil size={15} /></button>}</div>
            <div className="grid grid-cols-3 gap-2 mt-5">
              <div className="rounded-xl border border-white/10 bg-black/10 p-3"><Users size={14} className="text-cyan-400 mb-2" /><div className="text-lg font-black text-gray-900 dark:text-white">{productMetrics.clients}</div><div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Clientes</div></div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-3"><Wallet size={14} className="text-emerald-400 mb-2" /><div className="text-lg font-black text-gray-900 dark:text-white">R$ {productMetrics.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div><div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Receita paga</div></div>
              <div className="rounded-xl border border-white/10 bg-black/10 p-3"><ShoppingCart size={14} className="text-indigo-400 mb-2" /><div className="text-lg font-black text-gray-900 dark:text-white">{productMetrics.sales}</div><div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Vendas</div></div>
            </div>
            <div className="mt-5"><div className="flex justify-between text-[11px] font-bold mb-2"><span className="text-gray-500">Progresso estratégico</span><span className="text-gray-800 dark:text-gray-200">{selected.portfolioProgress ?? 0}%</span></div><div className="h-2 rounded-full bg-black/20 overflow-hidden"><div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${selected.portfolioProgress ?? 0}%` }} /></div></div>
            <div className="mt-5 rounded-xl border border-white/10 bg-black/10 p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2"><Target size={13} /> Objetivo atual</div><p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{selected.strategicObjective || 'Defina o objetivo estratégico deste produto.'}</p></div>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-4"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-500 mb-2"><Flag size={13} /> Próximo marco</div><p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{selected.nextMilestone || 'Nenhum marco definido.'}</p></div>
          </> : <form onSubmit={save}>
            <div className="flex items-center justify-between mb-4"><h4 className="font-black text-gray-900 dark:text-white">Editar visão estratégica</h4><button type="button" onClick={() => setEditing(false)} className="text-gray-500 hover:text-white"><X size={17} /></button></div>
            <div className="grid grid-cols-2 gap-3"><label className="text-[11px] font-bold text-gray-500">Segmento<select name="segment" defaultValue={selected.portfolioSegment || 'OTHER'} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-900 dark:text-white"><option value="B2B">B2B</option><option value="B2C">B2C</option><option value="OTHER">Outro</option></select></label><label className="text-[11px] font-bold text-gray-500">Status<select name="status" defaultValue={selected.portfolioStatus || 'PRODUCTION'} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-900 dark:text-white"><option value="IDEA">Ideia</option><option value="VALIDATION">Validação</option><option value="DEVELOPMENT">Desenvolvimento</option><option value="PRODUCTION">Produção</option><option value="PAUSED">Pausado</option></select></label></div>
            <label className="block mt-3 text-[11px] font-bold text-gray-500">Progresso (%)<input name="progress" type="number" min="0" max="100" defaultValue={selected.portfolioProgress ?? 0} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-900 dark:text-white" /></label>
            <label className="block mt-3 text-[11px] font-bold text-gray-500">Objetivo atual<textarea name="objective" rows={3} defaultValue={selected.strategicObjective || ''} placeholder="Ex.: Tornar-se o centro operacional da empresa." className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-900 dark:text-white" /></label>
            <label className="block mt-3 text-[11px] font-bold text-gray-500">Próximo marco<input name="milestone" defaultValue={selected.nextMilestone || ''} placeholder="Ex.: Portfolio estratégico" className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-900 dark:text-white" /></label>
            <button type="submit" className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 text-xs font-black"><Save size={14} /> Salvar visão</button>
          </form>}
        </div>}
      </div>
    </section>
  );
}
