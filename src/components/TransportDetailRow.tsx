import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TransportDetailRowProps {
  item: any;
  index: number;
  type: "organik" | "mitra";
  personList: Array<{ id: string; name: string }>;
  kecamatanList: string[];
  onUpdate: (type: "organik" | "mitra", index: number, field: string, value: any) => void;
  onRemove: (type: "organik" | "mitra", index: number) => void;
}

const TransportDetailRow = memo(({ 
  item, 
  index, 
  type, 
  personList, 
  kecamatanList, 
  onUpdate, 
  onRemove 
}: TransportDetailRowProps) => {
  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-medium">
          {type === "organik" ? "Organik BPS" : "Mitra Statistik"} #{index + 1}
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onRemove(type, index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Nama */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Nama</label>
          <Select
            value={item.personId}
            onValueChange={(value) => onUpdate(type, index, "personId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih nama" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {personList.map(person => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Dari Kecamatan */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Dari Kecamatan</label>
          <Select
            value={item.dariKecamatan}
            onValueChange={(value) => onUpdate(type, index, "dariKecamatan", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kecamatanList.map(kecamatan => (
                <SelectItem key={kecamatan} value={kecamatan}>
                  {kecamatan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kecamatan Tujuan */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Kecamatan Tujuan</label>
          <Select
            value={item.kecamatanTujuan}
            onValueChange={(value) => onUpdate(type, index, "kecamatanTujuan", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih kecamatan tujuan" />
            </SelectTrigger>
            <SelectContent>
              {kecamatanList.map(kecamatan => (
                <SelectItem key={kecamatan} value={kecamatan}>
                  {kecamatan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rate */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Rate (Rp)</label>
          <Input
            type="text"
            pattern="[0-9]*"
            value={item.rate || ""}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              onUpdate(type, index, "rate", value);
            }}
            placeholder="0"
          />
        </div>

        {/* Tanggal Pelaksanaan */}
        <div className="space-y-2 col-span-2">
          <label className="text-sm font-medium">Tanggal Pelaksanaan</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full pl-3 text-left font-normal",
                  !item.tanggalPelaksanaan && "text-muted-foreground"
                )}
              >
                {item.tanggalPelaksanaan ? format(item.tanggalPelaksanaan, "PPP", { locale: idLocale }) : <span>Pilih tanggal</span>}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={item.tanggalPelaksanaan}
                onSelect={(date) => onUpdate(type, index, "tanggalPelaksanaan", date)}
                disabled={(date) => false}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
});

TransportDetailRow.displayName = "TransportDetailRow";

export default TransportDetailRow;