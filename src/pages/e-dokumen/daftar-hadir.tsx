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
import { supabase } from "@/integrations/supabase/client";

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

// Format tanggal Indonesia
const formatTanggalIndonesia = (date: Date | null): string => {
  if (!date) return "";
  
  const day = date.getDate();
  const month = date.toLocaleDateString('id-ID', { month: 'long' });
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

// Custom hook untuk submit data
const useSubmitToSheets = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitData = async (data: any[]) => {
    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("google-sheets", {
        body: {
          spreadsheetId: "11a8c8cBJrgqS4ZKKvClvq_6DYsFI8R22Aka1NTxYkF0",
          operation: "append",
          range: "DaftarHadir",
          values: [data]
        }
      });

      if (error) throw error;
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submitData, isSubmitting };
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

// Komponen select sederhana tanpa placeholder yang tidak diperlukan
const KomponenSelect: React.FC<{ value: string; onValueChange: (value: string) => void }> = ({ value, onValueChange }) => {
  const [komponenOptions, setKomponenOptions] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    const fetchKomponen = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8",
            operation: "read",
            range: "komponen"
          }
        });

        if (error) throw error;
        
        const rows = data?.values || [];
        if (rows.length > 1) {
          const options = rows.slice(1).map((row: any[]) => ({
            id: row[1] || '',
            name: row[2] || ''
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

  useEffect(() => {
    const fetchKegiatan = async () => {
      if (!programId) {
        setKegiatanOptions([]);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8",
            operation: "read",
            range: "kegiatan"
          }
        });

        if (error) throw error;
        
        const rows = data?.values || [];
        if (rows.length > 1) {
          const options = rows.slice(1)
            .filter((row: any[]) => row[1] === programId)
            .map((row: any[]) => ({
              id: row[2] || '',
              name: row[3] || ''
            }))
            .filter((item: any) => item.id && item.name);
          
          setKegiatanOptions(options);
        }
      } catch (error) {
        console.error("Error fetching kegiatan:", error);
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
        {kegiatanOptions.map(option => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const KROSelect: React.FC<{ value: string; onValueChange: (value: string) => void; kegiatanId?: string }> = ({ value, onValueChange, kegiatanId }) => {
  const [kroOptions, setKroOptions] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    const fetchKRO = async () => {
      if (!kegiatanId) {
        setKroOptions([]);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8",
            operation: "read",
            range: "kro"
          }
        });

        if (error) throw error;
        
        const rows = data?.values || [];
        if (rows.length > 1) {
          const options = rows.slice(1)
            .filter((row: any[]) => row[1] === kegiatanId)
            .map((row: any[]) => ({
              id: row[2] || '',
              name: row[3] || ''
            }))
            .filter((item: any) => item.id && item.name);
          
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
        {kroOptions.map(option => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const ROSelect: React.FC<{ value: string; onValueChange: (value: string) => void; kroId?: string }> = ({ value, onValueChange, kroId }) => {
  const [roOptions, setRoOptions] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    const fetchRO = async () => {
      if (!kroId) {
        setRoOptions([]);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8",
            operation: "read",
            range: "ro"
          }
        });

        if (error) throw error;
        
        const rows = data?.values || [];
        if (rows.length > 1) {
          const options = rows.slice(1)
            .filter((row: any[]) => row[1] === kroId)
            .map((row: any[]) => ({
              id: row[2] || '',
              name: row[3] || ''
            }))
            .filter((item: any) => item.id && item.name);
          
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
        {roOptions.map(option => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const AkunSelect: React.FC<{ value: string; onValueChange: (value: string) => void }> = ({ value, onValueChange }) => {
  const [akunOptions, setAkunOptions] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    const fetchAkun = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8",
            operation: "read",
            range: "akun"
          }
        });

        if (error) throw error;
        
        const rows = data?.values || [];
        if (rows.length > 1) {
          const options = rows.slice(1).map((row: any[]) => ({
            id: row[1] || '',
            name: row[2] || ''
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

  const { submitData, isSubmitting: isSubmitLoading } = useSubmitToSheets();

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

  // Fetch data programs
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8",
            operation: "read",
            range: "program"
          }
        });

        if (error) throw error;
        
        const rows = data?.values || [];
        if (rows.length > 1) {
          const programData = rows.slice(1).map((row: any[]) => ({
            id: row[1] || '',
            name: row[2] || ''
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
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM",
            operation: "read",
            range: "MASTER.ORGANIK"
          }
        });

        if (error) throw error;
        
        const rows = data?.values || [];
        if (rows.length > 1) {
          const organikData = rows.slice(1).map((row: any[]) => ({
            id: row[1] || '', // NIP
            name: row[3] || '', // Nama
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
        const { data, error } = await supabase.functions.invoke("google-sheets", {
          body: {
            spreadsheetId: "1Sj1r_LrYmiUi9ABtjABHGC2bp5GqhVXcjBD9mGCvvtM",
            operation: "read",
            range: "MASTER.MITRA"
          }
        });

        if (error) throw error;
        
        const rows = data?.values || [];
        if (rows.length > 1) {
          const mitraData = rows.slice(1).map((row: any[]) => ({
            id: `mitra-${row[1]}` || '', // NIK
            name: row[2] || '', // Nama
            kecamatan: row[7] || '' // Kecamatan
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
      await submitData(rowData);

      toast({
        title: "Sukses!",
        description: "Daftar Hadir berhasil disimpan",
        variant: "default"
      });
      
      navigate("/buat-dokumen");

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

  const isLoading = isSubmitting || isSubmitLoading;

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