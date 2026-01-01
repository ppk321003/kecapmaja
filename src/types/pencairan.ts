// Types untuk Usulan Pencairan

export type SubmissionStatus = 
  | 'pending_ppk'
  | 'pending_bendahara'
  | 'incomplete_sm'
  | 'incomplete_ppk'
  | 'incomplete_bendahara'
  | 'sent_kppn';

export type UserRole = 
  | 'Fungsi Sosial'
  | 'Fungsi Neraca'
  | 'Fungsi Produksi'
  | 'Fungsi Distribusi'
  | 'Fungsi IPDS'
  | 'Pejabat Pembuat Komitmen'
  | 'Bendahara'
  | 'admin';

// Roles yang bisa mengajukan
export const SUBMITTER_ROLES: UserRole[] = [
  'Fungsi Sosial',
  'Fungsi Neraca',
  'Fungsi Produksi',
  'Fungsi Distribusi',
  'Fungsi IPDS',
];

export type DocumentType = 
  | 'spp'
  | 'sptb'
  | 'kwitansi'
  | 'faktur'
  | 'surat_tugas'
  | 'laporan'
  | 'daftar_hadir'
  | 'foto'
  | 'bast'
  | 'spk'
  | 'invoice'
  | 'other';

export interface Document {
  type: DocumentType;
  name: string;
  isRequired: boolean;
  isChecked: boolean;
}

export interface Submission {
  id: string;
  title: string;
  submitterName: string;
  jenisBelanja: string;
  subJenisBelanja?: string;
  submittedAt: Date;
  status: SubmissionStatus;
  documents: Document[];
  notes?: string;
  waktuPengajuan?: string;
  waktuPpk?: string;
  waktuBendahara?: string;
  statusPpk?: string;
  statusBendahara?: string;
  statusKppn?: string;
  ppkCheckedAt?: Date;
  bendaharaCheckedAt?: Date;
  sentToKppnAt?: Date;
}

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending_ppk: 'Menunggu PPK',
  pending_bendahara: 'Menunggu Bendahara',
  incomplete_sm: 'Dikembalikan ke SM',
  incomplete_ppk: 'Dikembalikan ke PPK',
  incomplete_bendahara: 'Dikembalikan ke Bendahara',
  sent_kppn: 'Dikirim ke KPPN',
};

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  spp: 'Surat Permintaan Pembayaran',
  sptb: 'Surat Pernyataan Tanggung Jawab Belanja',
  kwitansi: 'Kwitansi',
  faktur: 'Faktur/Invoice',
  surat_tugas: 'Surat Tugas',
  laporan: 'Laporan Kegiatan',
  daftar_hadir: 'Daftar Hadir',
  foto: 'Dokumentasi Foto',
  bast: 'Berita Acara Serah Terima',
  spk: 'Surat Perintah Kerja',
  invoice: 'Invoice',
  other: 'Dokumen Lainnya',
};

export const JENIS_BELANJA_OPTIONS = [
  'Honor',
  'Perjalanan Dinas',
  'Pengadaan Barang',
  'Pengadaan Jasa',
  'Lembur',
  'Transport Lokal',
  'Uang Harian',
  'Lainnya',
];

export const SUB_JENIS_BELANJA: Record<string, string[]> = {
  'Honor': ['Honor Kegiatan', 'Honor Narasumber', 'Honor Panitia'],
  'Perjalanan Dinas': ['Dalam Kota', 'Luar Kota', 'Luar Negeri'],
  'Pengadaan Barang': ['ATK', 'Peralatan', 'Konsumsi', 'Lainnya'],
  'Pengadaan Jasa': ['Jasa Konsultan', 'Jasa Teknis', 'Jasa Lainnya'],
  'Lembur': ['Lembur Hari Kerja', 'Lembur Hari Libur'],
  'Transport Lokal': ['Dalam Kabupaten', 'Luar Kabupaten'],
  'Uang Harian': ['Fullday', 'Halfday'],
  'Lainnya': ['Lainnya'],
};

export const DOCUMENTS_BY_JENIS: Record<string, Document[]> = {
  'Honor': [
    { type: 'spp', name: 'SPP/SPM', isRequired: true, isChecked: false },
    { type: 'sptb', name: 'SPTB', isRequired: true, isChecked: false },
    { type: 'daftar_hadir', name: 'Daftar Hadir', isRequired: true, isChecked: false },
    { type: 'laporan', name: 'Laporan Kegiatan', isRequired: true, isChecked: false },
    { type: 'foto', name: 'Dokumentasi', isRequired: false, isChecked: false },
  ],
  'Perjalanan Dinas': [
    { type: 'spp', name: 'SPP/SPM', isRequired: true, isChecked: false },
    { type: 'sptb', name: 'SPTB', isRequired: true, isChecked: false },
    { type: 'surat_tugas', name: 'Surat Tugas', isRequired: true, isChecked: false },
    { type: 'laporan', name: 'Laporan Perjalanan', isRequired: true, isChecked: false },
    { type: 'kwitansi', name: 'Kwitansi Penginapan', isRequired: false, isChecked: false },
    { type: 'foto', name: 'Dokumentasi', isRequired: false, isChecked: false },
  ],
  'Pengadaan Barang': [
    { type: 'spp', name: 'SPP/SPM', isRequired: true, isChecked: false },
    { type: 'sptb', name: 'SPTB', isRequired: true, isChecked: false },
    { type: 'spk', name: 'SPK', isRequired: true, isChecked: false },
    { type: 'bast', name: 'BAST', isRequired: true, isChecked: false },
    { type: 'faktur', name: 'Faktur/Invoice', isRequired: true, isChecked: false },
    { type: 'kwitansi', name: 'Kwitansi', isRequired: true, isChecked: false },
  ],
  'Pengadaan Jasa': [
    { type: 'spp', name: 'SPP/SPM', isRequired: true, isChecked: false },
    { type: 'sptb', name: 'SPTB', isRequired: true, isChecked: false },
    { type: 'spk', name: 'SPK/Kontrak', isRequired: true, isChecked: false },
    { type: 'bast', name: 'BAST', isRequired: true, isChecked: false },
    { type: 'invoice', name: 'Invoice', isRequired: true, isChecked: false },
    { type: 'laporan', name: 'Laporan Hasil Kerja', isRequired: true, isChecked: false },
  ],
  'Lembur': [
    { type: 'spp', name: 'SPP/SPM', isRequired: true, isChecked: false },
    { type: 'sptb', name: 'SPTB', isRequired: true, isChecked: false },
    { type: 'daftar_hadir', name: 'Daftar Hadir Lembur', isRequired: true, isChecked: false },
    { type: 'laporan', name: 'Laporan Hasil Lembur', isRequired: true, isChecked: false },
  ],
  'Transport Lokal': [
    { type: 'spp', name: 'SPP/SPM', isRequired: true, isChecked: false },
    { type: 'sptb', name: 'SPTB', isRequired: true, isChecked: false },
    { type: 'daftar_hadir', name: 'Daftar Hadir', isRequired: true, isChecked: false },
    { type: 'surat_tugas', name: 'Surat Tugas', isRequired: false, isChecked: false },
  ],
  'Uang Harian': [
    { type: 'spp', name: 'SPP/SPM', isRequired: true, isChecked: false },
    { type: 'sptb', name: 'SPTB', isRequired: true, isChecked: false },
    { type: 'daftar_hadir', name: 'Daftar Hadir', isRequired: true, isChecked: false },
    { type: 'laporan', name: 'Laporan Kegiatan', isRequired: true, isChecked: false },
  ],
  'Lainnya': [
    { type: 'spp', name: 'SPP/SPM', isRequired: true, isChecked: false },
    { type: 'sptb', name: 'SPTB', isRequired: true, isChecked: false },
    { type: 'kwitansi', name: 'Kwitansi', isRequired: false, isChecked: false },
    { type: 'other', name: 'Dokumen Pendukung', isRequired: false, isChecked: false },
  ],
};

export function getDocumentsByJenisBelanja(jenisBelanja: string, subJenis?: string): Document[] {
  const docs = DOCUMENTS_BY_JENIS[jenisBelanja] || DOCUMENTS_BY_JENIS['Lainnya'];
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
  if (role === 'Pejabat Pembuat Komitmen' && (status === 'pending_ppk' || status === 'incomplete_ppk')) return true;
  if (role === 'Bendahara' && (status === 'pending_bendahara' || status === 'incomplete_bendahara')) return true;
  return false;
}

export function canReturnFromKppn(role: UserRole, status: SubmissionStatus): boolean {
  return (role === 'Pejabat Pembuat Komitmen' || role === 'admin') && status === 'sent_kppn';
}

export function canViewDetail(role: UserRole, status: SubmissionStatus): boolean {
  return true;
}

export function canEdit(role: UserRole, status: SubmissionStatus): boolean {
  if (role === 'admin') return true;
  if (SUBMITTER_ROLES.includes(role) && status === 'incomplete_sm') return true;
  return false;
}

export function getRelevantTimestamp(submission: Submission): string | null {
  if (submission.status === 'sent_kppn' && submission.waktuBendahara) {
    return submission.waktuBendahara;
  }
  if (['pending_bendahara', 'incomplete_bendahara'].includes(submission.status) && submission.waktuPpk) {
    return submission.waktuPpk;
  }
  return submission.waktuPengajuan || null;
}
