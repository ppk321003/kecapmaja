import React, { useState, useMemo, useRef } from "react";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormLabel } from "@/components/ui/form";
import { Search, X } from "lucide-react";

const SOURCE_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

interface AkunSelectProps {
  value: string;
  onValueChange?: (value: string) => void;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

export const AkunSelect = ({ 
  value, 
  onValueChange, 
  onChange, 
  disabled,
  placeholder = "Pilih akun",
  label
}: AkunSelectProps) => {
  const { data, loading } = useGoogleSheetsData({
    spreadsheetId: SOURCE_SPREADSHEET_ID,
    sheetName: "akun"
  });

  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Transform and filter data
  const options = useMemo(() => {
    return data.map((item, index) => ({
      id: item.id || item.kode || `akun-${index}`,
      name: `${item.kode} - ${item.akun}`,
      kode: item.kode || '',
      akun: item.akun || ''
    }));
  }, [data]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    return options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.kode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, options]);

  const handleClearSearch = () => {
    setSearchTerm("");
    inputRef.current?.focus();
  };

  const handleValueChange = (newValue: string) => {
    if (onValueChange) onValueChange(newValue);
    if (onChange) onChange(newValue);
  };

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className="space-y-2">
      {label && <FormLabel>{label}</FormLabel>}
      <Select 
        value={value} 
        onValueChange={handleValueChange} 
        disabled={disabled || loading}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder}>
            {selectedOption ? selectedOption.kode : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="p-0">
          {/* Search Input */}
          <div className="sticky top-0 z-50 bg-popover p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Cari akun..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-8 h-9 text-sm"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-[250px] overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Tidak ada akun ditemukan
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => (
                  <SelectItem 
                    key={option.id} 
                    value={option.id}
                    className="cursor-pointer text-sm"
                  >
                    <div className="flex flex-col gap-0">
                      <span className="font-medium">{option.kode}</span>
                      <span className="text-xs text-muted-foreground">{option.akun}</span>
                    </div>
                  </SelectItem>
                ))}
              </div>
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
};
