import React from 'react';

interface InteractiveCreditCardProps {
  number: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  isFlipped: boolean;
  accentColor?: string;
}

export default function InteractiveCreditCard({
  number,
  holderName,
  expiryMonth,
  expiryYear,
  ccv,
  isFlipped,
  accentColor = '#f97316'
}: InteractiveCreditCardProps) {

  // Detecção simples e precisa de bandeiras por regex
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\D/g, '');
    if (/^4/.test(clean)) return 'VISA';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'MASTERCARD';
    if (/^3[47]/.test(clean)) return 'AMEX';
    if (/^(4011|438935|451416|4576|504175|5067|5090|627780|636297|636368)/.test(clean)) return 'ELO';
    if (/^(606282|3841)/.test(clean)) return 'HIPERCARD';
    return 'CREDIT_CARD';
  };

  const brand = getCardBrand(number);

  // Formatação de exibição do número no cartão (16 dígitos com máscara de asterisco se incompleto)
  const formatDisplayNumber = () => {
    const clean = number.replace(/\D/g, '').padEnd(16, '•');
    const parts = clean.match(/.{1,4}/g) || ['••••', '••••', '••••', '••••'];
    return parts.join(' ');
  };

  const displayName = holderName.trim() ? holderName.toUpperCase() : 'NOME NO CARTÃO';
  const displayExpiry = (expiryMonth || 'MM').padStart(2, '0') + '/' + (expiryYear ? expiryYear.slice(-2) : 'AA');
  const displayCcv = (ccv || '•••').padEnd(3, '•');

  return (
    <div className="w-full max-w-sm mx-auto h-48 sm:h-52 my-4 relative perspective-1000 select-none">
      <div 
        className={`w-full h-full relative duration-700 ease-in-out transform-style-3d transition-transform ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* FRENTE DO CARTÃO DE CRÉDITO */}
        <div 
          className="absolute inset-0 rounded-2xl p-5 text-white flex flex-col justify-between shadow-2xl border border-white/20 backface-hidden overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #0f172a 100%)`
          }}
        >
          {/* Efeito Glow e Textura */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-black/30 blur-xl pointer-events-none" />

          {/* Topo: Chip do Cartão + Logotipo da Bandeira */}
          <div className="flex items-center justify-between relative z-10">
            {/* Chip EMV Simulado */}
            <div className="w-11 h-8 bg-amber-400/90 rounded-md border border-amber-300/60 flex items-center justify-center relative overflow-hidden shadow-inner">
              <div className="w-full h-0.5 bg-amber-600/60 absolute top-2" />
              <div className="w-full h-0.5 bg-amber-600/60 absolute bottom-2" />
              <div className="h-full w-0.5 bg-amber-600/60 absolute left-3" />
              <div className="h-full w-0.5 bg-amber-600/60 absolute right-3" />
            </div>

            {/* Logo da Bandeira Detectada */}
            <div className="font-extrabold text-xs uppercase tracking-widest px-2.5 py-1 bg-black/40 border border-white/20 rounded-lg backdrop-blur-md">
              {brand === 'VISA' && <span className="text-blue-300 font-serif italic text-sm tracking-wider font-black">VISA</span>}
              {brand === 'MASTERCARD' && (
                <div className="flex items-center -space-x-2">
                  <div className="w-4 h-4 rounded-full bg-red-500 opacity-90" />
                  <div className="w-4 h-4 rounded-full bg-amber-400 opacity-90" />
                </div>
              )}
              {brand === 'AMEX' && <span className="text-cyan-300 font-bold text-xs">AMEX</span>}
              {brand === 'ELO' && <span className="text-amber-400 font-bold text-xs">ELO</span>}
              {brand === 'HIPERCARD' && <span className="text-red-400 font-bold text-xs">HIPER</span>}
              {brand === 'CREDIT_CARD' && <span className="text-gray-300 text-[10px]">CARTÃO</span>}
            </div>
          </div>

          {/* Meio: Número do Cartão */}
          <div className="relative z-10 space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-gray-300 font-medium block opacity-75">Número do Cartão</span>
            <p className="font-mono text-base sm:text-lg tracking-widest font-extrabold text-white text-shadow drop-shadow-md">
              {formatDisplayNumber()}
            </p>
          </div>

          {/* Rodapé: Nome do Titular e Validade */}
          <div className="flex items-center justify-between relative z-10 text-xs">
            <div className="max-w-[70%]">
              <span className="text-[8px] uppercase tracking-widest text-gray-300 block opacity-75">Titular</span>
              <p className="font-bold tracking-wider truncate uppercase text-white drop-shadow">
                {displayName}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[8px] uppercase tracking-widest text-gray-300 block opacity-75">Validade</span>
              <p className="font-mono font-bold tracking-wider text-white">
                {displayExpiry}
              </p>
            </div>
          </div>
        </div>

        {/* VERSO DO CARTÃO DE CRÉDITO (Giro 180°) */}
        <div 
          className="absolute inset-0 rounded-2xl p-5 text-white flex flex-col justify-between shadow-2xl border border-white/20 rotate-y-180 backface-hidden overflow-hidden"
          style={{
            background: `linear-gradient(135deg, #0f172a 0%, ${accentColor} 100%)`
          }}
        >
          {/* Tarja Magnética */}
          <div className="w-[115%] -mx-6 h-10 bg-black/90 mt-2 shadow-inner" />

          {/* Tarja de Assinatura e CVV */}
          <div className="space-y-1 my-auto">
            <div className="flex justify-between items-center px-1">
              <span className="text-[8px] uppercase tracking-widest text-gray-400 font-medium">Tarja de Segurança</span>
              <span className="text-[8px] uppercase tracking-widest text-amber-400 font-bold">CVV / CVC</span>
            </div>
            <div className="w-full bg-white/20 border border-white/30 h-9 rounded-lg flex items-center justify-end px-3 font-mono font-bold text-sm text-gray-900 bg-gradient-to-r from-gray-200 via-white to-gray-100 shadow-inner">
              <span className="tracking-widest text-gray-900 font-black">{displayCcv}</span>
            </div>
          </div>

          {/* Texto Legal no Verso */}
          <div className="text-[8px] text-gray-400 text-center leading-tight opacity-75">
            Este cartão virtual é processado com criptografia ponto a ponto SSL 256-bit via Asaas.
          </div>
        </div>
      </div>
    </div>
  );
}
