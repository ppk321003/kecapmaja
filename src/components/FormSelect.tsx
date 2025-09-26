
import React from "react";
import Select from "react-select";

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps {
  placeholder?: string;
  options: Option[];
  value: string | string[] | null | undefined;
  onChange: (value: any) => void;
  isMulti?: boolean;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  placeholder = "Select...",
  options,
  value,
  onChange,
  isMulti = false,
}) => {
  // Convert string or array of strings to the format expected by react-select
  const getValue = () => {
    if (isMulti) {
      if (!value) return [];
      return options.filter(option => (value as string[]).includes(option.value));
    } else {
      return options.find(option => option.value === value) || null;
    }
  };

  // Handle change and return just the value(s) to the parent component
  const handleChange = (selected: any) => {
    if (isMulti) {
      onChange(selected ? selected.map((item: Option) => item.value) : []);
    } else {
      onChange(selected ? selected.value : null);
    }
  };

  return (
    <Select
      placeholder={placeholder}
      options={options}
      value={getValue()}
      onChange={handleChange}
      isMulti={isMulti}
      className="react-select-container"
      classNamePrefix="react-select"
      styles={{
        control: (provided) => ({
          ...provided,
          minHeight: '40px',
          fontSize: '14px',
          boxShadow: 'none',
          borderColor: 'hsl(var(--input))',
          '&:hover': {
            borderColor: 'hsl(var(--input))',
          }
        }),
        valueContainer: (provided) => ({
          ...provided,
          padding: '0 12px',
          fontSize: '14px',
        }),
        input: (provided) => ({
          ...provided,
          margin: '0',
          fontSize: '14px',
        }),
        singleValue: (provided) => ({
          ...provided,
          fontSize: '14px',
        }),
        placeholder: (provided) => ({
          ...provided,
          fontSize: '14px',
        }),
        option: (provided) => ({
          ...provided,
          fontSize: '14px',
        }),
        menu: (provided) => ({
          ...provided,
          zIndex: 9999,
        }),
      }}
    />
  );
};
