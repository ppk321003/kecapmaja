import { Document } from '@/types/pencairan';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface DocumentChecklistProps {
  documents: Document[];
  onToggle?: (index: number) => void;
  readOnly?: boolean;
}

export function DocumentChecklist({ documents, onToggle, readOnly = false }: DocumentChecklistProps) {
  return (
    <div className="space-y-2">
      {documents.map((doc, index) => (
        <div
          key={`${doc.type}-${index}`}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg border transition-colors',
            doc.isChecked ? 'bg-green-50 border-green-200' : 'bg-card border-border',
            !readOnly && 'cursor-pointer hover:bg-muted/50'
          )}
          onClick={() => !readOnly && onToggle?.(index)}
        >
          <Checkbox
            checked={doc.isChecked}
            onCheckedChange={() => !readOnly && onToggle?.(index)}
            disabled={readOnly}
            className="rounded"
          />
          <div className="flex-1">
            <span className={cn(
              'text-sm',
              doc.isChecked && 'line-through text-muted-foreground'
            )}>
              {doc.name}
            </span>
            {doc.isRequired && (
              <span className="text-destructive ml-1">*</span>
            )}
            {!doc.isRequired && (
              <span className="text-muted-foreground text-xs ml-2">(Opsional)</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
