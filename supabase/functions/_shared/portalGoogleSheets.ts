declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

function base64UrlEncode(value: Uint8Array): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeJson(value: unknown): string {
  return base64UrlEncode(new TextEncoder().encode(JSON.stringify(value)));
}

export async function getAccessToken(): Promise<string> {
  const privateKeyValue = Deno.env.get('GOOGLE_PRIVATE_KEY') ?? '';
  const serviceAccountValue = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') ?? '';
  let privateKey = privateKeyValue;
  let serviceAccountEmail = serviceAccountValue;

  try {
    const credentials = privateKeyValue.includes('"type"')
      ? JSON.parse(privateKeyValue)
      : serviceAccountValue.includes('"type"')
        ? JSON.parse(serviceAccountValue)
        : null;
    if (credentials) {
      privateKey = credentials.private_key ?? '';
      serviceAccountEmail = credentials.client_email ?? '';
    }
  } catch {
    throw new Error('Google service account credentials are invalid.');
  }

  privateKey = privateKey.replace(/\\n/g, '\n');
  if (!privateKey || !serviceAccountEmail) {
    throw new Error('Google service account credentials are missing.');
  }

  const now = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    encodeJson({ alg: 'RS256', typ: 'JWT' }),
    encodeJson({
      iss: serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }),
  ].join('.');
  const pem = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const keyBytes = Uint8Array.from(atob(pem), (character) => character.charCodeAt(0));
  const signingKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    signingKey,
    new TextEncoder().encode(unsignedToken),
  ));
  const assertion = `${unsignedToken}.${base64UrlEncode(signature)}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error('Google access token request failed.');
  const tokenData = await response.json();
  if (typeof tokenData.access_token !== 'string') {
    throw new Error('Google did not return an access token.');
  }
  return tokenData.access_token;
}

export async function readGoogleSheetValues(
  spreadsheetId: string,
  range: string,
  accessToken: string,
): Promise<string[][]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) throw new Error(`Google Sheets read failed (${response.status}).`);
  const data = await response.json();
  if (data.error) throw new Error('Google Sheets returned a read error.');
  return Array.isArray(data.values)
    ? data.values.map((row: unknown[]) => row.map((cell) => String(cell ?? '')))
    : [];
}
