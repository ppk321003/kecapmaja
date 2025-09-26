import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FormSelect } from "@/components/FormSelect";

interface Trip {
  kecamatanTujuan: string;
  rate: string;
  tanggalPelaksanaan: Date | null;
}

interface PersonTransportGroupProps {
  personId: string;
  personName: string;
  dariKecamatan: string;
  trips: Trip[];
  type: "organik" | "mitra";
  personList: Array<{ id: string; name: string }>;
  kecamatanList: string[];
  onUpdatePerson: (personId: string) => void;
  onUpdateDariKecamatan: (kecamatan: string) => void;
  onUpdateTrip: (tripIndex: number, field: keyof Trip, value: any) => void;
  onAddTrip: () => void;
  onRemoveTrip: (tripIndex: number) => void;
  onRemovePerson: () => void;
}

const PersonTransportGroup = memo(({ 
  personId,
  personName,
  dariKecamatan,
  trips,
  type,
  personList,
  kecamatanList,
  onUpdatePerson,
  onUpdateDariKecamatan,
  onUpdateTrip,
  onAddTrip,
  onRemoveTrip,
  onRemovePerson
}: PersonTransportGroupProps) => {
  const totalRate = trips.reduce((sum, trip) => sum + (parseInt(trip.rate) || 0), 0);

  return (
    <div className="border rounded-lg p-4 mb-4 bg-card">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-base font-semibold text-primary">
          {type === "organik" ? "Organik BPS" : "Mitra Statistik"}
        </h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemovePerson}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Person Selection and From Kecamatan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nama</label>
          <FormSelect
            placeholder="Pilih nama"
            options={personList.map(person => ({
              value: person.id,
              label: person.name
            }))}
            value={personId}
            onChange={onUpdatePerson}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Dari Kecamatan</label>
          <Select
            value={dariKecamatan}
            onValueChange={onUpdateDariKecamatan}
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
      </div>

      {/* Trips */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h5 className="text-sm font-medium">Perjalanan ({personName})</h5>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddTrip}
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah Perjalanan
          </Button>
        </div>

        {trips.map((trip, tripIndex) => (
          <div key={tripIndex} className="border rounded-md p-3 bg-background">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-muted-foreground">
                Perjalanan #{tripIndex + 1}
              </span>
              {trips.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveTrip(tripIndex)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Kecamatan Tujuan */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Kecamatan Tujuan</label>
                <Select
                  value={trip.kecamatanTujuan}
                  onValueChange={(value) => onUpdateTrip(tripIndex, "kecamatanTujuan", value)}
                >
                  <SelectTrigger className="text-sm">
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
                <label className="text-xs font-medium">Rate (Rp)</label>
                <Input
                  type="text"
                  pattern="[0-9]*"
                  value={trip.rate || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    onUpdateTrip(tripIndex, "rate", value);
                  }}
                  placeholder="0"
                  className="text-sm"
                />
              </div>

              {/* Tanggal Pelaksanaan */}
              <div className="space-y-2">
                <label className="text-xs font-medium">Tanggal Pelaksanaan</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal text-sm",
                        !trip.tanggalPelaksanaan && "text-muted-foreground"
                      )}
                    >
                      {trip.tanggalPelaksanaan ? 
                        format(trip.tanggalPelaksanaan, "dd/MM/yyyy", { locale: idLocale }) : 
                        <span>Pilih tanggal</span>
                      }
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={trip.tanggalPelaksanaan}
                      onSelect={(date) => onUpdateTrip(tripIndex, "tanggalPelaksanaan", date)}
                      disabled={(date) => false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total for this person */}
      <div className="mt-4 pt-3 border-t">
        <div className="text-right">
          <span className="text-sm font-medium">
            Total {personName}: Rp {totalRate.toLocaleString("id-ID")}
          </span>
        </div>
      </div>
    </div>
  );
});

PersonTransportGroup.displayName = "PersonTransportGroup";

export default PersonTransportGroup;