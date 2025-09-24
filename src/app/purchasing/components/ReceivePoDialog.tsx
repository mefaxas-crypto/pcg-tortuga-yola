
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { PurchaseOrder } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { receivePurchaseOrder } from '@/lib/actions';
import { Textarea } from '@/components/ui/textarea';

const receivingItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  ordered: z.number(),
  purchaseUnit: z.string(),
  purchasePrice: z.coerce.number().min(0),
  received: z.coerce.number().min(0, 'Cannot be negative.'),
});

const formSchema = z.object({
  poId: z.string(),
  items: z.array(receivingItemSchema),
  notes: z.string().optional(),
  document: z.instanceof(File).optional().nullable(),
});

type ReceivePoDialogProps = {
  po: PurchaseOrder;
  open: boolean;
  onClose: () => void;
};

export function ReceivePoDialog({ po, open, onClose }: ReceivePoDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      poId: po.id,
      items: po.items.map((item) => ({
        itemId: item.itemId,
        name: item.name,
        ordered: item.orderQuantity,
        purchaseUnit: item.purchaseUnit,
        purchasePrice: item.purchasePrice,
        received: item.orderQuantity, // Default to receiving what was ordered
      })),
      notes: '',
      document: null,
    },
  });

  const handleConfirmSubmit = async () => {
    setLoading(true);
    try {
      await receivePurchaseOrder(form.getValues());
      toast({
        title: 'Inventory Updated',
        description: 'The received items have been added to your inventory.',
      });
      onClose();
    } catch (error) {
      console.error('Error receiving PO:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  function onSubmit() {
    setConfirmOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Receive Purchase Order: {po.poNumber}</DialogTitle>
            <DialogDescription>
              Confirm the quantities and prices received from {po.supplierName}. Any discrepancies will create a partial order. Updated prices will be saved to the inventory item using a weighted-average cost.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="max-h-[50vh] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Ordered</TableHead>
                      <TableHead className="w-[150px] text-right">
                        Received Qty
                      </TableHead>
                      <TableHead className="w-[150px] text-right">
                        Unit Price
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.getValues('items').map((item, index) => (
                      <TableRow key={item.itemId}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground sm:hidden">Ordered: {item.ordered} {item.purchaseUnit}</div>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                          {item.ordered} {item.purchaseUnit}
                        </TableCell>
                        <TableCell>
                          <FormField
                            control={form.control}
                            name={`items.${index}.received`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                step="any"
                                className="text-right"
                                {...field}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell>
                           <FormField
                            control={form.control}
                            name={`items.${index}.purchasePrice`}
                            render={({ field }) => (
                              <Input
                                type="number"
                                step="0.01"
                                className="text-right"
                                {...field}
                              />
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receiving Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., One case was damaged, credited on invoice #123."
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="document"
                    render={({ field: { onChange, ...rest } }) => (
                      <FormItem>
                        <FormLabel>Attach Invoice/Document (Optional)</FormLabel>
                        <FormControl>
                          <Input type="file" onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)} {...rest} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Confirm & Update Inventory'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                Please verify that all received counts and prices are correct before submitting. This action will permanently update your inventory levels and item costs.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
