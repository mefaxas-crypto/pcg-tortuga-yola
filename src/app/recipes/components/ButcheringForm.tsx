'use client';

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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, FileText, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  primaryItem: z.string(),
  quantityUsed: z.number(),
  yieldedItems: z.array(z.object({
    name: z.string(),
    weight: z.number(),
    yieldPercentage: z.number(),
  })),
});


export function ButcheringForm() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
     
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
        console.log(values);
      // await logButchering(values);
      toast({
          title: "Butchering Logged",
          description: "Inventory has been updated successfully."
      })
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to log butchering. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[400px]">
        <div className="flex flex-col items-center gap-1 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-12 w-12 text-muted-foreground"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M12 18a2 2 0 0 0-2-2c-1.17.01-2.12.8-2.34 1.9"></path><path d="M18 16c-1.17.01-2.12.8-2.34 1.9"></path><path d="M11.66 12H18"></path><path d="m14 10-2 2 2 2"></path><path d="M6 12h2"></path></svg>
            <h3 className="text-2xl mt-4 font-bold tracking-tight">
                Butchering Yield Log Coming Soon
            </h3>
            <p className="text-sm text-muted-foreground">
                You'll be able to log primary cuts and their yields here.
            </p>
        </div>
    </div>
  );
}
