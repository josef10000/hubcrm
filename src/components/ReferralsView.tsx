import React, { useState, useEffect } from 'react';
import { RefreshCw, Users } from 'lucide-react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Client, SiteStatus } from '../types';
import { getPlanPrice, updateReferrerSubscription } from '../helpers';

export default
function ReferralsView({ clients, user }: { clients: Client[], user: User }) {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const referralsRef = collection(db, 'users', user.uid, 'referrals');
    const unsubscribe = onSnapshot(referralsRef, (snapshot) => {
      const loadedReferrals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReferrals(loadedReferrals);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const handleConfirmReferral = async (referral: any) => {
    try {
      const referrer = clients.find(c => c.id === referral.referrerId);
      const referred = clients.find(c => c.id === referral.referredClientId);
      let bonusAmount = 0;

      if (referrer && referred) {
        const rewardType = referrer.referralRewardType || 'discount';
        
        if (rewardType === 'commission') {
          const planPrice = getPlanPrice(referred.plan, referred.billingCycle, referred);
          bonusAmount = planPrice * 0.25; // 25% commission
        }

        const newBalance = (referrer.referralBalance || 0) + bonusAmount;
        const newCount = (referrer.referralCount || 0) + 1;

        await updateDoc(doc(db, 'users', user.uid, 'clients', referrer.id), {
          referralBalance: newBalance,
          referralCount: newCount
        });
        
        await updateDoc(doc(db, 'users', user.uid, 'clients', referred.id), {
          referralConfirmed: true
        });
        
        if (rewardType === 'discount') {
          // Update referrer's subscription in Asaas
          // We need to pass the updated clients list, so we map the current clients and update the referred client's status
          const updatedClients = clients.map(c => c.id === referred.id ? { ...c, status: 'Ativo' as SiteStatus, referralConfirmed: true } : c);
          await updateReferrerSubscription(referrer.id, updatedClients);
        }
      }

      await updateDoc(doc(db, 'users', user.uid, 'referrals', referral.id), {
        status: 'confirmed',
        bonusAmount: bonusAmount
      });

      if (bonusAmount > 0) {
        toast.success(`Indicação confirmada! Comissão de R$ ${bonusAmount} adicionada ao saldo do parceiro.`);
      } else if (referrer?.referralRewardType === 'discount' || !referrer?.referralRewardType) {
        toast.success('Indicação confirmada! O desconto mensal será aplicado na próxima fatura do parceiro.');
      } else {
        toast.success('Indicação confirmada!');
      }
    } catch (err) {
      console.error("Error confirming referral:", err);
      toast.error('Erro ao confirmar indicação.');
    }
  };

  const filteredReferrals = referrals.filter(ref => {
    if (ref.status === 'cancelled') return false;
    const referred = clients.find(c => c.id === ref.referredClientId);
    // If we can't find the client, we might want to show it or not. 
    // Usually, if it's in referrals, it should exist.
    // The user specifically said "Those who were canceled should no longer appear there."
    return referred && referred.status !== 'Cancelado';
  });

  if (loading) return <div className="flex-1 flex items-center justify-center"><RefreshCw className="animate-spin text-primary-500" /></div>;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Programa de Indicações</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total de Indicações</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{filteredReferrals.length}</p>
          </div>
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Aguardando Confirmação</p>
            <p className="text-3xl font-bold text-yellow-500">{filteredReferrals.filter(r => r.status === 'pending').length}</p>
          </div>
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Bônus Totais Gerados</p>
            <p className="text-3xl font-bold text-emerald-500">R$ {filteredReferrals.reduce((acc, r) => acc + (r.bonusAmount || 0), 0).toFixed(2).replace('.', ',')}</p>
          </div>
          <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-3xl shadow-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Parceiros Ouro/Prata</p>
            <p className="text-3xl font-bold text-yellow-500">
              {clients.filter(c => (c.referralCount || 0) >= 3).length}
            </p>
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-medium">Quem Indicou</th>
                  <th className="px-6 py-4 font-medium">Nível</th>
                  <th className="px-6 py-4 font-medium">Indicado</th>
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Bônus</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {filteredReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Nenhuma indicação registrada ainda.</td>
                  </tr>
                ) : (
                  filteredReferrals.map((ref) => {
                    const referrer = clients.find(c => c.id === ref.referrerId);
                    const referred = clients.find(c => c.id === ref.referredClientId);
                    return (
                      <tr key={ref.id} className="hover:bg-gray-200 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-gray-900 dark:text-white font-medium">{referrer?.name || 'Desconhecido'}</p>
                          <p className="text-xs text-gray-500">{referrer?.whatsapp}</p>
                        </td>
                        <td className="px-6 py-4">
                          {referrer && (
                            <div className="flex items-center gap-1">
                              {(() => {
                                const count = referrer.referralCount || 0;
                                if (count >= 6) return <span title="Ouro" className="text-lg">🏆</span>;
                                if (count >= 3) return <span title="Prata" className="text-lg">🥈</span>;
                                return <span title="Bronze" className="text-lg">🥉</span>;
                              })()}
                              <span className="text-[10px] font-bold uppercase text-gray-500">
                                {referrer.referralCount >= 6 ? 'Ouro' : referrer.referralCount >= 3 ? 'Prata' : 'Bronze'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900 dark:text-white font-medium">{referred?.name || 'Novo Cliente'}</p>
                          <p className="text-xs text-gray-500">{referred?.whatsapp}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(ref.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-emerald-500">
                          {ref.bonusAmount ? `R$ ${ref.bonusAmount.toFixed(2).replace('.', ',')}` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            ref.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                            ref.status === 'applied' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {ref.status === 'confirmed' ? 'Confirmado' : ref.status === 'applied' ? 'Aplicado' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {ref.status === 'pending' && (
                            <button 
                              onClick={() => handleConfirmReferral(ref)}
                              className="text-emerald-500 hover:text-emerald-400 text-sm font-medium"
                            >
                              Confirmar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
