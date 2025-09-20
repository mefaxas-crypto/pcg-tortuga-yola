'use client';

import { predictFoodWaste } from '@/ai/flows/predict-food-waste';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, FileText, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  outletName: z.string().min(1, 'Outlet name is required.'),
  historicalData: z.string().min(1, 'Historical data is required.'),
  currentInventory: z.string().min(1, 'Current inventory is required.'),
});

const exampleHistoricalData = `Date,Item,Category,Quantity,Action,Price
2023-10-01,Chicken Breast,Meat,10kg,Purchased,8.50
2023-10-01,Tomatoes,Produce,5kg,Purchased,2.00
2023-10-01,Chicken Breast,Meat,2kg,Sold,25.00
2023-10-02,Tomatoes,Produce,1kg,Wasted,2.00
`;

const exampleCurrentInventory = `Chicken Breast, 8kg
Tomatoes, 4kg
Lettuce, 2kg
Onions, 5kg`;


export function WastePredictionForm() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outletName: 'Main Kitchen',
      historicalData: exampleHistoricalData,
      currentInventory: exampleCurrentInventory,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setPrediction(null);
    try {
      const result = await predictFoodWaste(values);
      setPrediction(result.predictedWaste);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate waste prediction. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Waste Prediction Input</CardTitle>
              <CardDescription>
                Provide data to predict potential food waste. Use CSV format for data fields.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <FormField
                control={form.control}
                name="outletName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outlet Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Downtown Cafe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="historicalData"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Historical Data (CSV)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste your historical sales, waste, and purchasing data here."
                        className="h-40 resize-none font-code text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include columns like Date, Item, Category, Quantity, Action (Purchased, Sold, Wasted), Price.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentInventory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Inventory (CSV)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Item Name, Quantity"
                        className="h-40 resize-none font-code text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      List current items and their quantities.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading}>
                {loading ? 'Analyzing Data...' : 'Predict Waste'}
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      
      {loading && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-48 gap-4">
                <Bot className="h-12 w-12 animate-pulse text-primary" />
                <p className="text-muted-foreground">AI is analyzing the data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {prediction && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <FileText />
              Waste Prediction Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-secondary/50 rounded-lg text-sm whitespace-pre-wrap font-body">
              {prediction}
            </pre>
          </CardContent>
        </Card>
      )}
    </>
  );
}
