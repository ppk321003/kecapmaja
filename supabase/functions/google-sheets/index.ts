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

        // Fetch spreadsheet metadata to get the sheetId for budget_items
        console.log('📊 Fetching spreadsheet metadata to get sheetId...');
        let mainSheetId = 0;
        try {
          const metadataResponse = await fetch(
            `${baseUrl.replace('/values', '')}`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          if (metadataResponse.ok) {
            const metadata = await metadataResponse.json();
            const sheet = metadata.sheets?.find((s: any) => s.properties.title === mainSheetName);
            if (sheet) {
              mainSheetId = sheet.properties.sheetId;
              console.log(`✓ Found sheetId for ${mainSheetName}: ${mainSheetId}`);
            } else {
              console.warn(`⚠️ Could not find sheet named "${mainSheetName}" in metadata`);
            }
          } else {
            console.warn(`⚠️ Could not fetch spreadsheet metadata`);
          }
        } catch (error) {
          console.warn(`⚠️ Error fetching spreadsheet metadata:`, error);
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
      let matchedCount = 0;
      let unmatchedCount = 0;
      let normalizedCount = 0;

      console.log(`🔍 Matching ${itemsToUpdate.length} items against ${rowMap.size} rows...`);
      itemsToUpdate.forEach((item: any, idx: number) => {
        // Create matching key from item - MUST match property names from BudgetItem interface
        const itemKey = [
          normalizeForMatching(item.program_pembebanan || item.program),
          normalizeForMatching(item.kegiatan),
          normalizeForMatching(item.rincian_output),
          normalizeForMatching(item.komponen_output),
          normalizeForMatching(item.sub_komponen),
          normalizeForMatching(item.akun),
          normalizeForMatching(item.uraian),
        ].join('|');

        const foundMatch = rowMap.get(itemKey);
        
        if (foundMatch) {
          // Update the row data with ALL columns from CSV item (not just sisa_anggaran)
          const newRow = [...foundMatch.data];
          
          // Map all available columns from CSV item to sheet columns
          headers.forEach((header: string, colIndex: number) => {
            const headerLower = header.toLowerCase();
            
            // Copy column values from CSV item where available
            if (headerLower === 'program_pembebanan') newRow[colIndex] = item.program_pembebanan || newRow[colIndex];
            else if (headerLower === 'kegiatan') newRow[colIndex] = item.kegiatan || newRow[colIndex];
            else if (headerLower === 'rincian_output') newRow[colIndex] = item.rincian_output || newRow[colIndex];
            else if (headerLower === 'komponen_output') newRow[colIndex] = item.komponen_output || newRow[colIndex];
            else if (headerLower === 'sub_komponen') {
              // Will be handled below with normalization
            } else if (headerLower === 'akun') newRow[colIndex] = item.akun || newRow[colIndex];
            else if (headerLower === 'uraian') newRow[colIndex] = item.uraian || newRow[colIndex];
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
          
          // Normalize sub_komponen to 3 digits with single quote prefix
          if (subKomponenIndex !== undefined && item.sub_komponen !== undefined && item.sub_komponen !== null && item.sub_komponen !== '') {
            try {
              const normalizedValue = normalizeSubKomponenValue(item.sub_komponen);
              newRow[subKomponenIndex] = `'${normalizedValue}`; // Add single quote for USER_ENTERED
              if (newRow[subKomponenIndex] !== item.sub_komponen && normalizedValue) {
                normalizedCount++;
              }
            } catch (e) {
              console.warn('Error normalizing sub_komponen for item:', item.uraian, e);
              // Keep original value if normalize fails
            }
          }

          updates.push({
            rowIndex: foundMatch.rowIndex,
            values: [newRow],
          });

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

      // Check if we have ANY items to process (matched or unmatched)
      const unmatchedItemsArg = (body.unmatchedItems || []) as any[];
      const hasAnyItems = updates.length > 0 || unmatchedItemsArg.length > 0;
      
      if (!hasAnyItems) {
        console.warn('⚠️  No items to process - both matched and unmatched are empty');
        return new Response(
          JSON.stringify({
            success: false,
            message: 'No items found to process (matched or unmatched)',
            matched: matchedCount,
            unmatched: unmatchedCount,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      if (updates.length === 0) {
        console.warn('⚠️  No matched items to update in main sheet - all items are unmatched');
        console.log(`   But ${unmatchedItemsArg.length} unmatched items will be appended to budget_items`);
      }

      // Step 3: Apply all updates to main sheet - WITH sub_komponen normalization
      let successCount = 0;
      const updateErrors: string[] = [];
      const BATCH_SIZE = 10; // Update 10 rows per batch

      console.log(`🔄 Updating main sheet (${mainSheetName}) with ${updates.length} rows (with sub_komponen normalization)...`);
      
      try {
        if (updates.length > 0) {
          // Sort updates by rowIndex for batch processing
          const sortedUpdates = [...updates].sort((a, b) => a.rowIndex - b.rowIndex);
          
          // Process in batches
          for (let batchIdx = 0; batchIdx < sortedUpdates.length; batchIdx += BATCH_SIZE) {
            const batch = sortedUpdates.slice(batchIdx, Math.min(batchIdx + BATCH_SIZE, sortedUpdates.length));
            
            try {
              // Build batchUpdate request using values:batchUpdate API (more reliable than updateCells)
              const dataBlocks = [];
              
              // Block 1: sub_komponen column with single quote prefix for text
              if (subKomponenIndex !== undefined) {
                const subKomponenData = batch.map(update => {
                  let rawValue = update.values[0][subKomponenIndex];
                  
                  // Remove single quote prefix if already present
                  if (typeof rawValue === 'string' && rawValue.startsWith("'")) {
                    rawValue = rawValue.substring(1);
                  }
                  
                  const normalizedValue = normalizeSubKomponenValue(rawValue);
                  console.log(`    Normalizing sub_komponen[${update.rowIndex}]: "${rawValue}" → "${normalizedValue}"`);
                  
                  return {
                    range: `${mainSheetName}!${indexToColumnLetter(subKomponenIndex)}${update.rowIndex}`,
                    values: [[`'${normalizedValue}`]], // Single quote prefix for text format
                  };
                });
                dataBlocks.push(...subKomponenData);
              }
              
              // Block 2: sisa_anggaran column
              const sisaAnggaranData = batch.map(update => ({
                range: `${mainSheetName}!${indexToColumnLetter(sisaAnggaranIndex)}${update.rowIndex}`,
                values: [[update.values[0][sisaAnggaranIndex]]],
              }));
              dataBlocks.push(...sisaAnggaranData);
              
              // Block 3: updated_date column (only if exists)
              if (updatedDateIndex !== undefined) {
                const updatedDateData = batch.map(update => ({
                  range: `${mainSheetName}!${indexToColumnLetter(updatedDateIndex)}${update.rowIndex}`,
                  values: [[update.values[0][updatedDateIndex]]],
                }));
                dataBlocks.push(...updatedDateData);
              }
              
              console.log(`  📤 Batch ${Math.floor(batchIdx / BATCH_SIZE) + 1}: sending ${dataBlocks.length} cell updates for ${batch.length} rows`);

              // Use values:batchUpdate with USER_ENTERED to interpret single quote as text
              const updateResponse = await fetch(
                `${baseUrl}/values:batchUpdate`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    data: dataBlocks,
                    valueInputOption: 'USER_ENTERED', // Interpret single quote as text
                  }),
                }
              );

              const updateResult = await updateResponse.json();
              
              if (updateResponse.ok) {
                successCount += batch.length;
                console.log(`  ✓ Batch ${Math.floor(batchIdx / BATCH_SIZE) + 1}: ${successCount}/${updates.length} rows updated`);
              } else {
                const errorMsg = updateResult?.error?.message || 'Unknown error';
                console.warn(`⚠️ Batch ${Math.floor(batchIdx / BATCH_SIZE) + 1} failed:`, errorMsg);
                batch.forEach(u => {
                  updateErrors.push(`Row ${u.rowIndex}: ${errorMsg}`);
                });
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.warn(`⚠️ Batch ${Math.floor(batchIdx / BATCH_SIZE) + 1} exception:`, errorMsg);
              batch.forEach(u => {
                updateErrors.push(`Row ${u.rowIndex}: ${errorMsg}`);
              });
            }

            // Small delay between batches to avoid rate limiting
            if ((batchIdx + BATCH_SIZE) < sortedUpdates.length) {
              await new Promise(r => setTimeout(r, 100));
            }
          }

          console.log(`✅ Update completed: ${successCount}/${updates.length} rows updated successfully`);
        }
      } catch (error) {
        console.error('❌ Critical error in batch update:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        updateErrors.push(`Critical error: ${errorMsg}`);
      }

      console.log(`✅ Update complete: ${successCount}/${updates.length} rows updated in main sheet`);

      // Step 4: Append unmatched items directly to budget_items (not to versioned sheet)
      let appendCount = 0;
      const appendErrors: string[] = [];
      const unmatchedItemsArg = (body.unmatchedItems || []) as any[];
      
      if (unmatchedItemsArg.length > 0) {
        console.log(`📥 Appending ${unmatchedItemsArg.length} unmatched items directly to ${mainSheetName}...`);
        
        try {
          // Build rows for append (same structure as budget_items headers)
          const appendRows: any[][] = [];
          
          unmatchedItemsArg.forEach((unmatchedItem: any, itemIdx: number) => {
            // Create a row array in the same order as headers
            const appendRow: any[] = [];
            headers.forEach((header: string) => {
              const headerLower = header.toLowerCase();
              // Map fields to header - COPY ALL COLUMNS just like matched items
              if (headerLower === 'id') appendRow.push(unmatchedItem.id || '');
              else if (headerLower === 'program_pembebanan') appendRow.push(unmatchedItem.program_pembebanan || '');
              else if (headerLower === 'kegiatan') appendRow.push(unmatchedItem.kegiatan || '');
              else if (headerLower === 'rincian_output') appendRow.push(unmatchedItem.rincian_output || '');
              else if (headerLower === 'komponen_output') appendRow.push(unmatchedItem.komponen_output || '');
              else if (headerLower === 'sub_komponen') {
                // Normalize sub_komponen with single quote
                if (unmatchedItem.sub_komponen !== undefined && unmatchedItem.sub_komponen !== null && unmatchedItem.sub_komponen !== '') {
                  const normalized = normalizeSubKomponenValue(unmatchedItem.sub_komponen || '');
                  appendRow.push(`'${normalized || ''}`);
                } else {
                  appendRow.push('');
                }
              }
              else if (headerLower === 'akun') appendRow.push(unmatchedItem.akun || '');
              else if (headerLower === 'uraian') appendRow.push(unmatchedItem.uraian || '');
              else if (headerLower === 'volume_semula') appendRow.push(unmatchedItem.volume_semula !== undefined ? unmatchedItem.volume_semula : 0);
              else if (headerLower === 'satuan_semula') appendRow.push(unmatchedItem.satuan_semula || '');
              else if (headerLower === 'harga_satuan_semula') appendRow.push(unmatchedItem.harga_satuan_semula !== undefined ? unmatchedItem.harga_satuan_semula : 0);
              else if (headerLower === 'jumlah_semula') appendRow.push(unmatchedItem.jumlah_semula !== undefined ? unmatchedItem.jumlah_semula : 0);
              else if (headerLower === 'volume_menjadi') appendRow.push(unmatchedItem.volume_menjadi !== undefined ? unmatchedItem.volume_menjadi : 1);
              else if (headerLower === 'satuan_menjadi') appendRow.push(unmatchedItem.satuan_menjadi || '');
              else if (headerLower === 'harga_satuan_menjadi') appendRow.push(unmatchedItem.harga_satuan_menjadi !== undefined ? unmatchedItem.harga_satuan_menjadi : 0);
              else if (headerLower === 'jumlah_menjadi') appendRow.push(unmatchedItem.jumlah_menjadi !== undefined ? unmatchedItem.jumlah_menjadi : 0);
              else if (headerLower === 'selisih') appendRow.push(unmatchedItem.selisih !== undefined ? unmatchedItem.selisih : 0);
              else if (headerLower === 'sisa_anggaran') appendRow.push(unmatchedItem.sisa_anggaran !== undefined ? unmatchedItem.sisa_anggaran : 0);
              else if (headerLower === 'blokir') appendRow.push(unmatchedItem.blokir !== undefined ? unmatchedItem.blokir : 0);
              else if (headerLower === 'status') appendRow.push(unmatchedItem.status || 'new');
              else if (headerLower === 'approved_by') appendRow.push(unmatchedItem.approved_by || '');
              else if (headerLower === 'approved_date') appendRow.push(unmatchedItem.approved_date || '');
              else if (headerLower === 'rejected_date') appendRow.push(unmatchedItem.rejected_date || '');
              else if (headerLower === 'submitted_by') appendRow.push(unmatchedItem.submitted_by || 'import');
              else if (headerLower === 'submitted_date') appendRow.push(unmatchedItem.submitted_date || '');
              else if (headerLower === 'updated_date') appendRow.push(unmatchedItem.updated_date !== undefined ? unmatchedItem.updated_date : new Date().toISOString());
              else if (headerLower === 'notes') appendRow.push(unmatchedItem.notes || '');
              else if (headerLower === 'catatan_ppk') appendRow.push(unmatchedItem.catatan_ppk || '');
              else appendRow.push(''); // Unknown columns
            });
            
            appendRows.push(appendRow);
            if ((itemIdx + 1) % 100 === 0) {
              console.log(`  Prepared ${itemIdx + 1}/${unmatchedItemsArg.length} rows for append`);
            }
          });
          
          console.log(`✓ Prepared ${appendRows.length} rows for append to ${mainSheetName}`);
          
          // Append to main sheet
          if (appendRows.length > 0) {
            const appendResponse = await fetch(
              `${baseUrl}/values/${mainSheetName}:append?valueInputOption=USER_ENTERED`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  values: appendRows,
                }),
              }
            );
            
            const appendResult = await appendResponse.json();
            if (appendResponse.ok) {
              appendCount = appendRows.length;
              console.log(`✅ Appended ${appendCount} unmatched items to ${mainSheetName}`);
            } else {
              const errorMsg = appendResult?.error?.message || 'Unknown error';
              console.warn(`⚠️ Failed to append unmatched items:`, errorMsg);
              appendErrors.push(errorMsg);
            }
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('❌ Error appending unmatched items:', errorMsg);
          appendErrors.push(errorMsg);
        }
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
      
      // Return success - all data (matched, updated, and appended) is now in budget_items
      const successResponse = {
        success: true,
        matched: matchedCount,
        updated: successCount,
        appended: appendCount,
        unmatched: unmatchedCount,
        rpd_updated: rpdUpdateCount,
        rpd_created: rpdCreateCount,
        total_requested: itemsToUpdate.length,
        total_processed: matchedCount + unmatchedCount,
        bulan,
        tahun,
        errors: updateErrors.length > 0 ? updateErrors.slice(0, 10) : undefined,
        append_errors: appendErrors.length > 0 ? appendErrors.slice(0, 10) : undefined,
        rpd_errors: rpdUpdateErrors.length > 0 ? rpdUpdateErrors.slice(0, 10) : undefined,
      };

      // No more background async operations - everything is complete now
      console.log(`✅ All operations complete: ${matchedCount} matched + ${appendCount} appended = ${matchedCount + appendCount} total rows in ${mainSheetName}`);

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
