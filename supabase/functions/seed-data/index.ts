
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Sample data for seeding
    const programData = [
      { name: "Program 1: Dukungan Manajemen" },
      { name: "Program 2: Peningkatan Kualitas Data" },
      { name: "Program 3: Penyediaan Data Statistik" },
    ];

    // Insert programs
    for (const program of programData) {
      const { data: progData, error: progError } = await supabase
        .from("programs")
        .insert([program])
        .select();

      if (progError) throw progError;

      if (progData && progData.length > 0) {
        // For each program, add kegiatan
        const kegiatanData = [
          { name: `Kegiatan 1 untuk ${program.name}`, program_id: progData[0].id },
          { name: `Kegiatan 2 untuk ${program.name}`, program_id: progData[0].id },
        ];

        for (const kegiatan of kegiatanData) {
          const { data: kegData, error: kegError } = await supabase
            .from("kegiatan")
            .insert([kegiatan])
            .select();

          if (kegError) throw kegError;

          if (kegData && kegData.length > 0) {
            // For each kegiatan, add KRO
            const kroData = [
              { name: `KRO 1 untuk ${kegiatan.name}`, kegiatan_id: kegData[0].id },
              { name: `KRO 2 untuk ${kegiatan.name}`, kegiatan_id: kegData[0].id },
            ];

            for (const kro of kroData) {
              const { data: kroData, error: kroError } = await supabase
                .from("kro")
                .insert([kro])
                .select();

              if (kroError) throw kroError;

              if (kroData && kroData.length > 0) {
                // For each KRO, add RO
                const roData = [
                  { name: `RO 1 untuk ${kro.name}`, kro_id: kroData[0].id },
                  { name: `RO 2 untuk ${kro.name}`, kro_id: kroData[0].id },
                ];

                for (const ro of roData) {
                  const { data: roData, error: roError } = await supabase
                    .from("ro")
                    .insert([ro])
                    .select();

                  if (roError) throw roError;

                  if (roData && roData.length > 0) {
                    // For each RO, add Komponen
                    const komponenData = [
                      { name: `Komponen 1 untuk ${ro.name}`, ro_id: roData[0].id },
                      { name: `Komponen 2 untuk ${ro.name}`, ro_id: roData[0].id },
                    ];

                    for (const komponen of komponenData) {
                      const { error: kompError } = await supabase
                        .from("komponen")
                        .insert([komponen]);

                      if (kompError) throw kompError;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Add Akun data
    const akunData = [
      { name: "Honorarium", code: "521213" },
      { name: "Belanja Bahan", code: "521211" },
      { name: "Perjalanan Dinas", code: "524111" },
      { name: "Paket Meeting", code: "522151" },
    ];

    const { error: akunError } = await supabase.from("akun").insert(akunData);
    if (akunError) throw akunError;

    // Add Mitra Statistik
    const mitraData = [
      { name: "Mitra 1: Ahmad Sudirman" },
      { name: "Mitra 2: Budi Santoso" },
      { name: "Mitra 3: Cahya Wijaya" },
      { name: "Mitra 4: Dewi Anggraini" },
      { name: "Mitra 5: Eko Prasetyo" },
    ];

    const { error: mitraError } = await supabase.from("mitra_statistik").insert(mitraData);
    if (mitraError) throw mitraError;

    // Add Organik BPS
    const organikData = [
      { name: "Organik 1: Faisal Rahman", nip: "198001012010011001" },
      { name: "Organik 2: Gunawan Wibowo", nip: "198101012010011002" },
      { name: "Organik 3: Hendra Wijaya", nip: "198201012010011003" },
      { name: "Organik 4: Indah Permata", nip: "198301012010012001" },
      { name: "Organik 5: Joko Susilo", nip: "198401012010011004" },
    ];

    const { error: organikError } = await supabase.from("organik_bps").insert(organikData);
    if (organikError) throw organikError;

    return new Response(
      JSON.stringify({ success: true, message: "Data seeded successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error seeding data:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
