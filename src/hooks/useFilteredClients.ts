import { useMemo, useDeferredValue } from 'react';
import { Client, SiteStatus } from '../types';
import { getPlanPrice } from '../helpers';

export function useFilteredClients(
  clients: Client[],
  searchTerm: string,
  filterStatus: SiteStatus | 'Todos',
  sortBy: 'recent' | 'alphabetical' | 'value'
) {
  const deferredSearchTerm = useDeferredValue(searchTerm);

  return useMemo(() => {
    let result = clients.filter((c) => {
      const searchLower = deferredSearchTerm.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(searchLower) ||
        c.whatsapp.includes(deferredSearchTerm) ||
        (c.cpfCnpj && c.cpfCnpj.includes(deferredSearchTerm)) ||
        (c.niche && c.niche.toLowerCase().includes(searchLower));
        
      const matchesStatus = filterStatus === 'Todos' || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'alphabetical') return a.name.localeCompare(b.name);
      if (sortBy === 'value') return getPlanPrice(b.plan, b.billingCycle, b) - getPlanPrice(a.plan, a.billingCycle, a);
      return b.createdAt - a.createdAt;
    });

    return result;
  }, [clients, deferredSearchTerm, filterStatus, sortBy]);
}
