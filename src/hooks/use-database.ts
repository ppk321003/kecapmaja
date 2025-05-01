
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
  return useQuery({
    queryKey: ["ro", kroId],
    queryFn: async () => {
      if (!kroId) return [];
      
      const { data, error } = await supabase
        .from("ro")
        .select("*")
        .eq("kro_id", kroId)
        .order("name");
      
      if (error) throw error;
      
      // Convert database field names to match our type definitions
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
interface KomponenDB {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const useKomponen = (roId: string | null) => {
  return useQuery({
    queryKey: ["komponen", roId],
    queryFn: async () => {
      if (!roId) return [];
      
      const { data, error } = await supabase
        .from("komponen")
        .select("*")
        .order("name");
      
      if (error) throw error;
      
      // Convert database fields to match our type definition
      // Note: We're manually associating components with the provided roId 
      // since there's no actual ro_id column in the database yet
      return (data as KomponenDB[]).map(item => ({
        id: item.id,
        name: item.name,
        roId: roId, // Using the passed roId parameter
        created_at: item.created_at,
        updated_at: item.updated_at
      })) as Komponen[];
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
        kecamatan: item.kecamatan || "", // Use actual kecamatan or empty string if null
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

// Get Documents
export const useGetDocuments = (jenisId?: string) => {
  return useQuery({
    queryKey: ["dokumen", jenisId],
    queryFn: async () => {
      let query = supabase.from("dokumen").select(`
        *,
        jenis:jenis_id(name)
      `);
      
      if (jenisId) {
        query = query.eq("jenis_id", jenisId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: true
  });
};

// Get Document by ID
export const useGetDocumentById = (id: string | null) => {
  return useQuery({
    queryKey: ["dokumen", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("dokumen")
        .select(`
          *,
          jenis:jenis_id(name)
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
};

// Seed Database with initial data (for development purposes)
export const useSeedDatabase = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('seed-data');
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate all relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["kegiatan"] });
      queryClient.invalidateQueries({ queryKey: ["kro"] });
      queryClient.invalidateQueries({ queryKey: ["ro"] });
      queryClient.invalidateQueries({ queryKey: ["komponen"] });
      queryClient.invalidateQueries({ queryKey: ["akun"] });
      queryClient.invalidateQueries({ queryKey: ["jenis"] });
      queryClient.invalidateQueries({ queryKey: ["mitra"] });
      queryClient.invalidateQueries({ queryKey: ["organik"] });
    }
  });
};
