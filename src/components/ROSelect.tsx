import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";

const SOURCE_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

interface ROSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  kroId?: string;
  disabled?: boolean;
}

export const ROSelect = ({ value, onValueChange, kroId, disabled }: ROSelectProps) => {
  const { data, loading } = useGoogleSheetsData({
    spreadsheetId: SOURCE_SPREADSHEET_ID,
    sheetName: "ro"
  });

  const filteredData = kroId 
    ? data.filter(item => item.kro_id === kroId)
    : data;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Memuat..." : "Pilih RO"} />
      </SelectTrigger>
      <SelectContent>
        {filteredData.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.kode} - {item.ro}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
