import PageHeader from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecipeSuggestions } from '../../recipes/components/RecipeSuggestions';
import { WastePredictionForm } from './components/WastePredictionForm';

export default function AIToolsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="AI Tools" />
      <Tabs defaultValue="waste-prediction" className='w-full'>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="waste-prediction">Waste Prediction</TabsTrigger>
          <TabsTrigger value="recipe-suggestions">Recipe Suggestions</TabsTrigger>
        </TabsList>
        <TabsContent value="waste-prediction">
          <WastePredictionForm />
        </TabsContent>
        <TabsContent value="recipe-suggestions">
          <div className="lg:max-w-lg mx-auto w-full">
            <RecipeSuggestions />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
