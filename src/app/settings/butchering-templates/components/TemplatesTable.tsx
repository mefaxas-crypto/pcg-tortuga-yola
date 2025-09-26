
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FilePenLine, MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { collection, query, orderBy } from 'firebase/firestore';
import type { ButcheryTemplate, InventoryItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteTemplateDialog } from './DeleteTemplateDialog';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { useMemo } from 'react';


type TemplatesTableProps = {
  onEdit: (template: ButcheryTemplate) => void;
};

export function TemplatesTable({ onEdit }: TemplatesTableProps) {
  const { firestore } = useFirebase();

  const templatesQuery = useMemoFirebase(() => query(collection(firestore, 'butcheryTemplates'), orderBy('name', 'asc')), [firestore]);
  const { data: templates, isLoading: templatesLoading } = useCollection<ButcheryTemplate>(templatesQuery);
  
  const inventoryQuery = useMemoFirebase(() => query(collection(firestore, 'inventory')), [firestore]);
  const { data: inventory, isLoading: inventoryLoading } = useCollection<InventoryItem>(inventoryQuery);

  const loading = templatesLoading || inventoryLoading;

  const inventoryMap = useMemo(() => {
    const map = new Map<string, string>();
    if (inventory) {
      inventory.forEach(item => map.set(item.materialCode, item.name));
    }
    return map;
  }, [inventory]);

  const getPrimaryItemName = (materialCode: string) => {
    return inventoryMap.get(materialCode) || materialCode;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Primary Item</TableHead>
                <TableHead>Yields</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                  </TableRow>
                ))}
              {!loading &&
                templates?.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell>{getPrimaryItemName(template.primaryItemMaterialCode)}</TableCell>
                    <TableCell>{template.yields.length}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => onEdit(template)}>
                            <FilePenLine className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DeleteTemplateDialog templateId={template.id} templateName={template.name}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DeleteTemplateDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
        {!loading && templates?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No butchering templates found. Add your first one!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
