import React, { useState } from 'react';
import { Plus, FileSignature, FileUp, CheckCircle, Loader2, Trash2, Eye, Link as LinkIcon, Copy } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { toast } from 'sonner';
import { Client, ClientContract } from '../../types';
import { User } from 'firebase/auth';

interface ContractsTabProps {
  client: Client;
  user: User;
  formData: Partial<Client>;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  defaultContractText: string;
}

export default function ContractsTab({ client, user, formData, setFormData, defaultContractText }: ContractsTabProps) {
  const [showNewContractForm, setShowNewContractForm] = useState(false);
  const [newContractType, setNewContractType] = useState<'pdf' | 'text'>('text');
  const [newContractText, setNewContractText] = useState(defaultContractText || '');
  const [isContractUploading, setIsContractUploading] = useState(false);

  const handleSaveTextContract = async () => {
    try {
      setIsContractUploading(true);
      const newContract: ClientContract = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        type: 'text',
        content: newContractText,
        status: 'pending',
        createdAt: Date.now()
      };
      const updatedContracts = [...(client.contracts || []), newContract];
      await updateDoc(doc(db, 'users', user.uid, 'clients', client.id), {
        contracts: updatedContracts
      });
      setFormData((prev: any) => ({ ...prev, contracts: updatedContracts }));
      toast.success('Contrato gerado com sucesso!');
      setShowNewContractForm(false);
    } catch (error) {
      toast.error('Erro ao gerar contrato.');
    } finally {
      setIsContractUploading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('O PDF deve ter no máximo 5MB');
      return;
    }
    try {
      setIsContractUploading(true);
      const fileRef = ref(storage, `users/${user.uid}/clients/${client.id}/contracts/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytesResumable(fileRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      const newContract: ClientContract = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2),
        type: 'pdf',
        content: downloadUrl,
        status: 'pending',
        createdAt: Date.now()
      };
      const updatedContracts = [...(client.contracts || []), newContract];
      await updateDoc(doc(db, 'users', user.uid, 'clients', client.id), {
        contracts: updatedContracts
      });
      setFormData((prev: any) => ({ ...prev, contracts: updatedContracts }));
      toast.success('Contrato em PDF carregado!');
      setShowNewContractForm(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro no upload do PDF. O Storage está configurado corretamente?');
    } finally {
      setIsContractUploading(false);
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!confirm('Tem absoluta certeza que deseja excluir permanentemente este contrato?')) return;
    try {
      const updated = (client.contracts || []).filter(c => c.id !== contractId);
      await updateDoc(doc(db, 'users', user.uid, 'clients', client.id), {
        contracts: updated
      });
      setFormData((prev: any) => ({ ...prev, contracts: updated }));
      toast.success('Contrato excluído com sucesso!');
    } catch(e) { toast.error('Erro ao excluir contrato') }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold border-b border-primary-500/30 pb-2 inline-block text-gray-900 dark:text-white">Contratos e Assinaturas</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Gere links de assinatura de contratos com validade de IP.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewContractForm(!showNewContractForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all font-medium whitespace-nowrap shadow-lg shadow-primary-500/20"
        >
          <Plus size={18} />
          {showNewContractForm ? 'Cancelar' : 'Novo Contrato'}
        </button>
      </div>

      {showNewContractForm && (
        <div className="bg-black/20 p-6 rounded-2xl border border-white/10 mb-6 shadow-xl">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Gerar Novo Contrato</h4>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button type="button" onClick={() => setNewContractType('text')}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${newContractType === 'text' ? 'bg-primary-500/20 border-primary-500 text-primary-400' : 'bg-black/40 border-white/5 text-gray-500 hover:bg-black/60'}`}>
              <FileSignature size={24} />
              <span className="font-medium">Texto Rico Editável</span>
            </button>
            <button type="button" onClick={() => setNewContractType('pdf')}
              className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${newContractType === 'pdf' ? 'bg-primary-500/20 border-primary-500 text-primary-400' : 'bg-black/40 border-white/5 text-gray-500 hover:bg-black/60'}`}>
              <FileUp size={24} />
              <span className="font-medium">Upload de PDF</span>
            </button>
          </div>

          {newContractType === 'text' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Edite as cláusulas abaixo para gerar o contrato exclusivo deste lead.</p>
              <textarea
                value={newContractText}
                onChange={(e) => setNewContractText(e.target.value)}
                className="w-full h-64 px-4 py-3 bg-white dark:bg-black/40 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-y custom-scrollbar text-sm font-mono leading-relaxed"
              />
              <button type="button" onClick={handleSaveTextContract} disabled={isContractUploading}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-all font-medium disabled:opacity-50 flex items-center justify-center">
                {isContractUploading ? <Loader2 size={18} className="animate-spin mr-2" /> : <CheckCircle size={18} className="mr-2" />}
                Gerar Contrato de Texto e Salvar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Faça o upload de um contrato preexistente em formato PDF (Max 5MB).</p>
              <input type="file" accept=".pdf" onChange={handlePdfUpload} disabled={isContractUploading}
                className="w-full px-4 py-8 border-2 border-dashed border-primary-500/30 rounded-xl bg-black/20 text-center text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-500/20 file:text-primary-400 hover:file:bg-primary-500/30 transition-all cursor-pointer" />
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {(formData.contracts || []).length === 0 ? (
          <div className="text-center py-16 bg-black/20 rounded-2xl border border-white/5 shadow-inner">
            <FileSignature size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400 font-medium">Nenhum contrato gerado para este cliente.</p>
            <p className="text-sm text-gray-500 mt-1">Crie um novo contrato para formalizar seu acordo.</p>
          </div>
        ) : (
          [...(formData.contracts || [])].sort((a,b) => b.createdAt - a.createdAt).map(contract => (
            <div key={contract.id} className="bg-black/20 p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md transition-all hover:bg-black/30">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${contract.status === 'signed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary-500/20 text-primary-400'}`}>
                  {contract.type === 'pdf' ? <FileUp size={24} /> : <FileSignature size={24} />}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Contrato em {contract.type === 'pdf' ? 'PDF' : 'Texto Base'}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${contract.status === 'signed' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-primary-500/20 text-primary-500'}`}>
                      {contract.status === 'signed' ? 'Assinado' : 'Pendente'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Criado em {new Date(contract.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                {contract.status === 'pending' ? (
                  <button type="button" onClick={() => {
                    const url = `${window.location.origin}/contrato/${user.uid}/${client.id}/${contract.id}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Link copiado!', { description: 'Envie este link para seu cliente assinar.' });
                  }}
                    className="px-4 py-2 bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors">
                    <LinkIcon size={16} /> Copiar Link Público
                  </button>
                ) : (
                  <div className="text-right bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 justify-end"><CheckCircle size={12}/> Validado via IP</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5" title="IP do Assinante">{contract.signedIp}</p>
                  </div>
                )}
                <a href={`${window.location.origin}/contrato/${user.uid}/${client.id}/${contract.id}`} target="_blank" rel="noopener noreferrer"
                  className="p-2.5 text-gray-400 hover:text-white bg-black/40 hover:bg-black/60 rounded-xl transition-colors" title="Visualizar Contrato">
                  <Eye size={18} />
                </a>
                <button type="button" onClick={() => handleDeleteContract(contract.id)}
                  className="p-2.5 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/80 rounded-xl transition-colors" title="Excluir Contrato">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
