import { useEffect, useState } from 'react';
import { useQuery, useQueryClient, QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { onSnapshot, Query, DocumentReference, DocumentSnapshot, QuerySnapshot, FirestoreError } from 'firebase/firestore';
import { Logger } from '@/lib/logger';

/**
 * Hook para buscar dados do Firestore mantendo a sincronização em tempo real via onSnapshot
 * 
 * @param queryKey Chave do React Query
 * @param query Instância da query do Firestore (ex: `query(collection(db, 'users'))`)
 * @param options Opções adicionais do React Query
 */
export function useFirestoreQuery<T>(
  queryKey: QueryKey,
  query: Query | null,
  options?: Omit<UseQueryOptions<T[], Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<T[], Error> {
  const queryClient = useQueryClient();
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  useEffect(() => {
    // Se a query for nula (ex: não temos o ID do usuário ainda), não fazemos nada
    if (!query) return;

    Logger.info(`[ReactQuery] Subscribing to query: ${queryKey.join('-')}`);

    const unsub = onSnapshot(
      query,
      (snapshot: QuerySnapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as T[];

        // Injeta os dados no cache do React Query magicamente
        queryClient.setQueryData(queryKey, data);
      },
      (error: FirestoreError) => {
        Logger.error(`[ReactQuery] Error on query ${queryKey.join('-')}:`, error);
      }
    );

    setUnsubscribe(() => unsub);

    return () => {
      Logger.info(`[ReactQuery] Unsubscribing from query: ${queryKey.join('-')}`);
      unsub();
    };
  }, [queryKey.join('-'), queryClient]); // Dependemos do serialize da chave, a instância `query` deve ser memoizada no consumer ou recriada apenas quando necessário

  // O React Query lida com o estado, loading, caching, etc.
  // A queryFn apenas aguarda os dados caso ainda não estejam no cache.
  // Como o useEffect já preenche o cache via onSnapshot, a queryFn raramente será "a única fonte" de loading, mas garante compatibilidade.
  return useQuery({
    queryKey,
    queryFn: async () => {
      // Retornamos os dados atuais do cache, ou um array vazio temporariamente até o snapshot bater
      return queryClient.getQueryData<T[]>(queryKey) || [];
    },
    ...options,
    // Prevenimos que o refetch natural sobrescreva nosso estado em tempo real
    staleTime: Infinity, 
  });
}

/**
 * Hook para buscar UM documento do Firestore em tempo real
 */
export function useFirestoreDocument<T>(
  queryKey: QueryKey,
  docRef: DocumentReference | null,
  options?: Omit<UseQueryOptions<T | null, Error>, 'queryKey' | 'queryFn'>
): UseQueryResult<T | null, Error> {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!docRef) return;

    Logger.info(`[ReactQuery] Subscribing to document: ${queryKey.join('-')}`);

    const unsub = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot) => {
        if (snapshot.exists()) {
          const data = { ...snapshot.data(), id: snapshot.id } as T;
          queryClient.setQueryData(queryKey, data);
        } else {
          queryClient.setQueryData(queryKey, null);
        }
      },
      (error: FirestoreError) => {
        Logger.error(`[ReactQuery] Error on document ${queryKey.join('-')}:`, error);
      }
    );

    return () => {
      Logger.info(`[ReactQuery] Unsubscribing from document: ${queryKey.join('-')}`);
      unsub();
    };
  }, [queryKey.join('-'), queryClient]);

  return useQuery({
    queryKey,
    queryFn: async () => {
      return queryClient.getQueryData<T | null>(queryKey) || null;
    },
    ...options,
    staleTime: Infinity,
  });
}
