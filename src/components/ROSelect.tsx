import React, { useEffect, useState } from 'react';
import { useRO } from '@/hooks/use-database';
import { FormSelect } from '@/components/FormSelect';

interface ROSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  kroId?: string | null;
}

export const ROSelect: React.FC<ROSelectProps> = ({
  value,
  onChange,
  placeholder = "Pilih RO...",
  kroId
}) => {
  // Use the hook to get RO items based on kroId
  const { data: roList = [], isLoading } = useRO(kroId);
  const [selectedValue, setSelectedValue] = useState<string | null>(value);
  
  // Update internal state when the external value changes
  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const options = roList.map(ro => ({
    value: ro.id,
    label: ro.name
  }));

  const handleChange = (newValue: string | null) => {
    setSelectedValue(newValue);
    onChange(newValue);
  };

  return (
    <FormSelect
      placeholder={isLoading ? "Memuat..." : placeholder}
      options={options}
      value={selectedValue}
      onChange={handleChange}
      isMulti={false}
    />
  );
};