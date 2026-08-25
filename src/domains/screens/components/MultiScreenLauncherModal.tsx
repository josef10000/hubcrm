import React from 'react';
import { 
  Tv, 
  DollarSign, 
  Users, 
  Globe, 
  ExternalLink, 
  Play, 
  X, 
  Sparkles, 
  MonitorCheck, 
  Maximize2,
  Volume2
} from 'lucide-react';

interface MultiScreenLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MultiScreenLauncherModal({ isOpen, onClose }: MultiScreenLauncherModalProps) {
  if (!isOpen) return null;

  const screens = [
    {
      number: 1,
      id: 'financial',
      path: '/screen/financial',
      title: 'Monitor 1: Sala Financeira & ASAAS Live',
      subtitle: 'Faturamento, Valor Gerado vs Valor Pago, Conversão %, Live Ticker e Meta Diária',
      icon: DollarSign,
      color: 'emerald',
      badge: '💰 Vendas & Caixa',
      features: [
        'Valor Gerado vs Valor Pago Hoje (R$)',
        'Taxa de Conversão do Caixa e Dinheiro na Mesa',
        'Live Ticker com Áudio Sintético de Venda',
        'Meta do Dia e Histograma Horário'
      ]
    },
    {
      number: 2,
      id: 'clients',
      path: '/screen/clients',
      title: 'Monitor 2: Radar de Clientes & Recuperação',
      subtitle: 'Novos clientes criados via Asaas/Checkout, esteira de onboarding e recuperação de Pix',
      icon: Users,
      color: 'cyan',
      badge: '👥 Clientes & Leads',
      features: [
        'Cards de Clientes Criados em Tempo Real',
        'Fila de Onboarding & Kick-off',
        'Fila de Recuperação Ativa (Pix Pendente)',
        'Botão Direto de WhatsApp para Fechar Vendas'
      ]
    },
    {
      number: 3,
      id: 'status',
      path: '/screen/status',
      title: 'Monitor 3: Status de Páginas, Checkouts & Funil',
      subtitle: 'Monitoramento de uptime em tempo real, latência de servidores e fluxo do funil',
      icon: Globe,
      color: 'indigo',
      badge: '🌐 Uptime & Infra',
      features: [
        'Status Online dos Checkouts Transparentes',
        'Ping de Latência em Milissegundos',
        'Alerta Visual/Sonoro de Queda de Páginas',
        'Etapas e Conversões do Funil Ativo'
      ]
    }
  ];

  const openScreen = (path: string) => {
    window.open(path, '_blank', 'width=1440,height=900,menubar=no,toolbar=no,location=no,status=no');
  };

  const launchAllScreens = () => {
    screens.forEach((screen, index) => {
      setTimeout(() => {
        openScreen(screen.path);
      }, index * 250);
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#090e1c] border border-white/15 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative p-6 lg:p-8 flex flex-col justify-between">
        
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between pb-6 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/30">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-2.5">
                Central da Sala de Comando
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Multi-Monitores
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Abra telas limpas dedicadas (Modo Kiosk / TV) para cada um dos seus monitores físicos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Botão de Destaque: Lançar Todos os Monitores */}
        <div className="my-6 p-5 rounded-3xl bg-gradient-to-r from-indigo-900/60 via-[#101b38] to-cyan-900/60 border border-indigo-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-black text-white flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Lançar Sala de Comando Completa (3 Monitores)
            </h3>
            <p className="text-xs text-gray-300">
              Abre as 3 janelas simultaneamente prontas para você posicionar em cada tela.
            </p>
          </div>

          <button
            onClick={launchAllScreens}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Lançar 3 Telas</span>
          </button>
        </div>

        {/* Grade com os 3 Monitores Individuais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {screens.map(screen => {
            const Icon = screen.icon;
            const isEmerald = screen.color === 'emerald';
            const isCyan = screen.color === 'cyan';

            return (
              <div
                key={screen.id}
                className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  {/* Badge & Ícone */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isEmerald 
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                        : isCyan 
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                    }`}>
                      {screen.badge}
                    </span>
                    <div className="p-2 rounded-xl bg-white/5 text-gray-300">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Título & Descrição */}
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {screen.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    {screen.subtitle}
                  </p>

                  {/* Lista de Recursos */}
                  <ul className="mt-4 space-y-1.5 border-t border-white/5 pt-3 text-[10px] text-gray-300">
                    {screen.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-indigo-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botão de Abrir */}
                <button
                  onClick={() => openScreen(screen.path)}
                  className="mt-5 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 hover:border-indigo-500/40 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Abrir Monitor {screen.number}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Dicas de Atalhos & Produtividade */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-[11px] text-gray-400">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pressione <strong className="text-white font-mono">F11</strong> na janela do monitor para Modo Tela Cheia limpo.</span>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Áudio sintético com sino de vendas ativável no topo de cada monitor.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
