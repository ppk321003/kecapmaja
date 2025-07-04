
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documentType, data } = await req.json()
    
    console.log('Received request for documentType:', documentType)
    console.log('Data keys:', Object.keys(data))

    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const privateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n')

    console.log('Service account email exists:', !!serviceAccountEmail)
    console.log('Private key exists:', !!privateKey)
    console.log('Private key length:', privateKey?.length || 0)

    if (!serviceAccountEmail || !privateKey) {
      console.error('Missing Google service account credentials')
      console.error('Service account email:', serviceAccountEmail ? 'EXISTS' : 'MISSING')
      console.error('Private key:', privateKey ? 'EXISTS' : 'MISSING')
      return new Response(
        JSON.stringify({ 
          error: 'Missing Google service account credentials',
          details: {
            serviceAccountEmail: !!serviceAccountEmail,
            privateKey: !!privateKey
          }
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create JWT token for Google Sheets API
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    }

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: serviceAccountEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    }

    console.log('Creating JWT with payload:', { iss: payload.iss, scope: payload.scope, aud: payload.aud })

    const headerEncoded = btoa(JSON.stringify(header)).replace(/[+/=]/g, (m) => ({ '+': '-', '/': '_', '=': '' })[m] || m)
    const payloadEncoded = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (m) => ({ '+': '-', '/': '_', '=': '' })[m] || m)

    let key
    try {
      // Clean up the private key format
      let cleanPrivateKey = privateKey
      if (!cleanPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        cleanPrivateKey = `-----BEGIN PRIVATE KEY-----\n${cleanPrivateKey}\n-----END PRIVATE KEY-----`
      }
      
      // Remove any extra whitespace and ensure proper line breaks
      cleanPrivateKey = cleanPrivateKey.replace(/\\n/g, '\n')
      
      console.log('Private key format check:', {
        hasBeginMarker: cleanPrivateKey.includes('-----BEGIN PRIVATE KEY-----'),
        hasEndMarker: cleanPrivateKey.includes('-----END PRIVATE KEY-----'),
        length: cleanPrivateKey.length
      })

      // Convert PEM to DER format for Web Crypto API
      const pemHeader = "-----BEGIN PRIVATE KEY-----"
      const pemFooter = "-----END PRIVATE KEY-----"
      const pemContents = cleanPrivateKey.substring(
        pemHeader.length,
        cleanPrivateKey.length - pemFooter.length
      ).replace(/\s/g, '')
      
      const binaryDer = atob(pemContents)
      const der = new Uint8Array(binaryDer.length)
      for (let i = 0; i < binaryDer.length; i++) {
        der[i] = binaryDer.charCodeAt(i)
      }

      key = await crypto.subtle.importKey(
        'pkcs8',
        der,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256',
        },
        false,
        ['sign']
      )
      console.log('Successfully imported private key')
    } catch (keyError) {
      console.error('Error importing private key:', keyError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to import private key', 
          details: keyError.message,
          keyFormat: 'Please ensure the private key is in proper PKCS#8 format'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    let signature
    try {
      signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        key,
        new TextEncoder().encode(`${headerEncoded}.${payloadEncoded}`)
      )
      console.log('Successfully created signature')
    } catch (signError) {
      console.error('Error creating signature:', signError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create JWT signature', 
          details: signError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/[+/=]/g, (m) => ({ '+': '-', '/': '_', '=': '' })[m] || m)

    const jwt = `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`
    console.log('JWT created successfully, length:', jwt.length)

    // Get access token
    console.log('Requesting access token from Google...')
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    })

    console.log('Token response status:', tokenResponse.status)
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token request failed:', errorText)
      console.error('Token response status:', tokenResponse.status)
      console.error('Token response headers:', Object.fromEntries(tokenResponse.headers.entries()))
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to get access token', 
          details: errorText,
          status: tokenResponse.status,
          troubleshooting: 'Check if service account email and private key are correct, and if the service account has proper permissions'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    console.log('Successfully obtained access token')

    // Prepare data for Google Sheets
    let rowData: (string | number)[] = []
    const timestamp = new Date().toISOString()

    if (documentType === 'KuitansiPerjalananDinas') {
      // Generate ID for Kuitansi
      const kuitansiId = `kui-${Date.now().toString().slice(-7)}`
      
      rowData = [
        kuitansiId,
        data.nomorSuratTugas || '',
        data.tanggalSuratTugas || '',
        data.namaPelaksana || '',
        data.tujuanPerjalanan || '',
        data.kabupatenKota || '',
        data.namaTempatTujuan || '',
        data.tanggalBerangkat || '',
        data.tanggalKembali || '',
        data.tanggalPengajuan || '',
        data._programNameMap?.[data.program] || data.program || '',
        data._kegiatanNameMap?.[data.kegiatan] || data.kegiatan || '',
        data._kroNameMap?.[data.kro] || data.kro || '',
        data._roNameMap?.[data.ro] || data.ro || '',
        data._komponenNameMap?.[data.komponen] || data.komponen || '',
        data._akunNameMap?.[data.akun] || data.akun || '',
        data.biayaTransport || '',
        data.biayaBBM || '',
        data.biayaPenginapan || '',
        data.jenisPerjalanan || ''
      ]

      // Add kecamatan details for "Dalam Kota"
      const kecamatanDetails = data.kecamatanDetails || []
      const maxKecamatan = 10
      
      for (let i = 0; i < maxKecamatan; i++) {
        if (i < kecamatanDetails.length) {
          const kec = kecamatanDetails[i]
          rowData.push(
            kec.nama || '',
            kec.tanggalBerangkat ? new Date(kec.tanggalBerangkat).toISOString().split('T')[0] : '',
            kec.tanggalKembali ? new Date(kec.tanggalKembali).toISOString().split('T')[0] : ''
          )
        } else {
          rowData.push('', '', '')
        }
      }
    } else {
      // Handle other document types
      console.log('Document type not specifically handled:', documentType)
      rowData = [timestamp, JSON.stringify(data)]
    }

    // Determine spreadsheet ID and range
    const spreadsheetId = '1OiWBe8jplhJQjy4pBV0o_GdcLR6a-bCbWCJGpHnKqAw'
    const range = `${documentType}!A1`

    console.log(`Appending data to ${range}:`, rowData.slice(0, 5), '... (truncated)')

    // Append data to Google Sheets
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [rowData]
        })
      }
    )

    console.log('Sheets API response status:', sheetsResponse.status)

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text()
      console.error('Sheets API error:', errorText)
      console.error('Sheets response status:', sheetsResponse.status)
      console.error('Sheets response headers:', Object.fromEntries(sheetsResponse.headers.entries()))
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to append to Google Sheets', 
          details: errorText,
          status: sheetsResponse.status,
          spreadsheetId,
          range,
          troubleshooting: 'Check if the service account has edit access to the Google Sheet'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = await sheetsResponse.json()
    console.log('Successfully appended to Google Sheets:', result)

    return new Response(
      JSON.stringify({ success: true, result }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in Google Sheets function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
