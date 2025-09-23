
import PageHeader from '@/components/PageHeader';
import { SalesAndProfitability } from './components/SalesAndProfitability';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" />
      <SalesAndProfitability />
    </div>
  );
}
