/**
 * ImgBB API Integration
 * Replaces Base64 direct DB saving with high performance cloud storage
 */

const IMGBB_API_KEY = '48da53f6abe7cff50dd96c3e56340fdd';

export interface ImgBBResponse {
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    width: number;
    height: number;
    size: number;
    time: number;
    expiration: number;
    image: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    thumb: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    medium?: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    delete_url: string;
  };
  success: boolean;
  status: number;
}

/**
 * Uploads an image (File or Blob) to ImgBB and returns the direct display URL
 */
export async function uploadImageToImgBB(file: File | Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const json = await response.json() as ImgBBResponse;
    if (json.success && json.data && json.data.url) {
      return json.data.url;
    } else {
      throw new Error('Upload format response unexpected');
    }
  } catch (error) {
    console.error('ImgBB Upload Error:', error);
    throw error;
  }
}
