
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Sample data for seeding
    const programs = [
      { name: 'Program PPIS' },
      { name: 'Program STATCAP-CERDAS' },
      { name: 'Program SP2020' },
    ]
    
    const akun = [
      { name: 'Belanja Bahan', code: '521211' },
      { name: 'Honor Output Kegiatan', code: '521213' },
      { name: 'Belanja Jasa Profesi', code: '522151' },
      { name: 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota', code: '524114' },
      { name: 'Belanja Perjalanan Dinas Paket Meeting Luar Kota', code: '524119' },
    ]
    
    const organikBPS = [
      { name: 'Agung Purwanto', nip: '196908171991011001' },
      { name: 'Naomi Octalia', nip: '198110172003122002' },
      { name: 'Ahmad Avid', nip: '198509182009021002' },
      { name: 'Widya Adhi Surya', nip: '198505202009021005' },
      { name: 'Hendry Trijaya', nip: '199009242013111001' },
    ]
    
    const mitraStatistik = [
      { name: 'Tri Nawangsari' },
      { name: 'Eli Nurlaeli' },
      { name: 'Ery Seftiawan' },
      { name: 'Agus Sutanto' },
      { name: 'Supri Irawan' },
    ]

    // Insert programs
    const { data: insertedPrograms, error: programsError } = await supabaseClient
      .from('programs')
      .upsert(programs, { onConflict: 'name' })
      .select()
    
    if (programsError) {
      console.error('Error inserting programs:', programsError)
    }
    
    // Insert some example kegiatan for each program
    if (insertedPrograms && insertedPrograms.length > 0) {
      for (const program of insertedPrograms) {
        const kegiatan = [
          { name: `Kegiatan Statistik ${program.name} 1`, program_id: program.id },
          { name: `Kegiatan Statistik ${program.name} 2`, program_id: program.id },
        ]
        
        const { data: insertedKegiatan, error: kegiatanError } = await supabaseClient
          .from('kegiatan')
          .upsert(kegiatan, { onConflict: 'name, program_id' })
          .select()
          
        if (kegiatanError) {
          console.error(`Error inserting kegiatan for program ${program.name}:`, kegiatanError)
        }
        
        // Insert KRO for each kegiatan
        if (insertedKegiatan && insertedKegiatan.length > 0) {
          for (const keg of insertedKegiatan) {
            const kros = [
              { name: `KRO ${keg.name} 1`, kegiatan_id: keg.id },
              { name: `KRO ${keg.name} 2`, kegiatan_id: keg.id },
            ]
            
            const { data: insertedKRO, error: kroError } = await supabaseClient
              .from('kro')
              .upsert(kros, { onConflict: 'name, kegiatan_id' })
              .select()
              
            if (kroError) {
              console.error(`Error inserting KRO for kegiatan ${keg.name}:`, kroError)
            }
            
            // Insert RO for each KRO
            if (insertedKRO && insertedKRO.length > 0) {
              for (const kro of insertedKRO) {
                const ros = [
                  { name: `RO ${kro.name} 1`, kro_id: kro.id },
                  { name: `RO ${kro.name} 2`, kro_id: kro.id },
                ]
                
                const { data: insertedRO, error: roError } = await supabaseClient
                  .from('ro')
                  .upsert(ros, { onConflict: 'name, kro_id' })
                  .select()
                  
                if (roError) {
                  console.error(`Error inserting RO for KRO ${kro.name}:`, roError)
                }
                
                // Insert Komponen for each RO
                if (insertedRO && insertedRO.length > 0) {
                  for (const ro of insertedRO) {
                    const komponenItems = [
                      { name: `Komponen ${ro.name} 1`, ro_id: ro.id },
                      { name: `Komponen ${ro.name} 2`, ro_id: ro.id },
                    ]
                    
                    const { error: komponenError } = await supabaseClient
                      .from('komponen')
                      .upsert(komponenItems, { onConflict: 'name, ro_id' })
                      
                    if (komponenError) {
                      console.error(`Error inserting Komponen for RO ${ro.name}:`, komponenError)
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Insert akun
    const { error: akunError } = await supabaseClient
      .from('akun')
      .upsert(akun, { onConflict: 'code' })
      
    if (akunError) {
      console.error('Error inserting akun:', akunError)
    }
    
    // Insert organik BPS
    const { error: organikError } = await supabaseClient
      .from('organik_bps')
      .upsert(organikBPS, { onConflict: 'nip' })
      
    if (organikError) {
      console.error('Error inserting organik BPS:', organikError)
    }
    
    // Insert mitra statistik
    const { error: mitraError } = await supabaseClient
      .from('mitra_statistik')
      .upsert(mitraStatistik, { onConflict: 'name' })
      
    if (mitraError) {
      console.error('Error inserting mitra statistik:', mitraError)
    }

    return new Response(
      JSON.stringify({
        message: 'Data seeding completed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
