
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
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import type { ButcheryTemplate, InventoryItem } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteTemplateDialog } from './DeleteTemplateDialog';


type TemplatesTableProps = {
  onEdit: (template: ButcheryTemplate) => void;
};

export function TemplatesTable({ onEdit }: TemplatesTableProps) {
  const [templates, setTemplates] = useState<ButcheryTemplate[] | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qTemplates = query(collection(db, 'butcheryTemplates'));
    const unsubscribeTemplates = onSnapshot(
      qTemplates,
      (querySnapshot) => {
        const data: ButcheryTemplate[] = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as ButcheryTemplate);
        });
        setTemplates(data.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching templates:', error);
        setLoading(false);
      }
    );
    
    const qInventory = query(collection(db, 'inventory'));
    const unsubscribeInventory = onSnapshot(qInventory, (snapshot) => {
        const items: InventoryItem[] = [];
        snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as InventoryItem);
        });
        setInventory(items);
    });

    return () => {
        unsubscribeTemplates();
        unsubscribeInventory();
    };
  }, []);

  const getPrimaryItemName = (materialCode: string) => {
    return inventory.find(i => i.materialCode === materialCode)?.name || materialCode;
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
