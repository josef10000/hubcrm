import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    switch (action) {
      case 'upload-url':
        return await handleUploadUrl(req, res);
      default:
        return res.status(400).json({ error: 'Ação de storage inválida ou não especificada' });
    }
  } catch (error: any) {
    console.error('[STORAGE_HANDLER] Critical Error:', error);
    return res.status(500).json({ 
      error: 'Erro interno no processador de armazenamento', 
      details: error.message 
    });
  }
}

async function handleUploadUrl(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  const { fileName, fileType, channelId } = req.body;

  if (!fileName || !fileType || !channelId) {
    return res.status(400).json({ error: 'Parâmetros ausentes: fileName, fileType e channelId são obrigatórios.' });
  }

  // 1. Validar e buscar credenciais do Cloudflare R2
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicDomain = process.env.R2_PUBLIC_DOMAIN || 'https://storage.hubsymples.com.br';

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('[STORAGE_HANDLER] Credenciais R2 ausentes no ambiente.');
    return res.status(500).json({ error: 'Serviço de storage temporariamente indisponível (chaves não configuradas)' });
  }

  try {
    // 2. Obter o S3Client apontando para o Cloudflare R2 via Singleton
    const s3 = getS3Client(accountId, accessKeyId, secretAccessKey);

    // 3. Definir a chave (pasta e nome do arquivo) no Bucket
    // Formato: chat/channels/[channelId]/[category]/[timestamp]-[fileName]
    const category = fileType.split('/')[0] || 'file';
    // Sanitizar nome do arquivo (remover caracteres estranhos)
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `chat/channels/${channelId}/${category}s/${Date.now()}-${sanitizedName}`;

    // 4. Criar o comando do S3
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: fileType,
    });

    // 5. Gerar a URL Assinada (válida por 10 minutos)
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
    
    // Garantir que a URL de acesso público não tenha barra extra
    const baseDomain = publicDomain.endsWith('/') ? publicDomain.slice(0, -1) : publicDomain;
    const publicAccessUrl = `${baseDomain}/${fileKey}`;

    return res.status(200).json({
      presignedUrl,
      publicAccessUrl,
      fileKey,
    });
  } catch (err: any) {
    console.error('[STORAGE_HANDLER] Falha ao gerar Presigned URL:', err);
    return res.status(500).json({ error: 'Erro ao assinar upload do arquivo', details: err.message });
  }
}
