/**
 * Cloudflare R2 Upload Helper
 * Realiza upload direto para o bucket do Cloudflare R2 usando Presigned URLs geradas no backend.
 */

export interface R2UploadResponse {
  presignedUrl: string;
  publicAccessUrl: string;
  fileKey: string;
}

/**
 * Faz upload de um arquivo diretamente para o Cloudflare R2
 * @param file O arquivo binário a ser enviado (File ou Blob)
 * @param channelId O ID do canal do chat ou lead associado
 * @returns A URL de acesso público do arquivo hospedado no R2
 */
export async function uploadFileToR2(file: File | Blob, channelId: string): Promise<string> {
  const fileName = file instanceof File ? file.name : `audio-${Date.now()}.webm`;
  const fileType = file.type || 'application/octet-stream';

  try {
    // 1. Solicita a URL pré-assinada ao backend do HubCRM (Vercel Serverless)
    const urlResponse = await fetch('/api/storage/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        fileType,
        channelId,
      }),
    });

    if (!urlResponse.ok) {
      const errData = await urlResponse.json().catch(() => ({}));
      throw new Error(errData.error || `Erro ao obter permissão de upload (${urlResponse.status})`);
    }

    const { presignedUrl, publicAccessUrl } = await urlResponse.json() as R2UploadResponse;

    if (!presignedUrl || !publicAccessUrl) {
      throw new Error('Resposta de permissão de upload inválida');
    }

    // 2. Faz o upload direto do binário para o R2 (sem passar pelo servidor Node)
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': fileType,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error(`Falha ao transferir arquivo para o storage (${uploadResponse.status})`);
    }

    // Retorna a URL pública customizada (ex: storage.hubsymples.com.br/chat/...)
    return publicAccessUrl;
  } catch (error: any) {
    console.error('[R2_UPLOAD_ERROR] Falha no upload para o Cloudflare R2:', error);
    throw error;
  }
}
