
import React from 'react';
import { useKomponen } from '@/hooks/use-database';
import { FormSelect } from '@/components/FormSelect';

interface KomponenSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export const KomponenSelect: React.FC<KomponenSelectProps> = ({
  value,
  onChange,
  placeholder = "Pilih Komponen..."
}) => {
  // Use the hook without passing any roId parameter to get all komponen items
  const { data: komponenList = [], isLoading } = useKomponen();
  
  const options = komponenList.map(komponen => ({
    value: komponen.id,
    label: komponen.name
  }));

  return (
    <FormSelect
      placeholder={isLoading ? "Memuat..." : placeholder}
      options={options}
      value={value}
      onChange={onChange}
      isMulti={false}
    />
  );
};
