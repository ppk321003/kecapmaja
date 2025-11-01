import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";

const SOURCE_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

interface AkunSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const AkunSelect = ({ value, onValueChange, disabled }: AkunSelectProps) => {
  const { data, loading } = useGoogleSheetsData({
    spreadsheetId: SOURCE_SPREADSHEET_ID,
    sheetName: "akun"
  });

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Memuat..." : "Pilih Akun"} />
      </SelectTrigger>
      <SelectContent>
        {data.map((item) => (
          <SelectItem key={item.id} value={item.kode}>
            {item.kode} - {item.akun}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
