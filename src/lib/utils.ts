import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Google Drive URL utilities (re-exported from drive-url-converter)
 */

function extractFileId(url: string): string {
  if (!url || typeof url !== 'string') return '';
  try {
    if (url.includes('/file/d/')) {
      const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      return match?.[1] || '';
    }
    if (url.includes('id=')) {
      const match = url.match(/id=([a-zA-Z0-9-_]+)/);
      return match?.[1] || '';
    }
    if (url.includes('/folders/')) {
      const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      return match?.[1] || '';
    }
  } catch (e) {
    console.warn('[extractFileId] Error:', e);
  }
  return '';
}

export function isGoogleDriveUrl(url: string): boolean {
  return url && typeof url === 'string' && url.includes('drive.google.com');
}

export function getGoogleDriveImageUrl(url: string): string {
  if (!url) return '';
  if (!isGoogleDriveUrl(url)) {
    return url;
  }
  const fileId = extractFileId(url);
  if (!fileId) return '';
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

export function getGoogleDriveEmbedUrl(url: string): string {
  const fileId = extractFileId(url);
  if (!fileId) return '';
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function getGoogleDriveViewUrl(url: string): string {
  const fileId = extractFileId(url);
  if (!fileId) return '';
  return `https://drive.google.com/file/d/${fileId}/view`;
}
