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

  // Prepare data rows - store numeric values, not formatted strings
  const dataRows = rows.map(row => [
    row.no,
    row.namaPenerimaHonor,
    row.noKontrakSKST,
    row.namaKegiatan,
    row.waktuKegiatan,
    row.output,
    row.noSPM,
    row.noSP2D,
    row.satuanBiaya, // Will be formatted as number
    row.jumlahWaktu,
    row.satuanWaktu, // Will be formatted as number in display
    row.totalBruto, // Store numeric value
    row.pph, // Store numeric value
    row.totalNetto // Store numeric value
  ]);

  // Calculate number of data rows (for formula in total row)
  const dataRowCount = dataRows.length;
  const firstDataRowIndex = 4; // Row 4 (1-based: row 5) is first data row (after title, empty, header, empty)
  const lastDataRowIndex = firstDataRowIndex + dataRowCount - 1;

  // Create total row with formulas
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
    '', // Satuan Waktu - blank for total row
    `=SUM(L${firstDataRowIndex + 1}:L${lastDataRowIndex + 1})`, // Total Bruto formula
    `=SUM(M${firstDataRowIndex + 1}:M${lastDataRowIndex + 1})`, // PPH formula
    `=SUM(N${firstDataRowIndex + 1}:N${lastDataRowIndex + 1})` // Total Netto formula
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

  // Format data rows with number formats
  for (let i = 3; i < 3 + dataRowCount; i++) {
    // Column I (Satuan Biaya) - index 8
    const satCell = XLSX.utils.encode_cell({ r: i, c: 8 });
    if (ws[satCell]) {
      ws[satCell].z = '#,##0'; // Number format with thousands separator
      ws[satCell].s = {
        alignment: { horizontal: 'right' },
        border: {
          top: { style: 'thin', color: { rgb: 'D0CECE' } },
          bottom: { style: 'thin', color: { rgb: 'D0CECE' } },
          left: { style: 'thin', color: { rgb: 'D0CECE' } },
          right: { style: 'thin', color: { rgb: 'D0CECE' } }
        }
      };
    }

    // Column J (Jumlah Waktu) - index 9
    const jumlahCell = XLSX.utils.encode_cell({ r: i, c: 9 });
    if (ws[jumlahCell]) {
      ws[jumlahCell].z = '#,##0'; // Number format
      ws[jumlahCell].s = {
        alignment: { horizontal: 'right' },
        border: {
          top: { style: 'thin', color: { rgb: 'D0CECE' } },
          bottom: { style: 'thin', color: { rgb: 'D0CECE' } },
          left: { style: 'thin', color: { rgb: 'D0CECE' } },
          right: { style: 'thin', color: { rgb: 'D0CECE' } }
        }
      };
    }

    // Column K (Satuan Waktu) - index 10 - format as number (days)
    const satuanCell = XLSX.utils.encode_cell({ r: i, c: 10 });
    if (ws[satuanCell]) {
      ws[satuanCell].z = '#,##0'; // Number format
      ws[satuanCell].s = {
        alignment: { horizontal: 'right' },
        border: {
          top: { style: 'thin', color: { rgb: 'D0CECE' } },
          bottom: { style: 'thin', color: { rgb: 'D0CECE' } },
          left: { style: 'thin', color: { rgb: 'D0CECE' } },
          right: { style: 'thin', color: { rgb: 'D0CECE' } }
        }
      };
    }

    // Column L (Total Bruto) - index 11
    const bruttoCell = XLSX.utils.encode_cell({ r: i, c: 11 });
    if (ws[bruttoCell]) {
      ws[bruttoCell].z = '#,##0'; // Number format
      ws[bruttoCell].s = {
        alignment: { horizontal: 'right' },
        border: {
          top: { style: 'thin', color: { rgb: 'D0CECE' } },
          bottom: { style: 'thin', color: { rgb: 'D0CECE' } },
          left: { style: 'thin', color: { rgb: 'D0CECE' } },
          right: { style: 'thin', color: { rgb: 'D0CECE' } }
        }
      };
    }

    // Column M (PPH) - index 12
    const pphCell = XLSX.utils.encode_cell({ r: i, c: 12 });
    if (ws[pphCell]) {
      ws[pphCell].z = '#,##0'; // Number format
      ws[pphCell].s = {
        alignment: { horizontal: 'right' },
        border: {
          top: { style: 'thin', color: { rgb: 'D0CECE' } },
          bottom: { style: 'thin', color: { rgb: 'D0CECE' } },
          left: { style: 'thin', color: { rgb: 'D0CECE' } },
          right: { style: 'thin', color: { rgb: 'D0CECE' } }
        }
      };
    }

    // Column N (Total Netto) - index 13
    const nettoCell = XLSX.utils.encode_cell({ r: i, c: 13 });
    if (ws[nettoCell]) {
      ws[nettoCell].z = '#,##0'; // Number format
      ws[nettoCell].s = {
        alignment: { horizontal: 'right' },
        border: {
          top: { style: 'thin', color: { rgb: 'D0CECE' } },
          bottom: { style: 'thin', color: { rgb: 'D0CECE' } },
          left: { style: 'thin', color: { rgb: 'D0CECE' } },
          right: { style: 'thin', color: { rgb: 'D0CECE' } }
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
      // Apply number format for numeric columns in total row
      if (i === 8 || i === 9 || i === 10 || i === 11 || i === 12 || i === 13) {
        cell.z = '#,##0'; // Number format
      }
      cell.s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E7E6E6' } },
        alignment: { horizontal: i > 7 ? 'right' : 'left' },
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
