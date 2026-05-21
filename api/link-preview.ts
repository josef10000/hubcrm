import { Request, Response } from 'express';

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Parâmetro url é obrigatório' });
  }

  try {
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Falha ao carregar página: ${response.statusText}`);
    }

    const html = await response.text();

    // Extrair metadados via regex simples e resilientes
    const getMetaTag = (property: string): string => {
      const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
                    html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, 'i'));
      return match ? match[1] : '';
    };

    const getTitle = (): string => {
      const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      return match ? match[1] : '';
    };

    const title = getMetaTag('og:title') || getMetaTag('twitter:title') || getTitle() || new URL(formattedUrl).hostname;
    const description = getMetaTag('og:description') || getMetaTag('twitter:description') || getMetaTag('description') || 'Veja mais detalhes acessando o link.';
    
    let image = getMetaTag('og:image') || getMetaTag('twitter:image') || '';
    if (image && !image.startsWith('http')) {
      const urlObj = new URL(formattedUrl);
      image = `${urlObj.origin}${image.startsWith('/') ? '' : '/'}${image}`;
    }

    return res.status(200).json({
      title: title.trim(),
      description: description.trim(),
      image,
      url: formattedUrl
    });
  } catch (error: any) {
    console.error(`[Link Preview API] Erro ao buscar metadados para ${url}:`, error);
    
    // Retorna fallback estético do próprio domínio para evitar falha
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return res.status(200).json({
        title: urlObj.hostname,
        description: 'Clique para acessar o endereço externo e ver mais informações.',
        image: `https://logo.clearbit.com/${urlObj.hostname}` || '',
        url: urlObj.href
      });
    } catch {
      return res.status(200).json({
        title: url,
        description: 'Clique para acessar o endereço externo.',
        image: '',
        url
      });
    }
  }
}
