export async function googleToken() {
  let privateKey = Deno.env.get('GOOGLE_PRIVATE_KEY') || '';
  let email = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') || '';
  const full = privateKey.includes('"type"') ? privateKey : email.includes('"type"') ? email : null;
  if (full) { const json = JSON.parse(full); privateKey = json.private_key; email = json.client_email; }
  if (!privateKey || !email) throw new Error('Google credentials not configured');
  privateKey = privateKey.replace(/\\n/g, '\n');
  const encode = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const now = Math.floor(Date.now() / 1000);
  const token = `${encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${encode(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const keyData = Uint8Array.from(atob(privateKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', keyData, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(token)));
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${token}.${encode(String.fromCharCode(...signature))}` }) });
  if (!response.ok) throw new Error(`Google authentication failed (${response.status})`);
  return (await response.json()).access_token as string;
}
export const MEETING_SPREADSHEET = '1Chk-NyJHOKlrevAvtG8SJCDv6mCzk0Vd3c9Wn0QCP08';
export async function googleRequest(token: string, path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${MEETING_SPREADSHEET}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) { const text = await response.text(); console.error(`Google Sheets [${response.status}]: ${text}`); throw new Error(`Google Sheets [${response.status}]: ${text}`); }
  return response.json();
}
