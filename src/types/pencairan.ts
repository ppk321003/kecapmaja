// Types untuk Usulan Pencairan

export type SubmissionStatus = 
  | 'draft'
  | 'pending_bendahara'
  | 'pending_ppk'
  | 'pending_ppspm'  
  | 'sent_kppn'
  | 'complete_arsip'
  | 'incomplete_sm'
  | 'incomplete_bendahara'
  | 'incomplete_ppk'
  | 'incomplete_ppspm'
  | 'incomplete_kppn';

export type UserRole = 
  | 'Fungsi Sosial'
  | 'Fungsi Neraca'
  | 'Fungsi Produksi'
  | 'Fungsi Distribusi'
  | 'Fungsi IPDS'
  | 'Bendahara'
  | 'Pejabat Pembuat Komitmen'
  | 'Pejabat Pengadaan'
  | 'Pejabat Penandatangan Surat Perintah Membayar'
  | 'Padamel BPS 3210'
  | 'KPPN'
  | 'Arsip'
  | 'operator'
  | 'admin';

// Roles yang bisa mengajukan
export const SUBMITTER_ROLES: UserRole[] = [
  'Fungsi Sosial',
  'Fungsi Neraca',
  'Fungsi Produksi',
  'Fungsi Distribusi',
  'Fungsi IPDS',
];

// 🆕 Roles yang bisa melihat SEMUA data pengajuan
export const ROLES_CAN_VIEW_ALL: UserRole[] = [
  'Pejabat Pembuat Komitmen',
  'Bendahara',
  'Pejabat Pengadaan',
  'Padamel BPS 3210',
  'Pejabat Penandatangan Surat Perintah Membayar',
  'Arsip',
  'operator',
  'admin',
];

// 🆕 Helper: Check apakah role bisa lihat semua atau hanya data mereka
export function canViewAllSubmissions(role: UserRole): boolean {
  return ROLES_CAN_VIEW_ALL.includes(role);
}

// 🆕 Helper: Check apakah submission harus ditampilkan untuk user dengan role tertentu
export function shouldShowSubmission(submission: Submission, userRole: UserRole, userCreatorRole?: string): boolean {
  // Admin dan roles khusus bisa lihat semua
  if (canViewAllSubmissions(userRole)) {
    return true;
  }
  
  // Untuk submitter (Fungsi*), hanya tampilkan:
  // 1. Data yang mereka buat sendiri (kolom R: user)
  // 2. Data yang sedang dalam review mereka (status = incomplete_sm HANYA jika mereka creator-nya)
  if (SUBMITTER_ROLES.includes(userRole)) {
    // Jika buat pengajuan sendiri
    if (submission.user && submission.user === userRole) {
      return true;
    }
    
    return false;
  }
  
  // Untuk role lain (operator, dll), tampilkan semua
  return true;
}

export type DocumentType = string;

export interface Document {
  type: DocumentType;
  name: string;
  isRequired: boolean;
  isChecked: boolean;
  note?: string;
}

export interface Submission {
  id: string;
  title: string;
  submitterName: string;
  jenisBelanja: string;
  subJenisBelanja?: string;
  submittedAt: Date;
  updatedAt?: Date; // ✅ UBAH dari string ke Date
  updatedAtString?: string; // ✅ TAMBAH ini - string asli dari kolom P
  status: SubmissionStatus;
  documents: Document[];
  notes?: string;
  waktuPengajuan?: string;
  waktuBendahara?: string;
  waktuPpk?: string;
  waktuPPSPM?: string;
  waktuKppn?: string;
  waktuArsip?: string; // ✅ TAMBAH untuk waktu input arsip
  statusBendahara?: string;
  statusPpk?: string;
  statusPPSPM?: string;
  statusKppn?: string;
  statusArsip?: string; // ✅ TAMBAH untuk status arsip
  bendaharaCheckedAt?: Date;
  ppkCheckedAt?: Date;
  ppspmCheckedAt?: Date;
  kppnCheckedAt?: Date;
  arsipCheckedAt?: Date; // ✅ TAMBAH untuk waktu record arsip
  user?: string; // 🆕 Kolom R - role login yang membuat 'Buat Pengajuan Baru'
}

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: 'Draft SM',
  pending_bendahara: 'Periksa Bendahara',
  pending_ppk: 'Periksa PPK',
  pending_ppspm: 'Periksa PPSPM', 
  sent_kppn: 'Kirim KPPN',
  complete_arsip: 'Selesai Arsip',
  incomplete_sm: 'Dikembalikan ke SM',
  incomplete_bendahara: 'Dikembalikan ke Bendahara',
  incomplete_ppk: 'Dikembalikan ke PPK',
  incomplete_ppspm: 'Dikembalikan ke PPSPM', 
  incomplete_kppn: 'Dikembalikan ke KPPN',
};

// Jenis Belanja Options (main categories)
export const JENIS_BELANJA_OPTIONS = [
  'Honorarium',
  'Perjalanan Dinas',
  'Belanja Bahan',
  'Belanja Barang Persediaan',
  'Paket Meeting Dalam Kota',
];

// Sub-Jenis Belanja for each main category
export const SUB_JENIS_BELANJA: Record<string, string[]> = {
  'Honorarium': ['Tim Pelaksana', 'Pengajar/Instruktur', 'Narasumber', 'Petugas Mitra', 'Petugas PNS'],
  'Perjalanan Dinas': ['Transport Lokal', 'Perjadin dalam kota > 8 Jam', 'Perjadin Luar Kota'],
  'Belanja Bahan': ['Konsumsi', 'Pulsa/Paket Data', 'Perlengkapan'],
  'Belanja Barang Persediaan': ['ATK dan Computer Supplies', 'Pencetakan'],
  'Paket Meeting Dalam Kota': ['Paket Meeting', 'Perjalanan'],
};

// Documents by Jenis and Sub-Jenis Belanja
export const DOCUMENTS_BY_SUB_JENIS: Record<string, Record<string, Document[]>> = {
  'Honorarium': {
    'Tim Pelaksana': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'sk_kpa', name: 'Surat Keputusan KPA', isRequired: true, isChecked: false },
      { type: 'rekap_honor', name: 'Rekap Honor/Kuitansi', isRequired: true, isChecked: false },
      { type: 'laporan', name: 'Laporan', isRequired: true, isChecked: false },
      { type: 'ssp_pph21', name: 'SSP PPh Pasal 21', isRequired: false, isChecked: false, note: 'dilengkapi Bendahara' },
    ],
    'Pengajar/Instruktur': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'sk_kpa', name: 'Surat Keputusan KPA', isRequired: true, isChecked: false },
      { type: 'rekap_honor', name: 'Rekap Honor/Kuitansi', isRequired: true, isChecked: false },
      { type: 'laporan', name: 'Laporan', isRequired: true, isChecked: false },
      { type: 'jadwal', name: 'Jadwal Kegiatan/Rundown Acara', isRequired: true, isChecked: false },
      { type: 'daftar_hadir', name: 'Daftar Hadir', isRequired: true, isChecked: false },
      { type: 'ssp_pph21', name: 'SSP PPh Pasal 21', isRequired: false, isChecked: false, note: 'dilengkapi Bendahara' },
    ],
    'Narasumber': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'sk_kpa', name: 'Surat Keputusan KPA', isRequired: true, isChecked: false },
      { type: 'rekap_honor', name: 'Rekap Honor/Kuitansi', isRequired: true, isChecked: false },
      { type: 'undangan', name: 'Undangan', isRequired: true, isChecked: false },
      { type: 'jadwal', name: 'Jadwal Kegiatan/Rundown Acara', isRequired: true, isChecked: false },
      { type: 'daftar_hadir', name: 'Daftar Hadir', isRequired: true, isChecked: false },
      { type: 'paparan', name: 'Paparan/Materi', isRequired: true, isChecked: false },
      { type: 'ktp_npwp', name: 'Fc. KTP dan NPWP', isRequired: true, isChecked: false },
      { type: 'ssp_pph21', name: 'SSP PPh Pasal 21', isRequired: false, isChecked: false, note: 'dilengkapi Bendahara' },
    ],
    'Petugas Mitra': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'sk_kpa', name: 'Surat Keputusan KPA', isRequired: true, isChecked: false },
      { type: 'spk', name: 'Surat Perjanjian Kerja (SPK)', isRequired: true, isChecked: false },
      { type: 'bast', name: 'Berita Acara Serah Terima (BAST)', isRequired: true, isChecked: false },
      { type: 'rekap_honor', name: 'Rekap Honor/Kuitansi', isRequired: true, isChecked: false },
      { type: 'ssp_pph21', name: 'SSP PPh Pasal 21', isRequired: false, isChecked: false, note: 'dilengkapi Bendahara' },
    ],
    'Petugas PNS': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'sk_kpa', name: 'Surat Keputusan KPA', isRequired: true, isChecked: false },
      { type: 'bast', name: 'Berita Acara Serah Terima (BAST)', isRequired: true, isChecked: false },
      { type: 'surat_tugas', name: 'Surat Tugas', isRequired: true, isChecked: false },
      { type: 'rekap_honor', name: 'Rekap Honor/Kuitansi', isRequired: true, isChecked: false },
      { type: 'ssp_pph21', name: 'SSP PPh Pasal 21', isRequired: false, isChecked: false, note: 'dilengkapi Bendahara' },
    ],
  },
  'Perjalanan Dinas': {
    'Transport Lokal': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan', isRequired: true, isChecked: false },
      { type: 'surat_tugas', name: 'Surat Tugas', isRequired: true, isChecked: false },
      { type: 'visum', name: 'Visum', isRequired: true, isChecked: false },
      { type: 'kuitansi', name: 'Kuitansi', isRequired: true, isChecked: false },
      { type: 'daftar_pengeluaran_riil', name: 'Daftar Pengeluaran Riil', isRequired: true, isChecked: false },
      { type: 'surat_kendis', name: 'Surat Pernyataan Kendaraan Dinas', isRequired: true, isChecked: false },
      { type: 'laporan_perjadin', name: 'Laporan Perjadin dan Dokumentasi', isRequired: true, isChecked: false },
      { type: 'rekap_translok', name: 'Rekapitulasi Translok', isRequired: true, isChecked: false },
    ],
    'Perjadin dalam kota > 8 Jam': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'surat_tugas', name: 'Surat Tugas', isRequired: true, isChecked: false },
      { type: 'spd', name: 'Surat Perjalanan Dinas (SPD)', isRequired: true, isChecked: false },
      { type: 'visum', name: 'Visum', isRequired: true, isChecked: false },
      { type: 'kuitansi', name: 'Kuitansi', isRequired: true, isChecked: false },
      { type: 'daftar_pengeluaran_riil', name: 'Daftar Pengeluaran Riil', isRequired: true, isChecked: false },
      { type: 'daftar_ongkos', name: 'Daftar Ongkos Perjalanan', isRequired: false, isChecked: false },
      { type: 'surat_kendis', name: 'Surat Pernyataan Kendaraan Dinas', isRequired: false, isChecked: false, note: 'Wajib ada jika kendaraan pribadi/umum'  },
      { type: 'laporan_perjadin', name: 'Laporan Perjadin dan Dokumentasi', isRequired: true, isChecked: false },
    ],
    'Perjadin Luar Kota': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'surat_tugas', name: 'Surat Tugas', isRequired: true, isChecked: false },
      { type: 'spd', name: 'Surat Perjalanan Dinas (SPD)', isRequired: true, isChecked: false },
      { type: 'visum', name: 'Visum', isRequired: true, isChecked: false },
      { type: 'kuitansi', name: 'Kuitansi', isRequired: true, isChecked: false },
      { type: 'daftar_pengeluaran_riil', name: 'Daftar Pengeluaran Riil', isRequired: true, isChecked: false },
      { type: 'daftar_ongkos', name: 'Daftar Ongkos Perjalanan', isRequired: false, isChecked: false },
      { type: 'surat_kendis', name: 'Surat Pernyataan Kendaraan Dinas', isRequired: false, isChecked: false, note: 'Wajib ada jika kendaraan pribadi/umum' },
      { type: 'laporan_perjadin', name: 'Laporan Perjadin dan Dokumentasi', isRequired: true, isChecked: false },
    ],
  },
  'Belanja Bahan': {
    'Konsumsi': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'undangan', name: 'Undangan', isRequired: true, isChecked: false },
      { type: 'daftar_hadir', name: 'Daftar Hadir', isRequired: true, isChecked: false },
      { type: 'notulen', name: 'Notulen dan Dokumentasi Rapat', isRequired: true, isChecked: false },
      { type: 'bukti_pembelian', name: 'Komitmen/Kontrak/Bukti Pembelian/Kuitansi *)', isRequired: true, isChecked: false },
      { type: 'foto_konsumsi', name: 'Foto Konsumsi', isRequired: true, isChecked: false },
      { type: 'super_fasilitas', name: 'Super Fasilitas Kantor Tidak Memadai', isRequired: false, isChecked: false },
      { type: 'ssp', name: 'Surat Setor Pajak (SSP)', isRequired: false, isChecked: false },
    ],
    'Pulsa/Paket Data': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'bukti_pembelian', name: 'Komitmen/Kontrak/Bukti Pembelian/Kuitansi *)', isRequired: true, isChecked: false },
      { type: 'tanda_terima', name: 'Tanda Terima', isRequired: true, isChecked: false },
      { type: 'foto_penerimaan', name: 'Foto penerimaan paket data/pulsa', isRequired: true, isChecked: false },
      { type: 'ssp', name: 'Surat Setor Pajak (SSP)', isRequired: false, isChecked: false, note: 'dilengkapi Bendahara' },
    ],
    'Perlengkapan': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'bukti_pembelian', name: 'Komitmen/Kontrak/Bukti Pembelian/Kuitansi *)', isRequired: true, isChecked: false },
      { type: 'tanda_terima', name: 'Tanda Terima', isRequired: true, isChecked: false },
      { type: 'bast', name: 'Berita Acara Serah Terima (BAST)', isRequired: true, isChecked: false },
      { type: 'ssp', name: 'Surat Setor Pajak (SSP)', isRequired: false, isChecked: false, note: 'dilengkapi Bendahara' },
    ],
  },
  'Belanja Barang Persediaan': {
    'ATK dan Computer Supplies': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'bukti_pembelian', name: 'Komitmen/Kontrak/Bukti Pembelian/Kuitansi *)', isRequired: true, isChecked: false },
      { type: 'bukti_prestasi', name: 'Bukti Prestasi (BAPP/BAST/BAP)', isRequired: true, isChecked: false },
      { type: 'ssp', name: 'Surat Setor Pajak (SSP)', isRequired: false, isChecked: false, note: 'dilengkapi Bendahara' },
    ],
    'Pencetakan': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'bukti_pembelian', name: 'Komitmen/Kontrak/Bukti Pembelian/Kuitansi *)', isRequired: true, isChecked: false },
      { type: 'bukti_prestasi', name: 'Bukti Prestasi (BAPP/BAST/BAP)', isRequired: true, isChecked: false },
      { type: 'ssp', name: 'Surat Setor Pajak (SSP)', isRequired: false, isChecked: false, note: 'dilengkapi Bendahara' },
    ],
  },
  'Paket Meeting Dalam Kota': {
    'Paket Meeting': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan (FP)', isRequired: true, isChecked: false },
      { type: 'undangan', name: 'Undangan', isRequired: true, isChecked: false },
      { type: 'jadwal', name: 'Jadwal Kegiatan', isRequired: true, isChecked: false },
      { type: 'surat_tugas', name: 'Surat Tugas', isRequired: true, isChecked: false },
      { type: 'daftar_hadir', name: 'Daftar Hadir', isRequired: true, isChecked: false },
      { type: 'notulen', name: 'Notulen/Laporan dan Dokumentasi Rapat', isRequired: true, isChecked: false },
      { type: 'super_fasilitas', name: 'Super Fasilitas Kantor Tidak Memadai', isRequired: false, isChecked: false, note: 'dilengkapi oleh Subject Meter' },
      { type: 'kontrak', name: 'Komitmen/Kontrak *)', isRequired: true, isChecked: false },
      { type: 'bukti_prestasi', name: 'Bukti Prestasi (BAPP/BAST/BAP)', isRequired: true, isChecked: false },
      { type: 'room_list', name: 'Room List', isRequired: false, isChecked: false, note: 'Wajib ada jika Fullboard' },
      { type: 'invoice_kuitansi', name: 'Invoice/Kuitansi', isRequired: true, isChecked: false },
      { type: 'npwp_rekening', name: 'Fc. NPWP dan Rek Koran', isRequired: true, isChecked: false },
      { type: 'ssp', name: 'Surat Setor Pajak (SSP)', isRequired: false, isChecked: false, note: 'dilengkapi Bendahara' },
    ],
    'Perjalanan': [
      { type: 'kak', name: 'Kerangka Acuan Kerja (KAK)', isRequired: true, isChecked: false },
      { type: 'form_permintaan', name: 'Form Permintaan', isRequired: true, isChecked: false },
      { type: 'undangan', name: 'Undangan', isRequired: true, isChecked: false },
      { type: 'jadwal', name: 'Jadwal Kegiatan', isRequired: true, isChecked: false },
      { type: 'surat_tugas', name: 'Surat Tugas', isRequired: true, isChecked: false },
      { type: 'daftar_hadir', name: 'Daftar Hadir', isRequired: true, isChecked: false },
      { type: 'notulen', name: 'Notulen/Laporan dan Dokumentasi Rapat', isRequired: true, isChecked: false },
      { type: 'spd_super', name: 'SPD, Super Kendis, Daftar Uang Harian', isRequired: true, isChecked: false },
      { type: 'ssp', name: 'Surat Setor Pajak (SSP)', isRequired: false, isChecked: false, note: 'dilengkapi Bendahara' },
    ],
  },
};

export function getDocumentsByJenisBelanja(jenisBelanja: string, subJenis?: string): Document[] {
  if (!jenisBelanja || !subJenis) return [];
  
  const subDocs = DOCUMENTS_BY_SUB_JENIS[jenisBelanja];
  if (!subDocs) return [];
  
  const docs = subDocs[subJenis];
  if (!docs) return [];
  
  return docs.map(doc => ({ ...doc }));
}

export function generateSubmissionId(existingIds: string[]): string {
  const prefix = 'SUB';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  let maxNum = 0;
  existingIds.forEach(id => {
    const match = id.match(/SUB\d{4}(\d{4})/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  
  const newNum = (maxNum + 1).toString().padStart(4, '0');
  return `${prefix}${year}${month}${newNum}`;
}

export function canCreateSubmission(role: UserRole): boolean {
  return SUBMITTER_ROLES.includes(role) || role === 'admin';
}

export function canTakeAction(role: UserRole, status: SubmissionStatus): boolean {
  if (role === 'admin') return true;
  if (role === 'Bendahara' && (status === 'pending_bendahara' || status === 'incomplete_bendahara')) return true;
  if (role === 'Pejabat Pembuat Komitmen' && (status === 'pending_ppk' || status === 'incomplete_ppk')) return true;
  if (role === 'Pejabat Penandatangan Surat Perintah Membayar' && (status === 'pending_ppspm' || status === 'incomplete_ppspm')) return true;
  if (role === 'Arsip' && (status === 'sent_kppn' || status === 'incomplete_kppn')) return true;
  return false;
}

export function canReturnFromArsip(role: UserRole, status: SubmissionStatus): boolean {
  return (role === 'Arsip' || role === 'admin') && status === 'sent_kppn';
}

export function canViewDetail(role: UserRole, status: SubmissionStatus): boolean {
  return true;
}

export function canEdit(role: UserRole, status: SubmissionStatus): boolean {
  if (role === 'admin') return true;
  if (SUBMITTER_ROLES.includes(role) && status === 'incomplete_sm') return true;
  if (SUBMITTER_ROLES.includes(role) && status === 'draft') return true; // ← TAMBAH INI
  return false;
}

export function getRelevantTimestamp(submission: Submission): string | null {
  if (submission.status === 'complete_arsip' && submission.waktuArsip) {
    return submission.waktuArsip;
  }
  if ((submission.status === 'sent_kppn' || submission.status === 'incomplete_kppn') && submission.waktuKppn) {
    return submission.waktuKppn;
  }
  if (['pending_ppspm', 'incomplete_ppspm'].includes(submission.status) && submission.waktuPPSPM) {
    return submission.waktuPPSPM;
  }
  if (['pending_ppk', 'incomplete_ppk'].includes(submission.status) && submission.waktuPpk) {
    return submission.waktuPpk;
  }
  if (['pending_bendahara', 'incomplete_bendahara'].includes(submission.status) && submission.waktuBendahara) {
    return submission.waktuBendahara;
  }
  return submission.waktuPengajuan || null;
}
