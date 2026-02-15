/**
 * Reusable Searchable Select Component for Bahan Revisi Filters
 * Similar to KAK.tsx pattern - supports search, filter, and value/label separation
 */

import React, { useState, useEffect, useMemo } from 'react';
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

  // Ensure options is always a safe array of valid SelectOptions
  const safeOptions = useMemo(() => {
    try {
      if (!Array.isArray(options)) return [];
      return options.filter(opt => {
        try {
          return (
            opt &&
            typeof opt === 'object' &&
            typeof opt.value === 'string' &&
            typeof opt.label === 'string' &&
            opt.value.length > 0 &&
            opt.label.length > 0
          );
        } catch {
          return false;
        }
      });
    } catch (e) {
      console.error('Error processing options:', options, e);
      return [];
    }
  }, [options]);

  const filteredOptions = useMemo(() => {
    try {
      if (!safeOptions || !Array.isArray(safeOptions)) return [];
      const lowerSearchTerm = String(searchTerm || '').toLowerCase();
      return safeOptions.filter(option => {
        try {
          const optLabel = String(option.label || '').toLowerCase();
          const optValue = String(option.value || '').toLowerCase();
          return optLabel.includes(lowerSearchTerm) || optValue.includes(lowerSearchTerm);
        } catch {
          return false;
        }
      });
    } catch (e) {
      console.error('Error filtering options:', e);
      return [];
    }
  }, [safeOptions, searchTerm]);

  const selectedOption = useMemo(() => {
    try {
      if (!safeOptions || !Array.isArray(safeOptions)) return undefined;
      const safeValue = String(value || '');
      return safeOptions.find(opt => opt && String(opt.value || '') === safeValue);
    } catch (e) {
      console.error('Error finding selected option:', e);
      return undefined;
    }
  }, [safeOptions, value]);

  // Reset search when dropdown opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  return (
    <Select
      value={String(value || '')}
      onValueChange={(newValue) => {
        try {
          onValueChange(String(newValue || ''));
          setIsOpen(false);
        } catch (e) {
          console.error('Error in onValueChange:', e);
        }
      }}
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue placeholder={placeholder}>
          {selectedOption && selectedOption.label ? String(selectedOption.label) : placeholder}
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
          {filteredOptions && filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              try {
                const key = String(option.value || `opt-${Math.random()}`);
                const val = String(option.value || '');
                const lbl = String(option.label || '');
                
                if (!key || !val || !lbl) return null;
                
                return (
                  <SelectItem key={key} value={val} className="text-xs">
                    {lbl}
                  </SelectItem>
                );
              } catch (e) {
                console.error('Error rendering option item:', option, e);
                return null;
              }
            })
          ) : (
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
