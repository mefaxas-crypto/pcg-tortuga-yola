import { config } from 'dotenv';
config();

import '@/ai/flows/predict-food-waste.ts';
import '@/ai/flows/suggest-recipes-from-inventory.ts';