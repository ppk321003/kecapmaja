import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FormSelectProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  isMulti?: boolean;
}

export function FormSelect({ value, onChange, options, placeholder = "Pilih...", isMulti = false }: FormSelectProps) {
  if (isMulti) {
    const selectedValues = Array.isArray(value) ? value : [];
    
    return (
      <div className="space-y-2">
        <Select 
          value="" 
          onValueChange={(newValue) => {
            if (selectedValues.includes(newValue)) {
              onChange(selectedValues.filter(v => v !== newValue));
            } else {
              onChange([...selectedValues, newValue]);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={selectedValues.length > 0 ? `${selectedValues.length} dipilih` : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {selectedValues.includes(option.value) ? "✓ " : ""}{option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedValues.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedValues.map((val) => {
              const option = options.find(o => o.value === val);
              return option ? (
                <div key={val} className="bg-primary/10 text-primary px-2 py-1 rounded text-sm flex items-center gap-1">
                  {option.label}
                  <button onClick={() => onChange(selectedValues.filter(v => v !== val))} className="hover:text-destructive">×</button>
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Select value={value as string} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
