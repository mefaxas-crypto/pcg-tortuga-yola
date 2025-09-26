
'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { TemplatesTable } from '@/app/settings/butchering-templates/components/TemplatesTable';
import { TemplateFormSheet } from '@/app/settings/butchering-templates/components/TemplateFormSheet';
import { ButcheryTemplate } from '@/lib/types';


export default function ButcheringTemplatesPage() {
  const [sheetState, setSheetState] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    template?: ButcheryTemplate;
  }>({
    open: false,
    mode: 'add',
  });

  const handleAdd = () => {
    setSheetState({ open: true, mode: 'add' });
  };

  const handleEdit = (template: ButcheryTemplate) => {
    setSheetState({ open: true, mode: 'edit', template });
  };

  const handleClose = () => {
    setSheetState({ open: false, mode: sheetState.mode });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Butchering Templates">
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2" />
          Add New Template
        </Button>
      </PageHeader>
      
      <TemplatesTable onEdit={handleEdit} />

      <TemplateFormSheet
        key={sheetState.template?.id || 'add'}
        open={sheetState.open}
        mode={sheetState.mode}
        template={sheetState.template}
        onClose={handleClose}
      />
    </div>
  );
}
