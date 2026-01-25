import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  return (
    <Card className="mb-4 border-2">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header dengan nama dan tombol hapus */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pilih Nama */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Nama {type === "organik" ? "Organik" : "Mitra"}
                </label>
                <Select value={personId} onValueChange={onUpdatePerson}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Pilih ${type === "organik" ? "organik" : "mitra"}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {personList.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dari Kecamatan */}
              <div>
                <label className="text-sm font-medium mb-2 block">Dari Kecamatan</label>
                <Select value={dariKecamatan} onValueChange={onUpdateDariKecamatan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kecamatan asal" />
                  </SelectTrigger>
                  <SelectContent>
                    {kecamatanList.map((kec) => (
                      <SelectItem key={kec} value={kec}>
                        {kec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tombol Hapus Orang */}
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onRemovePerson}
              className="mt-6"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Daftar Trip */}
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            {trips.map((trip, tripIndex) => (
              <div key={tripIndex} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                {/* Kecamatan Tujuan */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Ke Kecamatan</label>
                  <Select
                    value={trip.kecamatanTujuan}
                    onValueChange={(value) => onUpdateTrip(tripIndex, "kecamatanTujuan", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {kecamatanList.map((kec) => (
                        <SelectItem key={kec} value={kec}>
                          {kec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Rate (Rp)</label>
                  <Input
                    type="number"
                    value={trip.rate}
                    onChange={(e) => onUpdateTrip(tripIndex, "rate", e.target.value)}
                    placeholder="0"
                  />
                </div>

                {/* Tanggal Pelaksanaan */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Tanggal</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !trip.tanggalPelaksanaan && "text-muted-foreground"
                        )}
                      >
                        {trip.tanggalPelaksanaan ? (
                          format(trip.tanggalPelaksanaan, "PPP", { locale: idLocale })
                        ) : (
                          <span>Pilih tanggal</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={trip.tanggalPelaksanaan || undefined}
                        onSelect={(date) => onUpdateTrip(tripIndex, "tanggalPelaksanaan", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tombol Hapus Trip */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => onRemoveTrip(tripIndex)}
                  disabled={trips.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Tombol Tambah Trip */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddTrip}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Tambah Perjalanan
            </Button>
          </div>

          {/* Total untuk person ini */}
          <div className="text-right pt-2 border-t">
            <span className="text-sm font-medium">
              Subtotal: Rp{" "}
              {trips
                .reduce((sum, trip) => sum + (parseInt(trip.rate) || 0), 0)
                .toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

PersonTransportGroup.displayName = "PersonTransportGroup";

export default PersonTransportGroup;
