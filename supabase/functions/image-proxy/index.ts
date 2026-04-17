// @ts-ignore - Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'public, max-age=86400',
};

serve(async (req: Request) => {
  console.log('[image-proxy] Request:', req.method, req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');
    const type = url.searchParams.get('type') || 'view'; // view, download, preview

    if (!fileId) {
      return new Response(JSON.stringify({ error: 'Missing fileId parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[image-proxy] Proxying Google Drive file:', fileId);

    // Build Google Drive URL based on type
    let driveUrl = '';
    if (type === 'preview') {
      driveUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    } else if (type === 'download') {
      driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    } else {
      // default: view as image
      driveUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    console.log('[image-proxy] Fetching from:', driveUrl);

    // Fetch from Google Drive
    const response = await fetch(driveUrl);

    if (!response.ok) {
      console.error('[image-proxy] Google Drive returned:', response.status, response.statusText);
      return new Response(JSON.stringify({ 
        error: `Failed to fetch from Google Drive: ${response.status} ${response.statusText}` 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get content type from response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    console.log('[image-proxy] ✅ Success, size:', buffer.byteLength, 'bytes, type:', contentType);

    // Return with CORS headers
    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[image-proxy] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
