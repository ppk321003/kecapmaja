
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== Google Sheets Function Started ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Parsing Request Body ===')
    let requestBody
    try {
      requestBody = await req.json()
      console.log('Request body parsed successfully')
      console.log('Document type:', requestBody.documentType)
      console.log('Data keys:', requestBody.data ? Object.keys(requestBody.data) : 'No data')
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { documentType, data } = requestBody

    if (!documentType) {
      console.error('Missing documentType in request')
      return new Response(
        JSON.stringify({ 
          error: 'Missing documentType parameter'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!data) {
      console.error('Missing data in request')
      return new Response(
        JSON.stringify({ 
          error: 'Missing data parameter'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('=== Checking Environment Variables ===')
    const serviceAccountEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const privateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')

    console.log('Service account email exists:', !!serviceAccountEmail)
    console.log('Service account email value:', serviceAccountEmail ? serviceAccountEmail.substring(0, 20) + '...' : 'MISSING')
    console.log('Private key exists:', !!privateKey)
    console.log('Private key length:', privateKey?.length || 0)

    if (!serviceAccountEmail || !privateKey) {
      console.error('Missing Google service account credentials')
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

    console.log('=== Creating JWT Token ===')
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

    console.log('JWT payload created:', { 
      iss: payload.iss, 
      scope: payload.scope, 
      aud: payload.aud,
      exp: payload.exp,
      iat: payload.iat
    })

    const headerEncoded = btoa(JSON.stringify(header)).replace(/[+/=]/g, (m) => ({ '+': '-', '/': '_', '=': '' })[m] || m)
    const payloadEncoded = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (m) => ({ '+': '-', '/': '_', '=': '' })[m] || m)

    console.log('=== Processing Private Key ===')
    let key
    try {
      // Clean up the private key format
      let cleanPrivateKey = privateKey.replace(/\\n/g, '\n')
      
      if (!cleanPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        cleanPrivateKey = `-----BEGIN PRIVATE KEY-----\n${cleanPrivateKey}\n-----END PRIVATE KEY-----`
      }
      
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
      
      console.log('PEM contents length:', pemContents.length)
      
      const binaryDer = atob(pemContents)
      const der = new Uint8Array(binaryDer.length)
      for (let i = 0; i < binaryDer.length; i++) {
        der[i] = binaryDer.charCodeAt(i)
      }

      console.log('DER conversion completed, length:', der.length)

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
      console.error('Key error details:', {
        name: keyError.name,
        message: keyError.message,
        stack: keyError.stack
      })
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

    console.log('=== Creating Signature ===')
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
      console.error('Sign error details:', {
        name: signError.name,
        message: signError.message,
        stack: signError.stack
      })
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

    console.log('=== Requesting Access Token ===')
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

    console.log('=== Preparing Data for Google Sheets ===')
    // Generate ID for the document
    const documentId = `kui-${Date.now().toString().slice(-7)}`
    
    let rowData: (string | number)[] = []

    if (documentType === 'KuitansiPerjalananDinas') {
      console.log('Processing KuitansiPerjalananDinas data')
      
      rowData = [
        documentId,                               
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
      console.log('Document type not specifically handled:', documentType)
      const timestamp = new Date().toISOString()
      rowData = [documentId, timestamp, JSON.stringify(data)]
    }

    console.log('Row data prepared, length:', rowData.length)
    console.log('Row data preview:', rowData.slice(0, 5), '... (truncated)')

    // Determine spreadsheet ID and range
    const spreadsheetId = '1OiWBe8jplhJQjy4pBV0o_GdcLR6a-bCbWCJGpHnKqAw'
    const range = `${documentType}!A1`

    console.log(`=== Appending to Google Sheets ===`)
    console.log(`Spreadsheet ID: ${spreadsheetId}`)
    console.log(`Range: ${range}`)

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
    console.log('=== Google Sheets Function Completed Successfully ===')

    return new Response(
      JSON.stringify({ success: true, result, documentId }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('=== UNEXPECTED ERROR ===')
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        stack: error.stack,
        name: error.name
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
