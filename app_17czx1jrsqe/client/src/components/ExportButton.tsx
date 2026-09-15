import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ExportFormat } from '@/hooks/useExport';

interface ExportButtonProps {
  exporting: boolean;
  onExport: (format: ExportFormat) => void;
}

export function ExportButton({ exporting, onExport }: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1" disabled={exporting}>
          <Download className={cn('size-3.5', exporting && 'animate-spin')} />
          {exporting ? '导出中...' : '导出'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={() => onExport('excel')}>
          <FileSpreadsheet className="size-4" />
          导出 Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport('csv')}>
          <FileText className="size-4" />
          导出 CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
