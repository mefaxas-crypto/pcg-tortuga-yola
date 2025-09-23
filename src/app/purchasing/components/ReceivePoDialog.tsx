
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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

const receivingItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  ordered: z.number(),
  purchaseUnit: z.string(),
  received: z.coerce.number().min(0, 'Cannot be negative.'),
});

const formSchema = z.object({
  poId: z.string(),
  items: z.array(receivingItemSchema),
});

type ReceivePoDialogProps = {
  po: PurchaseOrder;
  open: boolean;
  onClose: () => void;
};

export function ReceivePoDialog({ po, open, onClose }: ReceivePoDialogProps) {
  const [loading, setLoading] = useState(false);
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
        received: item.orderQuantity, // Default to receiving what was ordered
      })),
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    // TODO: Implement the actual server action to update inventory and PO status
    console.log('Submitting received items:', values);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    
    toast({
        title: "Inventory Updated (Simulated)",
        description: "The received items have been added to your inventory.",
    });

    setLoading(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receive Purchase Order: {po.poNumber}</DialogTitle>
          <DialogDescription>
            Confirm the quantities received from {po.supplierName}. Any
            discrepancies will create a partial order.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="max-h-[60vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="w-[150px] text-right">
                      Received
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.getValues('items').map((item, index) => (
                    <TableRow key={item.itemId}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.ordered} {item.purchaseUnit}
                      </TableCell>
                      <TableCell className="text-right">
                        <FormField
                          control={form.control}
                          name={`items.${index}.received`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="any"
                                  className="text-right"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
  );
}
