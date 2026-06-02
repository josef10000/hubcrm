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
    const [newsResult, financeResult, animeResult] = await Promise.allSettled([
      // RSS G1 Tecnologia e InfoMoney
      Promise.all([
        fetchRSS('https://g1.globo.com/rss/g1/tecnologia/'),
        fetchRSS('https://www.infomoney.com.br/feed/')
      ]),
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

    // 3. Processar Notícias
    const newsList: any[] = [];
    if (newsResult.status === 'fulfilled') {
      const [g1Items, infoMoneyItems] = newsResult.value;

      const g1 = g1Items.slice(0, 5).map((item: any) => ({
        source: 'G1 Tecnologia',
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        summary: item.summary,
        imageUrl: item.imageUrl
      }));

      const infoMoney = infoMoneyItems.slice(0, 5).map((item: any) => ({
        source: 'InfoMoney',
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        summary: item.summary,
        imageUrl: null
      }));

      newsList.push(...g1, ...infoMoney);
      // Ordenar por data
      newsList.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    }

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

async function fetchRSS(url: string): Promise<any[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const xmlText = await response.text();

    const items: any[] = [];
    const itemMatches = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];

    for (const itemXml of itemMatches) {
      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const pubDate = extractTag(itemXml, 'pubDate');
      const description = extractTag(itemXml, 'description');

      // Extração de imagem se houver no description ou content
      let imageUrl = null;
      const imgMatch = description.match(/<img[^>]+src="([^">]+)"/i);
      if (imgMatch) {
        imageUrl = imgMatch[1];
      }

      const cleanTitle = cleanCData(title);
      // Remover tags HTML da descrição para o resumo limpo
      const cleanSummary = cleanCData(description)
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      items.push({
        title: cleanTitle,
        link: cleanCData(link),
        pubDate: cleanCData(pubDate),
        summary: cleanSummary,
        imageUrl: imageUrl
      });
    }

    return items;
  } catch (error) {
    console.error(`[FEED_HANDLER] Error parsing RSS from ${url}:`, error);
    return [];
  }
}

function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function cleanCData(str: string): string {
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
}
