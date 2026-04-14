// @ts-ignore - Deno runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz9IUT4qwZ_5uEZeUVmhWb7kKO5PhkUwuSw-VccngDa7CRUQ9OGuGKnk38BW9P_O957/exec";

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { spreadsheetId, folderId, templateSpkId } = await req.json().catch(() => ({}));

    if (!spreadsheetId) {
      return new Response(
        JSON.stringify({ success: false, error: "spreadsheetId is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(`🚀 Triggering Apps Script for spreadsheet: ${spreadsheetId.substring(0, 20)}...`);
    if (folderId) {
      console.log(`📁 Using folderId: ${folderId.substring(0, 20)}...`);
    }
    console.log('[generate-spk-bast] Received templateSpkId:', {
      templateSpkId: templateSpkId ? templateSpkId.substring(0, 30) + '...' : 'NOT_PROVIDED',
      templateSpkIdLength: templateSpkId?.length || 0,
      isTruthy: !!templateSpkId,
      trimmed: templateSpkId?.trim() ? 'YES' : 'NO'
    });

    // Call Apps Script with spreadsheetId parameter
    const appsScriptUrl = new URL(APPS_SCRIPT_URL);
    appsScriptUrl.searchParams.set("spreadsheetId", spreadsheetId);
    if (folderId) {
      appsScriptUrl.searchParams.set("folderId", folderId);
    }
    if (templateSpkId && templateSpkId.trim()) {
      appsScriptUrl.searchParams.set("templateSpkId", templateSpkId.trim());
      console.log(`✅ Added templateSpkId to URL: ${templateSpkId.substring(0, 30)}...`);
    } else {
      console.warn('⚠️ templateSpkId not set - Apps Script will use default');
    }

    // Make server-side request to Apps Script (no CORS issues on server)
    appsScriptUrl.searchParams.set("action", "generate");
    const response = await fetch(appsScriptUrl.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    const result = await response.text();
    console.log(`✅ Apps Script response received:`, response.status, result);

    if (!response.ok) {
      console.error(`❌ Apps Script error response: ${response.status}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Apps Script returned status ${response.status}`,
          appsScriptResponse: result,
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Generation started successfully",
        appsScriptResponse: result,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
