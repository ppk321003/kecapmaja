// Types for Sikostik28 Koperasi System

export interface AnggotaMaster {
  id: string;
  kodeAnggota: string;
  nama: string;
  nip: string;
  status: 'Aktif' | 'Tidak Aktif';
  tanggalBergabung: string;
  foto?: string;
}

export interface RekapDashboard {
  no: number;
  anggotaId: string;
  kodeAnggota: string;
  nama: string;
  nip: string;
  status: 'Aktif' | 'Tidak Aktif';
  periodeBulan: number;
  periodeTahun: number;
  saldoPiutang: number;
  simpananPokok: number;
  simpananWajib: number;
  simpananSukarela: number;
  simpananLebaran: number;
  simpananLainnya: number;
  totalSimpanan: number;
  totalSimpananBulanan: number;
  pinjamanBulanIni: number;
  pengambilanPokok: number;
  pengambilanWajib: number;
  pengambilanSukarela: number;
  pengambilanLebaran: number;
  pengambilanLainnya: number;
  totalPengambilan: number;
  biayaOperasional: number;
  cicilanPokok: number;
  saldoAkhirbulanPokok: number;
  saldoAkhirbulanWajib: number;
  saldoAkhirbulanSukarela: number;
  saldoAkhirbulanLebaran: number;
  saldoAkhirbulanLainlain: number;
  createdAt: string;
  updatedAt: string;
}

export interface LimitAnggota {
  anggotaId: string;
  nama: string;
  nip: string;
  totalSimpanan: number;
  totalPinjamanKumulatif: number;
  saldoPiutang: number;
  limitPinjaman: number;
  sisaLimit: number;
  cicilanPokok: number;
  totalSimpananKumulatif?: number;
}

export interface UsulPinjaman {
  id: string;
  anggotaId: string;
  nama: string;
  nip: string;
  jumlahPinjaman: number;
  jangkaWaktu: number;
  cicilanPokok: number;
  tujuanPinjaman: string;
  tanggalUsul: string;
  status: 'Proses' | 'Disetujui' | 'Ditolak';
  keterangan: string;
}

export interface UsulPerubahan {
  id: string;
  anggotaId: string;
  nama: string;
  nip: string;
  jenisPerubahan: string;
  nilaiLama: number;
  nilaiBaru: number;
  alasanPerubahan: string;
  tanggalUsul: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak';
  keterangan: string;
}

export interface UsulPengambilan {
  id: string;
  anggotaId: string;
  nama: string;
  nip: string;
  jenisPengambilan: 'Pokok' | 'Sukarela' | 'Lebaran' | 'Lainnya';
  jumlahPengambilan: number;
  alasanPengambilan: string;
  tanggalUsul: string;
  status: 'Proses' | 'Disetujui' | 'Ditolak';
  keterangan: string;
}

export interface RiwayatTransaksi {
  id: string;
  anggotaId: string;
  tanggal: string;
  jenisTransaksi: string;
  jumlah: number;
  keterangan: string;
}

// NIP Parsing utilities
export interface NIPInfo {
  birthDate: Date;
  retirementDate: Date;
  remainingWorkMonths: number;
  isNearRetirement: boolean;
}
