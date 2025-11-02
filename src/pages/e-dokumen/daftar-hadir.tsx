import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, Trash } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { cn } from "@/lib/utils";

interface FormValues {
  namaKegiatan: string;
  detil: string;
  jenis: string;
  program: string;
  kegiatan: string;
  kro: string;
  ro: string;
  komponen: string;
  akun: string;
  trainingCenter: string;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  tanggalSpj: Date | null;
  organik: string[];
  mitra: string[];
  pembuatDaftar: string;
}

const defaultValues: FormValues = {
  namaKegiatan: "",
  detil: "",
  jenis: "",
  program: "",
  kegiatan: "",
  kro: "",
  ro: "",
  komponen: "",
  akun: "",
  trainingCenter: "",
  tanggalMulai: null,
  tanggalSelesai: null,
  tanggalSpj: null,
  organik: [],
  mitra: [],
  pembuatDaftar: ""
};

const trainingCenterOptions = ["BPS Kabupaten Majalengka", "RM. Majalengka", "Fitra Hotel", "Garden Hotel", "Horison Ultima", "Achiera Hotel"];
const jenisOptions = ["Pelatihan", "Briefing", "Rapat Persiapan", "Rapat Evaluasi"];

// Custom hook untuk membaca data dari Google Sheets
const useGoogleSheets = () => {
  const [isLoading, setIsLoading] = useState(false);

  const readData = async (spreadsheetId: string, range: string) => {
    setIsLoading(true);
    try {
      // Simulasi pembacaan data dari Google Sheets
      // Dalam implementasi nyata, ini akan memanggil API Google Sheets
      console.log(`Reading data from ${spreadsheetId}, range: ${range}`);
      
      // Untuk sementara, return data dummy berdasarkan range yang diminta
      return await getMockData(spreadsheetId, range);
    } catch (error) {
      console.error("Error reading data:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const appendData = async (spreadsheetId: string, range: string, values: any[]) => {
    setIsLoading(true);
    try {
      console.log(`Appending data to ${spreadsheetId}, range: ${range}`, values);
      // Simulasi penyimpanan data
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    } catch (error) {
      console.error("Error appending data:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { readData, appendData, isLoading };
};

// Data mock untuk testing
const getMockData = async (spreadsheetId: string, range: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (spreadsheetId === "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8") {
    // Data Referensi
    if (range === "program!A:C") {
      return {
        values: [
          ["No", "Kode", "Nama Program"],
          ["1", "P001", "Program Statistik Dasar"],
          ["2", "P002", "Program Statistik Sektoral"],
          ["3", "P003", "Program Statistik Khusus"]
        ]
      };
    }
    
    if (range === "kegiatan!A:D") {
      return {
        values: [
          ["No", "ProgramID", "Kode", "Nama Kegiatan"],
          ["1", "P001", "K001", "Sensus Pertanian"],
          ["2", "P001", "K002", "Survei Sosial Ekonomi"],
          ["3", "P002", "K003", "Statistik Kesehatan"],
          ["4", "P002", "K004", "Statistik Pendidikan"],
          ["5", "P003", "K005", "Statistik Lingkungan"]
        ]
      };
    }
    
    if (range === "kro!A:D") {
      return {
        values: [
          ["No", "KegiatanID", "Kode", "Nama KRO"],
          ["1", "K001", "KRO001", "Pengumpulan Data Pertanian"],
          ["2", "K001", "KRO002", "Pengolahan Data Pertanian"],
          ["3", "K002", "KRO003", "Pengumpulan Data Sosial"],
          ["4", "K003", "KRO004", "Pengumpulan Data Kesehatan"]
        ]
      };
    }
    
    if (range === "ro!A:D") {
      return {
        values: [
          ["No", "KROID", "Kode", "Nama RO"],
          ["1", "KRO001", "RO001", "Penyusunan Kuesioner"],
          ["2", "KRO001", "RO002", "Pelatihan Petugas"],
          ["3", "KRO002", "RO003", "Data Cleaning"],
          ["4", "KRO003", "RO004", "Wawancara Lapangan"]
        ]
      };
    }
    
    if (range === "komponen!A:C") {
      return {
        values: [
          ["No", "Kode", "Nama Komponen"],
          ["1", "KOMP001", "Honorarium"],
          ["2", "KOMP002", "Transportasi"],
          ["3", "KOMP003", "Akomodasi"],
          ["4", "KOMP004", "Konsumsi"]
        ]
      };
    }
    
    if (range === "akun!A:C") {
      return {
        values: [
          ["No", "Kode", "Nama Akun"],
          ["1", "521211", "Belanja Honor Operasional"],
          ["2", "524111", "Belanja Perjalanan Dinas"],
          ["3", "521213", "Belanja Konsumsi Rapat"],
          ["4", "521115", "Belanja Pengadaan Barang"]
        ]
      };
    }
  }
  
  if (spreadsheetId === "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM") {
    // Data Master
    if (range === "MASTER.ORGANIK") {
      return {
        values: [
          ["No", "NIP", "NIP BPS", "Nama", "Jabatan", "Kecamatan"],
          ["1", "123456", "BPS123", "Budi Santoso", "Statistisi", "Majalengka"],
          ["2", "234567", "BPS234", "Siti Rahayu", "Koordinator", "Cikijing"],
          ["3", "345678", "BPS345", "Ahmad Fauzi", "Staff", "Talaga"]
        ]
      };
    }
    
    if (range === "MASTER.MITRA") {
      return {
        values: [
          ["No", "NIK", "Nama", "Pekerjaan", "Alamat", "Bank", "Rekening", "Kecamatan"],
          ["1", "327123456", "Dedi Supriadi", "Petani", "Jl. Merdeka No.1", "BNI", "123456", "Majalengka"],
          ["2", "327234567", "Maya Sari", "Guru", "Jl. Pahlawan No.2", "BRI", "234567", "Cikijing"],
          ["3", "327345678", "Rizki Pratama", "Wiraswasta", "Jl. Sudirman No.3", "Mandiri", "345678", "Talaga"]
        ]
      };
    }
  }
  
  return { values: [] };
};

// Format tanggal Indonesia
const formatTanggalIndonesia = (date: Date | null): string => {
  if (!date) return "";
  
  const day = date.getDate();
  const month = date.toLocaleDateString('id-ID', { month: 'long' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

// Komponen FormSelect sederhana
interface FormSelectProps {
  value: string | string[];
  onChange: (value: any) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  isMulti?: boolean;
}

const FormSelect: React.FC<FormSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Pilih...",
  isMulti = false 
}) => {
  const handleChange = (newValue: string) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(newValue)) {
        onChange(currentValues.filter(v => v !== newValue));
      } else {
        onChange([...currentValues, newValue]);
      }
    } else {
      onChange(newValue);
    }
  };

  if (isMulti) {
    return (
      <Select onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={value as string} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

// Komponen select yang diperbaiki
const KomponenSelect: React.FC<{ value: string; onValueChange: (value: string) => void }> = ({ value, onValueChange }) => {
  const [komponenOptions, setKomponenOptions] = useState<Array<{id: string, name: string}>>([]);
  const { readData } = useGoogleSheets();

  useEffect(() => {
    const fetchKomponen = async () => {
      try {
        const data = await readData("1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8", "komponen!A:C");
        
        const rows = data?.values || [];
        console.log('Komponen data:', rows);
        
        if (rows.length > 1) {
          const options = rows.slice(1).map((row: any[]) => ({
            id: row[1] || row[0] || '',
            name: row[2] || row[1] || ''
          })).filter((item: any) => item.id && item.name);
          
          setKomponenOptions(options);
        }
      } catch (error) {
        console.error("Error fetching komponen:", error);
      }
    };

    fetchKomponen();
  }, []);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Pilih komponen" />
      </SelectTrigger>
      <SelectContent>
        {komponenOptions.map(option => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const KegiatanSelect: React.FC<{ value: string; onValueChange: (value: string) => void; programId?: string }> = ({ value, onValueChange, programId }) => {
  const [kegiatanOptions, setKegiatanOptions] = useState<Array<{id: string, name: string}>>([]);
  const { readData } = useGoogleSheets();

  useEffect(() => {
    const fetchKegiatan = async () => {
      try {
        const data = await readData("1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8", "kegiatan!A:D");
        
        const rows = data?.values || [];
        console.log('All kegiatan data:', rows);
        
        if (rows.length > 1) {
          let options = [];
          
          if (programId) {
            // Filter berdasarkan programId
            options = rows.slice(1)
              .filter((row: any[]) => {
                const matchesProgram = row[1] === programId;
                console.log(`Checking row:`, row, `matches program ${programId}:`, matchesProgram);
                return matchesProgram;
              })
              .map((row: any[]) => ({
                id: row[2] || row[1] || '',
                name: row[3] || row[2] || ''
              }))
              .filter((item: any) => item.id && item.name);
          } else {
            // Tampilkan semua kegiatan jika tidak ada programId
            options = rows.slice(1).map((row: any[]) => ({
              id: row[2] || row[1] || '',
              name: row[3] || row[2] || ''
            })).filter((item: any) => item.id && item.name);
          }
          
          console.log('Filtered kegiatan options:', options);
          setKegiatanOptions(options);
        } else {
          console.log('No kegiatan data found');
          setKegiatanOptions([]);
        }
      } catch (error) {
        console.error("Error fetching kegiatan:", error);
        setKegiatanOptions([]);
      }
    };

    fetchKegiatan();
  }, [programId]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={!programId}>
      <SelectTrigger>
        <SelectValue placeholder={programId ? "Pilih kegiatan" : "Pilih program terlebih dahulu"} />
      </SelectTrigger>
      <SelectContent>
        {kegiatanOptions.length > 0 ? (
          kegiatanOptions.map(option => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-data" disabled>
            {programId ? "Tidak ada kegiatan tersedia" : "Pilih program terlebih dahulu"}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

const KROSelect: React.FC<{ value: string; onValueChange: (value: string) => void; kegiatanId?: string }> = ({ value, onValueChange, kegiatanId }) => {
  const [kroOptions, setKroOptions] = useState<Array<{id: string, name: string}>>([]);
  const { readData } = useGoogleSheets();

  useEffect(() => {
    const fetchKRO = async () => {
      try {
        const data = await readData("1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8", "kro!A:D");
        
        const rows = data?.values || [];
        console.log('All KRO data:', rows);
        
        if (rows.length > 1) {
          let options = [];
          
          if (kegiatanId) {
            options = rows.slice(1)
              .filter((row: any[]) => row[1] === kegiatanId)
              .map((row: any[]) => ({
                id: row[2] || row[1] || '',
                name: row[3] || row[2] || ''
              }))
              .filter((item: any) => item.id && item.name);
          } else {
            options = rows.slice(1).map((row: any[]) => ({
              id: row[2] || row[1] || '',
              name: row[3] || row[2] || ''
            })).filter((item: any) => item.id && item.name);
          }
          
          console.log('Filtered KRO options:', options);
          setKroOptions(options);
        }
      } catch (error) {
        console.error("Error fetching KRO:", error);
      }
    };

    fetchKRO();
  }, [kegiatanId]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={!kegiatanId}>
      <SelectTrigger>
        <SelectValue placeholder={kegiatanId ? "Pilih KRO" : "Pilih kegiatan terlebih dahulu"} />
      </SelectTrigger>
      <SelectContent>
        {kroOptions.length > 0 ? (
          kroOptions.map(option => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-data" disabled>
            {kegiatanId ? "Tidak ada KRO tersedia" : "Pilih kegiatan terlebih dahulu"}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

const ROSelect: React.FC<{ value: string; onValueChange: (value: string) => void; kroId?: string }> = ({ value, onValueChange, kroId }) => {
  const [roOptions, setRoOptions] = useState<Array<{id: string, name: string}>>([]);
  const { readData } = useGoogleSheets();

  useEffect(() => {
    const fetchRO = async () => {
      try {
        const data = await readData("1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8", "ro!A:D");
        
        const rows = data?.values || [];
        console.log('All RO data:', rows);
        
        if (rows.length > 1) {
          let options = [];
          
          if (kroId) {
            options = rows.slice(1)
              .filter((row: any[]) => row[1] === kroId)
              .map((row: any[]) => ({
                id: row[2] || row[1] || '',
                name: row[3] || row[2] || ''
              }))
              .filter((item: any) => item.id && item.name);
          } else {
            options = rows.slice(1).map((row: any[]) => ({
              id: row[2] || row[1] || '',
              name: row[3] || row[2] || ''
            })).filter((item: any) => item.id && item.name);
          }
          
          console.log('Filtered RO options:', options);
          setRoOptions(options);
        }
      } catch (error) {
        console.error("Error fetching RO:", error);
      }
    };

    fetchRO();
  }, [kroId]);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={!kroId}>
      <SelectTrigger>
        <SelectValue placeholder={kroId ? "Pilih RO" : "Pilih KRO terlebih dahulu"} />
      </SelectTrigger>
      <SelectContent>
        {roOptions.length > 0 ? (
          roOptions.map(option => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="no-data" disabled>
            {kroId ? "Tidak ada RO tersedia" : "Pilih KRO terlebih dahulu"}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
};

const AkunSelect: React.FC<{ value: string; onValueChange: (value: string) => void }> = ({ value, onValueChange }) => {
  const [akunOptions, setAkunOptions] = useState<Array<{id: string, name: string}>>([]);
  const { readData } = useGoogleSheets();

  useEffect(() => {
    const fetchAkun = async () => {
      try {
        const data = await readData("1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8", "akun!A:C");
        
        const rows = data?.values || [];
        console.log('Akun data:', rows);
        
        if (rows.length > 1) {
          const options = rows.slice(1).map((row: any[]) => ({
            id: row[1] || row[0] || '',
            name: row[2] || row[1] || ''
          })).filter((item: any) => item.id && item.name);
          
          setAkunOptions(options);
        }
      } catch (error) {
        console.error("Error fetching akun:", error);
      }
    };

    fetchAkun();
  }, []);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Pilih akun" />
      </SelectTrigger>
      <SelectContent>
        {akunOptions.map(option => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const DaftarHadir = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrganik, setSelectedOrganik] = useState<any[]>([]);
  const [selectedMitra, setSelectedMitra] = useState<any[]>([]);
  const [programs, setPrograms] = useState<Array<{id: string, name: string}>>([]);
  const [organikList, setOrganikList] = useState<Array<{id: string, name: string, jabatan: string}>>([]);
  const [mitraList, setMitraList] = useState<Array<{id: string, name: string, kecamatan: string}>>([]);

  const { readData, appendData, isLoading: isSheetLoading } = useGoogleSheets();

  // Use react-hook-form
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FormValues>({
    defaultValues
  });

  // Reset dependent fields when parent field changes
  const watchProgram = watch('program');
  const watchKegiatan = watch('kegiatan');
  const watchKro = watch('kro');

  useEffect(() => {
    if (watchProgram) {
      setValue('kegiatan', '');
      setValue('kro', '');
      setValue('ro', '');
    }
  }, [watchProgram, setValue]);

  useEffect(() => {
    if (watchKegiatan) {
      setValue('kro', '');
      setValue('ro', '');
    }
  }, [watchKegiatan, setValue]);

  useEffect(() => {
    if (watchKro) {
      setValue('ro', '');
    }
  }, [watchKro, setValue]);

  // Fetch data programs
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const data = await readData("1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8", "program!A:C");
        
        const rows = data?.values || [];
        console.log('Program data:', rows);
        
        if (rows.length > 1) {
          const programData = rows.slice(1).map((row: any[]) => ({
            id: row[1] || row[0] || '',
            name: row[2] || row[1] || ''
          })).filter((item: any) => item.id && item.name);
          
          setPrograms(programData);
        }
      } catch (error) {
        console.error("Error fetching programs:", error);
      }
    };

    fetchPrograms();
  }, []);

  // Fetch data organik
  useEffect(() => {
    const fetchOrganik = async () => {
      try {
        const data = await readData("1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM", "MASTER.ORGANIK");
        
        const rows = data?.values || [];
        console.log('Organik data:', rows);
        
        if (rows.length > 1) {
          const organikData = rows.slice(1).map((row: any[]) => ({
            id: row[1] || row[0] || '', // NIP
            name: row[3] || row[2] || '', // Nama
            jabatan: row[4] || '' // Jabatan
          })).filter((item: any) => item.id && item.name);
          
          setOrganikList(organikData);
        }
      } catch (error) {
        console.error("Error fetching organik:", error);
      }
    };

    fetchOrganik();
  }, []);

  // Fetch data mitra
  useEffect(() => {
    const fetchMitra = async () => {
      try {
        const data = await readData("1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM", "MASTER.MITRA");
        
        const rows = data?.values || [];
        console.log('Mitra data:', rows);
        
        if (rows.length > 1) {
          const mitraData = rows.slice(1).map((row: any[]) => ({
            id: `mitra-${row[1]}` || `mitra-${row[0]}` || '', // NIK
            name: row[2] || row[1] || '', // Nama
            kecamatan: row[7] || row[6] || '' // Kecamatan
          })).filter((item: any) => item.id && item.name);
          
          setMitraList(mitraData);
        }
      } catch (error) {
        console.error("Error fetching mitra:", error);
      }
    };

    fetchMitra();
  }, []);

  // Effect untuk update selected organik dan mitra
  useEffect(() => {
    const organikIds = watch('organik') || [];
    const mitraIds = watch('mitra') || [];
    
    const updatedOrganik = organikIds.map(id => 
      organikList.find(item => item.id === id)
    ).filter(Boolean);
    
    const updatedMitra = mitraIds.map(id => 
      mitraList.find(item => item.id === id)
    ).filter(Boolean);
    
    setSelectedOrganik(updatedOrganik);
    setSelectedMitra(updatedMitra);
  }, [watch('organik'), watch('mitra'), organikList, mitraList]);

  const handleSubmitForm = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      console.log('Form data submitted:', data);

      // Prepare data for Google Sheets submission
      const pembuatDaftar = organikList.find(item => item.id === data.pembuatDaftar);
      
      // Format data sesuai struktur spreadsheet
      const rowData = [
        data.namaKegiatan,
        data.detil || "",
        data.jenis,
        programs.find(p => p.id === data.program)?.name || data.program,
        "", // Kegiatan akan diisi berdasarkan selection
        "", // KRO akan diisi berdasarkan selection  
        "", // RO akan diisi berdasarkan selection
        "", // Komponen akan diisi berdasarkan selection
        "", // Akun akan diisi berdasarkan selection
        formatTanggalIndonesia(data.tanggalMulai),
        formatTanggalIndonesia(data.tanggalSelesai),
        pembuatDaftar?.name || data.pembuatDaftar,
        selectedOrganik.map(org => org.name).join(", "),
        selectedMitra.map(mitra => mitra.name).join(", ")
      ];

      console.log('Data prepared for sheets:', rowData);

      // Submit to Google Sheets
      await appendData("11a8c8cBJrgqS4ZKKvClvq_6DYsFI8R22Aka1NTxYkF0", "DaftarHadir", [rowData]);

      toast({
        title: "Sukses!",
        description: "Daftar Hadir berhasil disimpan",
        variant: "default"
      });
      
      navigate("/e-dokumen/buat");

    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan dokumen",
        description: "Terjadi kesalahan saat menyimpan data"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeOrganik = (id: string) => {
    const currentOrganik = watch('organik') || [];
    const updatedOrganik = currentOrganik.filter(orgId => orgId !== id);
    setValue('organik', updatedOrganik);
  };

  const removeMitra = (id: string) => {
    const currentMitra = watch('mitra') || [];
    const updatedMitra = currentMitra.filter(mitraId => mitraId !== id);
    setValue('mitra', updatedMitra);
  };

  const isLoading = isSubmitting || isSheetLoading;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-orange-600">Daftar Hadir</h1>
          <p className="text-muted-foreground mt-2">
            Formulir Daftar Hadir
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Form Daftar Hadir</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
              {/* Informasi Kegiatan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="namaKegiatan">Nama Kegiatan <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="namaKegiatan" 
                    control={control} 
                    rules={{ required: "Nama kegiatan harus diisi" }}
                    render={({ field }) => (
                      <Input 
                        id="namaKegiatan" 
                        placeholder="Contoh: Pelatihan Petugas Pemutakhiran Perkembangan Desa Tahun 2025"
                        value={field.value} 
                        onChange={field.onChange} 
                      />
                    )} 
                  />
                  {errors.namaKegiatan && <p className="text-sm text-destructive">{errors.namaKegiatan.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detil">Detil Kegiatan</Label>
                  <Controller 
                    name="detil" 
                    control={control} 
                    render={({ field }) => (
                      <Input 
                        id="detil" 
                        placeholder="Contoh: Pemutakhiran Perkembangan Desa Tahun 2025"
                        value={field.value} 
                        onChange={field.onChange} 
                      />
                    )} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Jenis <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="jenis" 
                    control={control} 
                    rules={{ required: "Jenis harus dipilih" }}
                    render={({ field }) => (
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis" />
                        </SelectTrigger>
                        <SelectContent>
                          {jenisOptions.map(option => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} 
                  />
                  {errors.jenis && <p className="text-sm text-destructive">{errors.jenis.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tempat Kegiatan</Label>
                  <Controller 
                    name="trainingCenter" 
                    control={control} 
                    render={({ field }) => (
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tempat kegiatan" />
                        </SelectTrigger>
                        <SelectContent>
                          {trainingCenterOptions.map(option => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} 
                  />
                </div>
              </div>

              {/* Program dan Kegiatan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Program Pembebanan <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="program" 
                    control={control} 
                    rules={{ required: "Program harus dipilih" }}
                    render={({ field }) => (
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih program" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map(program => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )} 
                  />
                  {errors.program && <p className="text-sm text-destructive">{errors.program.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Kegiatan <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="kegiatan" 
                    control={control} 
                    rules={{ required: "Kegiatan harus dipilih" }}
                    render={({ field }) => (
                      <KegiatanSelect 
                        value={field.value} 
                        onValueChange={field.onChange}
                        programId={watch('program')} 
                      />
                    )} 
                  />
                  {errors.kegiatan && <p className="text-sm text-destructive">{errors.kegiatan.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Kode Rincian Output (KRO) <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="kro" 
                    control={control} 
                    rules={{ required: "KRO harus dipilih" }}
                    render={({ field }) => (
                      <KROSelect 
                        value={field.value} 
                        onValueChange={field.onChange}
                        kegiatanId={watch('kegiatan')} 
                      />
                    )} 
                  />
                  {errors.kro && <p className="text-sm text-destructive">{errors.kro.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Rincian Output (RO) <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="ro" 
                    control={control} 
                    rules={{ required: "RO harus dipilih" }}
                    render={({ field }) => (
                      <ROSelect 
                        value={field.value} 
                        onValueChange={field.onChange}
                        kroId={watch('kro')} 
                      />
                    )} 
                  />
                  {errors.ro && <p className="text-sm text-destructive">{errors.ro.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Komponen Output <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="komponen" 
                    control={control} 
                    rules={{ required: "Komponen harus dipilih" }}
                    render={({ field }) => (
                      <KomponenSelect 
                        value={field.value} 
                        onValueChange={field.onChange}
                      />
                    )} 
                  />
                  {errors.komponen && <p className="text-sm text-destructive">{errors.komponen.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Akun <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="akun" 
                    control={control} 
                    rules={{ required: "Akun harus dipilih" }}
                    render={({ field }) => (
                      <AkunSelect 
                        value={field.value} 
                        onValueChange={field.onChange}
                      />
                    )} 
                  />
                  {errors.akun && <p className="text-sm text-destructive">{errors.akun.message}</p>}
                </div>
              </div>

              {/* Tanggal */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal Mulai <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="tanggalMulai" 
                    control={control} 
                    rules={{ required: "Tanggal mulai harus diisi" }}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )} 
                  />
                  {errors.tanggalMulai && <p className="text-sm text-destructive">{errors.tanggalMulai.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Selesai <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="tanggalSelesai" 
                    control={control} 
                    rules={{ required: "Tanggal selesai harus diisi" }}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )} 
                  />
                  {errors.tanggalSelesai && <p className="text-sm text-destructive">{errors.tanggalSelesai.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Tanggal membuat daftar <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="tanggalSpj" 
                    control={control} 
                    rules={{ required: "Tanggal SPJ harus diisi" }}
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )} 
                  />
                  {errors.tanggalSpj && <p className="text-sm text-destructive">{errors.tanggalSpj.message}</p>}
                </div>
              </div>

              {/* Pembuat Daftar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pembuat Daftar <span className="text-red-500">*</span></Label>
                  <Controller 
                    name="pembuatDaftar" 
                    control={control} 
                    rules={{ required: "Pembuat daftar harus dipilih" }}
                    render={({ field }) => (
                      <FormSelect 
                        placeholder="Pilih pembuat daftar" 
                        options={organikList.map(item => ({
                          value: item.id,
                          label: item.name
                        }))} 
                        value={field.value} 
                        onChange={field.onChange}
                      />
                    )} 
                  />
                  {errors.pembuatDaftar && <p className="text-sm text-destructive">{errors.pembuatDaftar.message}</p>}
                </div>
              </div>

              {/* Peserta Organik dan Mitra */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Peserta Organik */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Peserta Organik BPS</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Controller 
                        name="organik" 
                        control={control} 
                        render={({ field }) => (
                          <FormSelect 
                            placeholder="Pilih organik BPS" 
                            options={organikList.map(item => ({
                              value: item.id,
                              label: item.name
                            }))} 
                            value={field.value} 
                            onChange={field.onChange}
                            isMulti 
                          />
                        )} 
                      />
                    </div>
                    
                    {/* Daftar peserta organik yang sudah dipilih */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedOrganik.map(org => (
                        <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-sm text-muted-foreground">{org.jabatan}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOrganik(org.id)}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Peserta Mitra */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Peserta Mitra Statistik</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Controller 
                        name="mitra" 
                        control={control} 
                        render={({ field }) => (
                          <FormSelect 
                            placeholder="Pilih mitra statistik" 
                            options={mitraList.map(item => ({
                              value: item.id,
                              label: `${item.name}${item.kecamatan ? ` - ${item.kecamatan}` : ''}`
                            }))} 
                            value={field.value} 
                            onChange={field.onChange}
                            isMulti 
                          />
                        )} 
                      />
                    </div>
                    
                    {/* Daftar peserta mitra yang sudah dipilih */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedMitra.map(mitra => (
                        <div key={mitra.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{mitra.name}</p>
                            <p className="text-sm text-muted-foreground">{mitra.kecamatan}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMitra(mitra.id)}
                          >
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Ringkasan Peserta */}
              {(selectedOrganik.length > 0 || selectedMitra.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Ringkasan Peserta ({selectedOrganik.length + selectedMitra.length} orang)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-3 text-green-600">
                          Organik BPS ({selectedOrganik.length})
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selectedOrganik.map(org => (
                            <div key={org.id} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm">{org.name}</span>
                              <span className="text-xs text-muted-foreground">{org.jabatan}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-3 text-blue-600">
                          Mitra Statistik ({selectedMitra.length})
                        </h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {selectedMitra.map(mitra => (
                            <div key={mitra.id} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm">{mitra.name}</span>
                              <span className="text-xs text-muted-foreground">{mitra.kecamatan}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/e-dokumen/buat")}
                  disabled={isLoading}
                  className="min-w-24"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="min-w-32 bg-teal-600 hover:bg-teal-700"
                >
                  {isLoading ? "Menyimpan..." : "Simpan Dokumen"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DaftarHadir;