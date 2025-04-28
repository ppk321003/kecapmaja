
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
}

export interface Kegiatan {
  id: string;
  name: string;
  programId: string;
}

export interface KRO {
  id: string;
  name: string;
  kegiatanId: string;
}

export interface RO {
  id: string;
  name: string;
  kroId: string;
}

export interface Komponen {
  id: string;
  name: string;
  roId: string;
}

export interface Akun {
  id: string;
  name: string;
  code: string;
}

export interface Jenis {
  id: string;
  name: string;
}

export interface MitraStatistik {
  id: string;
  name: string;
}

export interface OrganikBPS {
  id: string;
  name: string;
  nip: string;
}

export interface ExternalLinkItem {
  title: string;
  url: string;
  icon: string;
}
