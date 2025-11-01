import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";

const SOURCE_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

interface KegiatanSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  programId?: string;
  disabled?: boolean;
}

export const KegiatanSelect = ({ value, onValueChange, programId, disabled }: KegiatanSelectProps) => {
  const { data, loading } = useGoogleSheetsData({
    spreadsheetId: SOURCE_SPREADSHEET_ID,
    sheetName: "kegiatan"
  });

  const filteredData = programId 
    ? data.filter(item => item.program_id === programId)
    : data;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Memuat..." : "Pilih Kegiatan"} />
      </SelectTrigger>
      <SelectContent>
        {filteredData.map((item) => (
          <SelectItem key={item.id} value={item.kode}>
            {item.kode} - {item.kegiatan}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
