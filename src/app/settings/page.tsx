import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[400px]">
            <div className="flex flex-col items-center gap-1 text-center">
              <Settings className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-2xl mt-4 font-bold tracking-tight">
                Settings Page Coming Soon
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage your outlets, suppliers, and application preferences here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
