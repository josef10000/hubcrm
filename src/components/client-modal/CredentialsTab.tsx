import React, { useState, useEffect } from 'react';
import { Plus, Copy, Trash2, AlertTriangle } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { ClientCredential } from '../../types';

interface CredentialsTabProps {
  clientId: string;
}

export default function CredentialsTab({ clientId }: CredentialsTabProps) {
  const [credentials, setCredentials] = useState<ClientCredential[]>([]);
  const [newCredential, setNewCredential] = useState<Partial<ClientCredential>>({});
  const [showNewCredential, setShowNewCredential] = useState(false);

  useEffect(() => {
    if (!clientId || !auth.currentUser) return;
    const credsRef = collection(db, 'users', auth.currentUser.uid, 'clients', clientId, 'credentials');
    const unsubscribe = onSnapshot(credsRef, (snapshot) => {
      const loaded: ClientCredential[] = [];
      snapshot.forEach(doc => loaded.push({ id: doc.id, ...doc.data() } as ClientCredential));
      setCredentials(loaded.sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => unsubscribe();
  }, [clientId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-white/10 pb-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Cofre de Credenciais</h3>
        <button
          type="button"
          onClick={() => setShowNewCredential(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Nova Credencial
        </button>
      </div>

      {/* Security Warning */}
      <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-3">
        <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-yellow-400 font-medium">Aviso de Segurança</p>
          <p className="text-[10px] text-yellow-400/70 mt-0.5">Credenciais são armazenadas no Firestore. Evite salvar senhas de contas bancárias ou dados altamente sensíveis aqui.</p>
        </div>
      </div>

      {showNewCredential && (
        <div className="bg-black/20 border border-white/5 p-4 rounded-xl mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">URL / Serviço</label>
            <input type="text" value={newCredential.url || ''} onChange={e => setNewCredential({...newCredential, url: e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="ex: Hostinger, WordPress..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Usuário</label>
              <input type="text" value={newCredential.username || ''} onChange={e => setNewCredential({...newCredential, username: e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Senha</label>
              <input type="password" value={newCredential.password || ''} onChange={e => setNewCredential({...newCredential, password: e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Notas (Opcional)</label>
            <input type="text" value={newCredential.notes || ''} onChange={e => setNewCredential({...newCredential, notes: e.target.value})} className="w-full px-3 py-2 bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowNewCredential(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancelar</button>
            <button type="button" onClick={async () => {
              if (!clientId || !auth.currentUser || !newCredential.url || !newCredential.username) return;
              try {
                const credRef = doc(collection(db, 'users', auth.currentUser.uid, 'clients', clientId, 'credentials'));
                await setDoc(credRef, { ...newCredential, id: credRef.id, createdAt: Date.now() });
                setNewCredential({});
                setShowNewCredential(false);
                toast.success('Credencial salva!');
              } catch (err) {
                toast.error('Erro ao salvar credencial.');
              }
            }} className="px-3 py-1.5 bg-primary-500 text-white rounded-lg text-sm font-medium">Salvar</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {credentials.map(cred => (
          <div key={cred.id} className="bg-black/20 border border-white/5 p-4 rounded-xl relative group">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-900 dark:text-white">{cred.url}</h4>
              <button type="button" onClick={async () => {
                if (!clientId || !auth.currentUser) return;
                await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'clients', clientId, 'credentials', cred.id));
                toast.success('Credencial excluída!');
              }} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block text-xs">Usuário</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">{cred.username}</span>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(cred.username); toast.success('Copiado!'); }} className="text-gray-500 hover:text-primary-400"><Copy size={14} /></button>
                </div>
              </div>
              {cred.password && (
                <div>
                  <span className="text-gray-500 block text-xs">Senha</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">••••••••</span>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(cred.password!); toast.success('Copiado!'); }} className="text-gray-500 hover:text-primary-400"><Copy size={14} /></button>
                  </div>
                </div>
              )}
            </div>
            {cred.notes && <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-white/5">{cred.notes}</p>}
          </div>
        ))}
        {credentials.length === 0 && !showNewCredential && (
          <div className="text-center py-8 text-gray-500">Nenhuma credencial salva.</div>
        )}
      </div>
    </div>
  );
}
