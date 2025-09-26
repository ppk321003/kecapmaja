import React, { useEffect, useState } from 'react';
import { useKRO } from '@/hooks/use-database';
import { FormSelect } from '@/components/FormSelect';

interface KROSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  kegiatanId?: string | null;
}

export const KROSelect: React.FC<KROSelectProps> = ({
  value,
  onChange,
  placeholder = "Pilih KRO...",
  kegiatanId
}) => {
  // Use the hook to get KRO items based on kegiatanId
  const { data: kroList = [], isLoading } = useKRO(kegiatanId);
  const [selectedValue, setSelectedValue] = useState<string | null>(value);
  
  // Update internal state when the external value changes
  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const options = kroList.map(kro => ({
    value: kro.id,
    label: kro.name
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