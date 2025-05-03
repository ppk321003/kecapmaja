export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      akun: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      dokumen: {
        Row: {
          created_at: string
          data: Json
          id: string
          jenis_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          jenis_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          jenis_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dokumen_jenis_id_fkey"
            columns: ["jenis_id"]
            isOneToOne: false
            referencedRelation: "jenis"
            referencedColumns: ["id"]
          },
        ]
      }
      jenis: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      kegiatan: {
        Row: {
          created_at: string
          id: string
          name: string
          program_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          program_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          program_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kegiatan_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      kerangka_acuan_kerja: {
        Row: {
          akun: string | null
          created_at: string
          detil: string | null
          id: string
          jenis: string | null
          kegiatan: string | null
          komponen: string | null
          kro: string | null
          latar_belakang: string | null
          nama_kegiatan: string
          program: string | null
          ro: string | null
          tanggal_mulai: string | null
          tanggal_selesai: string | null
          tujuan: string | null
          updated_at: string
        }
        Insert: {
          akun?: string | null
          created_at?: string
          detil?: string | null
          id?: string
          jenis?: string | null
          kegiatan?: string | null
          komponen?: string | null
          kro?: string | null
          latar_belakang?: string | null
          nama_kegiatan: string
          program?: string | null
          ro?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          tujuan?: string | null
          updated_at?: string
        }
        Update: {
          akun?: string | null
          created_at?: string
          detil?: string | null
          id?: string
          jenis?: string | null
          kegiatan?: string | null
          komponen?: string | null
          kro?: string | null
          latar_belakang?: string | null
          nama_kegiatan?: string
          program?: string | null
          ro?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          tujuan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      komponen: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      kro: {
        Row: {
          created_at: string
          id: string
          kegiatan_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kegiatan_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kegiatan_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kro_kegiatan_id_fkey"
            columns: ["kegiatan_id"]
            isOneToOne: false
            referencedRelation: "kegiatan"
            referencedColumns: ["id"]
          },
        ]
      }
      mitra_statistik: {
        Row: {
          alamat: string | null
          created_at: string
          id: string
          kecamatan: string | null
          nama_bank: string | null
          name: string
          nik: string | null
          no_rekening: string | null
          pekerjaan: string | null
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          created_at?: string
          id?: string
          kecamatan?: string | null
          nama_bank?: string | null
          name: string
          nik?: string | null
          no_rekening?: string | null
          pekerjaan?: string | null
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          created_at?: string
          id?: string
          kecamatan?: string | null
          nama_bank?: string | null
          name?: string
          nik?: string | null
          no_rekening?: string | null
          pekerjaan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      organik_bps: {
        Row: {
          bank: string | null
          created_at: string
          gol_akhir: string | null
          id: string
          jabatan: string | null
          name: string
          nip: string
          nip_bps: string | null
          no_hp: string | null
          nomor_rekening: string | null
          pangkat: string | null
          updated_at: string
          wilayah: string | null
        }
        Insert: {
          bank?: string | null
          created_at?: string
          gol_akhir?: string | null
          id?: string
          jabatan?: string | null
          name: string
          nip: string
          nip_bps?: string | null
          no_hp?: string | null
          nomor_rekening?: string | null
          pangkat?: string | null
          updated_at?: string
          wilayah?: string | null
        }
        Update: {
          bank?: string | null
          created_at?: string
          gol_akhir?: string | null
          id?: string
          jabatan?: string | null
          name?: string
          nip?: string
          nip_bps?: string | null
          no_hp?: string | null
          nomor_rekening?: string | null
          pangkat?: string | null
          updated_at?: string
          wilayah?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ro: {
        Row: {
          created_at: string
          id: string
          kro_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kro_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kro_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ro_kro_id_fkey"
            columns: ["kro_id"]
            isOneToOne: false
            referencedRelation: "kro"
            referencedColumns: ["id"]
          },
        ]
      }
      spj_honor: {
        Row: {
          akun: string | null
          created_at: string
          detil: string | null
          harga_satuan: number | null
          id: string
          jenis: string | null
          jumlah: number | null
          kegiatan: string | null
          komponen: string | null
          kro: string | null
          nama_kegiatan: string
          program: string | null
          ro: string | null
          tanggal_spj: string | null
          updated_at: string
        }
        Insert: {
          akun?: string | null
          created_at?: string
          detil?: string | null
          harga_satuan?: number | null
          id?: string
          jenis?: string | null
          jumlah?: number | null
          kegiatan?: string | null
          komponen?: string | null
          kro?: string | null
          nama_kegiatan: string
          program?: string | null
          ro?: string | null
          tanggal_spj?: string | null
          updated_at?: string
        }
        Update: {
          akun?: string | null
          created_at?: string
          detil?: string | null
          harga_satuan?: number | null
          id?: string
          jenis?: string | null
          jumlah?: number | null
          kegiatan?: string | null
          komponen?: string | null
          kro?: string | null
          nama_kegiatan?: string
          program?: string | null
          ro?: string | null
          tanggal_spj?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      spj_honor_mitra: {
        Row: {
          created_at: string
          id: string
          mitra_id: string | null
          spj_honor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mitra_id?: string | null
          spj_honor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mitra_id?: string | null
          spj_honor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spj_honor_mitra_mitra_id_fkey"
            columns: ["mitra_id"]
            isOneToOne: false
            referencedRelation: "mitra_statistik"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spj_honor_mitra_spj_honor_id_fkey"
            columns: ["spj_honor_id"]
            isOneToOne: false
            referencedRelation: "spj_honor"
            referencedColumns: ["id"]
          },
        ]
      }
      spj_honor_organik: {
        Row: {
          created_at: string
          id: string
          organik_id: string | null
          spj_honor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organik_id?: string | null
          spj_honor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organik_id?: string | null
          spj_honor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spj_honor_organik_organik_id_fkey"
            columns: ["organik_id"]
            isOneToOne: false
            referencedRelation: "organik_bps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spj_honor_organik_spj_honor_id_fkey"
            columns: ["spj_honor_id"]
            isOneToOne: false
            referencedRelation: "spj_honor"
            referencedColumns: ["id"]
          },
        ]
      }
      uang_harian_mitra: {
        Row: {
          created_at: string
          id: string
          mitra_id: string | null
          uang_harian_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mitra_id?: string | null
          uang_harian_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mitra_id?: string | null
          uang_harian_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uang_harian_mitra_mitra_id_fkey"
            columns: ["mitra_id"]
            isOneToOne: false
            referencedRelation: "mitra_statistik"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uang_harian_mitra_uang_harian_id_fkey"
            columns: ["uang_harian_id"]
            isOneToOne: false
            referencedRelation: "uang_harian_transport"
            referencedColumns: ["id"]
          },
        ]
      }
      uang_harian_organik: {
        Row: {
          created_at: string
          id: string
          organik_id: string | null
          uang_harian_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          organik_id?: string | null
          uang_harian_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          organik_id?: string | null
          uang_harian_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uang_harian_organik_organik_id_fkey"
            columns: ["organik_id"]
            isOneToOne: false
            referencedRelation: "organik_bps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uang_harian_organik_uang_harian_id_fkey"
            columns: ["uang_harian_id"]
            isOneToOne: false
            referencedRelation: "uang_harian_transport"
            referencedColumns: ["id"]
          },
        ]
      }
      uang_harian_transport: {
        Row: {
          akun: string | null
          created_at: string
          detil: string | null
          id: string
          jenis: string | null
          kegiatan: string | null
          komponen: string | null
          kro: string | null
          nama_kegiatan: string
          program: string | null
          ro: string | null
          tanggal_mulai: string | null
          tanggal_selesai: string | null
          tc: boolean | null
          uang_harian: number | null
          updated_at: string
        }
        Insert: {
          akun?: string | null
          created_at?: string
          detil?: string | null
          id?: string
          jenis?: string | null
          kegiatan?: string | null
          komponen?: string | null
          kro?: string | null
          nama_kegiatan: string
          program?: string | null
          ro?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          tc?: boolean | null
          uang_harian?: number | null
          updated_at?: string
        }
        Update: {
          akun?: string | null
          created_at?: string
          detil?: string | null
          id?: string
          jenis?: string | null
          kegiatan?: string | null
          komponen?: string | null
          kro?: string | null
          nama_kegiatan?: string
          program?: string | null
          ro?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          tc?: boolean | null
          uang_harian?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
