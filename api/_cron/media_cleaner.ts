import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

// Singleton para o S3Client para reaproveitamento de conexões e redução de overhead
let s3ClientInstance: S3Client | null = null;

function getS3Client(accountId: string, accessKeyId: string, secretAccessKey: string): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3ClientInstance;
}

export async function runMediaCleaner(req: VercelRequest, res: VercelResponse) {
  const { secret, dryRun } = req.query;

  // 1. Validação de Segurança
  if (secret !== process.env.CRON_SECRET) {
    console.error('[Media Cleaner] Tentativa de acesso não autorizada');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Buscar Credenciais do Cloudflare R2 do ambiente
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('[Media Cleaner] Credenciais R2 ausentes no ambiente.');
    return res.status(500).json({ error: 'Storage R2 não configurado no ambiente' });
  }

  const results = {
    totalFilesScanned: 0,
    eligibleForDeletion: 0,
    deletedFilesCount: 0,
    deletedKeys: [] as string[],
    isDryRun: dryRun === 'true',
    errors: [] as string[]
  };

  try {
    console.log(`[Media Cleaner] Iniciando faxina semanal sob o prefixo 'chat/channels/'...`);
    if (results.isDryRun) {
      console.log(`[Media Cleaner] MODO DRY-RUN ATIVADO: Nenhuma exclusão real será executada.`);
    }

    const s3 = getS3Client(accountId, accessKeyId, secretAccessKey);
    
    // Configurações e limites de tempo (45 dias para áudios temporários, 90 dias para imagens/vídeos gerais de chat)
    const AUDIO_RETENTION_MS = 45 * 24 * 60 * 60 * 1000;
    const GENERAL_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 3. Listar Objetos do R2 sob o prefixo 'chat/channels/'
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'chat/channels/',
      MaxKeys: 1000 // Limite de 1000 chaves por ciclo semanal para evitar sobrecarga
    });

    const listResponse = await s3.send(listCommand);
    const objects = listResponse.Contents || [];
    results.totalFilesScanned = objects.length;

    const keysToDelete: { Key: string }[] = [];

    for (const obj of objects) {
      if (!obj.Key || !obj.LastModified) continue;

      const fileAgeMs = now - obj.LastModified.getTime();
      const isAudio = obj.Key.endsWith('.webm') || obj.Key.includes('/audios/');
      const isDocument = obj.Key.includes('/documents/');

      let shouldDelete = false;

      if (isAudio && fileAgeMs > AUDIO_RETENTION_MS) {
        // Áudios temporários (mensagens de voz do chat) expiram após 45 dias
        shouldDelete = true;
      } else if (!isDocument && fileAgeMs > GENERAL_RETENTION_MS) {
        // Imagens e mídias gerais expiram após 90 dias (exceto documentos e PDFs anexados)
        shouldDelete = true;
      }

      if (shouldDelete) {
        results.eligibleForDeletion++;
        keysToDelete.push({ Key: obj.Key });
        results.deletedKeys.push(obj.Key);
      }
    }

    // 4. Executar a exclusão em lote no R2 caso haja itens elegíveis
    if (keysToDelete.length > 0) {
      if (!results.isDryRun) {
        // S3 DeleteObjectsCommand aceita deleções em lotes de até 1000 objetos por chamada
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: keysToDelete,
            Quiet: true
          }
        });

        await s3.send(deleteCommand);
        results.deletedFilesCount = keysToDelete.length;
        console.log(`[Media Cleaner] Excluídos fisicamente ${results.deletedFilesCount} arquivos temporários do Cloudflare R2.`);
      } else {
        results.deletedFilesCount = 0;
        console.log(`[Media Cleaner] [Dry-Run] Simulação concluída. ${keysToDelete.length} arquivos teriam sido excluídos.`);
      }
    } else {
      console.log(`[Media Cleaner] Nenhum arquivo temporário elegível encontrado para exclusão.`);
    }

    return res.status(200).json({
      success: true,
      summary: results
    });

  } catch (error: any) {
    console.error(`[Media Cleaner] Erro crítico na limpeza de mídias:`, error);
    return res.status(500).json({ error: error.message });
  }
}
