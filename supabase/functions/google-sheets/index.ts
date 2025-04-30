
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const SUPABASE_URL = "https://ltloelzcnnbxlreropql.supabase.co";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const GOOGLE_SERVICE_ACCOUNT_EMAIL = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || "";
    const GOOGLE_PRIVATE_KEY = Deno.env.get("GOOGLE_PRIVATE_KEY") || "";
    const SPREADSHEET_ID = "1aVoCmwZCmkihEOJ9ommE5kccep7uJv6oulI5R3EpOCg";

    // Log for debugging
    console.log("Service account email:", GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.log("Private key exists:", GOOGLE_PRIVATE_KEY ? "Yes" : "No");
    console.log("Private key length:", GOOGLE_PRIVATE_KEY.length);

    // Get JWT token for Google Sheets API
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600; // Token expires in 1 hour
    const payload = {
      iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      sub: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      aud: "https://sheets.googleapis.com/",
      iat: iat,
      exp: exp,
      scope: "https://www.googleapis.com/auth/spreadsheets"  // Read and write scope
    };

    // Sign JWT
    const header = { alg: "RS256", typ: "JWT" };
    const encoder = new TextEncoder();
    const headerString = JSON.stringify(header);
    const payloadString = JSON.stringify(payload);
    const encodedHeader = btoa(headerString).replace(/=+$/, "");
    const encodedPayload = btoa(payloadString).replace(/=+$/, "");
    const signatureInput = encoder.encode(`${encodedHeader}.${encodedPayload}`);

    // Convert PEM to ArrayBuffer for signing - with improved error handling
    let privateKey;
    try {
      privateKey = await crypto.subtle.importKey(
        "pkcs8",
        pemToDer(GOOGLE_PRIVATE_KEY),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
      );
    } catch (error) {
      console.error("Error importing private key:", error);
      return new Response(JSON.stringify({ error: "Failed to import private key: " + error.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const signature = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      privateKey,
      signatureInput
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const token = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

    // Parse the request to determine the operation
    const requestData = await req.json();
    const { action = "read", sheetName, range, values } = requestData;

    if (action === "read") {
      // Read data from Google Sheets
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!${range}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Sheets API error:", errorText);
        return new Response(JSON.stringify({ error: `Google Sheets API error: ${response.status} ${errorText}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "append") {
      // Append data to Google Sheets
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: values,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Sheets API error:", errorText);
        return new Response(JSON.stringify({ error: `Google Sheets API error: ${response.status} ${errorText}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === "update") {
      // Update specific cells in Google Sheets
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!${range}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: values,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Sheets API error:", errorText);
        return new Response(JSON.stringify({ error: `Google Sheets API error: ${response.status} ${errorText}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({ error: "Invalid action specified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper function to convert PEM to DER format with improved error handling
function pemToDer(pem) {
  try {
    if (!pem) {
      throw new Error("Empty private key");
    }
    
    // Replace \\n with actual newlines if needed (sometimes happens when stored in env vars)
    pem = pem.replace(/\\n/g, '\n');
    
    const lines = pem.split('\n');
    let encoded = '';
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().length > 0 &&
          !lines[i].includes('-----BEGIN') &&
          !lines[i].includes('-----END')) {
        encoded += lines[i].trim();
      }
    }
    
    if (!encoded) {
      throw new Error("Could not extract base64 content from private key");
    }
    
    const binary = atob(encoded);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer;
  } catch (error) {
    console.error("Error in pemToDer:", error);
    throw new Error("Failed to decode private key: " + error.message);
  }
}
