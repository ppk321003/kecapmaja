
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Program, Kegiatan, KRO, RO, Komponen, Akun, Jenis, MitraStatistik, OrganikBPS } from "@/types";

// Programs
export const usePrograms = () => {
  return useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Program[];
    }
  });
};

// Kegiatan
export const useKegiatan = (programId: string | null) => {
  return useQuery({
    queryKey: ["kegiatan", programId],
    queryFn: async () => {
      if (!programId) return [];
      
      const { data, error } = await supabase
        .from("kegiatan")
        .select("*")
        .eq("program_id", programId)
        .order("name");
      
      if (error) throw error;
      
      // Convert database field names to match our type definitions
      return data.map(item => ({
        id: item.id,
        name: item.name,
        programId: item.program_id,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) as Kegiatan[];
    },
    enabled: !!programId
  });
};

// KRO
export const useKRO = (kegiatanId: string | null) => {
  return useQuery({
    queryKey: ["kro", kegiatanId],
    queryFn: async () => {
      if (!kegiatanId) return [];
      
      const { data, error } = await supabase
        .from("kro")
        .select("*")
        .eq("kegiatan_id", kegiatanId)
        .order("name");
      
      if (error) throw error;
      
      // Convert database field names to match our type definitions
      return data.map(item => ({
        id: item.id,
        name: item.name,
        kegiatanId: item.kegiatan_id,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) as KRO[];
    },
    enabled: !!kegiatanId
  });
};

// RO 
export const useRO = (kroId: string | null) => {
  return useQuery<RO[], Error>({
    queryKey: ["ro", kroId],
    queryFn: async () => {
      if (!kroId) return [] as RO[];
      
      const { data, error } = await supabase
        .from("ro")
        .select("*")
        .eq("kro_id", kroId)
        .order("name");
      
      if (error) throw error;
      
      // Return a specific type to prevent recursive typing issues
      return data.map(item => ({
        id: item.id,
        name: item.name,
        kroId: item.kro_id,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) as RO[];
    },
    enabled: !!kroId
  });
};

// Komponen
export const useKomponen = (roId: string | null) => {
  // Fix the deep type instantiation issue by using a more direct approach
  return useQuery<Komponen[], Error>({
    queryKey: ["komponen", roId],
    queryFn: async () => {
      if (!roId) return [] as Komponen[];
      
      const { data, error } = await supabase
        .from("komponen")
        .select("*")
        .eq("ro_id", roId)
        .order("name");
      
      if (error) throw error;
      
      // Simplify the mapping to prevent deep type instantiation
      return data.map(item => ({
        id: item.id,
        name: item.name,
        roId: item.ro_id, // Use the database field directly
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
    },
    enabled: !!roId
  });
};

// Akun
export const useAkun = () => {
  return useQuery({
    queryKey: ["akun"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("akun")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Akun[];
    }
  });
};

// Jenis
export const useJenis = () => {
  return useQuery({
    queryKey: ["jenis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jenis")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Jenis[];
    }
  });
};

// Mitra Statistik
export const useMitraStatistik = () => {
  return useQuery({
    queryKey: ["mitra"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mitra_statistik")
        .select("*")
        .order("name");
      
      if (error) throw error;
      
      // Convert database fields to match our type definition
      return data.map(item => ({
        id: item.id,
        name: item.name,
        kecamatan: item.kecamatan || "", // Default empty string since it doesn't exist in the DB schema
        nik: item.nik,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) as MitraStatistik[];
    }
  });
};

// Organik BPS
export const useOrganikBPS = () => {
  return useQuery({
    queryKey: ["organik"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organik_bps")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as OrganikBPS[];
    }
  });
};

// Save Document
export const useSaveDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      jenisId, 
      title, 
      data 
    }: { 
      jenisId: string; 
      title: string; 
      data: any; 
    }) => {
      const { data: result, error } = await supabase
        .from("dokumen")
        .insert([
          { jenis_id: jenisId, title, data }
        ])
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dokumen"] });
    }
  });
};
