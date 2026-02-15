/**
 * Reusable Searchable Select Component for Bahan Revisi Filters
 * Similar to KAK.tsx pattern - supports search, filter, and value/label separation
 */

import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  options,
  placeholder = 'Pilih...',
  disabled = false,
  onValueChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = options.filter(
    option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  // Reset search when dropdown opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  return (
    <Select
      value={value}
      onValueChange={(newValue) => {
        onValueChange(newValue);
        setIsOpen(false);
      }}
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={placeholder}>
          {selectedOption ? selectedOption.label : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {/* Search Input */}
        <div className="relative p-2 border-b">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-xs"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>

        {/* Options */}
        <div className="max-h-[250px] overflow-y-auto">
          {filteredOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}

          {filteredOptions.length === 0 && (
            <div className="p-2 text-xs text-muted-foreground text-center">
              Tidak ditemukan
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
};

export default SearchableSelect;
