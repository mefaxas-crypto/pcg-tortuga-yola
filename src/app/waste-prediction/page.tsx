import PageHeader from '@/components/PageHeader';
import { WastePredictionForm } from './components/WastePredictionForm';

export default function WastePredictionPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="AI-Powered Waste Prediction" />
      <WastePredictionForm />
    </div>
  );
}
