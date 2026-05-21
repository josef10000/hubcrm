import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'preview':
        return await handleLinkPreview(req, res);
      case 'transcribe':
        return await handleTranscribe(req, res);
      default:
        return res.status(400).json({ error: 'Ação de chat inválida ou não especificada' });
    }
  } catch (error: any) {
    console.error(`[CHAT_HANDLER] Erro na ação ${action}:`, error);
    return res.status(500).json({ 
      error: 'Erro interno no processador de chat', 
      details: error.message 
    });
  }
}

async function handleLinkPreview(req: VercelRequest, res: VercelResponse) {
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
                    html.match(new RegExp(`<meta[^]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`, 'i'));
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

async function handleTranscribe(req: VercelRequest, res: VercelResponse) {
  const { audioUrl } = req.body;
  if (!audioUrl) {
    return res.status(400).json({ error: 'Parâmetro audioUrl é obrigatório' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

  try {
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error('Falha ao baixar o arquivo de áudio.');
      }
      
      const arrayBuffer = await audioResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Audio = buffer.toString('base64');

      // Chamamos o Gemini 2.5 Flash para transcrever o áudio
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Audio,
                  mimeType: audioResponse.headers.get('content-type') || 'audio/mp3'
                }
              },
              {
                text: "Transcreva este áudio exatamente como falado, em Português do Brasil. Retorne apenas o texto transcrito, sem introduções ou explicações."
              }
            ]
          }
        ]
      });

      const transcription = response.text || "Não foi possível transcrever o áudio.";
      return res.status(200).json({ transcription });
    } else {
      console.log("[Transcribe API] Chave do Gemini não configurada. Usando transcrição simulada.");
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fallbackTexts = [
        "Olá, tudo bem? Acabei de atualizar a proposta de vendas com o desconto de 15% que o cliente pediu. Por favor, verifique se está tudo correto para enviarmos.",
        "Oi equipe, estou na rua agora indo para a reunião com o cliente comercial. Qualquer urgência me liguem ou mandem mensagem por aqui no canal de vendas.",
        "Boa tarde! Alguém pode aprovar a solicitação de reembolso que anexei no sistema? É urgente para fechar o caixa do mês de maio. Obrigado!",
        "Fala pessoal, acabei de fechar a tarefa da biblioteca. Adicionei os efeitos suaves ao passar o mouse e a tag de retorno já está no repositório principal.",
        "Oi, estou testando o recurso de áudio e a transcrição automática por inteligência artificial integrada ao Hub Chat. Parece estar funcionando perfeitamente!"
      ];
      
      const randomText = fallbackTexts[Math.floor(Math.random() * fallbackTexts.length)];
      return res.status(200).json({ transcription: `[Transcrição IA Simulada] ${randomText}` });
    }
  } catch (error: any) {
    console.error("[Transcribe API] Erro no processamento do áudio:", error);
    
    return res.status(200).json({ 
      transcription: `[Transcrição IA Simulada (Fallback)] Olá! O áudio foi recebido, mas a API de transcrição em nuvem retornou uma falha temporária. Por favor, verifique sua conexão ou tente novamente.` 
    });
  }
}
