import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';
import { 
  AnggotaMaster, 
  RekapDashboard, 
  LimitAnggota, 
  UsulPinjaman, 
  UsulPerubahan,
  UsulPengambilan,
  NIPInfo
} from '@/types/sikostik';
import { parseIndonesianNumber, roundToThousand } from '@/lib/parseNumber';

// Re-export for convenience
export { roundToThousand };

// Default fallback untuk compatibility
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
  const satkerContext = useSatkerConfigContext();
  
  // Dapatkan sheet ID berdasarkan satker user (reactive setelah satkerConfig dimuat)
  const userSheetId = useMemo(() => {
    return satkerContext?.getUserSatkerSheetId('tagging') || SIKOSTIK_SPREADSHEET_ID;
  }, [satkerContext?.isLoading, satkerContext?.configs?.length, satkerContext?.error]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSheet = useCallback(async (sheetName: string, spreadsheetId?: string) => {
    // Fix: spreadsheetId parameter takes precedence, fallback to userSheetId if not provided
    const idToUse = spreadsheetId || userSheetId;
    try {
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: idToUse,
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
  }, [userSheetId]);

  const fetchAnggotaMaster = useCallback(async (): Promise<AnggotaMaster[]> => {
    setLoading(true);
    setError(null);
    try {
      // Fetch anggota data from anggota_master (central SIKOSTIK spreadsheet)
      const anggotaData = await fetchSheet('anggota_master', SIKOSTIK_SPREADSHEET_ID);
      
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
      const data = await fetchSheet('rekap_dashboard', SIKOSTIK_SPREADSHEET_ID);
      // Debug: log data summary to help troubleshoot missing RekapIndividu data
      try {
        console.log(`fetchRekapDashboard: fetched ${data.length} rows for sheet rekap_dashboard (bulan=${bulan}, tahun=${tahun})`);
        if (data.length > 0) {
          console.log('fetchRekapDashboard: sample row keys ->', Object.keys(data[0]).slice(0, 20));
        }
      } catch (e) {
        /* ignore logging errors */
      }
      const period = { bulan: bulan || getCurrentPeriod().bulan, tahun: tahun || getCurrentPeriod().tahun };
      
      // Filter by period
      const filteredByPeriod = data.filter((row: any) => {
        const rowBulan = parseInt(row.periodeBulan || row.bulan || 0);
        const rowTahun = parseInt(row.periodeTahun || row.tahun || 0);
        return rowBulan === period.bulan && rowTahun === period.tahun;
      });

      // Deduplicate by anggotaId: prioritize entries with NIP
      const deduplicatedMap = new Map<string, any>();
      
      filteredByPeriod.forEach((row: any) => {
        const anggotaId = row.anggotaId || row.id || '';
        if (!anggotaId) return;
        
        const existing = deduplicatedMap.get(anggotaId);
        const hasNip = row.nip && String(row.nip).trim() !== '';
        
        // Keep the entry with NIP, or if both have/don't have NIP, keep existing (first occurrence)
        if (!existing || (!existing.nip && hasNip)) {
          deduplicatedMap.set(anggotaId, row);
        }
      });

      // Convert map back to array and map to RekapDashboard objects
      return Array.from(deduplicatedMap.values())
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
      const data = await fetchSheet('rekap_dashboard', SIKOSTIK_SPREADSHEET_ID);
      
      // Group by anggotaId and calculate limit
      // Deduplicate: prioritize entries with NIP and latest data
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
        
        // Limit Pinjaman = Total Simpanan × 1.3 (updated policy)
        const limitPinjaman = Math.max(0, totalSimpanan * 1.3);
        // Sisa Limit = (Total Simpanan × 1.3) - Saldo Piutang
        const sisaLimit = Math.max(0, limitPinjaman - saldoPiutang);
        
        const newEntry: LimitAnggota = {
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
        };
        
        const existing = limitMap.get(anggotaId);
        // Keep the entry with NIP, or if both have NIP/no NIP, keep the one with more data
        if (!existing || (!existing.nip && newEntry.nip) || (existing.nip === newEntry.nip && newEntry.totalSimpanan > existing.totalSimpanan)) {
          limitMap.set(anggotaId, newEntry);
        }
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
      const data = await fetchSheet('usul_pinjaman', SIKOSTIK_SPREADSHEET_ID);
      return data
        .map((row: any) => ({
          id: row.id || row['ID'] || '',
          anggotaId: row.anggotaId || row['anggota_id'] || row['Anggota ID'] || '',
          nama: row.nama || row['Nama'] || '',
          nip: row.nip || row['NIP'] || '',
          jumlahPinjaman: parseNum(row.jumlahPinjaman || row['jumlah_pinjaman'] || row['Jumlah Pinjaman']),
          jangkaWaktu: parseInt(row.jangkaWaktu || row['jangka_waktu'] || row['Jangka Waktu'] || 0),
          cicilanPokok: parseNum(row.cicilanPokok || row['cicilan_pokok'] || row['Cicilan Pokok']),
          tujuanPinjaman: row.tujuanPinjaman || row['tujuan_pinjaman'] || row['Tujuan Pinjaman'] || '',
          tanggalUsul: row.tanggalUsul || row['tanggal_usul'] || row['Tanggal Usul'] || '',
          status: row.status || row['Status'] || 'Proses',
          keterangan: '' // Sheet usul_pinjaman doesn't have keterangan column
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
      const data = await fetchSheet('usul_perubahan', SIKOSTIK_SPREADSHEET_ID);
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
      console.log(`Appending to sheet ${sheetName}:`, values);
      
      const { data, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: SIKOSTIK_SPREADSHEET_ID,
          operation: "append",
          range: sheetName,
          values
        }
      });

      if (error) {
        console.error(`Error response from google-sheets function:`, error);
        throw new Error(error.message || 'Unknown error from google-sheets function');
      }
      
      console.log(`Successfully appended to sheet ${sheetName}:`, data);
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
      // Sheet usul_pinjaman has 10 columns: id, anggotaId, nama, nip, jumlahPinjaman, jangkaWaktu, cicilanPokok, tujuanPinjaman, tanggalUsul, status
      const values = [[
        String(id),
        String(data.anggotaId),
        String(data.nama),
        String(data.nip),
        String(data.jumlahPinjaman),
        String(data.jangkaWaktu),
        String(data.cicilanPokok),
        String(data.tujuanPinjaman),
        String(tanggalUsul),
        'Proses'
      ]];
      
      console.log('submitUsulPinjaman values:', values[0]);
      console.log('submitUsulPinjaman values count:', values[0].length);
      
      await appendToSheet('usul_pinjaman', values);
      return { success: true, id };
    } catch (err: any) {
      console.error('submitUsulPinjaman error:', err);
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
        String(id),
        String(data.anggotaId),
        String(data.nama),
        String(data.nip),
        String(data.jenisPerubahan),
        String(data.nilaiLama),
        String(data.nilaiBaru),
        String(data.alasanPerubahan),
        String(tanggalUsul),
        'Menunggu',
        ''
      ]];
      
      console.log('submitUsulPerubahan values:', values[0]);
      
      await appendToSheet('usul_perubahan', values);
      return { success: true, id };
    } catch (err: any) {
      console.error('submitUsulPerubahan error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [appendToSheet]);

  const fetchUsulPengambilan = useCallback(async (): Promise<UsulPengambilan[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSheet('usul_pengambilan', SIKOSTIK_SPREADSHEET_ID);
      console.log('Raw usul_pengambilan data from sheet:', data);
      
      if (data && data.length > 0) {
        console.log('First row object:', data[0]);
        console.log('First row keys:', Object.keys(data[0]));
      }
      
      const mapped = data
        .map((row: any, idx: number) => {
          // Create a normalized version of the row object
          // Google Sheets might use lowercase keys, so try multiple formats
          const normalizedRow: any = {};
          
          // Try to find and map each field from various possible key formats
          for (const [key, value] of Object.entries(row)) {
            const lowerKey = String(key).toLowerCase().trim();
            normalizedRow[lowerKey] = value;
          }
          
          if (idx === 0) {
            console.log('Normalized row 0:', normalizedRow);
          }
          
          // Extract values with multiple fallback attempts
          const getId = () => row.ID || row.id || normalizedRow['id'] || '';
          const getAnggotaId = () => row['Anggota ID'] || row['anggota id'] || row.anggotaId || normalizedRow['anggota id'] || '';
          const getNama = () => row.Nama || row.nama || normalizedRow['nama'] || '';
          const getNip = () => row.NIP || row.nip || normalizedRow['nip'] || '';
          const getJenisPengambilan = () => row['Jenis Pengambilan'] || row['jenis pengambilan'] || row.jenisPengambilan || normalizedRow['jenis pengambilan'] || 'Sukarela';
          
          // Critical: Jumlah field
          const getJumlah = () => {
            const candidates = [
              row.Jumlah,
              row.jumlah,
              row['Jumlah'],
              normalizedRow['jumlah'],
              normalizedRow['jumlah pengambilan']
            ];
            for (const val of candidates) {
              if (val !== undefined && val !== null && val !== '') {
                const parsed = typeof val === 'string' ? parseNum(val) : val;
                if (parsed > 0 || val !== '') {
                  if (idx === 0) console.log('Found Jumlah:', val, '→', parsed);
                  return parsed;
                }
              }
            }
            if (idx === 0) console.log('No Jumlah found in candidates');
            return 0;
          };
          
          // Critical: Alasan field
          const getAlasan = () => {
            const candidates = [
              row.Alasan,
              row.alasan,
              row['Alasan'],
              normalizedRow['alasan'],
              normalizedRow['alasan pengambilan']
            ];
            for (const val of candidates) {
              if (val !== undefined && val !== null && val !== '') {
                if (idx === 0) console.log('Found Alasan:', val);
                return String(val);
              }
            }
            if (idx === 0) console.log('No Alasan found');
            return '';
          };
          
          // Critical: Tanggal Usul field
          const getTanggal = () => {
            const candidates = [
              row['Tanggal Usul'],
              row['tanggal usul'],
              row.tanggalUsul,
              row['Tanggal'],
              normalizedRow['tanggal usul']
            ];
            for (const val of candidates) {
              if (val !== undefined && val !== null && val !== '') {
                if (idx === 0) console.log('Found Tanggal:', val);
                return String(val);
              }
            }
            if (idx === 0) console.log('No Tanggal found');
            return '';
          };
          
          const getStatus = () => row.Status || row.status || normalizedRow['status'] || 'Proses';
          const getKeterangan = () => row.Keterangan || row.keterangan || normalizedRow['keterangan'] || '';
          
          const result = {
            id: getId(),
            anggotaId: getAnggotaId(),
            nama: getNama(),
            nip: getNip(),
            jenisPengambilan: getJenisPengambilan(),
            jumlahPengambilan: getJumlah(),
            alasanPengambilan: getAlasan(),
            tanggalUsul: getTanggal(),
            status: getStatus(),
            keterangan: getKeterangan()
          };
          
          if (idx === 0) {
            console.log('Final mapped result row 0:', result);
          }
          
          return result;
        })
        .filter(item => {
          const valid = item.nama && item.nip;
          return valid;
        });
      
      console.log('Total mapped items:', mapped.length, 'Final data:', mapped);
      return mapped;
    } catch (err: any) {
      console.error('fetchUsulPengambilan error:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchSheet]);

  const submitUsulPengambilan = useCallback(async (data: {
    anggotaId: string;
    nama: string;
    nip: string;
    jenisPengambilan: 'Wajib' | 'Sukarela' | 'Lebaran' | 'Lainnya';
    jumlahPengambilan: number;
    alasanPengambilan: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const id = `UPG-${Date.now()}`;
      const tanggalUsul = new Date().toISOString().split('T')[0];
      const values = [[
        String(id),
        String(data.anggotaId),
        String(data.nama),
        String(data.nip),
        String(data.jenisPengambilan),
        String(data.jumlahPengambilan),
        String(data.alasanPengambilan),
        String(tanggalUsul),
        'Proses'
      ]];
      
      console.log('submitUsulPengambilan values:', values[0]);
      await appendToSheet('usul_pengambilan', values);
      return { success: true, id };
    } catch (err: any) {
      console.error('submitUsulPengambilan error:', err);
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
    fetchUsulPengambilan,
    submitUsulPinjaman,
    submitUsulPerubahan,
    submitUsulPengambilan,
    userSheetId
  };
  
};
