// @ts-ignore - Deno imports and types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - ESM imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

// @ts-ignore - Deno types
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

interface SheetOperation {
  spreadsheetId: string;
  operation: 'read' | 'append' | 'update' | 'delete' | 'update-sisa-anggaran' | 'health';
  range?: string;
  values?: any[][];
  rowIndex?: number;
  sheetName?: string;
  bulan?: number;
  tahun?: number;
  unmatchedItems?: any[];
  rpdUpdates?: any[];
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
// Handles ALL case variations (GG, gg, Gg, gG, BMA, bma, etc.) + extra spaces/special chars
function normalizeForMatching(value: any): string {
  if (!value) return '';
  
  let str = String(value)
    .toUpperCase() // ALL cases → uppercase (gg=GG, bma=BMA, bm=BM)
    .trim() // Remove leading/trailing spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/[\s_-]+/g, '_'); // Normalize separators to underscore (_)
  
  // Normalize sub_komponen to 3 digits (pad with zeros)
  if (/^\d+(_|$)/.test(str)) {
    const parts = str.split('_');
    parts[0] = parts[0].padStart(3, '0');
    return parts.join('_');
  }
  
  // Handle pure numeric strings
  if (/^\d+$/.test(str)) {
    return str.padStart(3, '0');
  }
  
  // Strip kode prefix like "000081. " or "81. "
  const withoutPrefix = str.replace(/^\d+\.\s*/, '');
  
  return withoutPrefix.trim();
}

// Normalize sub_komponen value to 3-digit format with text prefix
// Handles both plain numbers (051) and with program suffix (051_GG)
function normalizeSubKomponenValue(value: any): string {
  if (!value) return '';
  
  const str = String(value).trim();
  
  // If it already has program suffix like "051_GG", keep it as-is
  // Don't add quote prefix - Google Sheets will handle format properly
  if (str.includes('_')) {
    console.log(`[normalizeSubKomponenValue] Special case with program suffix: ${str}`);
    return str;
  }
  
  // If it's just digits, pad to 3 (e.g., "1" → "001", "51" → "051")
  if (/^\d+$/.test(str)) {
    const padded = str.padStart(3, '0');
    console.log(`[normalizeSubKomponenValue] Digit normalization: ${str} → ${padded}`);
    return padded;
  }
  
  // If it has format like "52.0A", normalize the numeric part to 3 digits
  const match = str.match(/^(\d+)(\..*)?$/);
  if (match) {
    const numPart = match[1].padStart(3, '0');
    const suffix = match[2] || '';
    const result = `${numPart}${suffix}`;
    console.log(`[normalizeSubKomponenValue] Format normalization: ${str} → ${result}`);
    return result;
  }
  
  // For other formats, keep as-is
  console.log(`[normalizeSubKomponenValue] Unknown format, keeping as-is: ${str}`);
  return str;
}

// Convert column index (0-based) to column letter (A, B, C, ..., Z, AA, AB, etc.)
function indexToColumnLetter(index: number): string {
  let result = '';
  index = index + 1; // Convert to 1-based for column letters
  while (index > 0) {
    index--; // Adjust for 0-based calculation
    result = String.fromCharCode(65 + (index % 26)) + result;
    index = Math.floor(index / 26);
  }
  return result;
}

serve(async (req: Request) => {
  console.log('Google Sheets function invoked');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body));
    
    const { spreadsheetId, operation, range, values, rowIndex, sheetName }: SheetOperation = body;
    
    // Health check endpoint - no credentials needed
    if (operation === 'health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        hasGoogleCredentials: !!(Deno.env.get('GOOGLE_PRIVATE_KEY') && Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL'))
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check for required environment variables before processing any real operations
    const googlePrivateKeyEnv = Deno.env.get('GOOGLE_PRIVATE_KEY');
    const googleServiceAccountEmailEnv = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    
    if (!googlePrivateKeyEnv || !googleServiceAccountEmailEnv) {
      const errorMsg = 'Missing required environment variables: GOOGLE_PRIVATE_KEY and/or GOOGLE_SERVICE_ACCOUNT_EMAIL';
      console.error(errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
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
      
      try {
        const { values: itemsToUpdate, bulan, tahun, rpdUpdates, unmatchedItems } = body;
        
        console.log('📦 Request body keys:', Object.keys(body).join(', '));
        console.log('📦 Destructured values:');
        console.log('   - itemsToUpdate:', typeof itemsToUpdate, 'isArray:', Array.isArray(itemsToUpdate), 'length:', Array.isArray(itemsToUpdate) ? itemsToUpdate.length : 'N/A');
        console.log('   - bulan:', bulan, 'tahun:', tahun);
        console.log('   - rpdUpdates:', typeof rpdUpdates, 'isArray:', Array.isArray(rpdUpdates), 'length:', Array.isArray(rpdUpdates) ? rpdUpdates.length : 'N/A');
        console.log('   - unmatchedItems:', typeof unmatchedItems, 'isArray:', Array.isArray(unmatchedItems), 'length:', Array.isArray(unmatchedItems) ? unmatchedItems.length : 'N/A');
        
        if (!itemsToUpdate || !Array.isArray(itemsToUpdate)) {
          const errorMsg = `Invalid itemsToUpdate: ${!itemsToUpdate ? 'null/undefined' : `not array, type=${typeof itemsToUpdate}`}. Body keys: ${Object.keys(body).join(', ')}`;
          console.error('❌ ' + errorMsg);
          return new Response(JSON.stringify({ error: errorMsg, receivedKeys: Object.keys(body) }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const monthStr = String(bulan).padStart(2, '0');
        
        console.log(`Processing ${itemsToUpdate.length} items for bulan=${bulan}, tahun=${tahun}`);
        console.log('Strategy: Create new monthly sheet and append items there');

        // Create versioned sheet name: budget_items_jan_2026, budget_items_feb_2026, etc.
        const bulanNames = ['', 'jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
        const bulanName = bulanNames[bulan] || String(bulan).padStart(2, '0');
        const versionedSheetName = `budget_items_${bulanName}_${tahun}`;
        
        console.log(`📅 Creating/using versioned sheet: ${versionedSheetName}`);

        // Read budget_items sheet to get header structure
        const mainSheetName = 'budget_items';
        const readResponse = await fetch(
          `${baseUrl}/values/${mainSheetName}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        
        if (!readResponse.ok) {
          throw new Error(`Failed to read main sheet: ${readResponse.status}`);
        }
        
        const readData = await readResponse.json();
        
        if (!readData.values || readData.values.length < 2) {
          throw new Error('Budget items sheet is empty or not found');
        }

        const headers = readData.values[0];
        const headerIndexes: { [key: string]: number } = {};
        headers.forEach((header: string, index: number) => {
          headerIndexes[header.toLowerCase()] = index;
        });

        console.log('📊 Sheet headers found:', headers.length, 'columns');
        
        const subKomponenIndex = headerIndexes['sub_komponen'];
        
        if (subKomponenIndex === undefined) {
          console.warn('⚠️  sub_komponen column not found, will skip normalization');
        }

        // SIMPLIFIED: Trust frontend matching - just prepare rows to INSERT
        // Frontend already correctly matched these 609 items to existing budget items
        // We just need to format them as sheet rows
        const rowsToInsert: any[] = [];
        let normalizedCount = 0;

        console.log(`📝 Preparing ${itemsToUpdate.length} items to INSERT into ${mainSheetName}`);
        itemsToUpdate.forEach((item: any, idx: number) => {
          const newRow = new Array(headers.length).fill('');
          
          // Map all columns from item to row
          headers.forEach((header: string, colIndex: number) => {
            const headerLower = header.toLowerCase();
            
            // Copy column values from item where available
            if (headerLower === 'id') newRow[colIndex] = item.id || '';
            else if (headerLower === 'program_pembebanan') newRow[colIndex] = item.program_pembebanan || '';
            else if (headerLower === 'kegiatan') newRow[colIndex] = item.kegiatan || '';
            else if (headerLower === 'rincian_output') newRow[colIndex] = item.rincian_output || '';
            else if (headerLower === 'komponen_output') newRow[colIndex] = item.komponen_output || '';
            else if (headerLower === 'sub_komponen') {
              // Will normalize below
              if (item.sub_komponen !== undefined && item.sub_komponen !== null && item.sub_komponen !== '') {
                try {
                  const normalizedValue = normalizeSubKomponenValue(item.sub_komponen);
                  newRow[colIndex] = `'${normalizedValue}`;
                  if (newRow[colIndex] !== item.sub_komponen && normalizedValue) {
                    normalizedCount++;
                  }
                } catch (e) {
                  console.warn('Error normalizing sub_komponen for item:', item.uraian, e);
                  newRow[colIndex] = item.sub_komponen || '';
                }
              } else {
                newRow[colIndex] = item.sub_komponen || '';
              }
            } else if (headerLower === 'akun') newRow[colIndex] = item.akun || '';
            else if (headerLower === 'uraian') newRow[colIndex] = item.uraian || '';
            else if (headerLower === 'volume_semula') newRow[colIndex] = item.volume_semula !== undefined ? item.volume_semula : 0;
            else if (headerLower === 'satuan_semula') newRow[colIndex] = item.satuan_semula || '';
            else if (headerLower === 'harga_satuan_semula') newRow[colIndex] = item.harga_satuan_semula !== undefined ? item.harga_satuan_semula : 0;
            else if (headerLower === 'jumlah_semula') newRow[colIndex] = item.jumlah_semula !== undefined ? item.jumlah_semula : 0;
            else if (headerLower === 'volume_menjadi') newRow[colIndex] = item.volume_menjadi !== undefined ? item.volume_menjadi : 1;
            else if (headerLower === 'satuan_menjadi') newRow[colIndex] = item.satuan_menjadi || '';
            else if (headerLower === 'harga_satuan_menjadi') newRow[colIndex] = item.harga_satuan_menjadi !== undefined ? item.harga_satuan_menjadi : 0;
            else if (headerLower === 'jumlah_menjadi') newRow[colIndex] = item.jumlah_menjadi !== undefined ? item.jumlah_menjadi : 0;
            else if (headerLower === 'selisih') newRow[colIndex] = item.selisih !== undefined ? item.selisih : 0;
            else if (headerLower === 'sisa_anggaran') newRow[colIndex] = item.sisa_anggaran !== undefined ? item.sisa_anggaran : 0;
            else if (headerLower === 'blokir') newRow[colIndex] = item.blokir !== undefined ? item.blokir : 0;
            else if (headerLower === 'status') newRow[colIndex] = item.status || 'updated';
            else if (headerLower === 'approved_by') newRow[colIndex] = item.approved_by || '';
            else if (headerLower === 'approved_date') newRow[colIndex] = item.approved_date || '';
            else if (headerLower === 'rejected_date') newRow[colIndex] = item.rejected_date || '';
            else if (headerLower === 'submitted_by') newRow[colIndex] = item.submitted_by || 'import';
            else if (headerLower === 'submitted_date') newRow[colIndex] = item.submitted_date || '';
            else if (headerLower === 'updated_date') newRow[colIndex] = item.updated_date !== undefined ? item.updated_date : new Date().toISOString();
            else if (headerLower === 'notes') newRow[colIndex] = item.notes || '';
            else if (headerLower === 'catatan_ppk') newRow[colIndex] = item.catatan_ppk || '';
          });
          
          rowsToInsert.push(newRow);
          
          if ((idx + 1) % 100 === 0) {
            console.log(`Prepared ${idx + 1}/${itemsToUpdate.length} rows...`);
          }
        });

        console.log(`✅ Prepared ${rowsToInsert.length} rows for INSERT`);
        console.log(`✅ Sub_komponen normalized: ${normalizedCount} items`);
        
        if (rowsToInsert.length > 0) {
          console.log('📋 Sample row [0] (first 10 cols):', rowsToInsert[0].slice(0, 10));
        }

        // Get unmatched items from body
        const unmatchedItemsArg = (body.unmatchedItems || []) as any[];

        // Step 3: Create versioned sheet if it doesn't exist
        console.log(`📋 Checking if ${versionedSheetName} exists...`);
        
        let versionedSheetExists = false;
        try {
          // Try to read the versioned sheet
          const versionedReadResponse = await fetch(
            `${baseUrl}/values/${versionedSheetName}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          
          if (versionedReadResponse.ok) {
            const versionedData = await versionedReadResponse.json();
            if (versionedData.values && versionedData.values.length > 0) {
              versionedSheetExists = true;
              console.log(`✓ ${versionedSheetName} already exists with ${versionedData.values.length} rows`);
            }
          }
        } catch (err) {
          console.log(`⚠️ Could not check ${versionedSheetName}, will create if needed`);
        }

        // If versioned sheet doesn't exist, create it with header
        if (!versionedSheetExists) {
          console.log(`📊 Creating new sheet: ${versionedSheetName}`);
          try {
            // Use batchUpdate API to add a new sheet
            const createSheetResponse = await fetch(
              `${baseUrl.replace('/values', '')}:batchUpdate`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  requests: [
                    {
                      addSheet: {
                        properties: {
                          title: versionedSheetName,
                          gridProperties: {
                            rowCount: 1000,
                            columnCount: headers.length,
                          },
                        },
                      },
                    },
                  ],
                }),
              }
            );
            
            const createResult = await createSheetResponse.json();
            if (createSheetResponse.ok && createResult.replies && createResult.replies[0]) {
              console.log(`✅ Created sheet: ${versionedSheetName}`);
              versionedSheetExists = true;
              
              // Now insert the header row
              try {
                const endColumnLetter = indexToColumnLetter(headers.length - 1);
                const headerInsertResponse = await fetch(
                  `${baseUrl}/values/${versionedSheetName}!A1:${endColumnLetter}1`,
                  {
                    method: 'PUT',
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      values: [headers],
                      majorDimension: 'ROWS',
                    }),
                  }
                );
                
                if (headerInsertResponse.ok) {
                  console.log(`✅ Inserted header row into ${versionedSheetName}`);
                } else {
                  const headerError = await headerInsertResponse.json();
                  console.warn(`⚠️ Failed to insert header:`, headerError.error?.message);
                }
              } catch (headerError) {
                console.warn(`⚠️ Error inserting header:`, headerError);
              }
            } else {
              const errorMsg = createResult?.error?.message || 'Unknown error';
              console.warn(`⚠️ Failed to create sheet:`, errorMsg);
              console.warn(`Response:`, createResult);
            }
          } catch (error) {
            console.warn(`⚠️ Error creating sheet:`, error);
          }
        }

        // Step 4: APPEND matched items to VERSIONED sheet (for historical record)
        let appendCountMatched = rowsToInsert.length; // Ini akan di-append nanti
        const appendErrors: string[] = [];

        console.log(`📥 Step 1: Appending ${rowsToInsert.length} matched items to ${versionedSheetName}...`);
        
        try {
          if (rowsToInsert.length > 0) {
            const appendResponse = await fetch(
              `${baseUrl}/values/${versionedSheetName}:append?valueInputOption=USER_ENTERED`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  values: rowsToInsert,
                }),
              }
            );
            
            const appendResult = await appendResponse.json();
            if (appendResponse.ok) {
              console.log(`✅ Appended ${appendCountMatched} matched items to ${versionedSheetName}`);
            } else {
              const errorMsg = appendResult?.error?.message || 'Unknown error';
              console.warn(`⚠️ Failed to append matched items to versioned sheet:`, errorMsg);
              appendErrors.push(`Versioned sheet append: ${errorMsg}`);
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('❌ Error appending to versioned sheet:', errorMsg);
          appendErrors.push(`Versioned sheet error: ${errorMsg}`);
        }

        // Step 4a: UPDATE main sheet budget_items (DON'T APPEND - ONLY UPDATE existing rows)
        console.log(`🔄 Step 2: Updating existing rows in main ${mainSheetName} sheet (DO NOT ADD NEW ROWS)...`);
        
        let updateCountMain = 0;
        try {
          // Build row map of main sheet for matching
          const mainRowMap = new Map<string, {rowIndex: number, data: any[]}>();
          const sisaAnggaranIndex = headerIndexes['sisa_anggaran'];
          
          for (let rowIndex = 1; rowIndex < readData.values.length; rowIndex++) {
            const sheetRow = readData.values[rowIndex];
            const sheetKey = [
              normalizeForMatching(sheetRow[headerIndexes['program_pembebanan']]),
              normalizeForMatching(sheetRow[headerIndexes['kegiatan']]),
              normalizeForMatching(sheetRow[headerIndexes['rincian_output']]),
              normalizeForMatching(sheetRow[headerIndexes['komponen_output']]),
              normalizeForMatching(sheetRow[headerIndexes['sub_komponen']]),
              normalizeForMatching(sheetRow[headerIndexes['akun']]),
              normalizeForMatching(sheetRow[headerIndexes['uraian']]),
            ].join('|');
            

            mainRowMap.set(sheetKey, { rowIndex: rowIndex + 1, data: sheetRow });
          }
          
          console.log(`📊 Built row map with ${mainRowMap.size} entries from main sheet`);
          
          // Prepare batch updates for sisa_anggaran column
          const updateBatches: any[] = [];
          let updateCount = 0;
          
          for (const item of itemsToUpdate) {
            const normalizedSubKomponen = normalizeSubKomponenValue(item.sub_komponen || '');
            const itemKey = [
              normalizeForMatching(item.program_pembebanan || item.program),
              normalizeForMatching(item.kegiatan),
              normalizeForMatching(item.rincian_output),
              normalizeForMatching(item.komponen_output),
              normalizeForMatching(normalizedSubKomponen),
              normalizeForMatching(item.akun),
              normalizeForMatching(item.uraian),
            ].join('|');
            
            const foundMatch = mainRowMap.get(itemKey);
            if (foundMatch && sisaAnggaranIndex !== undefined) {
              // Prepare batch update for sisa_anggaran column
              const columnLetter = indexToColumnLetter(sisaAnggaranIndex);
              updateBatches.push({
                range: `${mainSheetName}!${columnLetter}${foundMatch.rowIndex}`,
                values: [[item.sisa_anggaran !== undefined ? item.sisa_anggaran : 0]],
              });
              updateCount++;
            }
          }
          
          console.log(`📝 Prepared ${updateCount} batch updates for sisa_anggaran in ${mainSheetName}`);
          
          // Send batch updates
          if (updateBatches.length > 0) {
            const batchUpdateResponse = await fetch(
              `${baseUrl}/values:batchUpdate`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  data: updateBatches,
                  valueInputOption: 'RAW',
                }),
              }
            );
            
            if (batchUpdateResponse.ok) {
              console.log(`✅ Updated ${updateCount} items' sisa_anggaran in ${mainSheetName}`);
            } else {
              const batchError = await batchUpdateResponse.json();
              console.warn(`⚠️ Failed to update main sheet:`, batchError.error?.message);
              appendErrors.push(`Main sheet update: ${batchError.error?.message}`);
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.warn(`⚠️ Error updating main sheet:`, errorMsg);
          appendErrors.push(`Main update error: ${errorMsg}`);
        }

        // Step 4b: APPEND unmatched items to SEPARATE SHEET (NOT to budget_items)
        let appendCountUnmatched = 0;
        const unmatchedSheetName = `budget_items_unmatched_${bulanName}_${tahun}`;
        
        console.log(`\n📋 STEP 3: UNMATCHED ITEMS PROCESSING`);
        console.log(`  unmatchedItemsArg type: ${Array.isArray(unmatchedItemsArg) ? 'Array' : typeof unmatchedItemsArg}`);
        console.log(`  unmatchedItemsArg.length: ${unmatchedItemsArg?.length || 0}`);
        
        if (unmatchedItemsArg.length > 0) {
          console.log(`📥 Processing ${unmatchedItemsArg.length} unmatched items → sheet: ${unmatchedSheetName}...`);
          
          try {
            // Try to create sheet (if exists, will error but we'll catch and continue)
            let sheetJustCreated = false;
            
            try {
              console.log(`🔨 Attempting to create sheet: ${unmatchedSheetName}`);
              
              const createSheetResponse = await fetch(
                `${baseUrl}/batchUpdate`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    requests: [
                      {
                        addSheet: {
                          properties: {
                            title: unmatchedSheetName,
                            gridProperties: {
                              rowCount: 1000,
                              columnCount: headers.length,
                            },
                          },
                        },
                      },
                    ],
                  }),
                }
              );

              const createResult = await createSheetResponse.json();
              console.log(`  Create sheet response: ${createSheetResponse.status}`, createResult.replies ? `✅ Created` : createResult.error?.message);
              
              if (createSheetResponse.ok) {
                console.log(`✅ Sheet created: ${unmatchedSheetName}`);
                sheetJustCreated = true;
              } else if (createResult?.error?.message?.includes('already exists')) {
                console.log(`⚠️ Sheet already exists: ${unmatchedSheetName}`);
                sheetJustCreated = false;
              } else {
                throw new Error(createResult?.error?.message || 'Failed to create unmatched sheet');
              }
            } catch (createErr) {
              const errorMsg = createErr instanceof Error ? createErr.message : String(createErr);
              console.error(`❌ Create sheet error: ${errorMsg}`);
              // If error adalah "already exists", continue; otherwise log and continue anyway
              if (errorMsg.includes('already exists')) {
                console.log(`  → Continuing with existing sheet`);
                sheetJustCreated = false;
              } else {
                console.warn(`  → Continuing anyway (may create issues)`);
                sheetJustCreated = false;
              }
            }

            // Build rows for unmatched items - ALWAYS INCLUDE HEADER for new sheets
            const unmatchedRows: any[][] = [];
            
            // FORCE append header if sheet just created
            if (sheetJustCreated) {
              console.log(`📋 Adding header row to NEW sheet`);
              unmatchedRows.push(headers);
            }
            
            // Add all data items with status 'UNMATCHED'
            const statusColumnIndex = headerIndexes['status'] !== undefined ? headerIndexes['status'] : -1;
            console.log(`  Status column index: ${statusColumnIndex}, Total columns: ${headers.length}`);
            
            unmatchedItemsArg.forEach((unmatchedItem: any, itemIdx: number) => {
              const unmatchedRow = new Array(headers.length).fill('');
              
              // Map all columns from unmatched item to row
              headers.forEach((header: string, colIndex: number) => {
                const headerLower = header.toLowerCase();
                
                // Copy column values from unmatched item
                if (headerLower === 'id') unmatchedRow[colIndex] = unmatchedItem.id || '';
                else if (headerLower === 'program_pembebanan') unmatchedRow[colIndex] = unmatchedItem.program_pembebanan || '';
                else if (headerLower === 'kegiatan') unmatchedRow[colIndex] = unmatchedItem.kegiatan || '';
                else if (headerLower === 'rincian_output') unmatchedRow[colIndex] = unmatchedItem.rincian_output || '';
                else if (headerLower === 'komponen_output') unmatchedRow[colIndex] = unmatchedItem.komponen_output || '';
                else if (headerLower === 'sub_komponen') {
                  // Normalize sub_komponen with single quote
                  if (unmatchedItem.sub_komponen !== undefined && unmatchedItem.sub_komponen !== null && unmatchedItem.sub_komponen !== '') {
                    try {
                      const normalized = normalizeSubKomponenValue(unmatchedItem.sub_komponen || '');
                      unmatchedRow[colIndex] = `'${normalized || ''}`;
                    } catch (e) {
                      unmatchedRow[colIndex] = unmatchedItem.sub_komponen || '';
                    }
                  } else {
                    unmatchedRow[colIndex] = '';
                  }
                } else if (headerLower === 'akun') unmatchedRow[colIndex] = unmatchedItem.akun || '';
                else if (headerLower === 'uraian') unmatchedRow[colIndex] = unmatchedItem.uraian || '';
                else if (headerLower === 'volume_semula') unmatchedRow[colIndex] = unmatchedItem.volume_semula !== undefined ? unmatchedItem.volume_semula : 0;
                else if (headerLower === 'satuan_semula') unmatchedRow[colIndex] = unmatchedItem.satuan_semula || '';
                else if (headerLower === 'harga_satuan_semula') unmatchedRow[colIndex] = unmatchedItem.harga_satuan_semula !== undefined ? unmatchedItem.harga_satuan_semula : 0;
                else if (headerLower === 'jumlah_semula') unmatchedRow[colIndex] = unmatchedItem.jumlah_semula !== undefined ? unmatchedItem.jumlah_semula : 0;
                else if (headerLower === 'volume_menjadi') unmatchedRow[colIndex] = unmatchedItem.volume_menjadi !== undefined ? unmatchedItem.volume_menjadi : 1;
                else if (headerLower === 'satuan_menjadi') unmatchedRow[colIndex] = unmatchedItem.satuan_menjadi || '';
                else if (headerLower === 'harga_satuan_menjadi') unmatchedRow[colIndex] = unmatchedItem.harga_satuan_menjadi !== undefined ? unmatchedItem.harga_satuan_menjadi : 0;
                else if (headerLower === 'jumlah_menjadi') unmatchedRow[colIndex] = unmatchedItem.jumlah_menjadi !== undefined ? unmatchedItem.jumlah_menjadi : 0;
                else if (headerLower === 'selisih') unmatchedRow[colIndex] = unmatchedItem.selisih !== undefined ? unmatchedItem.selisih : 0;
                else if (headerLower === 'sisa_anggaran') unmatchedRow[colIndex] = unmatchedItem.sisa_anggaran !== undefined ? unmatchedItem.sisa_anggaran : 0;
                else if (headerLower === 'blokir') unmatchedRow[colIndex] = unmatchedItem.blokir !== undefined ? unmatchedItem.blokir : 0;
                else if (headerLower === 'status') {
                  unmatchedRow[colIndex] = 'UNMATCHED';
                  if (itemIdx === 0) console.log(`  ✔️ Status column (index ${colIndex}) = 'UNMATCHED'`);
                }
                else if (headerLower === 'approved_by') unmatchedRow[colIndex] = '';
                else if (headerLower === 'approved_date') unmatchedRow[colIndex] = '';
                else if (headerLower === 'rejected_date') unmatchedRow[colIndex] = '';
                else if (headerLower === 'submitted_by') unmatchedRow[colIndex] = 'system';
                else if (headerLower === 'submitted_date') unmatchedRow[colIndex] = new Date().toISOString();
                else if (headerLower === 'updated_date') unmatchedRow[colIndex] = new Date().toISOString();
                else if (headerLower === 'notes') unmatchedRow[colIndex] = 'Item tidak ditemukan di budget_items utama - perlu pengecekan/persetujuan manual';
                else if (headerLower === 'catatan_ppk') unmatchedRow[colIndex] = 'Menunggu review PPK';
              });
              
              unmatchedRows.push(unmatchedRow);
              if ((itemIdx + 1) % 100 === 0) {
                console.log(`  Prepared ${itemIdx + 1}/${unmatchedItemsArg.length} unmatched rows`);
              }
            });
            
            console.log(`✓ Ready to append: ${unmatchedRows.length} rows (${sheetJustCreated ? 'header + items' : 'items only'})`);
            
            // Append to unmatched sheet (NOT to budget_items)
            if (unmatchedRows.length > 0) {
              console.log(`📤 Appending to ${unmatchedSheetName}...`);
              console.log(`  Data: ${unmatchedRows.length} rows`);
              if (unmatchedRows.length > 0) {
                console.log(`  First row cols: ${unmatchedRows[0]?.length || 0}`);
                console.log(`  First row sample:`, JSON.stringify(unmatchedRows[0]?.slice(0, 5)));
              }
              if (unmatchedRows.length > 1) {
                console.log(`  Second row sample:`, JSON.stringify(unmatchedRows[1]?.slice(0, 5)));
              }
              
              // If sheet just created, use PUT to write headers + first batch
              if (sheetJustCreated && unmatchedRows.length > 0) {
                console.log(`✍️ Using PUT (insert) for fresh sheet with header + data`);
                
                const putResponse = await fetch(
                  `${baseUrl}/values/${unmatchedSheetName}?valueInputOption=USER_ENTERED`,
                  {
                    method: 'PUT',
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      values: unmatchedRows,
                    }),
                  }
                );
                
                const putResult = await putResponse.json();
                console.log(`  PUT response: ${putResponse.status}`, putResult.updatedCells !== undefined ? `✅ Updated ${putResult.updatedCells} cells` : `❌ ${putResult.error?.message}`);
                
                if (putResponse.ok) {
                  appendCountUnmatched = unmatchedRows.length - 1; // All minus header
                  console.log(`✅ DONE: PUT ${unmatchedRows.length} rows (header + data) to ${unmatchedSheetName}`);
                } else {
                  const errorMsg = putResult?.error?.message || 'Unknown error';
                  console.error(`❌ PUT failed: ${errorMsg}`);
                  appendErrors.push(`Unmatched items PUT: ${errorMsg}`);
                }
              } else {
                // Sheet exists, use APPEND
                console.log(`📌 Using APPEND (existing sheet)`);
                
                const appendResponse = await fetch(
                  `${baseUrl}/values/${unmatchedSheetName}:append?valueInputOption=USER_ENTERED`,
                  {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      values: unmatchedRows,
                    }),
                  }
                );
                
                const appendResult = await appendResponse.json();
                console.log(`  APPEND response: ${appendResponse.status}`, appendResult.updates ? `✅ Success` : `❌ ${appendResult.error?.message}`);
                
                if (appendResponse.ok) {
                  appendCountUnmatched = unmatchedRows.length - (sheetJustCreated ? 1 : 0); // Exclude header if just created
                  console.log(`✅ DONE: APPENDED ${unmatchedRows.length} rows to ${unmatchedSheetName}`);
                } else {
                  const errorMsg = appendResult?.error?.message || 'Unknown error';
                  console.error(`❌ APPEND failed: ${errorMsg}`);
                  appendErrors.push(`Unmatched items: ${errorMsg}`);
                }
              }
            } else {
              console.log(`⚠️ No rows to append (unmatchedRows.length = 0)`);
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`❌ EXCEPTION in unmatched processing: ${errorMsg}`);
            appendErrors.push(`Unmatched error: ${errorMsg}`);
          }
        } else {
          console.log(`ℹ️ No unmatched items to process (unmatchedItemsArg.length = 0)`);
        }

        // Step 5: Update rpd_items dengan bulan updates dan auto-calc total_rpd + sisa_anggaran
        let rpdUpdateCount = 0;
        let rpdCreateCount = 0;
        const rpdUpdateErrors: string[] = [];
        
      
      if (body.rpdUpdates && Array.isArray(body.rpdUpdates) && body.rpdUpdates.length > 0) {
        console.log(`🔄 Step 4: Updating rpd_items with ${body.rpdUpdates.length} monthly values...`);
        
        try {
          // Read rpd_items sheet
          const rpdReadResponse = await fetch(
            `${baseUrl}/values/rpd_items`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          
          if (!rpdReadResponse.ok) {
            console.warn(`⚠️ Could not read rpd_items sheet, will create new ones if needed`);
          } 
          
          const rpdData = await rpdReadResponse.json();
          const rpdUpdateBatches: any[] = [];
          const rpdCreateRows: any[] = [];
          
          // Extract existing RPD item IDs
          const existingRpdIds = new Set<string>();
          const rpdRowMap = new Map<string, number>(); // ID -> row index (0-based)
          let rpdDataStartIndex = 1; // Assume header at row 0
          
          if (rpdData.values && rpdData.values.length > 0) {
            console.log(`📊 RPD sheet has ${rpdData.values.length} rows`);
            
            // Check if first row is header
            const firstRow = rpdData.values[0];
            let idIndex = 0;
            
            if (Array.isArray(firstRow) && firstRow.length > 0) {
              const firstCell = String(firstRow[0]).toLowerCase().trim();
              if (firstCell === 'id' || isNaN(parseFloat(firstCell))) {
                console.log(`📊 Header row detected`);
                rpdDataStartIndex = 1;
                // Find id column
                for (let i = 0; i < firstRow.length; i++) {
                  if (String(firstRow[i]).toLowerCase().trim() === 'id') {
                    idIndex = i;
                    break;
                  }
                }
              } else {
                console.log(`📊 No header row, treating as data`);
                rpdDataStartIndex = 0;
                idIndex = 0;
              }
            }
            
            // Build map of existing IDs
            for (let i = rpdDataStartIndex; i < rpdData.values.length; i++) {
              const row = rpdData.values[i];
              if (row && row.length > idIndex) {
                const rowId = String(row[idIndex] || '').trim();
                if (rowId) {
                  existingRpdIds.add(rowId);
                  rpdRowMap.set(rowId, i);
                }
              }
            }
            
            console.log(`📊 Found ${existingRpdIds.size} existing RPD items`);
          } else {
            console.log(`📊 RPD sheet is empty, will insert header and create all items`);
            
            // Insert header row first
            const headerRow = [
              'id', 'program_pembebanan', 'kegiatan', 'komponen_output', 'sub_komponen', 'akun', 'uraian',
              'total_pagu', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
              'total_rpd', 'sisa_anggaran', 'status', 'modified_by', 'modified_date'
            ];
            
            try {
              const headerResponse = await fetch(
                `${baseUrl}/values/rpd_items`,
                {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    values: [headerRow],
                    majorDimension: 'ROWS',
                  }),
                }
              );
              
              if (headerResponse.ok) {
                console.log(`✅ RPD header row created`);
                rpdDataStartIndex = 1; // Header at row 1, data starts at row 2
              } else {
                console.warn(`⚠️ Failed to create RPD header row`);
              }
            } catch (err) {
              console.warn(`⚠️ Error creating RPD header:`, err);
            }
          }
          
          // Process each rpd update
          for (const rpdUpdate of body.rpdUpdates) {
            const itemId = rpdUpdate.item.id;
            const bulanColumnLetter = rpdUpdate.bulanColumn; // 'I', 'J', etc.
            const periodeIni = rpdUpdate.periodeIni;  // Column 24: Monthly realization value (Periode Ini)
            const bulanNum = rpdUpdate.bulan; // 1-12
            const budgetItem = rpdUpdate.item;
            
            console.log(`  🔄 Processing: ${itemId}, bulan ${bulanNum}, periodeIni value ${periodeIni}`);
            
            if (existingRpdIds.has(itemId)) {
              // Item exists - update it
              const rpdRowIndex = rpdRowMap.get(itemId)! + 1; // Convert to 1-indexed for sheets
              
              console.log(`  ✓ Updating existing item at row ${rpdRowIndex}`);
              
              rpdUpdateBatches.push({
                range: `rpd_items!${bulanColumnLetter}${rpdRowIndex}`,
                values: [[periodeIni]],
              });
              
              rpdUpdateBatches.push({
                range: `rpd_items!U${rpdRowIndex}`,
                values: [[`=SUM(I${rpdRowIndex}:T${rpdRowIndex})` ]],
              });
              
              rpdUpdateBatches.push({
                range: `rpd_items!V${rpdRowIndex}`,
                values: [[`=H${rpdRowIndex}-U${rpdRowIndex}`]],
              });
              
              rpdUpdateCount++;
            } else {
              // New item - create it
              console.log(`  + Creating new RPD item`);
              
              // Build row: [id, program, kegiatan, komponen, sub_komponen, akun, uraian, total_pagu, jan-dec, total_rpd, sisa_anggaran, status, modified_by, modified_date]
              const normalizedSubKomponen = normalizeSubKomponenValue(budgetItem.sub_komponen || '');
              const rpdRow = [
                itemId,
                budgetItem.program_pembebanan || '',
                budgetItem.kegiatan || '',
                budgetItem.komponen_output || '',
                `'${normalizedSubKomponen}`, // Force sub_komponen as text with single quote
                budgetItem.akun || '',
                budgetItem.uraian || '',
                budgetItem.jumlah_menjadi || budgetItem.sisa_anggaran || 0, // total_pagu
              ];
              
              // Add 12 month columns (initially 0, filling in the one with data)
              for (let m = 1; m <= 12; m++) {
                rpdRow.push(m === bulanNum ? periodeIni : 0);
              }
              
              // Calculate the future row number when this will be appended
              // If rpd_items has header at row 1 and current data up to row N,
              // new rows will be appended starting at row N+1
              // Row number in sheet = rpdCreateRows.length + rpdDataStartIndex + 1
              const futureRowNum = rpdCreateRows.length + rpdDataStartIndex + 1;
              
              console.log(`  📍 Calculated future row number: ${futureRowNum} (createRows.length=${rpdCreateRows.length}, dataStartIndex=${rpdDataStartIndex})`);
              
              // total_rpd + sisa_anggaran + status + modified_by + modified_date
              rpdRow.push(
                `=SUM(I${futureRowNum}:T${futureRowNum})`, // total_rpd
                `=H${futureRowNum}-U${futureRowNum}`, // sisa_anggaran
                'new', // status
                '', // modified_by
                new Date().toISOString() // modified_date
              );
              
              rpdCreateRows.push(rpdRow);
              rpdCreateCount++;
            }
          }
          
          console.log(`📊 RPD Processing: ${rpdUpdateCount} updates, ${rpdCreateCount} creates from ${body.rpdUpdates.length} items`);
          
          // Send batch updates if any
          if (rpdUpdateBatches.length > 0) {
            console.log(`📤 Sending ${rpdUpdateBatches.length} RPD update batches...`);
            
            const rpdBatchResponse = await fetch(
              `${baseUrl}/values:batchUpdate`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  data: rpdUpdateBatches,
                  valueInputOption: 'USER_ENTERED',
                }),
              }
            );
            
            const rpdBatchResult = await rpdBatchResponse.json();
            if (!rpdBatchResponse.ok) {
              const errorMsg = rpdBatchResult?.error?.message || 'Unknown error';
              console.warn(`⚠️ RPD batch update failed:`, errorMsg);
              rpdUpdateErrors.push(`RPD batch update failed: ${errorMsg}`);
            } else {
              console.log(`✅ RPD batch updates sent successfully`);
            }
          }
          
          // Append new RPD items if any
          if (rpdCreateRows.length > 0) {
            console.log(`📤 Appending ${rpdCreateRows.length} new RPD items...`);
            
            const rpdAppendResponse = await fetch(
              `${baseUrl}/values/rpd_items:append`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  values: rpdCreateRows,
                  valueInputOption: 'RAW',
                  insertDataOption: 'INSERT_ROWS',
                }),
              }
            );
            
            const rpdAppendResult = await rpdAppendResponse.json();
            if (!rpdAppendResponse.ok) {
              const errorMsg = rpdAppendResult?.error?.message || 'Unknown error';
              console.warn(`⚠️ RPD append failed:`, errorMsg);
              rpdUpdateErrors.push(`RPD item creation failed: ${errorMsg}`);
            } else {
              console.log(`✅ RPD items appended successfully: ${rpdCreateCount} items`);
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.warn(`⚠️ RPD operation error (non-blocking):`, errorMsg);
          rpdUpdateErrors.push(`${errorMsg}`);
        }
      }
      
      console.log(`✅ RPD Step 5 complete: ${rpdUpdateCount} updated, ${rpdCreateCount} created`);
      
      // Return success - all data (matched and unmatched) is now appended to budget_items
      const successResponse = {
        success: true,
        matched_appended: appendCountMatched,
        unmatched_appended: appendCountUnmatched,
        total_matched: rowsToInsert.length,
        total_unmatched: unmatchedItemsArg.length,
        total_appended: appendCountMatched + appendCountUnmatched,
        rpd_updated: rpdUpdateCount,
        rpd_created: rpdCreateCount,
        total_requested: itemsToUpdate.length,
        total_processed: appendCountMatched + appendCountUnmatched,
        bulan,
        tahun,
        errors: appendErrors.length > 0 ? appendErrors.slice(0, 10) : undefined,
        rpd_errors: rpdUpdateErrors.length > 0 ? rpdUpdateErrors.slice(0, 10) : undefined,
      };

      // No more background async operations - everything is complete now
      console.log(`✅ All operations complete: ${appendCountMatched} matched + ${appendCountUnmatched} unmatched = ${appendCountMatched + appendCountUnmatched} total rows appended to ${mainSheetName}`);

      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      } catch (operationError) {
        const errorMsg = operationError instanceof Error ? operationError.message : String(operationError);
        console.error(`❌ Error in update-sisa-anggaran operation:`, errorMsg);
        console.error('Stack:', operationError instanceof Error ? operationError.stack : 'N/A');
        return new Response(JSON.stringify({
          error: errorMsg,
          operation: 'update-sisa-anggaran',
          timestamp: new Date().toISOString(),
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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
