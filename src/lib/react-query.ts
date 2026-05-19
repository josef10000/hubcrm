import { QueryClient } from '@tanstack/react-query';
import { Logger } from './logger';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minutos de cache padrão antes de considerar stale
      staleTime: 5 * 60 * 1000, 
      // Não recarregar em focus a menos que estejamos lidando com server state não-realtime
      refetchOnWindowFocus: false,
      // Tentar novamente apenas 1 vez em caso de falha de rede temporária
      retry: 1,
    },
    mutations: {
      onError: (error) => {
        Logger.error('[ReactQuery] Global Mutation Error:', error);
      }
    }
  },
});
