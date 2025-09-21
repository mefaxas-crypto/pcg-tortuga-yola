
'use client';

import { Button } from '@/components/ui/button';
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
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { allUnits } from '@/lib/conversions';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  recipeUnitConversion: z.coerce.number().min(0.0001, 'Conversion must be a positive number.'),
  recipeUnit: z.string().min(1, 'Unit is required.'),
});

type UnitConversionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: (conversion: {
    recipeUnit: string;
    recipeUnitConversion: number;
  }) => void;
};

const availableUnits = Object.keys(allUnits)
    .filter(key => key !== 'un') // Can't convert a unit to itself
    .map(key => ({
        value: key,
        label: allUnits[key as keyof typeof allUnits].name
    }));

export function UnitConversionDialog({
  open,
  onOpenChange,
  itemName,
  onConfirm,
}: UnitConversionDialogProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      recipeUnit: 'g',
      recipeUnitConversion: 1,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    onConfirm(values);
    setLoading(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Define Unit Conversion</DialogTitle>
          <DialogDescription>
            You&apos;ve purchased &quot;{itemName}&quot; as a &apos;unit&apos;. Please define how it
            should be measured in recipes.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <p className='text-center text-lg font-semibold'>
                1 <span className='text-primary'>un.</span> =
            </p>
            <div className="grid grid-cols-2 gap-4 items-end">
              <FormField
                control={form.control}
                name="recipeUnitConversion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" placeholder="e.g., 750" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recipeUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {availableUnits.map(unit => (
                                <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Confirm Conversion'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
