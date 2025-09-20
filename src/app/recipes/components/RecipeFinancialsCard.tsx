
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { Percent } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value || 0);
};

interface RecipeFinancialsCardProps {
  form: UseFormReturn<any>; // Easiest to pass the whole form object
  totalRecipeCost: number;
  isSubRecipe: boolean;
}

export function RecipeFinancialsCard({ form, totalRecipeCost, isSubRecipe }: RecipeFinancialsCardProps) {
  const yieldValue = form.watch('yield') || 1;
  const contingency = form.watch('contingencyPercentage') || 0;
  const foodCostPercent = form.watch('foodCostPercentage') || 30;

  const costPerPortion = totalRecipeCost / (yieldValue > 0 ? yieldValue : 1);
  const totalCostWithContingency = costPerPortion * (1 + contingency / 100);
  const suggestedPrice =
    foodCostPercent > 0
      ? totalCostWithContingency / (foodCostPercent / 100)
      : 0;

  return (
    
      <Card>
        <CardHeader>
          <CardTitle>Financials</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {/* Column 1: Interactive Controls */}
          <div
            className={cn(
              'space-y-8 transition-opacity duration-300',
              isSubRecipe
                ? 'opacity-30 pointer-events-none'
                : 'opacity-100',
            )}
          >
            <FormField
              control={form.control}
              name="contingencyPercentage"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Contingency %</FormLabel>
                    <div className="relative w-20">
                      <FormControl>
                        <Input
                          type="number"
                          className="pr-6 text-right"
                          value={field.value}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={isSubRecipe}
                        />
                      </FormControl>
                       <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={(values) => field.onChange(values[0])}
                      max={50}
                      step={1}
                      disabled={isSubRecipe}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="foodCostPercentage"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Target Food Cost %</FormLabel>
                     <div className="relative w-20">
                      <FormControl>
                        <Input
                          type="number"
                          className="pr-6 text-right"
                          value={field.value}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={isSubRecipe}
                        />
                      </FormControl>
                       <Percent className="absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={(values) => field.onChange(values[0])}
                      max={100}
                      step={1}
                      disabled={isSubRecipe}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Column 2: Calculations */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Ingredients Cost (M.P.)</span>
              <span className="font-medium">
                {formatCurrency(totalRecipeCost)}
              </span>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-muted-foreground">Cost per Portion (P/P)</span>
              <span className="font-medium">
                {formatCurrency(costPerPortion)}
              </span>
            </div>
            
            <div className={cn('transition-opacity', isSubRecipe ? 'opacity-30' : 'opacity-100')}>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">
                  Contingency ({contingency}%)
                </span>
                <span className="font-medium text-primary">
                  {formatCurrency(costPerPortion * (contingency / 100))}
                </span>
              </div>
              <div className="flex justify-between items-center border-b-2 border-foreground/50 font-bold pb-2 mt-4">
                <span>Total Cost</span>
                <span>{formatCurrency(totalCostWithContingency)}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold text-green-600 pt-2">
                <span>Suggested Price</span>
                <span>{formatCurrency(suggestedPrice)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
  );
}
