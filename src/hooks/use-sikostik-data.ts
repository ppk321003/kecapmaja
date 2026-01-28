import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  AnggotaMaster, 
  RekapDashboard, 
  LimitAnggota, 
  UsulPinjaman, 
  UsulPerubahan,
  NIPInfo
} from '@/types/sikostik';
import { parseIndonesianNumber, roundToThousand } from '@/lib/parseNumber';

// Re-export for convenience
export { roundToThousand };

const SIKOSTIK_SPREADSHEET_ID = "1cBuo9tAtpGvKuThvotIQqd9HDvJfF2Hun61oGYhRtHk";
const ORGANIK_SPREADSHEET_ID = "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM";

// Helper to parse numbers from spreadsheet
const parseNum = (value: any): number => parseIndonesianNumber(value);

// Utility: parse NIP untuk menghitung masa pensiun
export const parseNIP = (nip: string): NIPInfo | null => {
  if (!nip || nip.length < 16) return null;
  
  try {
    // Format NIP: YYYYMMDD XXXXXX X XXX
    // First 8 digits = birth date (YYYYMMDD)
    const birthYear = parseInt(nip.substring(0, 4));
    const birthMonth = parseInt(nip.substring(4, 6)) - 1;
    const birthDay = parseInt(nip.substring(6, 8));
    
    const birthDate = new Date(birthYear, birthMonth, birthDay);
    
    // Retirement age is 58 years
    const retirementDate = new Date(birthDate);
    retirementDate.setFullYear(retirementDate.getFullYear() + 58);
    
    const now = new Date();
    const monthsRemaining = Math.max(0, 
      (retirementDate.getFullYear() - now.getFullYear()) * 12 + 
      (retirementDate.getMonth() - now.getMonth())
    );
    
    return {
      birthDate,
      retirementDate,
      remainingWorkMonths: monthsRemaining,
      isNearRetirement: monthsRemaining <= 36
    };
  } catch {
    return null;
  }
};

export const formatNIP = (nip: string): string => {
  if (!nip) return '-';
  // Format: XXXXXXXX XXXXXX X XXX
  if (nip.length === 18) {
    return `${nip.slice(0, 8)} ${nip.slice(8, 14)} ${nip.slice(14, 15)} ${nip.slice(15)}`;
  }
  return nip;
};

export const getRetirementStatusText = (months: number): string => {
  if (months <= 0) return 'Sudah Pensiun';
  if (months <= 12) return `${months} bulan`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (remainingMonths === 0) return `${years} tahun`;
  return `${years} tahun ${remainingMonths} bulan`;
};

// Period utilities
export const getCurrentPeriod = () => {
  const now = new Date();
  return {
    bulan: now.getMonth() + 1,
    tahun: now.getFullYear()
  };
};

export const bulanOptions = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
];

export const getTahunOptions = () => {
  const currentYear = new Date().getFullYear();
  return [
    { value: currentYear - 1, label: (currentYear - 1).toString() },
    { value: currentYear, label: currentYear.toString() },
    { value: currentYear + 1, label: (currentYear + 1).toString() }
  ];
};

export const formatPeriode = (bulan: number, tahun: number): string => {
  const bulanName = bulanOptions.find(b => b.value === bulan)?.label || '';
  return `${bulanName} ${tahun}`;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

export const useSikostikData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSheet = useCallback(async (sheetName: string, spreadsheetId: string = SIKOSTIK_SPREADSHEET_ID) => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: spreadsheetId,
          operation: "read",
          range: sheetName
        }
      });

      if (error) throw error;
      
      const rows = data?.values || [];
      if (rows.length <= 1) return [];
      
      const headers = rows[0];
      return rows.slice(1).map((row: any[]) => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          // Normalize header to camelCase
          const key = header.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          obj[key] = row[index] ?? '';
        });
        return obj;
      });
    } catch (err: any) {
      console.error(`Error fetching ${sheetName}:`, err);
      throw err;
    }
  }, []);

  const fetchAnggotaMaster = useCallback(async (): Promise<AnggotaMaster[]> => {
    setLoading(true);
    setError(null);
    try {
      // Fetch anggota data from anggota_master
      const anggotaData = await fetchSheet('anggota_master');
      
      // Fetch foto data from MASTER.ORGANIK
      let fotoMap: Record<string, string> = {};
      try {
        console.log('Fetching foto from MASTER.ORGANIK...');
        const organisasiData = await fetchSheet('MASTER.ORGANIK', ORGANIK_SPREADSHEET_ID);
        
        console.log('✓ Successfully fetched MASTER.ORGANIK with', organisasiData.length, 'rows');
        
        fotoMap = organisasiData.reduce((acc: Record<string, string>, row: any) => {
          const nip = (row.nip || row['NIP'] || row.nipbps || row['NIP BPS'] || '').trim();
          let foto = row.foto || row['Foto'] || '';
          
          // Convert Google Drive URL to viewable format
          if (foto && foto.includes('drive.google.com/file/d/')) {
            const fileIdMatch = foto.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (fileIdMatch) {
              const fileId = fileIdMatch[1];
              foto = `https://lh3.googleusercontent.com/d/${fileId}`;
            }
          }
          
          if (nip && foto) {
            acc[nip] = foto;
            console.log(`✓ Added to fotoMap: ${nip} -> ${foto.substring(0, 50)}...`);
          }
          return acc;
        }, {});
        
        console.log('✓ FotoMap created with', Object.keys(fotoMap).length, 'entries');
      } catch (err) {
        console.warn('Exception fetching MASTER.ORGANIK:', err);
        console.log('Using empty fotoMap');
      }
      
      return anggotaData.map((row: any) => {
        const nip = (row.nip || row['NIP'] || '').trim();
        const foto = fotoMap[nip] || '';

        return {
          id: row.id || row.kodeAnggota || '',
          kodeAnggota: row.kodeAnggota || row.kode || '',
          nama: row.nama || '',
          nip: row.nip || '',
          status: row.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif',
          tanggalBergabung: row.tanggalBergabung || row.tglBergabung || '',
          foto: foto
        };
      });
    } catch (err: any) {
      console.error('Error fetching anggota master:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchSheet]);

  const fetchRekapDashboard = useCallback(async (bulan?: number, tahun?: number): Promise<RekapDashboard[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSheet('rekap_dashboard');
      const period = { bulan: bulan || getCurrentPeriod().bulan, tahun: tahun || getCurrentPeriod().tahun };
      
      return data
        .filter((row: any) => {
          const rowBulan = parseInt(row.periodeBulan || row.bulan || 0);
          const rowTahun = parseInt(row.periodeTahun || row.tahun || 0);
          return rowBulan === period.bulan && rowTahun === period.tahun;
        })
        .map((row: any, index: number) => ({
          no: index + 1,
          anggotaId: row.anggotaId || row.id || '',
          kodeAnggota: row.kodeAnggota || '',
          nama: row.nama || '',
          nip: row.nip || '',
          status: row.status === 'Aktif' ? 'Aktif' : 'Tidak Aktif',
          periodeBulan: parseInt(row.periodeBulan || row.bulan || 0),
          periodeTahun: parseInt(row.periodeTahun || row.tahun || 0),
          saldoPiutang: parseNum(row.saldoPiutang),
          // Simpanan BULANAN dari kolom K-O (simpanan_pokok, simpanan_wajib, etc.) - potongan per bulan
          simpananPokok: parseNum(row.simpananPokok),
          simpananWajib: parseNum(row.simpananWajib),
          simpananSukarela: parseNum(row.simpananSukarela),
          simpananLebaran: parseNum(row.simpananLebaran),
          simpananLainnya: parseNum(row.simpananLainnya),
          // Total Simpanan KUMULATIF = sum(Z:AD) = saldo_akhirbulan_pokok + wajib + sukarela + lebaran + lainlain
          saldoAkhirbulanPokok: parseNum(row.saldoAkhirbulanPokok),
          saldoAkhirbulanWajib: parseNum(row.saldoAkhirbulanWajib),
          saldoAkhirbulanSukarela: parseNum(row.saldoAkhirbulanSukarela),
          saldoAkhirbulanLebaran: parseNum(row.saldoAkhirbulanLebaran),
          saldoAkhirbulanLainlain: parseNum(row.saldoAkhirbulanLainlain),
          totalSimpanan: parseNum(row.saldoAkhirbulanPokok) +
                         parseNum(row.saldoAkhirbulanWajib) +
                         parseNum(row.saldoAkhirbulanSukarela) +
                         parseNum(row.saldoAkhirbulanLebaran) +
                         parseNum(row.saldoAkhirbulanLainlain),
          // Total Simpanan Bulanan = sum(K:O) - potongan simpanan per bulan
          totalSimpananBulanan: parseNum(row.simpananPokok) +
                                parseNum(row.simpananWajib) +
                                parseNum(row.simpananSukarela) +
                                parseNum(row.simpananLebaran) +
                                parseNum(row.simpananLainnya),
          pinjamanBulanIni: parseNum(row.pinjamanBulanIni),
          pengambilanPokok: parseNum(row.pengambilanPokok),
          pengambilanWajib: parseNum(row.pengambilanWajib),
          pengambilanSukarela: parseNum(row.pengambilanSukarela),
          pengambilanLebaran: parseNum(row.pengambilanLebaran),
          pengambilanLainnya: parseNum(row.pengambilanLainnya),
          totalPengambilan: parseNum(row.totalPengambilan),
          biayaOperasional: parseNum(row.biayaOperasional),
          // Cicilan Pokok dari kolom R (cicilan_pokok)
          cicilanPokok: parseNum(row.cicilanPokok),
          createdAt: row.createdAt || '',
          updatedAt: row.updatedAt || ''
        }));
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchSheet]);

  const fetchLimitAnggota = useCallback(async (): Promise<LimitAnggota[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSheet('rekap_dashboard');
      
      // Group by anggotaId and calculate limit
      const limitMap = new Map<string, LimitAnggota>();
      
      data.forEach((row: any) => {
        const anggotaId = row.anggotaId || row.id || '';
        if (!anggotaId) return;
        
        // Total Simpanan = sum(Z:AD) = saldo_akhirbulan_pokok + wajib + sukarela + lebaran + lainlain
        const totalSimpanan = parseNum(row.saldoAkhirbulanPokok) +
                              parseNum(row.saldoAkhirbulanWajib) +
                              parseNum(row.saldoAkhirbulanSukarela) +
                              parseNum(row.saldoAkhirbulanLebaran) +
                              parseNum(row.saldoAkhirbulanLainlain);
        // Saldo Piutang dari kolom J
        const saldoPiutang = parseNum(row.saldoPiutang);
        
        // Limit Pinjaman = Total Simpanan × 1.5
        const limitPinjaman = Math.max(0, totalSimpanan * 1.5);
        // Sisa Limit = (Total Simpanan × 1.5) - Saldo Piutang
        const sisaLimit = Math.max(0, limitPinjaman - saldoPiutang);
        
        limitMap.set(anggotaId, {
          anggotaId,
          nama: row.nama || '',
          nip: row.nip || '',
          totalSimpanan,
          totalPinjamanKumulatif: saldoPiutang,
          saldoPiutang,
          limitPinjaman,
          sisaLimit,
          // Cicilan Saat Ini dari kolom R (cicilan_pokok)
          cicilanPokok: parseNum(row.cicilanPokok)
        });
      });
      
      return Array.from(limitMap.values());
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchSheet]);

  const fetchUsulPinjaman = useCallback(async (): Promise<UsulPinjaman[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSheet('usul_pinjaman');
      return data
        .map((row: any) => ({
          id: row.id || '',
          anggotaId: row.anggotaId || '',
          nama: row.nama || '',
          nip: row.nip || '',
          jumlahPinjaman: parseNum(row.jumlahPinjaman),
          jangkaWaktu: parseInt(row.jangkaWaktu) || 0,
          cicilanPokok: parseNum(row.cicilanPokok),
          tujuanPinjaman: row.tujuanPinjaman || '',
          tanggalUsul: row.tanggalUsul || '',
          status: row.status || 'Proses',
          keterangan: row.keterangan || ''
        }))
        .filter(item => item.nama && item.nip); // Filter out empty rows
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchSheet]);

  const fetchUsulPerubahan = useCallback(async (): Promise<UsulPerubahan[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSheet('usul_perubahan');
      return data.map((row: any) => ({
        id: row.id || '',
        anggotaId: row.anggotaId || '',
        nama: row.nama || '',
        nip: row.nip || '',
        jenisPerubahan: row.jenisPerubahan || '',
        nilaiLama: parseNum(row.nilaiLama),
        nilaiBaru: parseNum(row.nilaiBaru),
        alasanPerubahan: row.alasanPerubahan || '',
        tanggalUsul: row.tanggalUsul || '',
        status: row.status || 'Menunggu',
        keterangan: row.keterangan || ''
      }));
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchSheet]);

  const appendToSheet = useCallback(async (sheetName: string, values: any[][]) => {
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SIKOSTIK_SPREADSHEET_ID,
          operation: "append",
          range: sheetName,
          values
        }
      });

      if (error) throw error;
      return data;
    } catch (err: any) {
      console.error(`Error appending to ${sheetName}:`, err);
      throw err;
    }
  }, []);

  const submitUsulPinjaman = useCallback(async (data: {
    anggotaId: string;
    nama: string;
    nip: string;
    jumlahPinjaman: number;
    jangkaWaktu: number;
    cicilanPokok: number;
    tujuanPinjaman: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const id = `UP-${Date.now()}`;
      const tanggalUsul = new Date().toISOString().split('T')[0];
      const values = [[
        id,
        data.anggotaId,
        data.nama,
        data.nip,
        data.jumlahPinjaman,
        data.jangkaWaktu,
        data.cicilanPokok,
        data.tujuanPinjaman,
        tanggalUsul,
        'Proses',
        ''
      ]];
      await appendToSheet('usul_pinjaman', values);
      return { success: true, id };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [appendToSheet]);

  const submitUsulPerubahan = useCallback(async (data: {
    anggotaId: string;
    nama: string;
    nip: string;
    jenisPerubahan: string;
    nilaiLama: number;
    nilaiBaru: number;
    alasanPerubahan: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const id = `UB-${Date.now()}`;
      const tanggalUsul = new Date().toISOString().split('T')[0];
      const values = [[
        id,
        data.anggotaId,
        data.nama,
        data.nip,
        data.jenisPerubahan,
        data.nilaiLama,
        data.nilaiBaru,
        data.alasanPerubahan,
        tanggalUsul,
        'Menunggu',
        ''
      ]];
      await appendToSheet('usul_perubahan', values);
      return { success: true, id };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [appendToSheet]);

  return {
    loading,
    error,
    fetchAnggotaMaster,
    fetchRekapDashboard,
    fetchLimitAnggota,
    fetchUsulPinjaman,
    fetchUsulPerubahan,
    submitUsulPinjaman,
    submitUsulPerubahan
  };
};
