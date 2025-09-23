
'use client';

import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { MenuForm } from '../../components/MenuForm';

export default function NewMenuPage() {

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add New Menu" />
      <Card>
        <CardContent className="pt-6">
          <MenuForm mode="add" />
        </CardContent>
      </Card>
    </div>
  );
}
