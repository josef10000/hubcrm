import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Globe, CreditCard, CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';

export default function ClientPortal() {
  const { userId, clientId } = useParams<{ userId: string; clientId: string }>();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClientData = async () => {
      if (!userId || !clientId) {
        setError("Link inválido.");
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'users', userId, 'clients', clientId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setClient(docSnap.data());
        } else {
          setError("Cliente não encontrado.");
        }
      } catch (err: any) {
        console.error("Error fetching client:", err);
        setError("Não foi possível carregar os dados. Verifique se o link está correto.");
      } finally {
        setLoading(false);
      }
    };

    fetchClientData();
  }, [userId, clientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-gray-400 text-sm">Carregando seu portal...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="bg-white/10 border border-red-500/30 p-6 rounded-2xl max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-red-400 font-semibold mb-2">Ops!</h2>
          <p className="text-gray-300 text-sm mb-4">{error}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Em Desenvolvimento': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'Inadimplente': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'Cancelado': return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ativo': return <CheckCircle className="w-5 h-5" />;
      case 'Em Desenvolvimento': return <Clock className="w-5 h-5" />;
      case 'Inadimplente': return <AlertCircle className="w-5 h-5" />;
      default: return <Globe className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans selection:bg-orange-500/30">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20">
            <Globe className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Olá, {client.name.split(' ')[0]}!</h1>
          <p className="text-gray-400">Bem-vindo ao seu Portal do Cliente</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-400" />
              Status do Projeto
            </h2>
            
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(client.status)} mb-6`}>
              {getStatusIcon(client.status)}
              <span className="font-medium">{client.status}</span>
            </div>

            {client.siteLink && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">Link do seu site:</p>
                <a 
                  href={client.siteLink.startsWith('http') ? client.siteLink : `https://${client.siteLink}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
                >
                  {client.siteLink}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* Finance Card */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
            
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-400" />
              Fatura Atual
            </h2>

            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-1">Plano contratado</p>
              <p className="text-xl font-medium">{client.plan}</p>
            </div>

            {client.nextDueDate && (
              <div className="mb-8">
                <p className="text-sm text-gray-400 mb-1">Vencimento</p>
                <p className="text-lg font-medium">
                  {new Date(client.nextDueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}

            {client.invoiceUrl ? (
              <a 
                href={client.invoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors shadow-lg shadow-orange-500/20"
              >
                Pagar via PIX ou Cartão
              </a>
            ) : (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-sm text-gray-400">Nenhuma fatura em aberto no momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* Support Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm mb-4">Precisa de ajuda com seu site ou fatura?</p>
          <a 
            href="https://wa.me/5511999999999" // Replace with actual support number if available
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors font-medium"
          >
            Falar com o Suporte
          </a>
        </div>
      </div>
    </div>
  );
}
