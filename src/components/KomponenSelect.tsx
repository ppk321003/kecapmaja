import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";

const SOURCE_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

interface KomponenSelectProps {
  value: string;
  onValueChange?: (value: string) => void;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export const KomponenSelect = ({ value, onValueChange, onChange, disabled }: KomponenSelectProps) => {
  const { data, loading } = useGoogleSheetsData({
    spreadsheetId: SOURCE_SPREADSHEET_ID,
    sheetName: "komponen"
  });

  const handleValueChange = (newValue: string) => {
    if (onValueChange) onValueChange(newValue);
    if (onChange) onChange(newValue);
  };

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Memuat..." : "Pilih Komponen"} />
      </SelectTrigger>
      <SelectContent>
        {data.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.kode} - {item.komponen}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
