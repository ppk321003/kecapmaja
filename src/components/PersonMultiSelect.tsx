import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, ChevronDown, User, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface Person {
  id: string;
  name: string;
  jabatan?: string;
  kecamatan?: string;
}

interface PersonMultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: Person[];
  placeholder?: string;
  loading?: boolean;
  type: 'organik' | 'mitra';
}

export const PersonMultiSelect: React.FC<PersonMultiSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Pilih...",
  loading = false,
  type
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.jabatan && option.jabatan.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (option.kecamatan && option.kecamatan.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

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

  const handleSelect = (optionId: string) => {
    if (value.includes(optionId)) {
      onValueChange(value.filter(id => id !== optionId));
    } else {
      onValueChange([...value, optionId]);
    }
  };

  const selectedOptions = useMemo(() => {
    return options.filter(option => value.includes(option.id));
  }, [options, value]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm",
          "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring",
          "h-10 border-amber-600 focus:border-amber-700"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : selectedOptions.length > 0 ? (
            <div className="flex items-center gap-1">
              {type === 'organik' ? (
                <User className="h-4 w-4 text-blue-600" />
              ) : (
                <Users className="h-4 w-4 text-green-600" />
              )}
              <span className="truncate text-sm">
                {selectedOptions.length} terpilih
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Selected Names Display - BARU */}
      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 p-2 bg-muted/30 rounded-md border border-dashed border-gray-300">
          {selectedOptions.map((option) => (
            <div
              key={option.id}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-sm font-medium",
                type === 'organik' 
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              )}
            >
              <span>{option.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteConfirm({ id: option.id, name: option.name });
                }}
                className={cn(
                  "ml-1 font-bold hover:opacity-70 transition-opacity",
                  type === 'organik' 
                    ? "text-blue-600 hover:text-blue-800"
                    : "text-green-600 hover:text-green-800"
                )}
                title="Hapus"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-80">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder={`Cari ${type === 'organik' ? 'organik' : 'mitra'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-[200px] overflow-y-auto">
            <div className="p-1">
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Tidak ada data ditemukan
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option.id);
                  return (
                    <div
                      key={option.id}
                      onClick={() => handleSelect(option.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-blue-50"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center",
                        isSelected 
                          ? "bg-blue-600 border-blue-600" 
                          : "border-gray-300"
                      )}>
                        {isSelected && (
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn("text-gray-700 truncate block", isSelected && "text-blue-700 font-medium")}>
                          {option.name}
                        </span>
                        {(option.jabatan || option.kecamatan) && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {option.jabatan || option.kecamatan}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          
          {/* Selected Count Footer */}
          {selectedOptions.length > 0 && (
            <div className="border-t p-2 bg-muted/30">
              <div className="text-xs text-muted-foreground text-center">
                {selectedOptions.length} orang terpilih
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => {
        if (!open) setDeleteConfirm(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Nama?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus <span className="font-medium text-foreground">{deleteConfirm?.name}</span> dari daftar. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteConfirm) {
                  handleSelect(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Single select version untuk Pembuat Daftar
interface PersonSingleSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Person[];
  placeholder?: string;
  loading?: boolean;
}

export const PersonSingleSelect: React.FC<PersonSingleSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = "Pilih...",
  loading = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.jabatan && option.jabatan.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

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

  const handleSelect = (optionId: string) => {
    onValueChange(optionId);
    setIsOpen(false);
    setSearchTerm("");
  };

  const selectedOption = useMemo(() => {
    return options.find(option => option.id === value);
  }, [options, value]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm",
          "hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring",
          "h-10 border-input"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : selectedOption ? (
            <span className="truncate text-sm">{selectedOption.name}</span>
          ) : (
            <span className="text-muted-foreground text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-80">
          {/* Search Input */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Cari nama..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-[200px] overflow-y-auto">
            <div className="p-1">
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Tidak ada data ditemukan
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => handleSelect(option.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 cursor-pointer text-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-blue-50"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded-full border flex-shrink-0 flex items-center justify-center",
                        isSelected 
                          ? "bg-blue-600 border-blue-600" 
                          : "border-gray-300"
                      )}>
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn("text-gray-700 truncate block", isSelected && "text-blue-700 font-medium")}>
                          {option.name}
                        </span>
                        {option.jabatan && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {option.jabatan}
                          </span>
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
