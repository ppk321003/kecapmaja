import * as XLSX from 'xlsx';

interface HonorRow {
  no: number;
  namaPenerimaHonor: string;
  noKontrakSKST: string;
  namaKegiatan: string;
  waktuKegiatan: string;
  output: string;
  noSPM: string;
  noSP2D: string;
  satuanBiaya: string;
  jumlahWaktu: number;
  satuanWaktu: string;
  totalBruto: number;
  pph: number;
  totalNetto: number;
}

interface GenerateExcelParams {
  rows: HonorRow[];
  satkerName: string;
  tahun: number;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const generateHonorExcel = ({ rows, satkerName, tahun }: GenerateExcelParams) => {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create title and header rows
  const titleRow = [`Rincian Honor Output Kegiatan Tahun ${tahun}`];
  const emptyRow = [];
  const headerRow = [
    'No',
    'Nama Penerima Honor',
    'No. Kontrak/ST/SK',
    'Nama Kegiatan',
    'Waktu Kegiatan',
    'Output',
    'No SPM',
    'No SP2D',
    'Satuan Biaya',
    'Jumlah Waktu',
    'Satuan Waktu',
    'Total Bruto',
    'PPH (Jika ada)',
    'Total Netto'
  ];

  // Prepare data rows
  const dataRows = rows.map(row => [
    row.no,
    row.namaPenerimaHonor,
    row.noKontrakSKST,
    row.namaKegiatan,
    row.waktuKegiatan,
    row.output,
    row.noSPM,
    row.noSP2D,
    row.satuanBiaya,
    row.jumlahWaktu,
    row.satuanWaktu,
    formatCurrency(row.totalBruto),
    formatCurrency(row.pph),
    formatCurrency(row.totalNetto)
  ]);

  // Calculate totals
  const totalBruto = rows.reduce((sum, row) => sum + row.totalBruto, 0);
  const totalPph = rows.reduce((sum, row) => sum + row.pph, 0);
  const totalNetto = rows.reduce((sum, row) => sum + row.totalNetto, 0);

  const totalRow = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'TOTAL',
    formatCurrency(totalBruto),
    formatCurrency(totalPph),
    formatCurrency(totalNetto)
  ];

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

  // Set column widths
  const columnWidths = [
    { wch: 4 },   // No
    { wch: 20 },  // Nama Penerima Honor
    { wch: 18 },  // No. Kontrak/ST/SK
    { wch: 25 },  // Nama Kegiatan
    { wch: 25 },  // Waktu Kegiatan
    { wch: 12 },  // Output
    { wch: 15 },  // No SPM
    { wch: 15 },  // No SP2D
    { wch: 14 },  // Satuan Biaya
    { wch: 12 },  // Jumlah Waktu
    { wch: 12 },  // Satuan Waktu
    { wch: 16 },  // Total Bruto
    { wch: 16 },  // PPH
    { wch: 16 }   // Total Netto
  ];

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

  // Format total row
  const totalRowIndex = allRows.length - 1;
  for (let i = 0; i < headerRow.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c: i });
    const cell = ws[cellRef];
    if (cell) {
      cell.s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E7E6E6' } },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      };
    }
  }

  // Format number columns with accounting format
  const numberColumnIndices = [11, 12, 13]; // Columns for currency (Total Bruto, PPH, Total Netto)
  for (let i = 3; i < allRows.length - 2; i++) {
    numberColumnIndices.forEach(colIndex => {
      const cellRef = XLSX.utils.encode_cell({ r: i, c: colIndex });
      const cell = ws[cellRef];
      if (cell) {
        cell.s = {
          alignment: { horizontal: 'right' },
          font: { size: 10 },
          border: {
            top: { style: 'thin', color: { rgb: 'D0CECE' } },
            bottom: { style: 'thin', color: { rgb: 'D0CECE' } },
            left: { style: 'thin', color: { rgb: 'D0CECE' } },
            right: { style: 'thin', color: { rgb: 'D0CECE' } }
          }
        };
      }
    });
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
