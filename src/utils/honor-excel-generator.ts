import * as XLSX from 'xlsx';
import { type ColumnConfig } from './honor-columns-config';

interface HonorRow {
  no: number;
  namaPenerimaHonor: string;
  nik: string;
  noKontrakSKST: string;
  tglSK: string;
  jenisPekerjaan: string;
  periode: string;
  namaKegiatan: string;
  tanggalMulai: string;
  tanggalAkhir: string;
  waktuKegiatan: string;
  satuanBiaya: number;
  jumlahWaktu: number;
  satuanWaktu: string;
  totalBruto: number;
  pph: number;
  totalNetto: number;
  target: string;
  realisasi: string;
  satuan: string;
  komponenPOK: string;
  koordinator: string;
  bebanAnggaran: string;
  output: string;
  dikirimKePPK: string;
  noSPM: string;
  noSP2D: string;
}

interface GenerateExcelParams {
  rows: HonorRow[];
  satkerName: string;
  tahun: number;
  columnsConfig?: ColumnConfig[];
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const getColumnLabel = (key: string): string => {
  const labelMap: Record<string, string> = {
    no: 'No',
    namaPenerimaHonor: 'Nama Penerima Honor',
    nik: 'NIK',
    noKontrakSKST: 'No. Kontrak/ST/SK',
    tglSK: 'Tgl SK',
    jenisPekerjaan: 'Jenis Pekerjaan',
    periode: 'Periode',
    namaKegiatan: 'Nama Kegiatan',
    tanggalMulai: 'Tanggal Mulai',
    tanggalAkhir: 'Tanggal Akhir',
    waktuKegiatan: 'Waktu Kegiatan',
    satuanBiaya: 'Satuan Biaya',
    jumlahWaktu: 'Jumlah Waktu',
    satuanWaktu: 'Satuan Waktu',
    totalBruto: 'Total Bruto',
    pph: 'PPH (Jika ada)',
    totalNetto: 'Total Netto',
    target: 'Target',
    realisasi: 'Realisasi',
    satuan: 'Satuan',
    komponenPOK: 'Komponen POK',
    koordinator: 'Koordinator',
    bebanAnggaran: 'Beban Anggaran',
    output: 'Output',
    dikirimKePPK: 'Dikirim ke PPK',
    noSPM: 'No SPM',
    noSP2D: 'No SP2D'
  };
  return labelMap[key] || key;
};

// Determine if column is numeric
const isNumericColumn = (key: string): boolean => {
  return ['satuanBiaya', 'jumlahWaktu', 'totalBruto', 'pph', 'totalNetto'].includes(key);
};

// Extract value from row based on column key
const getRowValue = (row: HonorRow, key: string): any => {
  return (row as any)[key] ?? '';
};

export const generateHonorExcel = ({ 
  rows, 
  satkerName, 
  tahun,
  columnsConfig 
}: GenerateExcelParams) => {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Determine which columns to include
  const enabledColumns = columnsConfig || [];
  
  // If no columns config provided or empty, use default (first 14 columns)
  const defaultColumnKeys = [
    'no', 'namaPenerimaHonor', 'noKontrakSKST', 'namaKegiatan', 'waktuKegiatan',
    'output', 'noSPM', 'noSP2D', 'satuanBiaya', 'jumlahWaktu',
    'satuanWaktu', 'totalBruto', 'pph', 'totalNetto'
  ];
  
  const columnKeys = enabledColumns.length > 0 
    ? enabledColumns.map(c => c.key as string)
    : defaultColumnKeys;

  // Create title and header rows
  const titleRow = [`Rincian Honor Output Kegiatan Tahun ${tahun}`];
  const emptyRow = [];
  const headerRow = columnKeys.map(key => getColumnLabel(key));

  // Prepare data rows
  const dataRows = rows.map(row =>
    columnKeys.map(key => getRowValue(row, key))
  );

  // Calculate row indices for formulas
  const dataRowCount = dataRows.length;
  const firstDataRowIndex = 4; // Row 4 (1-based: row 5)
  const lastDataRowIndex = firstDataRowIndex + dataRowCount - 1;

  // Create total row with formulas for numeric columns
  const totalRow = columnKeys.map((key, colIndex) => {
    if (isNumericColumn(key)) {
      // Convert column index to Excel column letter (A, B, C, ... Z, AA, AB, etc.)
      const colLetter = XLSX.utils.encode_col(colIndex);
      return `=SUM(${colLetter}${firstDataRowIndex + 1}:${colLetter}${lastDataRowIndex + 1})`;
    }
    return '';
  });

  // Combine all rows
  const allRows = [
    titleRow,
    emptyRow,
    headerRow,
    ...dataRows,
    emptyRow,
    totalRow
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths dynamically based on number of columns
  const columnWidths = columnKeys.map(key => {
    const widthMap: Record<string, number> = {
      no: 4,
      namaPenerimaHonor: 20,
      nik: 15,
      noKontrakSKST: 18,
      tglSK: 15,
      jenisPekerjaan: 20,
      periode: 15,
      namaKegiatan: 25,
      tanggalMulai: 18,
      tanggalAkhir: 18,
      waktuKegiatan: 25,
      satuanBiaya: 14,
      jumlahWaktu: 12,
      satuanWaktu: 12,
      totalBruto: 16,
      pph: 16,
      totalNetto: 16,
      target: 12,
      realisasi: 12,
      satuan: 12,
      komponenPOK: 16,
      koordinator: 15,
      bebanAnggaran: 15,
      output: 12,
      dikirimKePPK: 15,
      noSPM: 15,
      noSP2D: 15
    };
    return { wch: widthMap[key] || 12 };
  });

  ws['!cols'] = columnWidths;

  // Format title row (merge and bold)
  const titleCell = ws['A1'];
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, size: 12 },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'FFE699' } }
    };
  }

  // Format header row
  for (let i = 0; i < headerRow.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 2, c: i });
    const cell = ws[cellRef];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }
  }

  // Format data rows with dynamic column handling
  for (let i = 3; i < 3 + dataRowCount; i++) {
    for (let j = 0; j < columnKeys.length; j++) {
      const columnKey = columnKeys[j];
      const cellRef = XLSX.utils.encode_cell({ r: i, c: j });
      const cell = ws[cellRef];
      
      if (cell) {
        // Apply number format for numeric columns
        if (isNumericColumn(columnKey)) {
          cell.z = '#,##0'; // Number format with thousands separator
        }

        // Apply cell styling
        cell.s = {
          alignment: { 
            horizontal: isNumericColumn(columnKey) ? 'right' : 'left',
            vertical: 'center'
          },
          border: {
            top: { style: 'thin', color: { rgb: 'D0CECE' } },
            bottom: { style: 'thin', color: { rgb: 'D0CECE' } },
            left: { style: 'thin', color: { rgb: 'D0CECE' } },
            right: { style: 'thin', color: { rgb: 'D0CECE' } }
          }
        };
      }
    }
  }

  // Format total row
  const totalRowIndex = allRows.length - 1;
  for (let i = 0; i < columnKeys.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c: i });
    const cell = ws[cellRef];
    const columnKey = columnKeys[i];
    
    if (cell) {
      // Apply number format for numeric columns in total row
      if (isNumericColumn(columnKey)) {
        cell.z = '#,##0'; // Number format
      }

      cell.s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E7E6E6' } },
        alignment: { 
          horizontal: isNumericColumn(columnKey) ? 'right' : 'left',
          vertical: 'center'
        },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }
  }

  ws['!frozenPane'] = { xSplit: 0, ySplit: 3 }; // Freeze header rows

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Honor');

  // Generate filename
  // Sanitize satker name for filename
  const sanitizedSatker = satkerName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30);

  const filename = `Rekap_Honor_${sanitizedSatker}_${tahun}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);

  return filename;
};
