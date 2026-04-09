/**
 * ComfyUI Image Upload Service
 */

import { getComfyUIBaseUrl, resolveComfyUIBaseUrl } from './api-config';

export interface UploadResult {
  name: string;
  subfolder: string;
  type: string;
}

function buildProxyUrl(comfyuiUrl: string): string {
  const normalized = (comfyuiUrl || '').trim() || getComfyUIBaseUrl();
  return resolveComfyUIBaseUrl(normalized);
}

export async function uploadImageToComfyUI(
  file: File,
  comfyuiUrl: string,
  subfolder = '',
  overwrite = true,
): Promise<UploadResult> {
  const baseUrl = buildProxyUrl(comfyuiUrl);
  const formData = new FormData();
  formData.append('image', file);
  formData.append('subfolder', subfolder);
  formData.append('overwrite', String(overwrite));
  formData.append('type', 'input');

  const response = await fetch(`${baseUrl}/upload/image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Image upload failed (${response.status}): ${text || response.statusText}`);
  }

  return await response.json() as UploadResult;
}

export function getImagePreviewUrl(
  filename: string,
  comfyuiUrl: string,
  subfolder = '',
): string {
  const baseUrl = buildProxyUrl(comfyuiUrl);
  const params = new URLSearchParams({
    filename,
    subfolder,
    type: 'input',
  });
  return `${baseUrl}/view?${params.toString()}`;
}

