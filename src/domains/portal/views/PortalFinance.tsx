import React from 'react';
import { motion } from 'motion/react';
import { 
  CreditCard, 
  ArrowUpRight, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ExternalLink,
  Wallet
} from 'lucide-react';

interface PortalFinanceProps {
  client: any;
  paymentsHistory: any[];
  allClients?: any[];
  activeClientId?: string;
  setActiveClientId?: (id: string) => void;
}

export default function PortalFinance({ 
  client, 
  paymentsHistory, 
  allClients = [], 
  activeClientId, 
  setActiveClientId 
}: PortalFinanceProps) {
  const setupValue = client.customSetupPrice || client.setupPrice || 0;
  const monthlyValue = client.customMonthlyPrice || client.planPrice || 0;
  
  // Verificar se o setup já foi pago no histórico
  const isSetupPaid = paymentsHistory.some(p => 
    (p.description?.toLowerCase().includes('setup') || p.description?.toLowerCase().includes('implementação')) && 
    (p.status === 'RECEIVED' || p.status === 'CONFIRMED')
  );

  // Fatura prioritária (Setup se não pago, senão a próxima pendente/recorrente)
  const currentInvoice = paymentsHistory.find(p => p.status === 'PENDING' || p.status === 'OVERDUE') 
    || paymentsHistory[0]
    || (setupValue > 0 && !isSetupPaid ? {
        value: setupValue,
        status: 'PENDING',
        dueDate: new Date().toISOString().split('T')[0],
        invoiceUrl: client.paymentLink || client.invoiceUrl || client.bankSlipUrl || client.invoiceHtmlUrl,
        description: 'Taxa de Implementação (Setup)'
       } : { 
        value: monthlyValue, 
        status: 'PENDING', 
        dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0], // Mês seguinte se for mensalidade nova
        invoiceUrl: client.paymentLink || client.invoiceUrl || client.bankSlipUrl || client.invoiceHtmlUrl,
        description: 'Mensalidade'
       });

  // Função para garantir que temos uma URL de pagamento válida do Asaas
  const getPaymentUrl = (invoice: any) => {
    const isAsaasUrl = (url: string) => {
      if (!url) return false;
      const domains = ['asaas.com', 'billing.asaas.com', 'cobranca.asaas.com.br', 'sandbox.asaas.com'];
      return domains.some(domain => url.includes(domain));
    };

    const isPortalLink = (url: string) => {
      if (!url || url === '#' || url === 'undefined') return true;
      if (isAsaasUrl(url)) return false; 

      try {
        const currentOrigin = window.location.origin;
        const urlObj = new URL(url, currentOrigin);
        
        // Bloquear se for o mesmo domínio e contiver /portal/ ou se for apenas a raiz
        return urlObj.origin === currentOrigin && (urlObj.pathname === '/' || urlObj.pathname.includes('/portal/'));
      } catch (e) {
        // Se falhar o parse da URL (ex: link relativo), checar se começa com /
        return url.startsWith('/') || url.includes('localhost') || url.includes('vercel.app');
      }
    };
    
    // Priorizar URLs da fatura específica
    if (invoice?.invoiceUrl && !isPortalLink(invoice.invoiceUrl)) return invoice.invoiceUrl;
    if (invoice?.bankSlipUrl && !isPortalLink(invoice.bankSlipUrl)) return invoice.bankSlipUrl;
    if (invoice?.invoiceHtmlUrl && !isPortalLink(invoice.invoiceHtmlUrl)) return invoice.invoiceHtmlUrl;
    
    // Fallback para dados do cliente
    if (client.paymentLink && !isPortalLink(client.paymentLink)) return client.paymentLink;
    if (client.invoiceUrl && !isPortalLink(client.invoiceUrl)) return client.invoiceUrl;
    
    return null;
  };

  const isSetupFocus = currentInvoice?.description?.includes('Setup') || (setupValue > 0 && !isSetupPaid && paymentsHistory.length === 0);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'CONFIRMED':
        return { label: 'Pago', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 };
      case 'OVERDUE':
        return { label: 'Atrasado', class: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle };
      case 'PENDING':
        return { label: 'Pendente', class: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock };
      default:
        return { label: 'Em Processamento', class: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: Clock };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Subscription Switcher (Tabs) */}
      {allClients.length > 1 && (
        <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 inline-flex gap-1">
          {allClients.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveClientId?.(sub.id)}
              className={`
                px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300
                ${activeClientId === sub.id 
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}
              `}
            >
              {sub.plan}
            </button>
          ))}
        </div>
      )}
      {/* Active Invoice Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gradient-to-br from-primary-600 to-primary-800 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl shadow-primary-500/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8 lg:mb-12">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                <Wallet className="text-white w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest leading-none mb-1">{isSetupFocus ? 'Serviço Profissional' : 'Plano Recorrente'}</span>
                <span className="text-base lg:text-xl font-bold text-white uppercase truncate max-w-[150px] lg:max-w-none">{client.plan}</span>
              </div>
            </div>
            
            <div className="mb-8 lg:mb-10 flex flex-col sm:flex-row sm:items-center gap-6 lg:gap-12">
              <div>
                <span className="text-white/60 text-xs font-medium block mb-1">{isSetupFocus ? 'Taxa de Implementação' : 'Valor da Mensalidade'}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl lg:text-4xl font-black text-white">R$ {currentInvoice?.value.toFixed(2).replace('.', ',') || '0,00'}</span>
                  {client.currentDiscount > 0 && !isSetupFocus && (
                    <span className="bg-emerald-400 text-emerald-950 text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                      -{Math.round((client.currentDiscount / (currentInvoice?.value + client.currentDiscount)) * 100)}% Off
                    </span>
                  )}
                </div>
              </div>

              {isSetupFocus && monthlyValue > 0 && (
                <div className="sm:pl-12 sm:border-l border-white/10">
                  <span className="text-white/60 text-xs font-medium block mb-1">Mensalidade (Mês Seguinte)</span>
                  <span className="text-xl font-bold text-white/90">R$ {monthlyValue.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {(currentInvoice?.status === 'PENDING' || currentInvoice?.status === 'OVERDUE') ? (
                getPaymentUrl(currentInvoice) ? (
                  <a 
                    href={getPaymentUrl(currentInvoice)!}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-8 lg:px-10 py-4 bg-white text-primary-600 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all active:scale-95 shadow-xl text-sm lg:text-base"
                  >
                    Pagar {isSetupFocus ? 'Setup' : 'Fatura'}
                    <ArrowUpRight size={20} />
                  </a>
                ) : (
                  <div className="w-full sm:w-auto px-8 lg:px-10 py-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg backdrop-blur-md">
                    <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
                      <AlertCircle size={18} />
                      Pagamento Manual
                    </div>
                    <span className="text-[10px] opacity-70 font-medium">Contate o suporte para receber o link</span>
                  </div>
                )
              ) : (
                <div className="w-full sm:w-auto px-8 lg:px-10 py-4 bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 font-bold rounded-2xl flex items-center justify-center gap-2 text-sm lg:text-base">
                  <CheckCircle2 size={20} />
                  Fatura Quitada
                </div>
              )}
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Vencimento</span>
                <span className="text-white font-bold text-sm lg:text-base">
                  {currentInvoice?.dueDate ? new Date(currentInvoice.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '--/--/----'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Small Summary Sidecard */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] flex flex-col">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2">
            <CreditCard size={18} className="text-primary-400" />
            Dados de Faturamento
          </h3>
          <div className="space-y-4 lg:space-y-6 flex-1">
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Cliente</p>
              <p className="text-white font-medium text-sm lg:text-base">{client.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Documento</p>
              <p className="text-white font-medium text-sm lg:text-base">{client.taxId || 'Não informado'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Meio de Pagamento</p>
              <p className="text-white font-medium flex items-center gap-2 text-sm lg:text-base">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                PIX / Cartão (Asaas)
              </p>
            </div>
          </div>
          <p className="mt-6 text-[10px] text-gray-500 leading-relaxed italic hidden lg:block">
            * Suas faturas são processadas com segurança através do ecossistema Asaas.
          </p>
        </div>
      </div>

      {/* Payment History Table / Cards */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem]">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg lg:text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <FileText className="text-blue-400 w-5 h-5" />
            </div>
            Histórico de Pagamentos
          </h3>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-3">
            <thead>
              <tr className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] px-4">
                <th className="pb-4 font-black">Fatura</th>
                <th className="pb-4 font-black">Vencimento</th>
                <th className="pb-4 font-black">Valor Total</th>
                <th className="pb-4 font-black">Status</th>
                <th className="pb-4 font-black text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paymentsHistory.length > 0 ? (
                paymentsHistory.map((payment, index) => {
                  const style = getStatusStyle(payment.status);
                  return (
                    <motion.tr 
                      key={payment.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group bg-white/[0.02] hover:bg-white/5 transition-all duration-300"
                    >
                      <td className="py-5 px-4 rounded-l-2xl border-y border-l border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${style.class}`}>
                            <style.icon size={16} />
                          </div>
                          <span className="text-white font-medium text-sm">#{payment.id.split('_').pop().toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="py-5 px-4 border-y border-white/5 text-sm text-gray-300">
                        {new Date(payment.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-5 px-4 border-y border-white/5 font-black text-white text-sm">
                        R$ {payment.value.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-5 px-4 border-y border-white/5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${style.class}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="py-5 px-4 rounded-r-2xl border-y border-r border-white/5 text-right">
                        {getPaymentUrl(payment) ? (
                          <a 
                            href={getPaymentUrl(payment)!} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 p-2 px-4 bg-white/5 hover:bg-primary-500 text-gray-400 hover:text-white rounded-xl transition-all text-xs font-bold"
                          >
                            {payment.status === 'RECEIVED' ? <Download size={14} /> : <ExternalLink size={14} />}
                            {payment.status === 'RECEIVED' ? 'Comprovante' : 'Pagar'}
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-500 italic">Link indisponível</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-gray-500 italic">
                    Nenhum histórico de faturamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {paymentsHistory.length > 0 ? (
            paymentsHistory.map((payment, index) => {
              const style = getStatusStyle(payment.status);
              return (
                <motion.div 
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/5 p-5 rounded-2xl border border-white/5 space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${style.class}`}>
                        <style.icon size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm">#{payment.id.split('_').pop().toUpperCase()}</span>
                        <span className="text-[10px] text-gray-500">{new Date(payment.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${style.class}`}>
                      {style.label}
                    </span>
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Valor Total</span>
                      <span className="text-lg font-black text-white">R$ {payment.value.toFixed(2).replace('.', ',')}</span>
                    </div>
                    {getPaymentUrl(payment) !== '#' && (
                      <a 
                        href={getPaymentUrl(payment)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-primary-500/20"
                      >
                        {payment.status === 'RECEIVED' ? <Download size={14} /> : <ExternalLink size={14} />}
                        {payment.status === 'RECEIVED' ? 'Comprovante' : 'Pagar'}
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="py-12 text-center text-gray-500 italic text-sm">
              Nenhum histórico de faturamento encontrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
