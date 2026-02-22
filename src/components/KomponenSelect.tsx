import React, { useState, useEffect, useRef, useMemo } from "react";
import { useGoogleSheetsData } from "@/hooks/use-google-sheets-data";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const SOURCE_SPREADSHEET_ID = "1G9E1CxP_ohSgc7mRl0GY_xPmvKGxylQh3asKM4aWwL8";

interface KomponenOption {
  id: string;
  kode: string;
  komponen: string;
}

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

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus ke input search saat dropdown terbuka
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mapedData: KomponenOption[] = data.map((item, index) => ({
    id: item.id || item.kode || `komponen-${index}`,
    kode: item.kode || '',
    komponen: item.komponen || ''
  }));

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return mapedData;
    return mapedData.filter(option =>
      option.komponen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.kode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [mapedData, searchTerm]);

  const selectedKomponen = mapedData.find(option => option.id === value);

  const handleValueChange = (newValue: string) => {
    if (onValueChange) onValueChange(newValue);
    if (onChange) onChange(newValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={cn(
          "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "min-h-[40px] text-left",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : selectedKomponen ? (
            <span className="truncate">{selectedKomponen.kode} - {selectedKomponen.komponen}</span>
          ) : (
            <span className="text-muted-foreground">Pilih Komponen...</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Content */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-0 shadow-md animate-in fade-in-80">
          {/* Search Input */}
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Cari kode atau nama komponen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List dengan Scroll */}
          <div className="max-h-64 overflow-y-auto">
            <div className="p-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada data komponen ditemukan
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value === option.id;

                  return (
                    <div
                      key={option.id}
                      onClick={() => handleValueChange(option.id)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-md cursor-pointer transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-blue-50 border border-blue-200"
                      )}
                    >
                      <div className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-sm border mt-0.5",
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300"
                      )}>
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "font-medium truncate",
                            isSelected && "text-blue-700"
                          )}>
                            {option.kode}
                          </p>
                          {isSelected && (
                            <Badge variant="outline" className="text-xs">
                              Terpilih
                            </Badge>
                          )}
                        </div>
                        {option.komponen && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {option.komponen}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
