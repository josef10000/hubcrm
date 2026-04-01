import React, { useState } from 'react';
import { useCRM } from '../../contexts/CRMContext';
import { parseOFX, OFXTransaction } from '../../lib/ofxParser';
import { Upload, CheckCircle, PlusCircle, AlertCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export default function BankReconciliation() {
  const { transactions, transactionCategories, user } = useCRM();
  const [ofxItems, setOfxItems] = useState<OFXTransaction[]>([]);
  const [isHovering, setIsHovering] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.ofx')) {
      toast.error('Por favor, envie um arquivo OFX válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseOFX(content);
        if (parsed.length > 0) {
          setOfxItems(parsed);
          toast.success(`${parsed.length} transações encontradas no extrato.`);
        } else {
          toast.error('Nenhuma transação encontrada no arquivo OFX.');
        }
      }
    };
    reader.readAsText(file);
  };

  const importTransaction = async (ofx: OFXTransaction) => {
    if (!user) return;
    
    // Fallback category logic
    let categoryId = transactionCategories[0]?.id || 'sem-categoria';

    const tId = Math.random().toString(36).substring(7);
    try {
      await setDoc(doc(db, 'users', user.uid, 'transactions', tId), {
        id: tId,
        description: ofx.memo,
        amount: Math.abs(ofx.amount),
        date: ofx.date.getTime(),
        type: ofx.amount > 0 ? 'INCOME' : 'EXPENSE',
        status: 'PAID', // Se já tá no OFX, já foi descontado do banco (caixa)
        categoryId: categoryId,
        referenceId: ofx.id // Guarda o FITID para saber que já foi importado
      });
      toast.success('Transação importada com sucesso!');
    } catch (e) {
      toast.error('Erro ao importar transação.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Conciliação Bancária</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Importe o arquivo OFX do seu banco para comparar gastos e importar registros não lançados.</p>

        {ofxItems.length === 0 ? (
          <div 
            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl transition-colors ${
              isHovering ? 'border-primary-500 bg-primary-500/5' : 'border-gray-300 dark:border-white/20 hover:border-primary-400 dark:hover:border-primary-500/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
            onDragLeave={() => setIsHovering(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsHovering(false);
              const file = e.dataTransfer.files?.[0];
              if (file && file.name.toLowerCase().endsWith('.ofx')) {
                const dt = new DataTransfer();
                dt.items.add(file);
                const input = document.getElementById('ofx-upload') as HTMLInputElement;
                input.files = dt.files;
                handleFileUpload({ target: input } as any);
              } else {
                toast.error('Apenas arquivos .OFX são suportados.');
              }
            }}
          >
            <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full mb-4 text-primary-500">
              <Upload size={32} />
            </div>
            <h4 className="text-gray-900 dark:text-white font-bold mb-2">Arraste seu extrato OFX aqui</h4>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center max-w-sm">
              Baixe o extrato no formato OFX pelo aplicativo web do seu banco (Itaú, Inter, Nubank, etc).
            </p>
            <label htmlFor="ofx-upload" className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl cursor-pointer transition-colors">
              Selecionar Arquivo
            </label>
            <input id="ofx-upload" type="file" accept=".ofx" className="hidden" onChange={handleFileUpload} />
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h4 className="font-bold text-gray-800 dark:text-white">Transações do Extrato ({ofxItems.length})</h4>
              <button 
                onClick={() => setOfxItems([])}
                className="text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Limpar Importação
              </button>
            </div>
            
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 dark:bg-black/40 border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm">
                  <tr>
                    <th className="py-3 px-4 font-medium">Data</th>
                    <th className="py-3 px-4 font-medium">Histórico (Banco)</th>
                    <th className="py-3 px-4 font-medium text-right">Valor</th>
                    <th className="py-3 px-4 font-medium text-center">Status</th>
                    <th className="py-3 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {ofxItems.sort((a, b) => b.date.getTime() - a.date.getTime()).map((ofx) => {
                    // Check if already exists based on referenceId or EXACT amount + date matching heuristics
                    const alreadyImported = transactions.some(t => t.referenceId === ofx.id);
                    // Procura match parcial de valor (só pra avisar que talvez já exista lançado na mão)
                    const partialMatch = !alreadyImported && transactions.some(t => 
                       t.amount === Math.abs(ofx.amount) && 
                       Math.abs(t.date - ofx.date.getTime()) < 3 * 24 * 60 * 60 * 1000 // 3 days tolerance
                    );

                    return (
                      <tr key={ofx.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {ofx.date.toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-800 dark:text-gray-200">
                          {ofx.memo}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${ofx.amount > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          R$ {Math.abs(ofx.amount).toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {alreadyImported ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                              <CheckCircle size={12} /> Conciliado
                            </span>
                          ) : partialMatch ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 text-xs font-bold" title="Já existe um lançamento no sistema com o mesmo valor nesta data.">
                              <AlertCircle size={12} /> Lançamento Similar
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-500/10 text-gray-500 text-xs font-bold">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!alreadyImported && (
                            <button 
                              onClick={() => importTransaction(ofx)}
                              className="p-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 rounded-lg transition-colors"
                              title="Importar transação para o HubCRM"
                            >
                              <PlusCircle size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
