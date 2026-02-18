// @ts-ignore - Deno imports and types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

// @ts-ignore - Deno types
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetOperation {
  spreadsheetId: string;
  operation: 'read' | 'append' | 'update' | 'delete' | 'update-sisa-anggaran';
  range?: string;
  values?: any[][];
  rowIndex?: number;
  sheetName?: string;
  bulan?: number;
  tahun?: number;
}

async function getAccessToken() {
  console.log('Getting access token...');
  
  let privateKey: string;
  let serviceAccountEmail: string;
  
  // Try to parse as JSON first (if full service account JSON is provided)
  const googlePrivateKeyEnv = Deno.env.get('GOOGLE_PRIVATE_KEY');
  const googleServiceAccountEmailEnv = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  
  try {
    // Check if GOOGLE_PRIVATE_KEY contains full JSON
    if (googlePrivateKeyEnv?.includes('"type"')) {
      console.log('Parsing full service account JSON from GOOGLE_PRIVATE_KEY');
      const serviceAccount = JSON.parse(googlePrivateKeyEnv);
      privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
      serviceAccountEmail = serviceAccount.client_email;
    } else if (googleServiceAccountEmailEnv?.includes('"type"')) {
      console.log('Parsing full service account JSON from GOOGLE_SERVICE_ACCOUNT_EMAIL');
      const serviceAccount = JSON.parse(googleServiceAccountEmailEnv);
      privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
      serviceAccountEmail = serviceAccount.client_email;
    } else {
      // Individual fields provided
      console.log('Using individual credential fields');
      privateKey = googlePrivateKeyEnv?.replace(/\\n/g, '\n') || '';
      serviceAccountEmail = googleServiceAccountEmailEnv || '';
    }
  } catch (e) {
    console.error('Error parsing credentials:', e);
    // Fall back to individual fields
    privateKey = googlePrivateKeyEnv?.replace(/\\n/g, '\n') || '';
    serviceAccountEmail = googleServiceAccountEmailEnv || '';
  }

  console.log('Service account email:', serviceAccountEmail);
  console.log('Private key exists:', !!privateKey);
  console.log('Private key length:', privateKey?.length || 0);

  if (!privateKey || !serviceAccountEmail) {
    console.error('Missing Google credentials');
    throw new Error('Missing Google credentials');
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const payload = {
    iss: serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
  };

  // Create JWT manually
  const encodedHeader = btoa(JSON.stringify(header))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  console.log('Importing private key...');
  
  // Import the private key
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  console.log('Signing JWT...');
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${unsignedToken}.${encodedSignature}`;

  console.log('Requesting access token from Google...');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  console.log('Token response status:', tokenResponse.status);
  
  if (!tokenResponse.ok) {
    console.error('Token error:', tokenData);
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  
  console.log('Access token obtained successfully');
  return tokenData.access_token;
}

async function getSheetIdByName(spreadsheetId: string, accessToken: string, sheetName: string): Promise<number> {
  console.log(`Getting sheet ID for sheet name: ${sheetName}`);
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const data = await response.json();
    
    if (!data.sheets) {
      console.warn('No sheets found in spreadsheet, defaulting to sheet ID 0');
      return 0;
    }
    
    const sheet = data.sheets.find((s: any) => s.properties.title === sheetName);
    if (!sheet) {
      console.warn(`Sheet "${sheetName}" not found, defaulting to sheet ID 0. Available sheets:`, data.sheets.map((s: any) => s.properties.title));
      return 0;
    }
    
    const sheetId = sheet.properties.sheetId;
    console.log(`Found sheet "${sheetName}" with ID: ${sheetId}`);
    return sheetId;
  } catch (error) {
    console.error('Error getting sheet ID:', error);
    console.warn('Defaulting to sheet ID 0');
    return 0;
  }
}

// Normalize values for consistent matching
function normalizeForMatching(value: any): string {
  if (!value) return '';
  
  const str = String(value).toLowerCase().trim();
  
  // Normalize sub_komponen to 3 digits (pad with zeros)
  if (/^\d+$/.test(str)) {
    return str.padStart(3, '0');
  }
  
  // Strip kode prefix like "000081. " or "81. "
  const withoutPrefix = str.replace(/^\d+\.\s*/, '');
  
  return withoutPrefix;
}

serve(async (req: Request) => {
  console.log('Google Sheets function invoked');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { spreadsheetId, operation, range, values, rowIndex, sheetName }: SheetOperation = body;
    
    console.log('Getting access token...');
    const accessToken = await getAccessToken();

    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;

    if (operation === 'read') {
      console.log(`Reading range: ${range || 'Sheet1'}`);
      const response = await fetch(`${baseUrl}/values/${range || 'Sheet1'}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      console.log('Read response:', JSON.stringify(data));
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (operation === 'append') {
      console.log(`Appending to range: ${range || 'Sheet1'}`);
      console.log('Values to append:', JSON.stringify(values));
      console.log('Append URL:', `${baseUrl}/values/${range || 'Sheet1'}:append?valueInputOption=USER_ENTERED`);
      
      const response = await fetch(
        `${baseUrl}/values/${range || 'Sheet1'}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
      const data = await response.json();
      console.log('Append response status:', response.status);
      console.log('Append response:', JSON.stringify(data));
      
      if (!response.ok) {
        console.error('❌ Append failed with status', response.status);
        console.error('Append error details:', JSON.stringify(data, null, 2));
        if (data.error) {
          console.error('Google Sheets API Error:', data.error.message || JSON.stringify(data.error));
        }
        throw new Error(`Append failed: ${data.error?.message || JSON.stringify(data)}`);
      }
      
      console.log('✅ Append succeeded');
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (operation === 'update') {
      // Support both rowIndex-based update and direct range update
      let updateRange = range || 'Sheet1';
      
      if (rowIndex !== undefined) {
        // Legacy support: if rowIndex is provided, use it with Sheet name
        const sheetName = range?.split('!')[0] || 'Sheet1';
        updateRange = `${sheetName}!A${rowIndex}`;
      }
      
      console.log(`Updating range: ${updateRange}`);
      console.log('Values to update:', JSON.stringify(values));
      
      const response = await fetch(
        `${baseUrl}/values/${updateRange}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
      const data = await response.json();
      console.log('Update response:', JSON.stringify(data));
      
      if (!response.ok) {
        console.error('Update failed:', data);
        throw new Error(`Update failed: ${JSON.stringify(data)}`);
      }
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (operation === 'delete' && rowIndex !== undefined) {
      console.log(`Deleting row ${rowIndex}`);
      
      // Get the correct sheet ID based on the sheet name
      const sheetId = sheetName 
        ? await getSheetIdByName(spreadsheetId, accessToken, sheetName)
        : 0; // Default to first sheet if no sheet name provided
      
      console.log(`Using sheet ID: ${sheetId}`);
      
      const response = await fetch(
        `${baseUrl}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1,
                  endIndex: rowIndex,
                },
              },
            }],
          }),
        }
      );
      const data = await response.json();
      console.log('Delete response:', JSON.stringify(data));
      
      if (!response.ok) {
        console.error('Delete failed:', data);
        throw new Error(`Delete failed: ${JSON.stringify(data)}`);
      }
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (operation === 'update-sisa-anggaran') {
      console.log('🔄 Updating sisa_anggaran values...');
      const { values: itemsToUpdate, bulan, tahun } = body;
      
      if (!itemsToUpdate || !Array.isArray(itemsToUpdate)) {
        throw new Error('values must be an array of items');
      }

      console.log(`Processing ${itemsToUpdate.length} items for bulan=${bulan}, tahun=${tahun}`);

      // Read budget_items sheet to find matching rows
      const sheetName = 'budget_items';
      const readResponse = await fetch(
        `${baseUrl}/values/${sheetName}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const readData = await readResponse.json();
      
      if (!readData.values || readData.values.length < 2) {
        throw new Error('Budget items sheet is empty or not found');
      }

      const headers = readData.values[0];
      const headerIndexes: { [key: string]: number } = {};
      headers.forEach((header: string, index: number) => {
        headerIndexes[header.toLowerCase()] = index;
      });

      console.log('Sheet headers:', headers);
      const sisaAnggaranIndex = headerIndexes['sisa_anggaran'];
      const updatedDateIndex = headerIndexes['updated_date'];

      if (sisaAnggaranIndex === undefined) {
        throw new Error('sisa_anggaran column not found in budget_items sheet');
      }

      console.log(`sisaAnggaranIndex: ${sisaAnggaranIndex}, updatedDateIndex: ${updatedDateIndex}`);

      // Find matching rows and prepare updates
      const updates: { rowIndex: number; values: any[] }[] = [];
      let matchedCount = 0;

      itemsToUpdate.forEach((item: any) => {
        // Create matching key from item
        const itemKey = [
          normalizeForMatching(item.program),
          normalizeForMatching(item.kegiatan),
          normalizeForMatching(item.rincian_output),
          normalizeForMatching(item.komponen_output),
          normalizeForMatching(item.sub_komponen),
          normalizeForMatching(item.akun),
          normalizeForMatching(item.uraian),
        ].join('|');

        // Find matching row in sheet
        let foundRow = false;
        for (let rowIndex = 1; rowIndex < readData.values.length; rowIndex++) {
          const sheetRow = readData.values[rowIndex];
          const sheetKey = [
            normalizeForMatching(sheetRow[headerIndexes['program']]),
            normalizeForMatching(sheetRow[headerIndexes['kegiatan']]),
            normalizeForMatching(sheetRow[headerIndexes['rincian_output']]),
            normalizeForMatching(sheetRow[headerIndexes['komponen_output']]),
            normalizeForMatching(sheetRow[headerIndexes['sub_komponen']]),
            normalizeForMatching(sheetRow[headerIndexes['akun']]),
            normalizeForMatching(sheetRow[headerIndexes['uraian']]),
          ].join('|');

          if (itemKey === sheetKey) {
            // Prepare row update
            const newRow = [...sheetRow];
            newRow[sisaAnggaranIndex] = item.sisa_anggaran;
            if (updatedDateIndex !== undefined) {
              newRow[updatedDateIndex] = item.updated_date;
            }

            updates.push({
              rowIndex: rowIndex + 1, // +1 because row 1 is headers
              values: [newRow],
            });

            matchedCount++;
            foundRow = true;
            console.log(`✓ Matched row ${rowIndex + 1}: ${itemKey.substring(0, 50)}...`);
            break;
          }
        }

        if (!foundRow) {
          console.warn(`✗ No match found for: ${itemKey.substring(0, 50)}...`);
        }
      });

      console.log(`Found ${matchedCount} matching rows out of ${itemsToUpdate.length}`);

      // Apply all updates using individual update operations
      let successCount = 0;
      const updateErrors: string[] = [];

      for (const update of updates) {
        try {
          const cellRange = `${sheetName}!A${update.rowIndex}`;
          console.log(`Updating row ${update.rowIndex}...`);

          const updateResponse = await fetch(
            `${baseUrl}/values/${cellRange}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ values: update.values }),
            }
          );

          const updateResult = await updateResponse.json();
          if (!updateResponse.ok) {
            updateErrors.push(`Row ${update.rowIndex}: ${JSON.stringify(updateResult)}`);
            console.error(`✗ Failed to update row ${update.rowIndex}:`, updateResult);
          } else {
            successCount++;
            console.log(`✓ Updated row ${update.rowIndex}`);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          updateErrors.push(`Row ${update.rowIndex}: ${errorMsg}`);
          console.error(`✗ Error updating row ${update.rowIndex}:`, error);
        }
      }

      console.log(`✅ Update complete: ${successCount}/${updates.length} rows updated`);

      return new Response(JSON.stringify({
        success: true,
        matched: matchedCount,
        updated: successCount,
        total_requested: itemsToUpdate.length,
        bulan,
        tahun,
        errors: updateErrors.length > 0 ? updateErrors : undefined,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.error('Invalid operation:', operation);
    return new Response(JSON.stringify({ error: 'Invalid operation' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in google-sheets function:', errorMessage);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
