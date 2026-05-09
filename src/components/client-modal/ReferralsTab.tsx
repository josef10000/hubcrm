import React from 'react';
import { DollarSign, Copy } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { authFetch } from '@/lib/authFetch';
import { toast } from 'sonner';
import { Client } from '@/types';
import { User } from 'firebase/auth';

interface ReferralsTabProps {
  client: Client;
  user: User;
}

export default function ReferralsTab({ client, user }: ReferralsTabProps) {
  const handleApplyBonus = async () => {
    if (!client.asaasCustomerId) {
      toast.error('Cliente não possui ID do Asaas.');
      return;
    }

    try {
      const res = await authFetch(`/api/asaas/payments?customer=${client.asaasCustomerId}`);
      if (!res.ok) throw new Error('Failed to fetch payments');
      const data = await res.json();
      const pendingPayment = data.data.find((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE');

      if (!pendingPayment) {
        toast.error('Nenhuma fatura pendente encontrada para este cliente.');
        return;
      }

      const bonusToApply = Math.min(client.referralBalance || 0, pendingPayment.value);
      
      if (bonusToApply >= pendingPayment.value) {
        const receiveRes = await authFetch('/api/asaas/receive-in-cash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: pendingPayment.id })
        });
        if (!receiveRes.ok) throw new Error('Failed to mark as paid');
      } else {
        const editRes = await authFetch('/api/asaas/edit-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            paymentId: pendingPayment.id,
            value: pendingPayment.value - bonusToApply
          })
        });
        if (!editRes.ok) throw new Error('Failed to edit payment');
      }

      await updateDoc(doc(db, 'users', user.uid, 'clients', client.id), {
        referralBalance: (client.referralBalance || 0) - bonusToApply
      });

      toast.success('Bônus aplicado com sucesso na fatura do Asaas!');
    } catch (err) {
      console.error("Error applying bonus:", err);
      toast.error('Erro ao aplicar bônus no Asaas.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
          <h4 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Status do Programa</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Total de Indicações:</span>
              <span className="text-white font-bold">{client.referralCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Bônus Acumulado:</span>
              <span className="text-emerald-400 font-bold">R$ {(client.referralBalance || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Regras Atuais:</p>
              <ul className="text-[10px] text-gray-400 space-y-1 list-disc pl-4">
                <li>Comissão: 25% do valor do plano</li>
              </ul>
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-xs text-gray-500 mb-2">Link de Indicação do Cliente:</p>
              <div className="flex items-center gap-2 bg-black/40 p-2 rounded-lg border border-white/5">
                <code className="text-[10px] text-primary-400 truncate flex-1">
                  {`${window.location.origin}/onboarding/${user.uid}?ref=${client.id}`}
                </code>
                <button 
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/onboarding/${user.uid}?ref=${client.id}`);
                    toast.success('Link copiado!');
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-black/20 p-6 rounded-2xl border border-white/5">
          <h4 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Ações Rápidas</h4>
          <div className="space-y-3">
            <button 
              type="button"
              onClick={handleApplyBonus}
              disabled={!client.referralBalance || client.referralBalance <= 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl border border-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <DollarSign size={18} />
              Aplicar Bônus no Asaas
            </button>
            <p className="text-[10px] text-gray-500 text-center">
              Isso irá editar a fatura pendente no Asaas subtraindo o bônus disponível.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
        <h4 className="text-sm font-medium text-gray-400 p-4 bg-white/5 border-b border-white/5 uppercase tracking-wider">Histórico de Indicações</h4>
        <div className="p-4">
          <p className="text-sm text-gray-500 text-center py-8">
            Consulte a aba principal de "Indicações" para ver a lista completa de todos os clientes.
          </p>
        </div>
      </div>
    </div>
  );
}
