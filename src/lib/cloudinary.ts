/**
 * Cloudinary API Integration
 * Handles file uploads (PDFs, Images) using unsigned presets
 */

const CLOUD_NAME = 'dxn2uv26s';
const UPLOAD_PRESET = 'hubcrm_pdfs';

export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
  bytes: number;
}

/**
 * Otimiza uma imagem no frontend: redimensiona e converte para WebP (qualidade 80%)
 */
async function optimizeImage(file: File | Blob, maxDimension: number = 1200): Promise<Blob> {
  return new Promise((resolve) => {
    // Garante compatibilidade se rodar em ambiente sem DOM
    if (typeof window === 'undefined' || typeof Image === 'undefined') {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Calcular novas dimensões proporcionalmente se exceder o limite máximo
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const originalName = (file as File).name || 'image.png';
            const lastDotIndex = originalName.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
            const webpFile = new File([blob], `${baseName}.webp`, { type: 'image/webp' });
            resolve(webpFile);
          } else {
            resolve(file);
          }
        },
        'image/webp',
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
  });
}

/**
 * Uploads a file to Cloudinary using the unsigned preset
 */
export async function uploadToCloudinary(file: File | Blob): Promise<string> {
  try {
    let fileToUpload = file;

    // Se for imagem elegível (excluindo SVG), aplica otimização WebP e redimensionamento no voo
    if (file.type && file.type.startsWith('image/') && file.type !== 'image/svg+xml') {
      try {
        fileToUpload = await optimizeImage(file);
      } catch (optErr) {
        console.warn('Falha na otimização da imagem. Usando arquivo original:', optErr);
      }
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Upload failed with status: ${response.status}`);
    }

    const data = await response.json() as CloudinaryResponse;
    return data.secure_url;
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    throw error;
  }
}

