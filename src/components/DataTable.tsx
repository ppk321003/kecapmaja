import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Column {
  key: string;
  header: string;
  render?: (value: any, row?: any) => React.ReactNode;
}

interface DataTableProps {
  title: string;
  columns: Column[];
  data: any[];
}

export function DataTable({ title, columns, data }: DataTableProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => {
                  try {
                    return (
                      <TableHead key={column.key}>
                        {String(column.header || '')}
                      </TableHead>
                    );
                  } catch (e) {
                    console.error('Error rendering table header:', column.key, e);
                    return (
                      <TableHead key={column.key}>
                        -
                      </TableHead>
                    );
                  }
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    Tidak ada data
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column) => {
                      try {
                        const cellValue = row[column.key];
                        const renderedContent = column.render 
                          ? column.render(cellValue, row) 
                          : cellValue;
                        
                        // Ensure we never render objects directly
                        let safeContent;
                        if (renderedContent === null || renderedContent === undefined) {
                          safeContent = '-';
                        } else if (typeof renderedContent === 'string' || typeof renderedContent === 'number' || typeof renderedContent === 'boolean') {
                          safeContent = String(renderedContent);
                        } else if (typeof renderedContent === 'object' && renderedContent.type) {
                          // It's a React element, safe to render
                          safeContent = renderedContent;
                        } else {
                          // It's an object, convert to string safely
                          try {
                            safeContent = String(renderedContent);
                          } catch (e) {
                            safeContent = '[Object]';
                          }
                        }
                        
                        return (
                          <TableCell key={column.key}>
                            {safeContent}
                          </TableCell>
                        );
                      } catch (e) {
                        console.error('Error rendering cell:', column.key, e);
                        return (
                          <TableCell key={column.key}>
                            -
                          </TableCell>
                        );
                      }
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
