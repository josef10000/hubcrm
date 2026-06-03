import type { VercelRequest, VercelResponse } from '@vercel/node';

interface CacheData {
  data: any;
  expiresAt: number;
}

let feedCache: CacheData | null = null;
const CACHE_DURATION_MS = 12 * 60 * 1000; // 12 minutos

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. Validar se o cache está ativo
    if (feedCache && Date.now() < feedCache.expiresAt) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(feedCache.data);
    }

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[new Date().getDay()];

    // 2. Requisições concorrentes e resilientes (allSettled)
    const [financeResult, animeResult] = await Promise.allSettled([
      // AwesomeAPI (Cotações)
      fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL').then(async r => {
        if (!r.ok) throw new Error('AwesomeAPI status error');
        return r.json();
      }),
      // Jikan API (Anime Tracker)
      fetch(`https://api.jikan.moe/v4/schedules?filter=${currentDay}`).then(async r => {
        if (!r.ok) throw new Error('Jikan API status error');
        return r.json();
      })
    ]);

    // 3. Processar Notícias (Radar removido conforme solicitação)
    const newsList: any[] = [];

    // 4. Processar Cotações Financeiras
    let financial = null;
    if (financeResult.status === 'fulfilled') {
      const data: any = financeResult.value;
      if (data.USDBRL && data.EURBRL && data.BTCBRL) {
        financial = {
          usd: {
            name: 'Dólar Comercial',
            code: 'USD',
            bid: parseFloat(data.USDBRL.bid),
            pctChange: parseFloat(data.USDBRL.pctChange)
          },
          eur: {
            name: 'Euro',
            code: 'EUR',
            bid: parseFloat(data.EURBRL.bid),
            pctChange: parseFloat(data.EURBRL.pctChange)
          },
          btc: {
            name: 'Bitcoin',
            code: 'BTC',
            bid: parseFloat(data.BTCBRL.bid) * 1000,
            pctChange: parseFloat(data.BTCBRL.pctChange)
          }
        };
      }
    }

    // 5. Processar Animes
    let animes = [];
    if (animeResult.status === 'fulfilled') {
      const rawData: any = animeResult.value;
      animes = (rawData.data || []).slice(0, 6).map((anime: any) => ({
        id: anime.mal_id,
        title: anime.title_english || anime.title,
        imageUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
        score: anime.score || 'N/A',
        episodes: anime.episodes || '?',
        time: anime.broadcast?.time || 'N/A',
        synopsis: anime.synopsis
      }));
    }

    const payload = {
      timestamp: Date.now(),
      news: newsList,
      financial,
      animes
    };

    // 6. Atualizar Cache
    feedCache = {
      data: payload,
      expiresAt: Date.now() + CACHE_DURATION_MS
    };

    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(payload);
  } catch (error: any) {
    console.error('[FEED_HANDLER] Error generating feed:', error);
    return res.status(500).json({ error: 'Erro interno ao gerar o feed matinal', details: error.message });
  }
}
