import React, { useState, useMemo } from 'react';
import { Shield, FileText, CheckCircle, Clock, Search, ExternalLink, Download, Mail } from 'lucide-react';
import { useCRM } from '@crm/contexts/CRMContext';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Table, Chip } from '@heroui/react';

type ContractTab = 'pending' | 'signed' | 'archive';

export default function ContractsView() {
  const { clients } = useCRM();
  const [activeTab, setActiveTab] = useState<ContractTab>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<{column: string, direction: 'ascending' | 'descending'}>({
    column: 'name',
    direction: 'ascending'
  });

  // Lógica de Filtragem de Contratos
  const allContractClients = clients.filter(c => c.contracts && c.contracts.length > 0);
  
  const filteredClients = allContractClients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === 'pending') return client.contracts?.some(con => con.status === 'pending');
    if (activeTab === 'signed') return client.contracts?.some(con => con.status === 'signed');
    return true; // Archive tab
  });

  const sortedClients = useMemo(() => {
    const list = [...filteredClients];
    list.sort((a, b) => {
      const col = sortDescriptor.column;
      
      let first = a[col as keyof typeof a];
      let second = b[col as keyof typeof b];

      if (col === 'createdAt') {
        first = a.contracts?.[0]?.createdAt || 0;
        second = b.contracts?.[0]?.createdAt || 0;
      }
      if (col === 'status') {
        first = a.contracts?.[0]?.status || '';
        second = b.contracts?.[0]?.status || '';
      }

      if (first === undefined || first === null) return 1;
      if (second === undefined || second === null) return -1;

      let cmp = 0;
      if (typeof first === 'string' && typeof second === 'string') {
        cmp = first.localeCompare(second);
      } else {
        cmp = (first as any) < (second as any) ? -1 : (first as any) > (second as any) ? 1 : 0;
      }
      return sortDescriptor.direction === 'descending' ? -cmp : cmp;
    });
    return list;
  }, [filteredClients, sortDescriptor]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return (
          <Chip size="sm" variant="flat" color="success" className="border border-green-500/20">
            <CheckCircle className="inline w-3 h-3 mr-1" /> Assinado
          </Chip>
        );
      default:
        return (
          <Chip size="sm" variant="flat" color="warning" className="border border-yellow-500/20">
            <Clock className="inline w-3 h-3 mr-1" /> Pendente
          </Chip>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-transparent custom-scrollbar relative z-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Jurídico */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400">
                <Shield size={24} />
              </div>
              <h2 className="text-3xl font-bold text-white">Central de Contratos</h2>
            </div>
            <p className="text-gray-400">Gestão de Formalização e Segurança v4.0</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-400 transition-colors z-10" size={18} />
              <input 
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500/50 w-full md:w-64 backdrop-blur-xl transition-all"
              />
            </div>
          </div>
        </div>

        {/* Tabs de Status */}
        <div className="flex items-center gap-2 p-1 bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl w-fit">
          <TabButton 
            active={activeTab === 'pending'} 
            onClick={() => setActiveTab('pending')}
            icon={<Clock size={16} />}
            label="Pendentes"
            count={allContractClients.filter(c => c.contracts?.some(con => con.status === 'pending')).length}
          />
          <TabButton 
            active={activeTab === 'signed'} 
            onClick={() => setActiveTab('signed')}
            icon={<CheckCircle size={16} />}
            label="Assinados"
            count={allContractClients.filter(c => c.contracts?.some(con => con.status === 'signed')).length}
          />
          <TabButton 
            active={activeTab === 'archive'} 
            onClick={() => setActiveTab('archive')}
            icon={<FileText size={16} />}
            label="Arquivo Geral"
            count={allContractClients.length}
          />
        </div>

        {/* Lista de Documentos em Tabela */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {sortedClients.length > 0 ? (
              <Table>
                <Table.Content 
                  aria-label="Tabela de Contratos"
                  sortDescriptor={sortDescriptor}
                  onSortChange={(desc) => setSortDescriptor(desc as any)}
                  className="bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-xl w-full"
                >
                  <Table.Header>
                    <Table.Column id="name" allowsSorting>CLIENTE / CONTRATO</Table.Column>
                    <Table.Column id="plan">PLANO</Table.Column>
                    <Table.Column id="createdAt" allowsSorting>DATA DE ENVIO</Table.Column>
                    <Table.Column id="status" allowsSorting>STATUS</Table.Column>
                    <Table.Column id="signedAt">DATA DE ASSINATURA</Table.Column>
                    <Table.Column id="actions">AÇÕES</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {sortedClients.map((client) => {
                      const contract = client.contracts?.[0];
                      return (
                        <Table.Row key={client.id}>
                          <Table.Cell className="font-bold text-white py-3">
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span>Contrato: {client.name}</span>
                            </div>
                          </Table.Cell>
                          <Table.Cell>
                            <Chip size="sm" variant="bordered" className="text-gray-400 border-white/10">
                              {client.plan}
                            </Chip>
                          </Table.Cell>
                          <Table.Cell className="text-xs text-gray-400">
                            {contract?.createdAt ? format(contract.createdAt, 'dd MMM yyyy', { locale: ptBR }) : '-'}
                          </Table.Cell>
                          <Table.Cell>
                            {getStatusBadge(contract?.status || 'pending')}
                          </Table.Cell>
                          <Table.Cell className="text-xs text-gray-400">
                            {contract?.status === 'signed' && contract.signedAt 
                              ? format(contract.signedAt, 'dd/MM/yyyy HH:mm') 
                              : '-'}
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex items-center gap-2">
                              <button className="p-2 bg-white/5 hover:bg-primary-500/20 text-gray-400 hover:text-primary-400 rounded-lg transition-all border border-white/5" title="Visualizar">
                                <ExternalLink size={14} />
                              </button>
                              <button className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all border border-white/5" title="Baixar Cópia">
                                <Download size={14} />
                              </button>
                              {contract?.status === 'pending' && (
                                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-lg text-xs transition-all shadow-lg shadow-primary-500/20 active:scale-95">
                                  <Mail size={12} />
                                  Reenviar
                                </button>
                              )}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Content>
              </Table>
            ) : (
              <div className="py-32 flex flex-col items-center justify-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem] text-center">
                <div className="p-6 bg-gray-900/50 rounded-full mb-6 border border-white/5">
                  <Shield size={48} className="text-gray-700" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Sem contratos {activeTab === 'pending' ? 'pendentes' : 'nesta aba'}</h3>
                <p className="text-gray-500 max-w-sm">Tudo em ordem no jurídico! Quando houver movimentação nos documentos digitais, eles aparecerão aqui.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl transition-all duration-500 group ${
        active 
        ? 'bg-primary-500 text-white shadow-xl shadow-primary-500/20' 
        : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={`${active ? 'scale-110' : 'opacity-60'} transition-transform duration-500`}>{icon}</span>
      <span className="font-semibold text-sm">{label}</span>
      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${active ? 'bg-black/20 text-white' : 'bg-white/5 text-gray-500 group-hover:text-gray-300'}`}>
        {count}
      </span>
    </button>
  );
}
