
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Spreadsheet IDs mapping
const SPREADSHEET_IDS: Record<string, string> = {
  "KerangkaAcuanKerja": "1B2EBK1JY92us3IycEJNxDla3gxJu_GjeQsz_ef8YJdc",
  "DaftarHadir": "11a8c8cBJrgqS4ZKKvClvq_6DYsFI8R22Aka1NTxYkF0",
  "SPJHonor": "1rsHaC6FPCJd-VHWmV3AGGJTxDSB03xOw8jqFqzBtHXM",
  "TransportLokal": "1n6b-fTij3TPpCIQRRbcqRO-CpgvpCIavvDM7Xn3Q5vc",
  "UangHarianTransport": "1-cJGkEqcBDzQ1n8RgdxByEHRk3ZG9Iax8YDhwi3kPIg",
  "KuitansiPerjalananDinas": "1o1lRjKm8-9KtAyx7eHTNUUZxGMtVi_jJ97rcFfrJOjk",
  "KuitansiTransportLokal": "1K0tEfeN45iwyq8yOqaCyZc1p3CLnAotQ6Iuu5NFilkI",
  "DokumenPengadaan": "1Paf4pvIXyJnCGcl21XunXIGdSafhN-0Apz9aE3bOXhg",
  "TandaTerima": "1TbViG1lxButPEZ9rgU0aWBXWYN_8fyj3DRUqDyXawx8",
  "SuratKeputusan": "11gtkh70Qg1ggvDNl1uXtjlh051eJ3KLe4YkCODr6TPo",
  "SuratPernyataan": "1rGIK4xt2CiKyfuJaZe0rhyz57j_8iFDlzwRBbXnW4xo",
  // Default fallback spreadsheet for testing/misc operations
  "Organik": "1aVoCmwZCmkihEOJ9ommE5kccep7uJv6oulI5R3EpOCg",
  "Mitra": "1aVoCmwZCmkihEOJ9ommE5kccep7uJv6oulI5R3EpOCg"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const SUPABASE_URL = "https://jbmgujpkyyqqphlzflfj.supabase.co";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const GOOGLE_SERVICE_ACCOUNT_EMAIL = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || "";
    const GOOGLE_PRIVATE_KEY = Deno.env.get("GOOGLE_PRIVATE_KEY") || "";
    
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
    
    // Get the spreadsheet ID for the requested sheet
    const SPREADSHEET_ID = SPREADSHEET_IDS[sheetName] || SPREADSHEET_IDS["Sheet1"];
    
    console.log(`Using spreadsheet ID for ${sheetName}: ${SPREADSHEET_ID}`);

    // First check if we can access the spreadsheet
    try {
      console.log("Checking spreadsheet access...");
      const accessCheckResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!accessCheckResponse.ok) {
        const errorText = await accessCheckResponse.text();
        console.error("Cannot access spreadsheet:", accessCheckResponse.status, errorText);
        return new Response(JSON.stringify({ 
          error: `Cannot access spreadsheet: ${accessCheckResponse.status} ${errorText}`,
          details: {
            spreadsheetId: SPREADSHEET_ID,
            sheetName: sheetName,
            suggestion: "Please ensure the service account has access to this spreadsheet"
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: accessCheckResponse.status,
        });
      }
      
      console.log("Spreadsheet access confirmed");
    } catch (error) {
      console.error("Error checking spreadsheet access:", error);
      return new Response(JSON.stringify({ 
        error: "Failed to check spreadsheet access: " + error.message,
        details: {
          spreadsheetId: SPREADSHEET_ID,
          sheetName: sheetName
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Check if the specific sheet exists and create it if needed
    try {
      console.log(`Checking if sheet '${sheetName}' exists...`);
      const checkResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // If the sheet doesn't exist, try to create it
      if (!checkResponse.ok && checkResponse.status === 400) {
        console.log(`Sheet ${sheetName} doesn't exist, attempting to create it`);
        
        // Create the sheet
        const createSheetResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: sheetName
                    }
                  }
                }
              ]
            }),
          }
        );
        
        if (!createSheetResponse.ok) {
          const errorText = await createSheetResponse.text();
          console.error(`Error creating sheet: ${errorText}`);
          return new Response(JSON.stringify({ 
            error: `Failed to create sheet: ${createSheetResponse.status} ${errorText}`,
            details: {
              spreadsheetId: SPREADSHEET_ID,
              sheetName: sheetName
            }
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: createSheetResponse.status,
          });
        } else {
          console.log(`Successfully created sheet: ${sheetName}`);
        }
      } else if (checkResponse.ok) {
        console.log(`Sheet '${sheetName}' exists and is accessible`);
      } else {
        const errorText = await checkResponse.text();
        console.error(`Error checking sheet: ${checkResponse.status} ${errorText}`);
      }
    } catch (error) {
      console.error(`Error checking/creating sheet ${sheetName}:`, error);
      return new Response(JSON.stringify({ 
        error: "Failed to check/create sheet: " + error.message,
        details: {
          spreadsheetId: SPREADSHEET_ID,
          sheetName: sheetName
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

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
      console.log(`Attempting to append data to spreadsheet ${SPREADSHEET_ID}, sheet ${sheetName}, range ${range}`);
      console.log("Data to append:", JSON.stringify(values, null, 2));
      
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

      console.log(`Append response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Sheets API error:", response.status, errorText);
        return new Response(JSON.stringify({ 
          error: `Google Sheets API error: ${response.status} ${errorText}`,
          details: {
            spreadsheetId: SPREADSHEET_ID,
            sheetName: sheetName,
            range: range,
            status: response.status
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: response.status,
        });
      }

      const data = await response.json();
      console.log("Append successful:", JSON.stringify(data, null, 2));
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
