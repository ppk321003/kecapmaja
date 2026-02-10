import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSatkerConfigContext } from '@/contexts/SatkerConfigContext';

interface HonorRow {
  // Identitas Penerima
  no: number;
  namaPenerimaHonor: string;
  nik: string;
  
  // Referensi Kegiatan
  noKontrakSKST: string;
  tglSK: string;
  jenisPekerjaan: string;
  periode: string;
  
  // Waktu Kegiatan
  namaKegiatan: string;
  tanggalMulai: string;
  tanggalAkhir: string;
  waktuKegiatan: string; // Duration like "1 Januari 2025 s/d 31 Januari 2025"
  
  // Finansial
  satuanBiaya: number; // Numeric value (harga satuan)
  jumlahWaktu: number; // Realisasi
  satuanWaktu: string; // Duration in days (e.g., "7 hari")
  totalBruto: number;
  pph: number;
  totalNetto: number;
  
  // Konfigurasi
  target: string;
  realisasi: string;
  satuan: string;
  komponenPOK: string;
  koordinator: string;
  bebanAnggaran: string;
  
  // Status & Output
  output: string;
  dikirimKePPK: string;
  noSPM: string;
  noSP2D: string;
}

interface HonorDataResult {
  rows: HonorRow[];
  satkerName: string;
  tahun: number;
}

const cleanNumberValue = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const stringValue = value.toString().trim();
  if (stringValue === '') return 0;
  const cleanValue = stringValue.replace(/[^\d,.-]/g, '').replace(',', '.').replace(/(\..*)\./g, '$1');
  const numberValue = parseFloat(cleanValue);
  return isNaN(numberValue) ? 0 : numberValue;
};

const processMultipleValues = (text: string, separator: string = '|'): string[] => {
  if (!text) return [];
  return text.toString().split(separator).map(item => item.trim()).filter(item => item !== '');
};

const formatTanggalIndonesia = (tanggal: string): string => {
  if (!tanggal) return '';
  // If already in format like "1 Januari 2026", return as is
  if (/^\d{1,2}\s[A-Za-z]+\s\d{4}$/.test(tanggal)) {
    return tanggal;
  }
  // Try to parse and reformat
  try {
    const date = new Date(tanggal);
    if (isNaN(date.getTime())) return tanggal;
    
    const bulanList = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const day = date.getDate();
    const month = bulanList[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return tanggal;
  }
};

const calculateDurationDays = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  try {
    // Parse Indonesian date format (e.g., "25 Mei 2025")
    const parseDateIndonesia = (dateStr: string): Date => {
      const bulanMap: { [key: string]: number } = {
        'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
        'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
      };
      
      const parts = dateStr.trim().split(' ');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const monthName = parts[1].toLowerCase();
        const year = parseInt(parts[2]);
        
        const month = bulanMap[monthName];
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
      
      // Fallback: try native Date parsing
      return new Date(dateStr);
    };

    const start = parseDateIndonesia(startDate);
    const end = parseDateIndonesia(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 0;
    }
    
    // Calculate difference in days (inclusive of both start and end date)
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
    
    return daysDiff > 0 ? daysDiff : 0;
  } catch (e) {
    return 0;
  }
};

export const useHonorData = () => {
  const { user } = useAuth();
  const satkerConfig = useSatkerConfigContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHonorData = useCallback(
    async (tahun: number): Promise<HonorDataResult | null> => {
      if (!user?.satker) {
        setError('User satker tidak ditemukan');
        return null;
      }

      try {
        setLoading(true);
        setError(null);

        // Get satker config dan sheet ID untuk data kegiatan
        const satkerInfo = satkerConfig?.configs.find(c => c.satker_id === user.satker);
        if (!satkerInfo) {
          setError(`Konfigurasi satker ${user.satker} tidak ditemukan`);
          return null;
        }

        const entriKegiatanSheetId = satkerInfo.entrikegiatan_sheet_id;
        if (!entriKegiatanSheetId) {
          setError('Sheet ID untuk data kegiatan tidak ditemukan');
          return null;
        }

        // Fetch data kegiatan dari spreadsheet
        const { data, error: fetchError } = await supabase.functions.invoke(
          'google-sheets',
          {
            body: {
              spreadsheetId: entriKegiatanSheetId,
              operation: 'read',
              range: 'Sheet1!A:W'
            }
          }
        );

        if (fetchError) {
          setError(`Gagal memuat data: ${fetchError.message}`);
          return null;
        }

        if (!data?.values || data.values.length <= 1) {
          return {
            rows: [],
            satkerName: satkerInfo.satker_nama || user.satker,
            tahun
          };
        }

        // Parse data kegiatan
        const rows = data.values.slice(1);
        const honorRows: HonorRow[] = [];
        let rowNo = 1;

        rows.forEach((row: any[]) => {
          if (!row[0] || !row[2]) return; // Check periode exists

          // All row data extraction (supporting all 27 columns)
          const periode = row[2] || ''; // Column C: periode
          const jenisPekerjaan = row[3] || ''; // Column D: jenisPekerjaan
          const namaKegiatan = row[4] || ''; // Column E: namaKegiatan
          const nomorSK = row[5] || ''; // Column F: nomorSK
          const tanggalSK = row[6] || ''; // Column G: tanggalSK
          const tanggalMulai = row[7] || ''; // Column H: tanggalMulai
          const tanggalAkhir = row[8] || ''; // Column I: tanggalAkhir
          const hargaSatuan = cleanNumberValue(row[9]); // Column J: hargaSatuan
          const satuan = row[10] || ''; // Column K: satuan
          const koordinator = row[11] || ''; // Column L: koordinator
          const komponenPOK = row[12] || ''; // Column M: komponenPOK
          const namaPetugasStr = row[13] || ''; // Column N: namaPetugas
          const target = row[14] || ''; // Column O: target
          const realisasiStr = row[15] || ''; // Column P: realisasi
          const bebanAnggaran = row[18] || ''; // Column S: bebanAnggaran
          const dikirimKePPK = row[19] || ''; // Column T: dikirimKePPK
          const nik = row[22] || ''; // Column W: nik

          // Extract tahun dari periode
          const periodeYear = parseInt(periode.match(/\d{4}/)?.[0] || tahun.toString());
          if (periodeYear !== tahun) return; // Filter by tahun

          const namaPetugasList = processMultipleValues(namaPetugasStr);
          const realisasiList = processMultipleValues(realisasiStr);

          // Create honor row for each worker
          namaPetugasList.forEach((nama: string, idx: number) => {
            const realisasi = cleanNumberValue(realisasiList[idx] || '0');
            const totalBruto = hargaSatuan * realisasi;
            const pph = 0; // Default 0 as per requirement
            const totalNetto = totalBruto - pph;

            // Format waktu kegiatan dengan tanggal Indonesia format
            const waktuKegiatan = tanggalMulai && tanggalAkhir 
              ? `${formatTanggalIndonesia(tanggalMulai)} s/d ${formatTanggalIndonesia(tanggalAkhir)}`
              : '';

            // Calculate duration in days
            const durationDays = calculateDurationDays(tanggalMulai, tanggalAkhir);
            const satuanWaktuText = durationDays > 0 ? `${durationDays} hari` : '';

            honorRows.push({
              // Identitas Penerima
              no: rowNo++,
              namaPenerimaHonor: nama,
              nik,
              
              // Referensi Kegiatan
              noKontrakSKST: nomorSK,
              tglSK: formatTanggalIndonesia(tanggalSK),
              jenisPekerjaan,
              periode,
              
              // Waktu Kegiatan
              namaKegiatan,
              tanggalMulai: formatTanggalIndonesia(tanggalMulai),
              tanggalAkhir: formatTanggalIndonesia(tanggalAkhir),
              waktuKegiatan,
              
              // Finansial
              satuanBiaya: hargaSatuan, // Numeric value (harga satuan)
              jumlahWaktu: realisasi, // Realisasi
              satuanWaktu: satuanWaktuText, // Duration in days (e.g., "7 hari")
              totalBruto,
              pph,
              totalNetto,
              
              // Konfigurasi
              target,
              realisasi: realisasiStr,
              satuan,
              komponenPOK,
              koordinator,
              bebanAnggaran,
              
              // Status & Output
              output: 'Laporan', // Output adalah Laporan
              dikirimKePPK,
              noSPM: '', // Kosong per requirement
              noSP2D: '' // Kosong per requirement
            });
          });
        });

        return {
          rows: honorRows,
          satkerName: satkerInfo.satker_nama || user.satker,
          tahun
        };
      } catch (err: any) {
        const errorMsg = err?.message || 'Terjadi kesalahan saat mengambil data honor';
        setError(errorMsg);
        console.error('Error fetching honor data:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user?.satker, satkerConfig?.configs]
  );

  return {
    fetchHonorData,
    loading,
    error
  };
};
