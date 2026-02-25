import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TooltipLabelProps {
  label: string;
  description?: string;
  longDescription?: string;
  children?: React.ReactNode;
  className?: string;
  iconClassName?: string;
}

/**
 * Component untuk menampilkan label dengan tooltip
 * Digunakan untuk menjelaskan istilah teknis di halaman Karir
 */
export const TooltipLabel: React.FC<TooltipLabelProps> = ({
  label,
  description,
  longDescription,
  children,
  className = '',
  iconClassName = 'w-4 h-4'
}) => {
  const tooltipText = longDescription || description;

  if (!tooltipText && !children) {
    return <span className={className}>{label}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`inline-flex items-center gap-1.5 cursor-help ${className}`}>
          <span>{label}</span>
          <HelpCircle className={`${iconClassName} text-muted-foreground hover:text-primary transition-colors`} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-sm">
        <div className="space-y-1">
          {description && <p className="font-medium">{description}</p>}
          {longDescription && !description && <p>{longDescription}</p>}
          {longDescription && description && <p className="text-xs opacity-90">{longDescription}</p>}
          {children && <div className="mt-2 pt-2 border-t text-xs">{children}</div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default TooltipLabel;
