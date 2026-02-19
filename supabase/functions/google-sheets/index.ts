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

// Normalize sub_komponen value to 3-digit format with text prefix
// Handles both plain numbers (051) and with program suffix (051_GG)
function normalizeSubKomponenValue(value: any): string {
  if (!value) return '';
  
  const str = String(value).trim();
  
  // If it already has program suffix like "051_GG", keep it as-is with quote prefix
  if (str.includes('_')) {
    return `'${str}`;
  }
  
  // If it's just digits, pad to 3
  if (/^\d+$/.test(str)) {
    // Add single quote prefix to force Google Sheets to treat as text
    return `'${str.padStart(3, '0')}`;
  }
  
  // If it has format like "52.0A", normalize the numeric part
  const match = str.match(/^(\d+)(\..*)?$/);
  if (match) {
    const numPart = match[1].padStart(3, '0');
    const suffix = match[2] || '';
    return `'${numPart}${suffix}`;
  }
  
  return `'${str}`;
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

// Async background function to update versioned sheet (doesn't block response)
async function updateVersionedSheetAsync(versionedSheetName: string, versionedRows: any[][], accessToken: string, baseUrl: string) {
  console.log(`🔄 [ASYNC] Starting versioned sheet update: ${versionedSheetName} with ${versionedRows.length} rows`);
  
  try {
    // Step 1: Create versioned sheet if not exists
    let versionedSheetId = 0;
    try {
      const createSheetResponse = await fetch(`${baseUrl}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            addSheet: {
              properties: { title: versionedSheetName },
            },
          }],
        }),
      });
      const createSheetResult = await createSheetResponse.json();
      if (createSheetResult.replies?.[0]?.addSheet?.properties?.sheetId !== undefined) {
        versionedSheetId = createSheetResult.replies[0].addSheet.properties.sheetId;
        console.log(`✓ [ASYNC] Versioned sheet created with ID: ${versionedSheetId}`);
      }
    } catch (error) {
      console.warn(`⚠️ [ASYNC] Could not create versioned sheet (may exist):`, error);
    }

    // Step 2: Write data to versioned sheet
    if (versionedRows.length > 0) {
      const writeVersionResponse = await fetch(
        `${baseUrl}/values/${versionedSheetName}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: versionedRows }),
        }
      );
      if (writeVersionResponse.ok) {
        console.log(`✓ [ASYNC] Versioned sheet '${versionedSheetName}' written with ${versionedRows.length} rows`);
      } else {
        console.warn(`⚠️ [ASYNC] Failed to write versioned sheet:`, writeVersionResponse.status);
      }
    }
  } catch (error) {
    console.warn(`⚠️ [ASYNC] Versioned sheet error (non-blocking):`, error);
  }
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
      
      try {
        const { values: itemsToUpdate, bulan, tahun } = body;
        
        if (!itemsToUpdate || !Array.isArray(itemsToUpdate)) {
          throw new Error('values must be an array of items');
        }

        const monthStr = String(bulan).padStart(2, '0');
        const versionedSheetName = `budget_items_${tahun}${monthStr}`;
        
        console.log(`Processing ${itemsToUpdate.length} items for bulan=${bulan}, tahun=${tahun}`);
        console.log(`Will create versioned sheet: ${versionedSheetName}`);

        // Read budget_items sheet to find matching rows
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
      console.log('   Headers:', headers.join(' | '));
      
      const sisaAnggaranIndex = headerIndexes['sisa_anggaran'];
      const updatedDateIndex = headerIndexes['updated_date'];

      if (sisaAnggaranIndex === undefined) {
        throw new Error('sisa_anggaran column not found in budget_items sheet');
      }

      console.log(`✓ Header map built:`, Object.keys(headerIndexes).slice(0, 10).join(', '), '...');
      console.log(`  sisaAnggaranIndex: ${sisaAnggaranIndex}, updatedDateIndex: ${updatedDateIndex}`);

      const subKomponenIndex = headerIndexes['sub_komponen'];
      console.log(`  subKomponenIndex: ${subKomponenIndex}`);

      if (subKomponenIndex === undefined) {
        console.warn('⚠️  sub_komponen column not found, will skip normalization');
      }
      console.log('📊 Building row map for faster matching...');
      const rowMap = new Map<string, {rowIndex: number, data: any[]}>();
      
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
        
        rowMap.set(sheetKey, { rowIndex: rowIndex + 1, data: sheetRow });

        if ((rowIndex) % 100 === 0) {
          console.log(`Indexed ${rowIndex} rows...`);
        }
      }
      
      console.log(`✓ Row map built with ${rowMap.size} entries`);

      // Find matching rows and prepare updates
      const updates: { rowIndex: number; values: any[] }[] = [];
      const versionedRows: any[][] = [headers]; // Start with headers
      let matchedCount = 0;
      let unmatchedCount = 0;
      let normalizedCount = 0;

      console.log(`🔍 Matching ${itemsToUpdate.length} items against ${rowMap.size} rows...`);
      itemsToUpdate.forEach((item: any, idx: number) => {
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

        const foundMatch = rowMap.get(itemKey);
        
        if (foundMatch) {
          // Update the row data
          const newRow = [...foundMatch.data];
          newRow[sisaAnggaranIndex] = item.sisa_anggaran;
          
          // Normalize sub_komponen to 3 digits if column exists
          if (subKomponenIndex !== undefined && item.sub_komponen !== undefined && item.sub_komponen !== null && item.sub_komponen !== '') {
            try {
              const originalValue = newRow[subKomponenIndex];
              const normalizedValue = normalizeSubKomponenValue(item.sub_komponen);
              newRow[subKomponenIndex] = normalizedValue;
              if (originalValue !== normalizedValue && normalizedValue) {
                normalizedCount++;
              }
            } catch (e) {
              console.warn('Error normalizing sub_komponen for item:', item.uraian, e);
              // Keep original value if normalize fails
            }
          }
          
          if (updatedDateIndex !== undefined) {
            newRow[updatedDateIndex] = item.updated_date;
          }

          updates.push({
            rowIndex: foundMatch.rowIndex,
            values: [newRow],
          });

          // Also save for versioned sheet
          versionedRows.push(newRow);

          matchedCount++;
          
          if ((idx + 1) % 100 === 0) {
            console.log(`Matched ${idx + 1}/${itemsToUpdate.length} items...`);
          }
        } else {
          unmatchedCount++;
        }
      });

      console.log(`✅ Matching complete: ${matchedCount} matched, ${unmatchedCount} unmatched out of ${itemsToUpdate.length}`);
      console.log(`✅ Sub_komponen normalized: ${normalizedCount} items`);
      console.log(`✅ Column index for sub_komponen: ${subKomponenIndex} (header: '${headers[subKomponenIndex] || 'NOT FOUND'}')`);
      console.log(`✅ Column index for sisa_anggaran: ${sisaAnggaranIndex} (header: '${headers[sisaAnggaranIndex] || 'NOT FOUND'}')`);
      
      if (updates.length > 0) {
        console.log('📋 Sample update [0]:', {
          rowIndex: updates[0].rowIndex,
          subKomponenValue: updates[0].values[0][subKomponenIndex],
          sisaAnggaranValue: updates[0].values[0][sisaAnggaranIndex],
          firstValues: updates[0].values[0].slice(0, 10),
        });
      }

      if (updates.length === 0) {
        console.warn('⚠️  No updates to apply - all items unmatched');
        return new Response(
          JSON.stringify({
            success: false,
            message: 'No matching items found',
            matched: matchedCount,
            unmatched: unmatchedCount,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Add unmatched items to versioned sheet as NEW rows
      const unmatchedItemsArg = (body.unmatchedItems || []) as any[];
      if (unmatchedItemsArg.length > 0) {
        console.log(`📝 Adding ${unmatchedItemsArg.length} unmatched items to versioned sheet (${versionedRows.length} total rows after this)...`);
        
        try {
          unmatchedItemsArg.forEach((unmatchedItem: any, itemIdx: number) => {
            // Create a row array in the same order as headers
            const unmatchedRow: any[] = [];
            headers.forEach((header: string) => {
              const headerLower = header.toLowerCase();
              // Map fields to header
              if (headerLower === 'id') unmatchedRow.push(unmatchedItem.id || '');
              else if (headerLower === 'program_pembebanan') unmatchedRow.push(unmatchedItem.program_pembebanan || '');
              else if (headerLower === 'kegiatan') unmatchedRow.push(unmatchedItem.kegiatan || '');
              else if (headerLower === 'rincian_output') unmatchedRow.push(unmatchedItem.rincian_output || '');
              else if (headerLower === 'komponen_output') unmatchedRow.push(unmatchedItem.komponen_output || '');
              else if (headerLower === 'sub_komponen') {
                // Normalize sub_komponen to 3 digits
                if (unmatchedItem.sub_komponen !== undefined && unmatchedItem.sub_komponen !== null && unmatchedItem.sub_komponen !== '') {
                  const normalized = normalizeSubKomponenValue(unmatchedItem.sub_komponen || '');
                  unmatchedRow.push(normalized || '');
                } else {
                  unmatchedRow.push('');
                }
              } else if (headerLower === 'akun') unmatchedRow.push(unmatchedItem.akun || '');
              else if (headerLower === 'uraian') unmatchedRow.push(unmatchedItem.uraian || '');
              else if (headerLower === 'volume_semula') unmatchedRow.push(unmatchedItem.volume_semula || 1);
              else if (headerLower === 'satuan_semula') unmatchedRow.push(unmatchedItem.satuan_semula || '');
              else if (headerLower === 'harga_satuan_semula') unmatchedRow.push(unmatchedItem.harga_satuan_semula || 0);
              else if (headerLower === 'jumlah_semula') unmatchedRow.push(unmatchedItem.jumlah_semula || 0);
              else if (headerLower === 'volume_menjadi') unmatchedRow.push(unmatchedItem.volume_menjadi || 1);
              else if (headerLower === 'satuan_menjadi') unmatchedRow.push(unmatchedItem.satuan_menjadi || '');
              else if (headerLower === 'harga_satuan_menjadi') unmatchedRow.push(unmatchedItem.harga_satuan_menjadi || 0);
              else if (headerLower === 'jumlah_menjadi') unmatchedRow.push(unmatchedItem.jumlah_menjadi || 0);
              else if (headerLower === 'selisih') unmatchedRow.push(unmatchedItem.selisih || 0);
              else if (headerLower === 'sisa_anggaran') unmatchedRow.push(unmatchedItem.sisa_anggaran || 0);
              else if (headerLower === 'blokir') unmatchedRow.push(unmatchedItem.blokir || 0);
              else if (headerLower === 'status') unmatchedRow.push(unmatchedItem.status || 'new');
              else if (headerLower === 'approved_by') unmatchedRow.push(unmatchedItem.approved_by || '');
              else if (headerLower === 'approved_date') unmatchedRow.push(unmatchedItem.approved_date || '');
              else if (headerLower === 'rejected_date') unmatchedRow.push(unmatchedItem.rejected_date || '');
              else if (headerLower === 'submitted_by') unmatchedRow.push(unmatchedItem.submitted_by || 'import');
              else if (headerLower === 'submitted_date') unmatchedRow.push(unmatchedItem.submitted_date || '');
              else if (headerLower === 'updated_date') unmatchedRow.push(unmatchedItem.updated_date || '');
              else if (headerLower === 'notes') unmatchedRow.push(unmatchedItem.notes || '');
              else if (headerLower === 'catatan_ppk') unmatchedRow.push(unmatchedItem.catatan_ppk || '');
              else unmatchedRow.push(''); // Unknown columns get empty
            });
            
            versionedRows.push(unmatchedRow);
            if ((itemIdx + 1) % 5 === 0) {
              console.log(`  Added ${itemIdx + 1}/${unmatchedItemsArg.length} unmatched items`);
            }
          });
          
          console.log(`✓ Added ${unmatchedItemsArg.length} unmatched items, versioned sheet now has ${versionedRows.length} rows total`);
        } catch (error) {
          console.error('Error preparing unmatched items:', error);
          throw new Error(`Error preparing unmatched items: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Step 1: Create versioned sheet with matched data
      console.log(`📊 Creating versioned sheet: ${versionedSheetName}...`);
      let versionedSheetId = 0;
      try {
        const createSheetResponse = await fetch(
          `${baseUrl}:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [{
                addSheet: {
                  properties: {
                    title: versionedSheetName,
                  },
                },
              }],
            }),
          }
        );
        const createSheetResult = await createSheetResponse.json();
        if (createSheetResponse.ok && createSheetResult.replies?.[0]?.addSheet?.properties?.sheetId !== undefined) {
          versionedSheetId = createSheetResult.replies[0].addSheet.properties.sheetId;
          console.log(`✓ Versioned sheet created with ID: ${versionedSheetId}`);
        } else {
          console.warn(`⚠️ Could not create new versioned sheet (may already exist). Trying to clear existing...`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not create versioned sheet (may already exist):`, error);
      }

      // Step 2: Write data to versioned sheet (truncate and rewrite)
      if (versionedRows.length > 0) {
        console.log(`📝 Writing ${versionedRows.length} rows to versioned sheet...`);
        try {
          // First, clear existing data in versioned sheet
          if (versionedSheetId) {
            console.log('Clearing existing data in versioned sheet...');
            const clearResponse = await fetch(
              `${baseUrl}:batchUpdate`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  requests: [{
                    updateCells: {
                      range: {
                        sheetId: versionedSheetId,
                      },
                      fields: 'userEnteredValue',
                    },
                  }],
                }),
              }
            );
            console.log('Clear response:', clearResponse.status);
          }

          const writeVersionResponse = await fetch(
            `${baseUrl}/values/${versionedSheetName}?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ values: versionedRows }),
            }
          );
          const writeVersionResult = await writeVersionResponse.json();
          if (writeVersionResponse.ok) {
            console.log(`✓ Versioned sheet updated with ${versionedRows.length} rows`);
          } else {
            console.error(`✗ Failed to write versioned sheet:`, writeVersionResult);
            console.warn(`⚠️  Continuing despite versioned sheet write error...`);
          }
        } catch (error) {
          console.error('❌ Error writing versioned sheet:', error);
          console.warn(`⚠️  Continuing despite versioned sheet error to apply main sheet updates...`);
        }
      }

      // Step 3: Apply updates to main sheet with period-based overwrite (Hybrid Approach)
      // Delete only rows matching this period, keep other periods intact
      let successCount = 0;
      let deletedRowCount = 0;
      const updateErrors: string[] = [];
      const submittedDateIndex = headerIndexes['submitted_date'];

      console.log(`🔄 Step 3: Updated main sheet (${mainSheetName}) - overwriting only ${monthStr}/${tahun} period data...`);
      
      try {
        // Step 3a: Identify rows to delete (matching this period)
        const rowsToDelete: number[] = [];
        const periodDateFilter = `${tahun}-${monthStr}`;
        const itemKeysInThisUpload = new Set<string>();
        
        // Build set of all 7-field keys from items being uploaded (for matching)
        itemsToUpdate.forEach(item => {
          const itemKey = [
            normalizeForMatching(item.program),
            normalizeForMatching(item.kegiatan),
            normalizeForMatching(item.rincian_output),
            normalizeForMatching(item.komponen_output),
            normalizeForMatching(item.sub_komponen),
            normalizeForMatching(item.akun),
            normalizeForMatching(item.uraian),
          ].join('|');
          itemKeysInThisUpload.add(itemKey);
        });
        
        console.log(`🔍 Identifying rows to delete using ${itemKeysInThisUpload.size} item keys from this upload...`);
        
        if (submittedDateIndex !== undefined) {
          // Strategy 1: Delete by submitted_date match
          for (let rowIndex = 1; rowIndex < readData.values.length; rowIndex++) {
            const sheetRow = readData.values[rowIndex];
            const submittedDate = sheetRow[submittedDateIndex];
            
            if (submittedDate && String(submittedDate).startsWith(periodDateFilter)) {
              rowsToDelete.push(rowIndex); // Store 0-based index
            }
          }
          console.log(`  By submitted_date: Found ${rowsToDelete.length} rows with period ${monthStr}/${tahun}`);
        } else {
          console.warn(`⚠️ submitted_date column not found, will use 7-field key matching for deletion`);
        }
        
        // Strategy 2: Fallback - Also delete rows matching item keys from this upload
        // (in case submitted_date not set or empty)
        const additionalRowsToDelete: number[] = [];
        for (let rowIndex = 1; rowIndex < readData.values.length; rowIndex++) {
          // Skip if already marked for deletion
          if (rowsToDelete.includes(rowIndex)) continue;
          
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
          
          // If this row key matches any item in current upload, mark for deletion
          if (itemKeysInThisUpload.has(sheetKey)) {
            additionalRowsToDelete.push(rowIndex);
          }
        }
        
        if (additionalRowsToDelete.length > 0) {
          console.log(`  By 7-field key match: Found ${additionalRowsToDelete.length} additional rows matching items in this upload`);
          rowsToDelete.push(...additionalRowsToDelete);
        }
        
        // Remove duplicates and sort in reverse
        const uniqueRowsToDelete = Array.from(new Set(rowsToDelete)).sort((a, b) => b - a);
        console.log(`🗑️ Total rows marked for deletion: ${uniqueRowsToDelete.length}`);
        
        if (uniqueRowsToDelete.length > 0) {
          console.log(`  Rows to delete (0-based indices): ${uniqueRowsToDelete.join(', ')}`);
        }

        // Step 3b: Delete matching period rows from main sheet (in reverse order to maintain indices)
        if (uniqueRowsToDelete.length > 0) {
          // Get main sheet ID first
          const sheetsResponse = await fetch(
            `${baseUrl}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const sheetsData = await sheetsResponse.json();
          const mainSheetId = sheetsData.sheets?.[0]?.properties?.sheetId || 0;
          
          // Delete rows in reverse order to maintain indices
          for (let i = 0; i < uniqueRowsToDelete.length; i++) {
            const rowIndexToDelete = uniqueRowsToDelete[i];
            
            try {
              const deleteResponse = await fetch(
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
                          sheetId: mainSheetId,
                          dimension: 'ROWS',
                          startIndex: rowIndexToDelete,
                          endIndex: rowIndexToDelete + 1,
                        },
                      },
                    }],
                  }),
                }
              );
              
              if (!deleteResponse.ok) {
                console.warn(`⚠️ Failed to delete row ${rowIndexToDelete + 1}, continuing...`);
              } else {
                deletedRowCount++;
              }
            } catch (error) {
              console.warn(`⚠️ Error deleting row ${rowIndexToDelete + 1}:`, error);
            }
          }
          
          console.log(`✓ Deleted ${deletedRowCount}/${uniqueRowsToDelete.length} old rows for period ${monthStr}/${tahun}`);
        }

        // Step 3c: Append new rows from this upload - with submitted_date set for future deletion
        if (updates.length > 0) {
          // Prepare new rows and ensure submitted_date is set for period matching
          const newRows = updates.map(u => {
            const row = [...u.values[0]];
            // Set submitted_date to this period (YYYY-MM-01) if not already set
            if (submittedDateIndex !== undefined) {
              const submittedDate = `${tahun}-${monthStr}-01`;
              row[submittedDateIndex] = submittedDate;
              console.log(`  Setting submitted_date[${submittedDateIndex}] = ${submittedDate}`);
            }
            return row;
          });
          
          console.log(`📝 Appending ${newRows.length} rows with submitted_date = ${tahun}-${monthStr}-01...`);
          
          const appendResponse = await fetch(
            `${baseUrl}/values/${mainSheetName}:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ values: newRows }),
            }
          );
          
          const appendResult = await appendResponse.json();
          
          if (appendResponse.ok) {
            successCount = updates.length;
            console.log(`✅ Appended ${updates.length} new rows for period ${monthStr}/${tahun} with submitted_date set`);
          } else {
            const errorMsg = appendResult?.error?.message || 'Unknown error';
            console.error(`❌ Append failed:`, errorMsg);
            throw new Error(`Append failed: ${errorMsg}`);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('❌ Critical error in main sheet update:', errorMsg);
        updateErrors.push(`Critical error: ${errorMsg}`);
        throw error;
      }

      if (updateErrors.length === 0) {
        console.log(`✅ Main sheet update complete: ${deletedRowCount} rows deleted, ${successCount}/${updates.length} new rows added`);
      }
      
      // Step 4: Update rpd_items dengan bulan updates dan auto-calc total_rpd + sisa_anggaran
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
            const periodeIni = rpdUpdate.periodeIni;  // Column 24: Monthly realization value
            const bulanNum = rpdUpdate.bulan; // 1-12
            const budgetItem = rpdUpdate.item;
            
            console.log(`  🔄 Processing: ${itemId}, bulan ${bulanNum}, periodeIni ${periodeIni}`);
            
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
              const rpdRow = [
                itemId,
                budgetItem.program_pembebanan || '',
                budgetItem.kegiatan || '',
                budgetItem.komponen_output || '',
                budgetItem.sub_komponen || '',
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
      
      console.log(`✅ RPD Step 4 complete: ${rpdUpdateCount} updated, ${rpdCreateCount} created`);
      
      // Return success immediately - main sheet is updated successfully
      // Versioned sheet operations are secondary and shouldn't block response
      const successResponse = {
        success: true,
        matched: matchedCount,
        updated: successCount,
        rpd_updated: rpdUpdateCount,
        rpd_created: rpdCreateCount,
        total_requested: itemsToUpdate.length,
        bulan,
        tahun,
        versioned_sheet: versionedSheetName,
        errors: updateErrors.length > 0 ? updateErrors.slice(0, 10) : undefined,
        rpd_errors: rpdUpdateErrors.length > 0 ? rpdUpdateErrors.slice(0, 10) : undefined,
      };

      // Start versioned sheet operations in background (don't await, don't block response)
      if (unmatchedItemsArg.length > 0 || matchedCount > 0) {
        console.log(`📊 Starting background versioned sheet operations (${versionedSheetName})...`);
        // This runs after we return but won't block the client
        updateVersionedSheetAsync(versionedSheetName, versionedRows, accessToken, baseUrl)
          .catch(err => {
            console.warn(`⚠️ Versioned sheet background operation error (non-blocking):`, err);
          });
      }

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
