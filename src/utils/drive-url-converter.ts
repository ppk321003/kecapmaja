/**
 * Google Drive URL Converter Utilities
 * Adapted dari pattern yang sukses di Visualisasi page
 */

/**
 * Extract Google Drive file ID from various URL formats
 */
function extractFileId(url: string): string {
  if (!url || typeof url !== 'string') return '';

  try {
    // Format: https://drive.google.com/file/d/{FILE_ID}/view?usp=drive_link
    if (url.includes('/file/d/')) {
      const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      return match?.[1] || '';
    }
    // Format: https://drive.google.com/open?id={FILE_ID}
    if (url.includes('id=')) {
      const match = url.match(/id=([a-zA-Z0-9-_]+)/);
      return match?.[1] || '';
    }
    // Format: https://drive.google.com/drive/folders/{FOLDER_ID}
    if (url.includes('/folders/')) {
      const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      return match?.[1] || '';
    }
  } catch (e) {
    console.warn('[extractFileId] Error:', e);
  }

  return '';
}

/**
 * Check if URL is a Google Drive URL
 */
export function isGoogleDriveUrl(url: string): boolean {
  return url && typeof url === 'string' && url.includes('drive.google.com');
}

/**
 * Get direct image URL from Google Drive (works for display in img tag)
 * Returns URL that can be embedded directly in <img src="..." />
 */
export function getGoogleDriveImageUrl(url: string): string {
  if (!url) return '';
  
  if (!isGoogleDriveUrl(url)) {
    return url; // Return as-is if not Google Drive
  }

  const fileId = extractFileId(url);
  if (!fileId) return '';

  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/**
 * Get preview URL for embedding (videos, 3D models)
 */
export function getGoogleDriveEmbedUrl(url: string): string {
  const fileId = extractFileId(url);
  if (!fileId) return '';
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Get view URL for opening file in new tab
 */
export function getGoogleDriveViewUrl(url: string): string {
  const fileId = extractFileId(url);
  if (!fileId) return '';
  return `https://drive.google.com/file/d/${fileId}/view`;
}
