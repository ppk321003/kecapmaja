/**
 * Document export utilities untuk Bahan Revisi Anggaran (PDF dan JPEG)
 * Exports pada berbagai level: Program, Kegiatan, Komponen, Akun, dll
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { formatCurrency } from './bahanrevisi-calculations';

export interface SummaryRow {
  id: string;
  name: string;
  totalSemula: number;
  totalMenjadi: number;
  totalSelisih: number;
  newItems: number;
  changedItems: number;
  totalItems: number;
  sisaAnggaran?: number;
  blokir?: number;
  realisasi?: number;
  persentaseRealisasi?: number;
}

/**
 * Export chart and table to PDF
 */
export const exportSummaryToPDF = async (
  element: HTMLElement,
  fileName: string = 'Ringkasan_Revisi'
) => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 297; // A4 landscape width in mm
    const pageHeight = 210; // A4 landscape height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const timestamp = new Date().toISOString().split('T')[0];
    pdf.save(`${fileName}_${timestamp}.pdf`);
  } catch (error) {
    console.error('[exportSummaryToPDF] Error:', error);
    throw new Error('Gagal mengekspor PDF');
  }
};

/**
 * Export chart and table to JPEG
 */
export const exportSummaryToJPEG = async (
  element: HTMLElement,
  fileName: string = 'Ringkasan_Revisi'
) => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create blob');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `${fileName}_${timestamp}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
  } catch (error) {
    console.error('[exportSummaryToJPEG] Error:', error);
    throw new Error('Gagal mengekspor JPEG');
  }
};

/**
 * Export summary data to Excel
 */
export const exportSummaryToExcel = (
  data: SummaryRow[],
  title: string = 'Ringkasan_Revisi'
) => {
  try {
    const headers = [
      'Nama',
      'Jumlah Semula',
      'Jumlah Menjadi',
      'Selisih',
      'Item Baru',
      'Item Berubah',
      'Total Item',
      'Sisa Anggaran',
      'Blokir',
      'Realisasi',
      'Persentase Realisasi',
    ];

    const exportData = data.map((row) => [
      row.name,
      row.totalSemula,
      row.totalMenjadi,
      row.totalSelisih,
      row.newItems,
      row.changedItems,
      row.totalItems,
      row.sisaAnggaran || 0,
      row.blokir || 0,
      row.realisasi || 0,
      `${(row.persentaseRealisasi || 0).toFixed(2)}%`,
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...exportData]);

    // Set column widths
    ws['!cols'] = [
      { wch: 40 },  // Nama
      { wch: 18 },  // Jumlah Semula
      { wch: 18 },  // Jumlah Menjadi
      { wch: 18 },  // Selisih
      { wch: 12 },  // Item Baru
      { wch: 12 },  // Item Berubah
      { wch: 12 },  // Total Item
      { wch: 18 },  // Sisa Anggaran
      { wch: 18 },  // Blokir
      { wch: 18 },  // Realisasi
      { wch: 18 },  // Persentase Realisasi
    ];

    // Add totals row
    const totalSemula = data.reduce((sum, row) => sum + row.totalSemula, 0);
    const totalMenjadi = data.reduce((sum, row) => sum + row.totalMenjadi, 0);
    const totalSelisih = data.reduce((sum, row) => sum + row.totalSelisih, 0);
    const totalNewItems = data.reduce((sum, row) => sum + row.newItems, 0);
    const totalChangedItems = data.reduce((sum, row) => sum + row.changedItems, 0);
    const totalAllItems = data.reduce((sum, row) => sum + row.totalItems, 0);
    const totalSisaAnggaran = data.reduce((sum, row) => sum + (row.sisaAnggaran || 0), 0);
    const totalBlokir = data.reduce((sum, row) => sum + (row.blokir || 0), 0);
    const totalRealisasi = data.reduce((sum, row) => sum + (row.realisasi || 0), 0);

    // Freeze header row
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomRight' };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${title}_${timestamp}.xlsx`);
  } catch (error) {
    console.error('[exportSummaryToExcel] Error:', error);
    throw new Error('Gagal mengekspor Excel');
  }
};
