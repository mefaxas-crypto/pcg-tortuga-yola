
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useToast } from '@/hooks/use-toast';
import { updateButcheryTemplate } from '@/lib/actions';
import type { ButcheryTemplate, InventoryItem, YieldItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';

type ButcheringTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ButcheryTemplate;
  inventoryItems: InventoryItem[];
  onTemplateUpdate: (template: ButcheryTemplate) => void;
};

export function ButcheringTemplateDialog({
  open,
  onOpenChange,
  template,
  inventoryItems,
  onTemplateUpdate,
}: ButcheringTemplateDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [yields, setYields] = useState<YieldItem[]>(template.yields);
  const [isAddPopoverOpen, setAddPopoverOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Reset yields when the dialog is reopened with a new template
    setYields(template.yields);
  }, [template, open]);

  const handleAddYield = (item: InventoryItem) => {
    if (yields.some(y => y.id === item.materialCode)) {
      toast({
        variant: 'destructive',
        title: 'Item already in template',
      });
      return;
    }
    setYields(currentYields => [...currentYields, { id: item.materialCode, name: item.name }]);
    setAddPopoverOpen(false);
  };

  const handleRemoveYield = (materialCode: string) => {
    setYields(currentYields => currentYields.filter(y => y.id !== materialCode));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const updatedTemplate: ButcheryTemplate = { ...template, yields };
    try {
      // In a real app, this would call a server action to save to a database.
      // For this demo, we'll simulate the save and use the callback.
      await updateButcheryTemplate(updatedTemplate);
      toast({
        title: 'Template Saved!',
        description: `The template for "${template.name}" has been updated.`,
      });
      onTemplateUpdate(updatedTemplate); // Notify parent component of the change
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error Saving Template',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter out items that are already in the template from the add list
  const availableInventoryToAdd = inventoryItems.filter(
    invItem => !yields.some(y => y.id === invItem.materialCode)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Butchering Template</DialogTitle>
          <DialogDescription>
            Manage the yield cuts for: <span className="font-medium">{template.name}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <h4 className="text-sm font-medium">Current Yields</h4>
            <div className="rounded-md border p-2 space-y-2">
            {yields.length > 0 ? (
                yields.map(yieldItem => (
                <div key={yieldItem.id} className="flex justify-between items-center p-2 rounded-md hover:bg-accent">
                    <div>
                        <p className="font-medium">{yieldItem.name}</p>
                        <p className="text-xs text-muted-foreground">{yieldItem.id}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveYield(yieldItem.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center p-4">No yield items in this template.</p>
            )}
            </div>
          <Separator />
            <div className="flex flex-col gap-2">
                <h4 className="text-sm font-medium">Add New Yield Item</h4>
                 <Popover open={isAddPopoverOpen} onOpenChange={setAddPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                        >
                            Select an inventory item to add...
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput placeholder="Search inventory..." />
                            <CommandList>
                            <CommandEmpty>No items found.</CommandEmpty>
                            <CommandGroup>
                                {availableInventoryToAdd.map((item) => (
                                <CommandItem
                                    value={item.name}
                                    key={item.id}
                                    onSelect={() => handleAddYield(item)}
                                >
                                    <Check
                                    className={cn(
                                        'mr-2 h-4 w-4',
                                        yields.some(y => y.id === item.materialCode)
                                        ? 'opacity-100'
                                        : 'opacity-0',
                                    )}
                                    />
                                    {item.name}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>

        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
