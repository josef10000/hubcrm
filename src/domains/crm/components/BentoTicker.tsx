import React from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TickerProps {
  financial: any;
}

export default function BentoTicker({ financial }: TickerProps) {
  if (!financial) {
    return (
      <div className="h-full min-h-[160px] bg-black/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl flex items-center justify-center">
        <p className="text-xs text-gray-500">Cotações indisponíveis no momento.</p>
      </div>
    );
  }

  const renderCoin = (coin: any) => {
    const isPositive = coin.pctChange >= 0;
    const value = coin.code === 'BTC'
      ? coin.bid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
      : coin.bid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
      <div key={coin.code} className="flex-1 min-w-[120px] bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex flex-col justify-between text-left transition-all duration-300">
        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{coin.name}</span>
        <div className="flex items-baseline gap-2 mt-1.5 justify-between">
          <span className="text-sm font-black text-white">{value}</span>
          <span className={`flex items-center text-[9px] font-black px-1.5 py-0.5 rounded ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {isPositive ? <ArrowUpRight size={8} className="mr-0.5" /> : <ArrowDownRight size={8} className="mr-0.5" />}
            {isPositive ? '+' : ''}{coin.pctChange.toFixed(2)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full min-h-[160px] bg-black/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp size={14} className="text-primary-500" />
          Mercado e Cotações
        </h4>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {renderCoin(financial.usd)}
        {renderCoin(financial.eur)}
        {renderCoin(financial.btc)}
      </div>
    </div>
  );
}
