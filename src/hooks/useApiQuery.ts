import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';

/**
 * Cache global em memória para o useApiQuery.
 * Compartilhado entre todas as instâncias do hook.
 */
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  promise?: Promise<T>; // Para deduplicação de requests em voo
}

const globalCache = new Map<string, CacheEntry>();

// Requests em andamento (para deduplicação)
const inflight = new Map<string, Promise<any>>();

interface UseApiQueryOptions {
  /** Tempo de vida do cache em milissegundos (padrão: 60000 = 1 minuto) */
  ttl?: number;
  /** Se false, não executa automaticamente (útil para queries condicionais) */
  enabled?: boolean;
  /** Se true, exibe toast em erro (padrão: false para queries, o componente decide) */
  showErrorToast?: boolean;
  /** Dependências extras para re-executar a query */
  deps?: any[];
}

interface UseApiQueryResult<T> {
  /** Os dados retornados pela API */
  data: T | null;
  /** Se a query está em execução pela primeira vez (sem cache) */
  isLoading: boolean;
  /** Se a query está re-buscando dados (já tem cache) */
  isFetching: boolean;
  /** Erro da última execução */
  error: Error | null;
  /** Se os dados vieram do cache e podem estar desatualizados */
  isStale: boolean;
  /** Força uma nova busca ignorando o cache */
  refetch: () => Promise<void>;
}

/**
 * Hook customizado para queries REST com cache, deduplicação e retry.
 * Alternativa leve ao TanStack Query, sem dependências externas.
 * 
 * @example
 * // Busca simples com cache de 30s
 * const { data, isLoading, error } = useApiQuery<Book[]>(
 *   'google-books',
 *   `https://www.googleapis.com/books/v1/volumes?q=${query}`,
 *   { ttl: 30000, enabled: query.length >= 3 }
 * );
 * 
 * @example
 * // Busca com dependências (re-executa quando orgId muda)
 * const { data: payments, refetch } = useApiQuery<Payment[]>(
 *   `payments-${orgId}`,
 *   `/api/portal_handler?orgId=${orgId}`,
 *   { ttl: 60000, deps: [orgId] }
 * );
 */
export function useApiQuery<T = any>(
  /** Chave única para identificar esta query no cache */
  key: string,
  /** URL para buscar */
  url: string,
  /** Opções de configuração */
  options: UseApiQueryOptions = {}
): UseApiQueryResult<T> {
  const {
    ttl = 60000,
    enabled = true,
    showErrorToast = false,
    deps = [],
  } = options;

  const [data, setData] = useState<T | null>(() => {
    // Inicializar com dados do cache se disponível e não expirado
    const cached = globalCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < ttl) {
      return cached.data;
    }
    return null;
  });
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!data && enabled);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);

  const mountedRef = useRef(true);
  const keyRef = useRef(key);
  keyRef.current = key;

  const fetchData = useCallback(async (ignoreCache = false) => {
    if (!enabled) return;

    const currentKey = keyRef.current;

    // Verificar cache
    if (!ignoreCache) {
      const cached = globalCache.get(currentKey);
      if (cached && (Date.now() - cached.timestamp) < ttl) {
        if (mountedRef.current) {
          setData(cached.data);
          setIsLoading(false);
          setIsStale(false);
          setError(null);
        }
        return;
      }
    }

    // Deduplicação: se já existe um request em voo para a mesma key, reutiliza
    const existingRequest = inflight.get(currentKey);
    if (existingRequest && !ignoreCache) {
      try {
        const result = await existingRequest;
        if (mountedRef.current && keyRef.current === currentKey) {
          setData(result);
          setIsLoading(false);
          setIsFetching(false);
          setError(null);
        }
      } catch (err: any) {
        if (mountedRef.current && keyRef.current === currentKey) {
          setError(err);
          setIsLoading(false);
          setIsFetching(false);
        }
      }
      return;
    }

    // Setar estados de loading
    if (mountedRef.current) {
      if (data) {
        setIsFetching(true);
        setIsStale(true);
      } else {
        setIsLoading(true);
      }
    }

    // Criar o request
    const requestPromise = apiClient.get<T>(url, { showErrorToast });
    inflight.set(currentKey, requestPromise);

    try {
      const result = await requestPromise;

      // Salvar no cache
      globalCache.set(currentKey, {
        data: result,
        timestamp: Date.now(),
      });

      if (mountedRef.current && keyRef.current === currentKey) {
        setData(result);
        setError(null);
        setIsStale(false);
      }
    } catch (err: any) {
      if (mountedRef.current && keyRef.current === currentKey) {
        setError(err);
      }
    } finally {
      inflight.delete(currentKey);
      if (mountedRef.current && keyRef.current === currentKey) {
        setIsLoading(false);
        setIsFetching(false);
      }
    }
  }, [url, enabled, ttl, showErrorToast, ...deps]);

  // Efeito principal
  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  return {
    data,
    isLoading,
    isFetching,
    error,
    isStale,
    refetch,
  };
}

/**
 * Invalida o cache de uma ou mais queries.
 * Útil após mutações para forçar re-fetch.
 * 
 * @example
 * await apiClient.post('/api/create-item', data);
 * invalidateQuery('items-list'); // Próximo useApiQuery com essa key vai re-buscar
 */
export function invalidateQuery(key: string): void {
  globalCache.delete(key);
}

/**
 * Invalida todas as queries que começam com um prefixo.
 * 
 * @example
 * invalidateQueriesStartingWith('payments-'); // Invalida payments-org1, payments-org2, etc.
 */
export function invalidateQueriesStartingWith(prefix: string): void {
  for (const key of globalCache.keys()) {
    if (key.startsWith(prefix)) {
      globalCache.delete(key);
    }
  }
}

/**
 * Limpa todo o cache (útil no logout).
 */
export function clearQueryCache(): void {
  globalCache.clear();
}
