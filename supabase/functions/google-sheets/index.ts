
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

    if (!serviceAccountEmail || !privateKey) {
      console.error('Missing Google service account credentials')
      return new Response(
        JSON.stringify({ error: 'Missing Google service account credentials' }),
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

    const headerEncoded = btoa(JSON.stringify(header)).replace(/[+/=]/g, (m) => ({ '+': '-', '/': '_', '=': '' })[m] || m)
    const payloadEncoded = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (m) => ({ '+': '-', '/': '_', '=': '' })[m] || m)

    const key = await crypto.subtle.importKey(
      'pkcs8',
      new TextEncoder().encode(privateKey),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(`${headerEncoded}.${payloadEncoded}`)
    )

    const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/[+/=]/g, (m) => ({ '+': '-', '/': '_', '=': '' })[m] || m)

    const jwt = `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`

    // Get access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token request failed:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to get access token', details: errorText }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Prepare data for Google Sheets
    let rowData: (string | number)[] = []
    const timestamp = new Date().toISOString()

    if (documentType === 'KerangkaAcuanKerja') {
      // Generate ID for KAK
      const kakId = `kak-${Date.now().toString().slice(-7)}`
      
      rowData = [
        kakId,
        data.jenisKak || '',
        data.jenisPaketMeeting || '',
        data._programNameMap?.[data.programPembebanan] || data.programPembebanan || '',
        data._kegiatanNameMap?.[data.kegiatan] || data.kegiatan || '',
        data._kroNameMap?.[data.kro] || data.kro || '',
        data._roNameMap?.[data.ro] || data.ro || '',
        data._komponenNameMap?.[data.komponenOutput] || data.komponenOutput || '',
        data._akunNameMap?.[data.akun] || data.akun || '',
        data.paguAnggaran || '',
        data.tanggalMulaiKegiatan || '',
        data.tanggalAkhirKegiatan || '',
        data.tanggalPengajuanKAK || '',
        data._pembuatDaftarName || ''
      ]

      // Add kegiatan details (up to 10 activities, 4 fields each = 40 columns)
      const maxActivities = 10
      const kegiatanDetails = data.kegiatanDetails || []
      
      for (let i = 0; i < maxActivities; i++) {
        if (i < kegiatanDetails.length) {
          const kegiatan = kegiatanDetails[i]
          rowData.push(
            kegiatan.namaKegiatan || '',
            kegiatan.volume || '',
            kegiatan.satuan || '',
            kegiatan.hargaSatuan || ''
          )
        } else {
          rowData.push('', '', '', '')
        }
      }

      // Add jumlah gelombang
      rowData.push(data.jumlahGelombang || '0')

      // Add wave dates (up to 10 waves, 2 dates each = 20 columns)
      const maxWaves = 10
      const waveDates = data.waveDates || []
      
      for (let i = 0; i < maxWaves; i++) {
        if (i < waveDates.length) {
          const wave = waveDates[i]
          rowData.push(
            wave.startDate || '',
            wave.endDate || ''
          )
        } else {
          rowData.push('', '')
        }
      }
    } else if (documentType === 'TandaTerima') {
      // Generate ID for Tanda Terima
      const ttId = `tt-${Date.now().toString().slice(-7)}`
      
      rowData = [
        ttId,
        data.namaKegiatan || '',
        data.detail || '',
        data.tanggalPembuatanDaftar || '',
        data._pembuatDaftarName || '',
        (data.organikBPS || []).map(id => data._organikNameMap?.[id] || id).join(', '),
        (data.mitraStatistik || []).map(id => data._mitraNameMap?.[id] || id).join(', ')
      ]

      // Add item details
      const daftarItem = data.daftarItem || []
      for (const item of daftarItem) {
        rowData.push(
          item.namaItem || '',
          item.banyaknya || '',
          item.satuan || ''
        )
      }
    }

    // Determine spreadsheet ID and range
    const spreadsheetId = '1OiWBe8jplhJQjy4pBV0o_GdcLR6a-bCbWCJGpHnKqAw'
    const range = `${documentType}!A1`

    console.log(`Appending data to ${range}:`, rowData)

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

    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text()
      console.error('Sheets API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to append to Google Sheets', details: errorText }),
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
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
