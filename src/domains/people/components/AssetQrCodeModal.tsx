import React from 'react';
import { X, Printer, QrCode, Laptop, Monitor, Smartphone, Armchair, MousePointer2, Zap } from 'lucide-react';
import { Asset } from '@/types/people';
import { ToolAsset } from '@/types';

interface AssetQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | ToolAsset;
  orgId: string;
}

const CATEGORY_ICONS = {
  Notebook: Laptop,
  Hardware: Laptop,
  Monitor: Monitor,
  Software: Monitor,
  Celular: Smartphone,
  Cadeira: Armchair,
  Periférico: MousePointer2,
  Acesso: Zap,
  Outro: Zap
};

export default function AssetQrCodeModal({ isOpen, onClose, asset, orgId }: AssetQrCodeModalProps) {
  if (!isOpen) return null;

  const getCategoryIcon = (cat: string) => {
    return CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || Zap;
  };

  const IconComponent = getCategoryIcon(asset.category);

  // Define URL pública do ativo
  const assetUrl = `${window.location.origin}/p/asset/${orgId}/${asset.id}`;
  // QR Code Server API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(assetUrl)}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Etiqueta Patrimonial - ${asset.assetCode || 'Ativo'}</title>
          <style>
            @page {
              size: 50mm 30mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 2mm;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 30mm;
              width: 50mm;
              box-sizing: border-box;
              background-color: white;
            }
            .label-container {
              display: flex;
              width: 100%;
              height: 100%;
              align-items: center;
              gap: 2mm;
            }
            .qr-box {
              width: 24mm;
              height: 24mm;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .qr-box img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .info-box {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              font-size: 7px;
              color: black;
              line-height: 1.25;
              overflow: hidden;
            }
            .brand {
              font-weight: 900;
              font-size: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
              border-bottom: 0.5px solid #ddd;
              padding-bottom: 1px;
            }
            .asset-name {
              font-weight: 700;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              font-size: 7px;
            }
            .asset-code {
              font-family: monospace;
              font-size: 7px;
              font-weight: 700;
              background-color: #f0f0f0;
              padding: 1px 3px;
              border-radius: 2px;
              width: fit-content;
              margin-top: 1px;
              margin-bottom: 2px;
            }
            .owner-name {
              font-weight: 600;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              font-size: 6.5px;
            }
            .owner-role {
              color: #555;
              font-size: 5.5px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="qr-box">
              <img src="${qrCodeUrl}" alt="QR Code" />
            </div>
            <div class="info-box">
              <div class="brand">Patrimônio</div>
              <div class="asset-name">${asset.name}</div>
              <div class="asset-code">${asset.assetCode || 'CRM-AST-NEW'}</div>
              <div class="owner-name">Portador: ${asset.assignedToName || 'N/A'}</div>
              <div class="owner-role">${asset.assignedToJobTitle || 'Colaborador'}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-[#0c0d0e] w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-white/10 scale-in-center animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-primary-500/10 text-primary-500">
              <QrCode size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Etiqueta Patrimonial</h3>
              <p className="text-xs text-gray-500">Gere e imprima o QR Code do ativo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="bg-white p-6 rounded-[2rem] flex justify-center items-center mb-6 shadow-inner mx-auto w-56 h-56 border border-white/5">
          <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
        </div>

        <div className="space-y-4 bg-white/5 p-6 rounded-3xl border border-white/5 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/5 text-gray-400">
              <IconComponent size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Equipamento</p>
              <h4 className="font-bold text-sm text-white">{asset.name}</h4>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Código</p>
              <p className="font-mono text-xs font-bold text-primary-400">{asset.assetCode || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Serial</p>
              <p className="text-xs font-bold text-white truncate">{asset.serialNumber || '—'}</p>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Responsável Atual</p>
            <p className="text-sm font-bold text-white">{asset.assignedToName || 'Não atribuído'}</p>
            <p className="text-xs text-gray-400">{asset.assignedToJobTitle || 'Colaborador'}</p>
            {asset.assignedAt && (
              <p className="text-[10px] text-gray-500 mt-1 font-mono">
                Vinculado em: {new Date(asset.assignedAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        <button 
          onClick={handlePrint}
          className="w-full py-4 bg-gradient-to-r from-primary-500 to-indigo-600 hover:from-primary-600 hover:to-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-primary-500/10 hover:shadow-primary-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Printer size={18} />
          Imprimir Etiqueta Patrimonial
        </button>
      </div>
    </div>
  );
}
