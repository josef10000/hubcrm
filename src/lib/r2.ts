/**
 * Cloudflare R2 Client Upload integration
 * Utiliza o backend storage_handler para obter urls assinadas e realiza o upload via PUT
 */

export async function uploadToR2(file: File, channelId: string = 'growth_hub'): Promise<string> {
  try {
    // 1. Obter URL Assinada do backend
    const response = await fetch(`/api/storage_handler?action=upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        channelId,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Falha ao assinar o upload no R2');
    }

    const { presignedUrl, publicAccessUrl } = await response.json();

    // 2. Fazer o upload do arquivo real diretamente para o R2 usando PUT
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Falha no upload do arquivo físico para o R2 (status ${uploadResponse.status})`);
    }

    return publicAccessUrl;
  } catch (error) {
    console.error('[R2_UPLOAD_ERROR]:', error);
    throw error;
  }
}

export { uploadToR2 as uploadFileToR2 };
