from pathlib import Path
path = Path('src/pages/sensusEkonomi2026/MonitoringLapangan.tsx')
text = path.read_text(encoding='utf-8')
start = text.find('const exportBAPPToDocx = async (')
end = text.find('const getAnomalyPPLValue =', start)
if start == -1 or end == -1:
    raise SystemExit(f'boundaries not found start={start}, end={end}')
new = '''const exportBAPPToDocx = async (
  pmlRow: any,
  pplUnderPML: AggregatedData[],
  usersData: any[],
  qualityUsahaData: any[],
  qualityUsahaRumahData: any[],
  qualityKeluargaData: any[]
) => {
  if (!pmlRow || !pmlRow.nama_pml) return;

  const parseNumber = (value: any): number => {
    const n = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeCode = (value: any) => String(value ?? "").replace(/[^0-9]/g, "").trim();

  const getEmail = (row: any) =>
    String(
      getColumnValue(row, "email", ["email", "Email", "email_ppl", "email_pml", "Email PPL", "Email PML"], "")
    )
      .trim()
      .toLowerCase();

  const usersSlsByEmail = new Map<string, string[]>();
  const usersRowsByEmail = new Map<string, any[]>();

  (usersData || []).forEach((user: any) => {
    const email = getEmail(user);
    if (!email) return;

    const slsRaw = String(
      getColumnValue(user, "sls", ["__col_7", "H", "h", "sls", "regioncode", "region_code"], "")
    ).trim();

    if (slsRaw) {
      const parts = slsRaw
        .split(/[,:;\s]+/)
        .map(normalizeCode)
        .filter(Boolean);
      if (parts.length > 0) {
        usersSlsByEmail.set(
          email,
          Array.from(
            new Set([...(usersSlsByEmail.get(email) || []), ...parts])
          )
        );
      }
    }

    const existing = usersRowsByEmail.get(email) || [];
    existing.push(user);
    usersRowsByEmail.set(email, existing);
  });

  const qualityKeluargaBySls = new Map<string, number>();
  (qualityKeluargaData || []).forEach((row: any) => {
    const code = normalizeCode(
      getColumnValue(row, "idsubsls_25_2", [
        "idsubsls_25_2",
        "idsubsls",
        "idsubsls252",
        "kdsubsls",
        "kdsls",
        "kode",
        "code",
        "__col_0",
        "__col_3",
      ], "")
    );
    if (!code) return;

    const keluargaCount = parseNumber(
      getColumnValue(row, "total_hasil_pendataan", [
        "total_hasil_pendataan",
        "total hasil pendataan",
        "totalhasilpendataan",
        "jumlah_keluarga",
        "jumlah keluarga",
      ], "0")
    );
    qualityKeluargaBySls.set(code, (qualityKeluargaBySls.get(code) || 0) + keluargaCount);
  });

  const usahaRumahBySls = new Map<string, number>();
  (qualityUsahaRumahData || []).forEach((row: any) => {
    const code = normalizeCode(
      getColumnValue(row, "idsubsls_25_2", [
        "idsubsls_25_2",
        "idsubsls",
        "idsubsls252",
        "kdsubsls",
        "kdsls",
        "kode",
        "code",
        "__col_0",
        "__col_3",
      ], "")
    );
    if (!code) return;

    const usahaDalamKeluarga = parseNumber(
      getColumnValue(row, "jumlah_usaha_dlm_keluarga", [
        "jumlah usaha dalam keluarga yang berhasil didata",
        "jumlah_usaha_dlm_keluarga",
        "usaha dalam keluarga didata",
        "usaha_dlm_keluarga",
        "jumlah_usaha_dalam_keluarga",
        "usaha_dlm_rumah",
        "__col_3",
        "D",
      ], "0")
    );
    if (usahaDalamKeluarga) {
      usahaRumahBySls.set(code, (usahaRumahBySls.get(code) || 0) + usahaDalamKeluarga);
    }
  });

  const qualityUsahaBySls = new Map<string, number>();
  (qualityUsahaData || []).forEach((row: any) => {
    const code = normalizeCode(
      getColumnValue(row, "idsubsls_25_2", [
        "idsubsls_25_2",
        "idsubsls",
        "idsubsls252",
        "kdsubsls",
        "kdsls",
        "kode",
        "code",
        "__col_0",
        "__col_3",
      ], "")
    );
    if (!code) return;

    const totalUsaha = parseNumber(
      getColumnValue(row, "total", [
        "total",
        "total_usaha",
        "total usaha",
        "jumlah_usaha_total",
        "jumlah usaha total",
        "Total Usaha",
      ], "0")
    );
    qualityUsahaBySls.set(code, (qualityUsahaBySls.get(code) || 0) + totalUsaha);
  });

  const tableRows: DocxTableRow[] = [
    new DocxTableRow({
      children: [
        new DocxTableCell({
          width: { size: 900, type: WidthType.DXA },
          children: [getDocumentCell("No")],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new DocxTableCell({
          width: { size: 4200, type: WidthType.DXA },
          children: [getDocumentCell("Nama Petugas Lapangan Sensus")],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new DocxTableCell({
          width: { size: 2800, type: WidthType.DXA },
          children: [getDocumentCell("Kecamatan")],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new DocxTableCell({
          width: { size: 2800, type: WidthType.DXA },
          children: [getDocumentCell("Desa/Lurah")],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new DocxTableCell({
          width: { size: 2400, type: WidthType.DXA },
          children: [getDocumentCell("SLS/Sub-SLS")],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new DocxTableCell({
          width: { size: 2200, type: WidthType.DXA },
          children: [getDocumentCell("Muatan Hasil Pendataan")],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new DocxTableCell({
          width: { size: 2200, type: WidthType.DXA },
          children: [getDocumentCell("Keluarga")],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new DocxTableCell({
          width: { size: 2200, type: WidthType.DXA },
          children: [getDocumentCell("Usaha")],
          verticalAlign: VerticalAlign.CENTER,
        }),
      ],
    }),
  ];

  let rowIndex = 1;
  const addRow = (rowData: {
    namaPetugas: string;
    kecamatan: string;
    desa: string;
    sls: string;
    muatan: number | string;
    keluarga: number | string;
    usaha: number | string;
  }) => {
    tableRows.push(
      new DocxTableRow({
        children: [
          new DocxTableCell({ width: { size: 900, type: WidthType.DXA }, children: [getDocumentCell(String(rowIndex++))] }),
          new DocxTableCell({ width: { size: 4200, type: WidthType.DXA }, children: [getDocumentCell(rowData.namaPetugas)] }),
          new DocxTableCell({ width: { size: 2800, type: WidthType.DXA }, children: [getDocumentCell(rowData.kecamatan)] }),
          new DocxTableCell({ width: { size: 2800, type: WidthType.DXA }, children: [getDocumentCell(rowData.desa)] }),
          new DocxTableCell({ width: { size: 2400, type: WidthType.DXA }, children: [getDocumentCell(rowData.sls)] }),
          new DocxTableCell({ width: { size: 2200, type: WidthType.DXA }, children: [getDocumentCell(String(rowData.muatan))] }),
          new DocxTableCell({ width: { size: 2200, type: WidthType.DXA }, children: [getDocumentCell(String(rowData.keluarga))] }),
          new DocxTableCell({ width: { size: 2200, type: WidthType.DXA }, children: [getDocumentCell(String(rowData.usaha))] }),
        ],
      })
    );
  };

  const getFirstUserValue = (email: string, key: string, fallback: string) => {
    const rows = usersRowsByEmail.get(email) || [];
    return rows.length > 0 ? getDocString(getColumnValue(rows[0], key, [key], fallback)) : fallback;
  };

  if (pplUnderPML.length === 0) {
    addRow({
      namaPetugas: getDocString(pmlRow.nama_pml),
      kecamatan: getDocString(pmlRow.kecamatan),
      desa: "-",
      sls: "-",
      muatan: "-",
      keluarga: "-",
      usaha: "-",
    });
  } else {
    pplUnderPML.forEach((ppl: any) => {
      const emailPPL = String(
        getColumnValue(ppl, "email_ppl", ["email_ppl", "email", "Email", "Email PPL", "Email"], "")
      )
        .trim()
        .toLowerCase();
      const slsList = Array.from(new Set(usersSlsByEmail.get(emailPPL) || []));
      const desaValue = getFirstUserValue(emailPPL, "nama_desa_kel", "-");
      const kecamatanValue = getDocString(ppl.kecamatan || pmlRow.kecamatan || "-");
      const namaPetugasValue = getDocString(ppl.nama_ppl || pmlRow.nama_pml || "-");

      if (slsList.length === 0) {
        const keluargaValue = qualityKeluargaBySls.get("-") || 0;
        const usahaValue = (qualityUsahaBySls.get("-") || 0) + (usahaRumahBySls.get("-") || 0);
        addRow({
          namaPetugas: namaPetugasValue,
          kecamatan: kecamatanValue,
          desa: desaValue,
          sls: "-",
          muatan: keluargaValue + usahaValue,
          keluarga: keluargaValue,
          usaha: usahaValue,
        });
      } else {
        slsList.forEach((sls) => {
          const keluargaValue = qualityKeluargaBySls.get(sls) || 0;
          const usahaValue = (qualityUsahaBySls.get(sls) || 0) + (usahaRumahBySls.get(sls) || 0);
          addRow({
            namaPetugas: namaPetugasValue,
            kecamatan: kecamatanValue,
            desa: desaValue,
            sls: sls || "-",
            muatan: keluargaValue + usahaValue,
            keluarga: keluargaValue,
            usaha: usahaValue,
          });
        });
      }
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { orientation: PageOrientation.LANDSCAPE } },
        },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "LAMPIRAN", bold: true, size: 24 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "SURAT PERNYATAAN PENYELESAIAN LAPANGAN TERMIN I", bold: true, size: 24 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "SENSUS EKONOMI 2026", bold: true, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "", size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: `PML: ${getDocString(pmlRow.nama_pml)}`, bold: true, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: `Kecamatan: ${getDocString(pmlRow.kecamatan)}`, size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: "", size: 20 })] }),
          new DocxTable({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
          new Paragraph({ children: [new TextRun({ text: "", size: 20 })] }),
          new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "Yang membuat pernyataan,", bold: true, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: "<<Nama>>", italics: true, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: "", size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: "Mengetahui,", size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: "Ketua Tim Pelaksana Sensus Ekonomi 2026", size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: "Kabupaten/Kota...", size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: "", size: 20 })] }),
          new Paragraph({ children: [new TextRun({ text: "Sukadi, SST", bold: true, size: 22 })] }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `BAPP - ${sanitizeFilename(pmlRow.nama_pml)}.docx`;
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};'''
text = text[:start] + new + text[end:]
path.write_text(text, encoding='utf-8')
print('updated')
