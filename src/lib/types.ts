
import type { Unit } from './conversions';
import { z } from 'zod';
import { 
  allergenSchema, 
  appUserSchema,
  butcheringLogSchema, 
  butcheryTemplateSchema, 
  ingredientCategorySchema, 
  inventoryItemSchema, 
  inventoryStockSchema,
  inventoryTransferSchema,
  menuSchema,
  outletSchema,
  physicalCountItemSchema,
  productionLogSchema,
  purchaseOrderSchema,
  recipeSchema,
  saleSchema,
  supplierSchema,
  transferInventorySchema
} from './validations';


export type InventoryItem = z.infer<typeof inventoryItemSchema> & { id: string };
export type InventoryStockItem = z.infer<typeof inventoryStockSchema> & { id: string };
export type Supplier = z.infer<typeof supplierSchema> & { id: string };
export type Allergen = z.infer<typeof allergenSchema> & { id: string };
export type IngredientCategory = z.infer<typeof ingredientCategorySchema> & { id: string };
export type Recipe = z.infer<typeof recipeSchema> & { id: string };
export type RecipeIngredient = Recipe['ingredients'][number];
export type Menu = z.infer<typeof menuSchema> & { id: string };
export type MenuItem = Menu['items'][number];
export type Sale = z.infer<typeof saleSchema> & { id: string };
export type ProductionLog = z.infer<typeof productionLogSchema> & { id: string, logDate: Date, producedItems: {
        recipeId: string;
        recipeName: string;
        quantityProduced: number;
        yieldPerBatch: number;
        yieldUnit: string;
    }[]};
export type ButcheringLog = z.infer<typeof butcheringLogSchema> & { 
  id: string, 
  logDate: Date,
  primaryItem: {
    itemId: string;
    itemName: string;
    quantityUsed: number;
    unit: Unit;
  },
  yieldedItems: {
    itemId: string;
    itemName: string;
    quantityYielded: number;
    unit: Unit;
  }[],
 };
export type ButcheryTemplate = z.infer<typeof butcheryTemplateSchema> & { id: string };
export type YieldItem = ButcheryTemplate['yields'][number];
export type PhysicalCountItem = z.infer<typeof physicalCountItemSchema>;
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema> & { id: string, createdAt: Date };
export type PurchaseOrderItem = PurchaseOrder['items'][number];
export type Outlet = z.infer<typeof outletSchema> & { id: string };
export type VarianceLogItem = {
    itemId: string;
    itemName: string;
    theoreticalQuantity: number;
    physicalQuantity: number;
    variance: number;
    unit: Unit;
    varianceValue?: number;
};
export type VarianceLog = {
    id: string;
    logDate: Date;
    outletId: string;
    items: VarianceLogItem[];
    user: string;
    totalVarianceValue?: number;
};
export type InventoryTransfer = z.infer<typeof inventoryTransferSchema> & { id: string, transferDate: Date };
export type InventoryTransferData = z.infer<typeof transferInventorySchema>;
export type InventoryFormData = z.infer<typeof inventoryItemSchema>;
export type AddRecipeData = z.infer<typeof recipeSchema>;
export type AddMenuData = z.infer<typeof menuSchema>;
export type AddSaleData = z.infer<typeof saleSchema>;
export type LogProductionData = z.infer<typeof productionLogSchema>;
export type ButcheringData = z.infer<typeof butcheringLogSchema>;
export type AddPurchaseOrderData = z.infer<typeof purchaseOrderSchema>;
export type ReceivePurchaseOrderData = z.infer<typeof z.object({
  poId: z.string(),
  items: z.array(z.object({
    itemId: z.string(),
    name: z.string(),
    ordered: z.number(),
    purchaseUnit: z.string(),
    purchasePrice: z.coerce.number().min(0),
    received: z.coerce.number().min(0, "Cannot be negative."),
  })),
  notes: z.string().optional(),
  document: z.instanceof(File).optional().nullable(),
})>;
export type AddOutletData = z.infer<typeof outletSchema>;
export type AddAllergenData = z.infer<typeof allergenSchema>;
export type AddIngredientCategoryData = z.infer<typeof ingredientCategorySchema>;
export type AppUser = z.infer<typeof appUserSchema>;

