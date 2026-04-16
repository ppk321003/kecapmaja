-- Migration: Create Pulsa Management table

-- Create table for pulsa items
CREATE TABLE IF NOT EXISTS pulsa_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulan integer NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
  tahun integer NOT NULL CHECK (tahun >= 2020),
  nama_petugas character varying NOT NULL,
  nip character varying,
  kegiatan character varying NOT NULL,
  organik character varying NOT NULL,
  mitra character varying,
  nominal integer NOT NULL CHECK (nominal > 0),
  
  -- Status tracking
  status character varying NOT NULL DEFAULT 'draft' 
    CHECK (status IN ('draft', 'pending_ppk', 'approved_ppk', 'rejected_ppk', 'completed', 'cancelled')),
  catatan text,
  
  -- Approval tracking
  approved_by character varying,
  approved_at timestamp with time zone,
  
  -- Metadata
  created_by character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraint: satu petugas hanya boleh satu kegiatan per bulan
  CONSTRAINT unique_petugas_kegiatan_per_bulan UNIQUE (nama_petugas, bulan, tahun, kegiatan)
);

-- Create table for monthly summary
CREATE TABLE IF NOT EXISTS pulsa_bulanan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulan integer NOT NULL CHECK (bulan >= 1 AND bulan <= 12),
  tahun integer NOT NULL CHECK (tahun >= 2020),
  total_nominal integer DEFAULT 0,
  jumlah_petugas integer DEFAULT 0,
  daftar_petugas text[], -- Array of names
  status character varying NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'in_progress', 'completed', 'archived')),
  keterangan text,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT unique_bulan_tahun UNIQUE (bulan, tahun)
);

-- Create index untuk faster queries
CREATE INDEX IF NOT EXISTS idx_pulsa_items_bulan_tahun ON pulsa_items(bulan, tahun);
CREATE INDEX IF NOT EXISTS idx_pulsa_items_nama_petugas ON pulsa_items(nama_petugas);
CREATE INDEX IF NOT EXISTS idx_pulsa_items_kegiatan ON pulsa_items(kegiatan);
CREATE INDEX IF NOT EXISTS idx_pulsa_items_organik ON pulsa_items(organik);
CREATE INDEX IF NOT EXISTS idx_pulsa_items_status ON pulsa_items(status);
CREATE INDEX IF NOT EXISTS idx_pulsa_bulanan_bulan_tahun ON pulsa_bulanan(bulan, tahun);

-- Enable RLS (Row Level Security)
ALTER TABLE pulsa_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulsa_bulanan ENABLE ROW LEVEL SECURITY;

-- RLS Policies untuk pulsa_items
-- 1. PPK, Bendahara, dan admin bisa lihat semua
CREATE POLICY "pulsa_items_view_all_ppk_bendahara" 
  ON pulsa_items 
  FOR SELECT 
  USING (
    auth.jwt() ->> 'user_metadata'::text ->> 'role' IN ('Pejabat Pembuat Komitmen', 'Bendahara', 'admin', 'operator')
  );

-- 2. User bisa lihat data yang mereka buat
CREATE POLICY "pulsa_items_view_own" 
  ON pulsa_items 
  FOR SELECT 
  USING (created_by = auth.jwt() ->> 'user_metadata'::text ->> 'email');

-- 3. User dengan role tertentu bisa insert
CREATE POLICY "pulsa_items_insert" 
  ON pulsa_items 
  FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'user_metadata'::text ->> 'role' IN (
      'Fungsi Sosial', 'Fungsi Neraca', 'Fungsi Produksi', 'Fungsi Distribusi', 'Fungsi IPDS',
      'Bendahara', 'Pejabat Pembuat Komitmen', 'admin'
    )
  );

-- 4. PPK bisa update untuk approval
CREATE POLICY "pulsa_items_update_ppk" 
  ON pulsa_items 
  FOR UPDATE 
  USING (auth.jwt() ->> 'user_metadata'::text ->> 'role' = 'Pejabat Pembuat Komitmen');

-- Similar policies untuk pulsa_bulanan
CREATE POLICY "pulsa_bulanan_view_all" 
  ON pulsa_bulanan 
  FOR SELECT 
  USING (true); -- Everyone can view summary

CREATE POLICY "pulsa_bulanan_write_ppk" 
  ON pulsa_bulanan 
  FOR INSERT WITH CHECK (auth.jwt() ->> 'user_metadata'::text ->> 'role' IN ('Pejabat Pembuat Komitmen', 'admin'));
