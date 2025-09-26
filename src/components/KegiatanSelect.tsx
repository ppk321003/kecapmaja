import React, { useEffect, useState } from 'react';
import { useKegiatan } from '@/hooks/use-database';
import { FormSelect } from '@/components/FormSelect';

interface KegiatanSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  programId?: string | null;
}

export const KegiatanSelect: React.FC<KegiatanSelectProps> = ({
  value,
  onChange,
  placeholder = "Pilih Kegiatan...",
  programId
}) => {
  // Use the hook to get kegiatan items based on programId
  const { data: kegiatanList = [], isLoading } = useKegiatan(programId);
  const [selectedValue, setSelectedValue] = useState<string | null>(value);
  
  // Update internal state when the external value changes
  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const options = kegiatanList.map(kegiatan => ({
    value: kegiatan.id,
    label: kegiatan.name
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