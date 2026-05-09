import React from 'react';
import { AlertTriangle, Clock, Phone, Tag, Briefcase, Globe, DollarSign, MessageCircle, Copy, Users, Link as LinkIcon, Zap, Calendar, PlusCircle } from 'lucide-react';
import SupportRequestModal from '@support/components/SupportRequestModal';
import { Client } from '@/types';
import { getPlanPrice } from '@/helpers';
import { toast } from 'sonner';
import { calculateHealthScore, getHealthColor, getHealthLabel } from '@/helpers/healthCalculation';
import { useCRM } from '@crm/contexts/CRMContext';


interface ClientsGridProps {
  currentClients: Client[];
  filteredClients: Client[];
  user: any;
  setEditingClient: (client: Client) => void;
  setIsModalOpen: (open: boolean) => void;
  isChurnRisk: (client: Client, churnRiskDays: number) => boolean;
  churnRiskDays: number;
}

export default function ClientsGrid({
  currentClients,
  filteredClients,
  user,
  setEditingClient,
  setIsModalOpen,
  isChurnRisk,
  churnRiskDays
}: ClientsGridProps) {
  const { tags, effectiveOrgId } = useCRM();
  const [supportModalClientId, setSupportModalClientId] = React.useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {currentClients.map((client) => (
          <div key={client.id} onClick={() => { setEditingClient(client); setIsModalOpen(true); }} className="bg-gray-200 dark:bg-white/10 backdrop-blur-2xl border border-gray-300 dark:border-white/20 p-6 rounded-3xl cursor-pointer hover:bg-gray-100 dark:hover:bg-primary-500/20 transition-all group relative overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_0_rgba(249,115,22,0.15)] hover:-translate-y-1 flex flex-col h-full">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-primary-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate pr-4 flex items-center gap-2">
                {client.name}
                {isChurnRisk(client, churnRiskDays) && (
                  <span title={`Fatura atrasada há mais de ${churnRiskDays} dias`} className="animate-pulse bg-red-500/20 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                    <AlertTriangle size={10} />
                    Risco Churn
                  </span>
                )}
              </h3>
              
              {client.tagIds && client.tagIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 mb-2">
                  {client.tagIds.map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <span 
                        key={tagId} 
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                        style={{ 
                          backgroundColor: tag.color + '20', 
                          color: tag.color,
                          borderColor: tag.color + '40'
                        }}
                      >
                        {tag.name}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col items-end space-y-2">
                {/* Health Score Indicator */}
                <div 
                  className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/10"
                  title={`Health Score: ${calculateHealthScore(client)}/100 - ${getHealthLabel(calculateHealthScore(client))}`}
                >
                  <div className={`w-2 h-2 rounded-full animate-pulse ${getHealthColor(calculateHealthScore(client)).replace('text', 'bg')}`} />
                  <span className={`text-[10px] font-bold ${getHealthColor(calculateHealthScore(client))}`}>
                    {calculateHealthScore(client)}%
                  </span>
                </div>

                <div className="flex gap-2">

                  {client.isCombo && (
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <Zap size={10} />
                      Combo
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap backdrop-blur-md ${
                    client.status === 'Ativo' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 
                    client.status === 'Cancelado' ? 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30' : 
                    client.status === 'Inadimplente' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 
                    'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  }`}>
                    {client.status}
                  </span>
                </div>
                {client.paymentStatus && client.paymentStatus !== 'N/A' && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    client.paymentStatus === 'RECEIVED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    client.paymentStatus === 'OVERDUE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  }`}>
                    {client.paymentStatus === 'RECEIVED' ? 'Pago' : client.paymentStatus === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-3 flex-1">
              <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                <Phone size={16} className="mr-3 text-primary-400 opacity-80" />
                {client.whatsapp}
              </div>
              
              <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                <Tag size={16} className="mr-3 text-primary-400 opacity-80" />
                Plano {client.plan} <span className="ml-2 text-xs opacity-60">(R$ {getPlanPrice(client.plan, client.billingCycle, client).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
              </div>
              
              {client.nextDueDate && client.status !== 'Cancelado' && (
                <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                  <Calendar size={16} className="mr-3 text-primary-400 opacity-80" />
                  Vencimento: {new Date(client.nextDueDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                </div>
              )}

              {client.isCombo && client.comboRenewalDate && (
                <div className="flex items-center text-purple-400 text-sm font-medium">
                  <Clock size={16} className="mr-3 opacity-80" />
                  Renovação: {new Date(client.comboRenewalDate + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                </div>
              )}
              
              {client.niche && (
                <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                  <Briefcase size={16} className="mr-3 text-primary-400 opacity-80 shrink-0" />
                  <span className="truncate">{client.niche}</span>
                </div>
              )}
              
              {client.siteLink && (
                <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm">
                  <Globe size={16} className="mr-3 text-primary-400 opacity-80" />
                  <a href={client.siteLink} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline truncate" onClick={e => e.stopPropagation()}>
                    {client.siteLink}
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-white/10 flex flex-col gap-2">
              {client.invoiceUrl && (
                <div className="flex gap-2">
                  <a 
                    href={client.invoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-colors text-sm font-medium"
                  >
                    <DollarSign size={18} className="mr-2" />
                    Ver Fatura
                  </a>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(client.invoiceUrl!);
                      toast.success('Link de pagamento copiado!');
                    }}
                    className="flex items-center justify-center px-3 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-colors"
                    title="Copiar Link de Pagamento"
                  >
                    <LinkIcon size={18} />
                  </button>
                </div>
              )}
              <div className="flex gap-2 w-full">
                <a 
                  href={`https://wa.me/55${(client.whatsapp || '').replace(/\D/g, '')}?text=Olá ${client.name}, tudo bem? Aqui é do Hub central.`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center justify-center flex-1 py-2.5 rounded-xl bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 border border-[#25D366]/30 transition-colors text-sm font-medium"
                >
                  <MessageCircle size={18} className="mr-2" />
                  WhatsApp
                </a>
                {client.invoiceUrl && (
                  <a 
                    href={`https://wa.me/55${(client.whatsapp || '').replace(/\D/g, '')}?text=Olá ${client.name}, sua fatura de R$ ${getPlanPrice(client.plan, client.billingCycle, client).toFixed(2).replace('.', ',')} vence dia ${client.nextDueDate ? new Date(client.nextDueDate).toLocaleDateString('pt-BR') : ''}. Segue o link para pagamento via PIX: ${client.invoiceUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center justify-center flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors text-sm font-medium"
                    title="Cobrar Fatura"
                  >
                    <AlertTriangle size={18} className="mr-2" />
                    Cobrar
                  </a>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const url = `${window.location.origin}/cliente/${effectiveOrgId}/${client.id}`;
                  navigator.clipboard.writeText(url);
                  toast.success('Link do Portal copiado para a área de transferência!');
                }}
                className="flex items-center justify-center w-full py-2.5 rounded-xl bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 border border-primary-500/30 transition-colors text-sm font-medium"
              >
                <Copy size={18} className="mr-2" />
                Link do Portal
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSupportModalClientId(client.id);
                }}
                className="flex items-center justify-center w-full py-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors text-sm font-medium"
              >
                <PlusCircle size={18} className="mr-2" />
                Novo Chamado
              </button>
            </div>
          </div>
        ))}
        
        {filteredClients.length === 0 && (
          <div className="col-span-full py-16 text-center border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 backdrop-blur-xl rounded-3xl">
            <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-gray-500 dark:text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nenhum cliente encontrado</h3>
            <p className="text-gray-500 dark:text-gray-400">Ajuste os filtros ou adicione um novo cliente.</p>
          </div>
        )}
      </div>

      <SupportRequestModal 
        isOpen={!!supportModalClientId} 
        onClose={() => setSupportModalClientId(null)} 
        initialClientId={supportModalClientId || undefined}
      />
    </>
  );
}
