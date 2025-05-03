
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const KerangkaAcuanKerja = () => {
  const [jenisKAK, setJenisKAK] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [jumlahGelombang, setJumlahGelombang] = useState(0);
  const [gelombangDates, setGelombangDates] = useState<Array<{ start: Date | undefined, end: Date | undefined }>>([]);
  const [tangggalPengajuan, setTanggalPengajuan] = useState<Date>();
  
  // Handle change in jumlah gelombang
  const handleJumlahGelombangChange = (value: string) => {
    const numGelombang = parseInt(value) || 0;
    setJumlahGelombang(numGelombang);
    
    // Initialize or resize the gelombang dates array
    const newGelombangDates = [...gelombangDates];
    if (numGelombang > newGelombangDates.length) {
      // Add new entries if we need more
      while (newGelombangDates.length < numGelombang) {
        newGelombangDates.push({ start: undefined, end: undefined });
      }
    } else {
      // Remove entries if we need fewer
      newGelombangDates.splice(numGelombang);
    }
    
    setGelombangDates(newGelombangDates);
  };
  
  // Handle gelombang date changes
  const handleGelombangDateChange = (index: number, type: 'start' | 'end', date: Date) => {
    const newGelombangDates = [...gelombangDates];
    newGelombangDates[index] = {
      ...newGelombangDates[index],
      [type]: date
    };
    setGelombangDates(newGelombangDates);
  };

  return (
    <div className="container mx-auto py-10">
      <ScrollArea className="h-[calc(100vh-2rem)] pr-4">
        <div className="flex flex-col gap-6">
          <h1 className="text-2xl font-bold text-center mb-5">
            Form Kerangka Acuan Kerja
          </h1>

          <Card>
            <CardHeader>
              <CardTitle>Detail Kerangka Acuan Kerja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="jenis">Jenis Kerangka Acuan Kerja</Label>
                <Select value={jenisKAK} onValueChange={(value) => setJenisKAK(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis KAK" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Belanja Paket Meeting">Belanja Paket Meeting</SelectItem>
                    <SelectItem value="Belanja Konsumsi Rapat">Belanja Konsumsi Rapat</SelectItem>
                    <SelectItem value="Perjalanan Dinas">Perjalanan Dinas</SelectItem>
                    <SelectItem value="Belanja Jasa">Belanja Jasa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="nomor_kak">Nomor KAK</Label>
                <Input
                  id="nomor_kak"
                  placeholder="Masukkan Nomor KAK"
                  type="text"
                />
              </div>

              <div>
                <Label htmlFor="nama_kegiatan">Nama Kegiatan</Label>
                <Input
                  id="nama_kegiatan"
                  placeholder="Masukkan Nama Kegiatan"
                  type="text"
                />
              </div>

              <div>
                <Label htmlFor="dasar_kegiatan">Dasar Kegiatan</Label>
                <Input
                  id="dasar_kegiatan"
                  placeholder="Masukkan Dasar Kegiatan"
                  type="text"
                />
              </div>

              <div>
                <Label htmlFor="maksud_tujuan">Maksud dan Tujuan</Label>
                <Input
                  id="maksud_tujuan"
                  placeholder="Masukkan Maksud dan Tujuan"
                  type="text"
                />
              </div>

              <div>
                <Label htmlFor="keluaran">Keluaran</Label>
                <Input
                  id="keluaran"
                  placeholder="Masukkan Keluaran"
                  type="text"
                />
              </div>

              <div>
                <Label>Waktu Pelaksanaan</Label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="tanggal_mulai">Tanggal Mulai Kegiatan</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "PPP") : <span>Pilih Tanggal</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="flex-1">
                    <Label htmlFor="tanggal_akhir">Tanggal Akhir Kegiatan</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "PPP") : <span>Pilih Tanggal</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {jenisKAK === "Belanja Paket Meeting" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="jumlah_gelombang">Jumlah Gelombang</Label>
                    <Input
                      id="jumlah_gelombang"
                      placeholder="Masukkan Jumlah Gelombang"
                      type="number"
                      min="1"
                      value={jumlahGelombang || ""}
                      onChange={(e) => handleJumlahGelombangChange(e.target.value)}
                    />
                  </div>
                  
                  {jumlahGelombang > 0 && gelombangDates.map((gelombang, index) => (
                    <div key={index} className="space-y-4">
                      <Separator />
                      <h3 className="text-md font-medium">Gelombang {index + 1}</h3>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <Label htmlFor={`tanggal_mulai_gelombang_${index+1}`}>
                            Tanggal Mulai Gelombang-{index + 1}
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !gelombang.start && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {gelombang.start ? format(gelombang.start, "PPP") : <span>Pilih Tanggal</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={gelombang.start}
                                onSelect={(date) => date && handleGelombangDateChange(index, 'start', date)}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="flex-1">
                          <Label htmlFor={`tanggal_akhir_gelombang_${index+1}`}>
                            Tanggal Akhir Gelombang-{index + 1}
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !gelombang.end && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {gelombang.end ? format(gelombang.end, "PPP") : <span>Pilih Tanggal</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={gelombang.end}
                                onSelect={(date) => date && handleGelombangDateChange(index, 'end', date)}
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label htmlFor="penanggung_jawab">Penanggung Jawab Kegiatan</Label>
                <Input
                  id="penanggung_jawab"
                  placeholder="Masukkan Nama Penanggung Jawab"
                  type="text"
                />
              </div>

              <div>
                <Label htmlFor="tanggal_pengajuan">Tanggal Pengajuan KAK</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !tangggalPengajuan && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {tangggalPengajuan ? format(tangggalPengajuan, "PPP") : <span>Pilih Tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={tangggalPengajuan}
                      onSelect={setTanggalPengajuan}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="default">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Dokumen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};

export default KerangkaAcuanKerja;
