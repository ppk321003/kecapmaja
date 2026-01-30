import { createServer } from 'http';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const googlePrivateKeyEnv = process.env.GOOGLE_PRIVATE_KEY;
const googleServiceAccountEmailEnv = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

if (!googlePrivateKeyEnv || !googleServiceAccountEmailEnv) {
  throw new Error('Environment variables GOOGLE_PRIVATE_KEY and GOOGLE_SERVICE_ACCOUNT_EMAIL must be set');
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetOperation {
  spreadsheetId: string;
  operation: 'read' | 'append' | 'update' | 'delete' | 'aggregate';
  range?: string;
  values?: any[][];
  rowIndex?: number;
}

async function getAccessToken() {
  console.log('Getting access token...');
  
  let privateKey: string;
  let serviceAccountEmail: string;
  
  // Try to parse as JSON first (if full service account JSON is provided)
  const googlePrivateKeyEnv = process.env.GOOGLE_PRIVATE_KEY;
  const googleServiceAccountEmailEnv = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  
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

// Dummy cache functions (replace with actual implementation)
const cache = new Map<string, { data: any, expiry: number }>();

async function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  return null;
}

async function setCachedData(key: string, data: any, ttl: number) {
  const expiry = Date.now() + ttl * 1000;
  cache.set(key, { data, expiry });
}

function aggregateData(values: any[][]) {
  // Simple aggregation: sum up the first column
  const sum = values.reduce((acc, row) => acc + (row[0] || 0), 0);
  return { sum };
}

const server = createServer(async (req, res) => {
  console.log('Google Sheets function invoked');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end('ok');
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        console.log('Request body:', JSON.stringify(data));
        
        const { spreadsheetId, operation, range, values, rowIndex }: SheetOperation = data;
        
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
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return;
        }

        if (operation === 'append') {
          console.log(`Appending to range: ${range || 'Sheet1'}`);
          console.log('Values to append:', JSON.stringify(values));
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
          console.log('Append response:', JSON.stringify(data));
          
          if (!response.ok) {
            console.error('Append failed:', data);
            throw new Error(`Append failed: ${JSON.stringify(data)}`);
          }
          
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return;
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
          
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return;
        }

        if (operation === 'delete' && rowIndex !== undefined) {
          console.log(`Deleting row ${rowIndex}`);
          const sheetId = 0; // Default sheet ID
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
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return;
        }

        if (operation === 'aggregate') {
          console.log(`Aggregating data for range: ${range || 'Sheet1'}`);

          // Check cache (if implemented)
          const cacheKey = `${spreadsheetId}-${range}`;
          const cachedData = await getCachedData(cacheKey);
          if (cachedData) {
            console.log('Cache hit for:', cacheKey);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            res.end(JSON.stringify(cachedData));
            return;
          }

          // Fetch data from Google Sheets
          const response = await fetch(`${baseUrl}/values/${range || 'Sheet1'}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const data = await response.json();

          if (!response.ok) {
            console.error('Aggregation failed:', data);
            throw new Error(`Aggregation failed: ${JSON.stringify(data)}`);
          }

          // Perform aggregation logic here
          const aggregatedData = aggregateData(data.values);

          // Cache the result (if caching is implemented)
          await setCachedData(cacheKey, aggregatedData, 600); // Cache for 10 minutes

          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(aggregatedData));
          return;
        }

        console.error('Invalid operation:', operation);
        res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid operation' }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Error in google-sheets function:', errorMessage);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorMessage }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
