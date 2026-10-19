import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { documentRows, type Meeting, type DocumentName } from './model';
const filename = (m: Meeting) => m.name.replace(/[^\p{L}\p{N}\s-]/gu, '').slice(0, 80) || 'Administrasi Meeting';
export function exportExcel(m: Meeting, documents: DocumentName[]) {
  const wb = XLSX.utils.book_new();
  documents.forEach((doc, index) => {
    const { headers, rows } = documentRows(m, doc);
    const data = [[doc.toUpperCase()], [m.name], [`${m.start} s.d. ${m.end} | ${m.venue}`], [`Penyelenggara: ${m.organizer} | Nomor: ${m.number}`], [], headers, ...rows, [], ['Penanggung jawab'], [], [], [m.responsible]];
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = headers.map((h, i) => ({ wch: Math.min(45, Math.max(12, h.length + 2, ...rows.map(r => String(r[i] ?? '').length + 2))) }));
    sheet['!merges'] = [0, 1, 2, 3].map(r => ({ s: { r, c: 0 }, e: { r, c: headers.length - 1 } }));
    sheet['!rows'] = data.map((_, i) => ({ hpt: i >= 6 && i < rows.length + 6 ? 32 : 22 }));
    sheet['!margins'] = { left: .35, right: .35, top: .5, bottom: .5, header: .25, footer: .25 };
    sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 5, c: 0 }, e: { r: 5 + rows.length, c: headers.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, sheet, `${index + 1} ${doc}`.slice(0, 31));
  });
  XLSX.writeFile(wb, `${filename(m)}.xlsx`);
}
export function exportPDF(m: Meeting, documents: DocumentName[]) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  documents.forEach((doc, index) => {
    if (index) pdf.addPage();
    const { headers, rows } = documentRows(m, doc);
    pdf.setFontSize(13); pdf.text(doc.toUpperCase(), 14, 15, { maxWidth: 269 });
    pdf.setFontSize(11); pdf.text(m.name, 14, 24, { maxWidth: 269 });
    pdf.setFontSize(9); pdf.text(`${m.start} s.d. ${m.end} | ${m.venue}`, 14, 32);
    pdf.text(`Penyelenggara: ${m.organizer} | Nomor: ${m.number}`, 14, 38, { maxWidth: 269 });
    autoTable(pdf, { startY: 44, head: [headers], body: rows, theme: 'grid', styles: { fontSize: 8, cellPadding: 3, minCellHeight: 12, overflow: 'linebreak' }, margin: { top: 14, right: 14, bottom: 18, left: 14 }, rowPageBreak: 'avoid', showHead: 'everyPage' });
    const tablePDF = pdf as jsPDF & { lastAutoTable?: { finalY: number } };
    let y = (tablePDF.lastAutoTable?.finalY || 44) + 12;
    if (y + 25 > 190) { pdf.addPage(); y = 25; }
    pdf.text('Penanggung jawab kegiatan', 205, y); pdf.text(m.responsible, 205, y + 24);
  });
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) { pdf.setPage(i); pdf.setFontSize(8); pdf.text(`${i} / ${total}`, 280, 202, { align: 'right' }); }
  pdf.save(`${filename(m)}.pdf`);
}
