
export interface JenisDocumentOption {
  value: string;
  label: string;
}

export interface DocumentFormData {
  id?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface Program {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Kegiatan {
  id: string;
  name: string;
  programId: string;
  created_at?: string;
  updated_at?: string;
}

export interface KRO {
  id: string;
  name: string;
  kegiatanId: string;
  created_at?: string;
  updated_at?: string;
}

export interface RO {
  id: string;
  name: string;
  kroId: string;
  created_at?: string;
  updated_at?: string;
}

export interface Komponen {
  id: string;
  name: string;
  roId: string;
  created_at?: string;
  updated_at?: string;
}

export interface Akun {
  id: string;
  name: string;
  code: string;
  created_at?: string;
  updated_at?: string;
}

export interface Jenis {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface MitraStatistik {
  id: string;
  name: string;
  kecamatan?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrganikBPS {
  id: string;
  name: string;
  nip: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalLinkItem {
  title: string;
  url: string;
  icon: string;
}
