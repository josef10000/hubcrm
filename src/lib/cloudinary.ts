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
 * Uploads a file to Cloudinary using the unsigned preset
 */
export async function uploadToCloudinary(file: File | Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
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
