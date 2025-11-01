import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";

const SOURCE_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

interface KROSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  kegiatanId?: string;
  disabled?: boolean;
}

export const KROSelect = ({ value, onValueChange, kegiatanId, disabled }: KROSelectProps) => {
  const { data, loading } = useGoogleSheetsData({
    spreadsheetId: SOURCE_SPREADSHEET_ID,
    sheetName: "kro"
  });

  const filteredData = kegiatanId 
    ? data.filter(item => item.kegiatan_id === kegiatanId)
    : data;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Memuat..." : "Pilih KRO"} />
      </SelectTrigger>
      <SelectContent>
        {filteredData.map((item) => (
          <SelectItem key={item.id} value={item.kode}>
            {item.kode} - {item.kro}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
