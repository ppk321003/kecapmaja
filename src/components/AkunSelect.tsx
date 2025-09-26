import React, { useEffect, useState } from 'react';
import { useAkun } from '@/hooks/use-database';
import { FormSelect } from '@/components/FormSelect';

interface AkunSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export const AkunSelect: React.FC<AkunSelectProps> = ({
  value,
  onChange,
  placeholder = "Pilih Akun..."
}) => {
  // Use the hook to get all akun items
  const { data: akunList = [], isLoading } = useAkun();
  const [selectedValue, setSelectedValue] = useState<string | null>(value);
  
  // Update internal state when the external value changes
  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const options = akunList.map(akun => ({
    value: akun.id,
    label: akun.name
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