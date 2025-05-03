
import { useMutation } from "@tanstack/react-query";
import { GoogleSheetsService } from "@/components/GoogleSheetsService";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";

interface SubmitToSheetsOptions {
  documentType: string;
  onSuccess?: () => void;
}

export const useSubmitToSheets = ({ documentType, onSuccess }: SubmitToSheetsOptions) => {
  return useMutation({
    mutationFn: async (data: any) => {
      try {
        console.log("Submitting data to Google Sheets:", data);
        
        // Generate a document ID
        const documentId = await GoogleSheetsService.generateDocumentId(documentType);
        
        // Prepare the row data based on the document type and form data
        let rowData: any[] = [];
        
        // First item is always the document ID
        rowData.push(documentId);
        
        switch (documentType) {
          case "TandaTerima":
            rowData = formatTandaTerimaData(documentId, data);
            break;
          case "KerangkaAcuanKerja":
            rowData = formatKerangkaAcuanKerjaData(documentId, data);
            break;
          case "DaftarHadir":
            rowData = formatDaftarHadirData(documentId, data);
            break;
          case "SPJHonor":
            rowData = formatSPJHonorData(documentId, data);
            break;
          case "TransportLokal":
            rowData = formatTransportLokalData(documentId, data);
            break;
          case "UangHarianTransport":
            rowData = formatUangHarianTransportData(documentId, data);
            break;
          case "KuitansiPerjalananDinas":
            rowData = formatKuitansiPerjalananDinasData(documentId, data);
            break;
          case "DokumenPengadaan":
            rowData = formatDokumenPengadaanData(documentId, data);
            break;
          default:
            throw new Error(`Unsupported document type: ${documentType}`);
        }
        
        // Append to Google Sheets
        const response = await GoogleSheetsService.appendData({
          sheetName: documentType,
          range: "A1", // Start from the first cell
          values: [rowData] // Add as a single row
        });
        
        console.log(`Data successfully saved to ${documentType} sheet:`, response);
        
        return { success: true, documentId };
      } catch (error: any) {
        console.error(`Error submitting ${documentType} to Google Sheets:`, error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Data berhasil disimpan",
        description: `ID dokumen: ${data.documentId}`,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan data",
        description: error.message,
      });
    }
  });
};

// Helper function to format Tanda Terima data
function formatTandaTerimaData(documentId: string, data: any): any[] {
  console.log("Formatting Tanda Terima data:", data);
  const row: any[] = [
    documentId,                    // ID
    data.namaKegiatan || "",       // Nama Kegiatan
    data.detail || "",             // Detail Kegiatan
    formatDate(data.tanggalPembuatanDaftar),  // Tanggal Pembuatan Daftar
    data._pembuatDaftarName || data.pembuatDaftar || "",      // Pembuat Daftar
  ];

  // Get display names for Organik BPS (instead of IDs)
  const organikIds = data.organikBPS || [];
  const organikNames = organikIds.map((id: string) => {
    return data._organikNameMap?.[id] || id;
  });
  row.push(organikNames.join(", ")); // Organik BPS

  // Add NIP BPS (empty for now, would need to fetch from database)
  row.push(""); // NIP BPS

  // Get display names for Mitra Statistik (instead of IDs)
  const mitraIds = data.mitraStatistik || [];
  const mitraNames = mitraIds.map((id: string) => {
    return data._mitraNameMap?.[id] || id;
  });
  row.push(mitraNames.join(", ")); // Mitra Statistik

  // Add NIK Mitra Statistik (empty for now, would need to fetch from database)
  row.push(""); // NIK Mitra Statistik

  // Add items (up to 15)
  const items = data.daftarItem || [];
  for (let i = 0; i < 15; i++) {
    const item = items[i] || {};
    row.push(item.namaItem || ""); // Nama Item
    row.push(item.banyaknya || ""); // Banyaknya
    row.push(item.satuan || ""); // Satuan
  }

  return row;
}

// Helper function to format Kerangka Acuan Kerja data
function formatKerangkaAcuanKerjaData(documentId: string, data: any): any[] {
  console.log("Formatting Kerangka Acuan Kerja data:", data);
  
  // Map selected IDs to their display names
  const programName = data._programNameMap?.[data.programPembebanan] || data.programPembebanan || "";
  const kegiatanName = data._kegiatanNameMap?.[data.kegiatan] || data.kegiatan || "";
  const kroName = data._kroNameMap?.[data.kro] || data.kro || "";
  const roName = data._roNameMap?.[data.ro] || data.ro || "";
  const komponenName = data._komponenNameMap?.[data.komponenOutput] || data.komponenOutput || "";
  const akunName = data._akunNameMap?.[data.akun] || data.akun || "";

  const row: any[] = [
    documentId,                                  // ID
    data.jenisKak || "",                         // Jenis Kerangka Acuan Kerja
    data.jenisPaketMeeting || "",                // Jenis Paket Meeting
    programName,                                 // Program Pembebanan
    kegiatanName,                                // Kegiatan
    kroName,                                     // KRO
    roName,                                      // RO
    komponenName,                                // Komponen Output
    akunName,                                    // Akun
    data.paguAnggaran || "",                     // Pagu Anggaran
    formatDate(data.tanggalPengajuanKAK),        // Tanggal Pengajuan KAK
    formatDate(data.tanggalMulaiKegiatan),       // Tanggal Mulai Kegiatan
    formatDate(data.tanggalAkhirKegiatan),       // Tanggal Akhir Kegiatan
    data._pembuatDaftarName || data.pembuatDaftar || "",    // Pembuat Daftar
  ];

  // Add kegiatan details (up to 15)
  const kegiatanDetails = data.kegiatanDetails || [];
  for (let i = 0; i < 15; i++) {
    const kegiatan = kegiatanDetails[i] || {};
    row.push(kegiatan.namaKegiatan || "");       // Nama Kegiatan
    row.push(kegiatan.volume || "");             // Volume
    row.push(kegiatan.satuan || "");             // Satuan
    row.push(kegiatan.hargaSatuan || "");        // Harga Satuan
  }

  // Add Jumlah Gelombang
  row.push(data.jumlahGelombang || "0");          // Jumlah Gelombang

  // Add wave dates (up to 10 gelombang)
  const waveDates = data.waveDates || [];
  for (let i = 0; i < 10; i++) {
    const wave = waveDates[i] || {};
    row.push(formatDate(wave.startDate));         // Tanggal Mulai Gelombang
    row.push(formatDate(wave.endDate));           // Tanggal Akhir Gelombang
  }

  return row;
}

// Helper function to format Daftar Hadir data
function formatDaftarHadirData(documentId: string, data: any): any[] {
  console.log("Formatting Daftar Hadir data:", data);
  
  const programName = data._programNameMap?.[data.program] || data.program || "";
  const kegiatanName = data._kegiatanNameMap?.[data.kegiatan] || data.kegiatan || "";
  const kroName = data._kroNameMap?.[data.kro] || data.kro || "";
  const roName = data._roNameMap?.[data.ro] || data.ro || "";
  const komponenName = data._komponenNameMap?.[data.komponen] || data.komponen || "";
  const akunName = data._akunNameMap?.[data.akun] || data.akun || "";
  const jenisName = data._jenisNameMap?.[data.jenis] || data.jenis || "";

  // Get display names for Organik and Mitra
  const organikNames = (data.organik || []).map((id: string) => {
    return data._organikNameMap?.[id] || id;
  });

  const mitraNames = (data.mitra || []).map((id: string) => {
    return data._mitraNameMap?.[id] || id;
  });
  
  const row: any[] = [
    documentId,                      // ID
    data.namaKegiatan || "",         // Nama Kegiatan
    data.detil || "",                // Detil
    jenisName,                       // Jenis
    programName,                     // Program
    kegiatanName,                    // Kegiatan
    kroName,                         // KRO
    roName,                          // RO
    komponenName,                    // Komponen
    akunName,                        // Akun
    formatDate(data.tanggalMulai),   // Tanggal Mulai
    formatDate(data.tanggalSelesai), // Tanggal Selesai
    data._pembuatDaftarName || data.pembuatDaftar || "",        // Pembuat Daftar
    organikNames.join(", "),         // Organik
    "",                              // NIP BPS (placeholder)
    mitraNames.join(", "),           // Mitra Statistik
    ""                               // NIK Mitra Statistik (placeholder)
  ];

  return row;
}

// Helper function to format SPJ Honor data
function formatSPJHonorData(documentId: string, data: any): any[] {
  console.log("Formatting SPJ Honor data:", data);
  
  const programName = data._programNameMap?.[data.program] || data.program || "";
  const kegiatanName = data._kegiatanNameMap?.[data.kegiatan] || data.kegiatan || "";
  const kroName = data._kroNameMap?.[data.kro] || data.kro || "";
  const roName = data._roNameMap?.[data.ro] || data.ro || "";
  const komponenName = data._komponenNameMap?.[data.komponen] || data.komponen || "";
  const akunName = data._akunNameMap?.[data.akun] || data.akun || "";
  const jenisName = data._jenisNameMap?.[data.jenis] || data.jenis || "";

  const row: any[] = [
    documentId,                    // ID
    data.namaKegiatan || "",       // Nama Kegiatan
    data.detil || "",              // Detil
    jenisName,                     // Jenis
    programName,                   // Program
    kegiatanName,                  // Kegiatan
    kroName,                       // KRO
    roName,                        // RO
    komponenName,                  // Komponen
    akunName,                      // Akun
    formatDate(data.tanggalSpj),   // Tanggal (SPJ)
    data._pembuatDaftarName || data.pembuatDaftar || "",      // Pembuat Daftar
  ];

  // Extract organik and mitra names from honorDetails
  const organikNames: string[] = [];
  const mitraNames: string[] = [];

  (data.honorDetails || []).forEach((detail: any) => {
    if (detail.type === 'organik' && detail.personId) {
      const name = data._organikNameMap?.[detail.personId] || detail.personId;
      if (!organikNames.includes(name)) {
        organikNames.push(name);
      }
    } else if (detail.type === 'mitra' && detail.personId) {
      const name = data._mitraNameMap?.[detail.personId] || detail.personId;
      if (!mitraNames.includes(name)) {
        mitraNames.push(name);
      }
    }
  });

  row.push(organikNames.join(", "));  // Organik
  row.push("");                       // NIP BPS (placeholder)
  row.push(mitraNames.join(", "));    // Mitra Statistik
  row.push("");                       // NIK Mitra Statistik (placeholder)

  return row;
}

// Helper function to format Transport Lokal data
function formatTransportLokalData(documentId: string, data: any): any[] {
  console.log("Formatting Transport Lokal data:", data);
  
  const programName = data._programNameMap?.[data.program] || data.program || "";
  const kegiatanName = data._kegiatanNameMap?.[data.kegiatan] || data.kegiatan || "";
  const kroName = data._kroNameMap?.[data.kro] || data.kro || "";
  const roName = data._roNameMap?.[data.ro] || data.ro || "";
  const komponenName = data._komponenNameMap?.[data.komponen] || data.komponen || "";
  const akunName = data._akunNameMap?.[data.akun] || data.akun || "";
  const jenisName = data._jenisNameMap?.[data.jenis] || data.jenis || "";

  // Get display names for Organik and Mitra
  const organikNames = (data.organikBPS || []).map((id: string) => {
    return data._organikNameMap?.[id] || id;
  });

  const mitraNames = (data.mitraStatistik || []).map((id: string) => {
    return data._mitraNameMap?.[id] || id;
  });

  const row: any[] = [
    documentId,                       // ID
    data.namaKegiatan || "",          // Nama Kegiatan
    data.detil || "",                 // Detil
    jenisName,                        // Jenis
    programName,                      // Program
    kegiatanName,                     // Kegiatan
    kroName,                          // KRO
    roName,                          // RO
    komponenName,                     // Komponen
    akunName,                         // Akun
    formatDate(data.tanggalPengajuan),// Tanggal Pengajuan
    data._pembuatDaftarName || data.pembuatDaftar || "",         // Pembuat Daftar
    organikNames.join(", "),          // Organik
    "",                               // NIP BPS (placeholder)
    mitraNames.join(", "),            // Mitra Statistik
    "",                                // NIK Mitra Statistik (placeholder)
    data.kecamatan || ""               // Nama Kecamatan (added as requested)
  ];

  return row;
}

// Helper function to format Uang Harian dan Transport Lokal data
function formatUangHarianTransportData(documentId: string, data: any): any[] {
  console.log("Formatting Uang Harian Transport data:", data);
  
  const programName = data._programNameMap?.[data.program] || data.program || "";
  const kegiatanName = data._kegiatanNameMap?.[data.kegiatan] || data.kegiatan || "";
  const kroName = data._kroNameMap?.[data.kro] || data.kro || "";
  const roName = data._roNameMap?.[data.ro] || data.ro || "";
  const komponenName = data._komponenNameMap?.[data.komponen] || data.komponen || "";
  const akunName = data._akunNameMap?.[data.akun] || data.akun || "";

  // Get display names for Organik and Mitra
  const organikNames = (data.organik || []).map((id: string) => {
    return data._organikNameMap?.[id] || id;
  });

  const mitraNames = (data.mitra || []).map((id: string) => {
    return data._mitraNameMap?.[id] || id;
  });

  const row: any[] = [
    documentId,                      // ID
    data.namaKegiatan || "",         // Nama Kegiatan
    data.detil || "",                // Detil
    data.jenis || "",                // Jenis
    programName,                     // Program
    kegiatanName,                    // Kegiatan
    kroName,                         // KRO
    roName,                          // RO
    komponenName,                    // Komponen
    akunName,                        // Akun
    data.trainingCenter || "",       // Training Center
    formatDate(data.tanggalMulai),   // Tanggal Mulai
    formatDate(data.tanggalSelesai), // Tanggal Selesai
    formatDate(data.tanggalSpj),     // Tanggal (SPJ)
    data._pembuatDaftarName || data.pembuatDaftar || "",        // Pembuat Daftar
    organikNames.join(", "),         // Organik
    "",                              // NIP BPS (placeholder)
    mitraNames.join(", "),           // Mitra Statistik
    ""                               // NIK Mitra Statistik (placeholder)
  ];

  return row;
}

// Helper function to format Kuitansi Perjalanan Dinas data
function formatKuitansiPerjalananDinasData(documentId: string, data: any): any[] {
  console.log("Formatting Kuitansi Perjalanan Dinas data:", data);
  
  const programName = data._programNameMap?.[data.program] || data.program || "";
  const kegiatanName = data._kegiatanNameMap?.[data.kegiatan] || data.kegiatan || "";
  const kroName = data._kroNameMap?.[data.kro] || data.kro || "";
  const roName = data._roNameMap?.[data.ro] || data.ro || "";
  const komponenName = data._komponenNameMap?.[data.komponen] || data.komponen || "";
  const akunName = data._akunNameMap?.[data.akun] || data.akun || "";
  
  const row: any[] = [
    documentId,                               // ID
    data.namaKegiatan || "",                  // Kuitansi Perjalanan Dinas
    data.jenisPerjalanan || "",               // Jenis Perjalanan Dinas
    data.nomorSuratTugas || "",               // Nomor Surat Tugas
    formatDate(data.tanggalSuratTugas),       // Tanggal Surat Tugas
    data.namaPelaksana || "",                 // Nama Pelaksana Perjalanan Dinas
    data.tujuanPerjalanan || "",              // Tujuan Pelaksanaan Perjalanan Dinas
    programName,                              // Program
    kegiatanName,                             // Kegiatan
    kroName,                                  // KRO
    roName,                                   // RO
    komponenName,                             // Komponen
    akunName,                                 // Akun
    formatDate(data.tanggalPengajuan),        // Tanggal Pengajuan
    data.kabupatenKota || "",                 // Kab/Kota Tujuan
    data.namaTempatTujuan || "",              // Nama Tempat Tujuan
    formatDate(data.tanggalBerangkat),        // Tanggal Berangkat
    formatDate(data.tanggalKembali),          // Tanggal Kembali
    data.biayaTransport || "",                // Biaya Transport Kab/Kota Tujuan (PP)
    data.biayaBBM || "",                      // Biaya Pembelian BBM/Tol (PP)
    data.biayaPenginapan || ""                // Biaya Penginapan/Hotel
  ];

  // Add kecamatan details (up to 5)
  const kecamatanDetails = data.kecamatanDetails || [];
  for (let i = 0; i < 5; i++) {
    const kecamatan = kecamatanDetails[i] || {};
    row.push(kecamatan.nama || "");                  // Kecamatan Tujuan
    row.push(formatDate(kecamatan.tanggalBerangkat)); // Tanggal Berangkat
    row.push(formatDate(kecamatan.tanggalKembali));   // Tanggal Kembali
  }

  return row;
}

// Helper function to format Dokumen Pengadaan data
function formatDokumenPengadaanData(documentId: string, data: any): any[] {
  console.log("Formatting Dokumen Pengadaan data:", data);
  
  const row: any[] = [
    documentId,                                // ID
    data.kodeKegiatan || "",                   // Kode Kegiatan
    data.namaPaket || "",                      // Nama Paket Pengadaan
    formatDate(data.tanggalMulai),             // Tanggal Mulai Pelaksanaan
    formatDate(data.tanggalSelesai),           // Tanggal Selesai Pelaksanaan
    data.spesifikasiTeknis || "",              // Spesifikasi Teknis
    data.volume || "",                         // Volume
    data.satuan || "",                         // Satuan
    data.hargaSatuanAwal || "",                // Harga Satuan Awal
    data.hargaSatuanSetelahNego || "",         // Harga Satuan Setelah Nego
    data.metodePengadaan || "",                // Metode Pengadaan
    data.bentukKontrak || "",                  // Bentuk/Bukti Kontrak
    data.jenisKontrak || "",                   // Jenis Kontrak
    data.caraPembayaran || "",                 // Cara Pembayaran
    data.uangMuka || "",                       // Uang Muka
    data.nomorFormulirPermintaan || "",        // Nomor Formulir Permintaan
    formatDate(data.tanggalFormulirPermintaan),// Tanggal Formulir Permintaan
    formatDate(data.tanggalKak),               // Tanggal Kerangka Acuan Kerja (KAK)
    data.nomorKertasKerjaHPS || "",            // Nomor Kertas Kerja Penyusunan HPS
    data.namaPenyedia || "",                   // Nama Penyedia Barang/Jasa
    data.namaPerwakilan || "",                 // Nama Perwakilan Penyedia
    data.jabatan || "",                        // Jabatan
    data.alamatPenyedia || "",                 // Alamat Penyedia
    data.namaBank || "",                       // Nama Bank
    data.nomorRekening || "",                  // Nomor Rekening
    data.atasNamaRekening || "",               // Atas Nama Rekening
    data.npwpPenyedia || "",                   // NPWP Penyedia
    data.nomorSuratPenawaranHarga || "",       // Nomor Surat Penawaran Harga
    data.nomorSuratPermintaanPembayaran || "", // Nomor Surat Permohonan Pembayaran
    data.nomorInvoice || ""                    // Nomor Invoice Pembayaran
  ];

  return row;
}

// Helper function to format date values
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  try {
    return format(new Date(date), "yyyy-MM-dd");
  } catch {
    return "";
  }
}
