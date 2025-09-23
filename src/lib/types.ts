
import type { Unit } from './conversions';

export type InventoryItem = {
  id: string;
  materialCode: string;
  name: string;
  category: string;
  
  // Fields moved from the old model but still part of the master spec
  unit: Unit; // The unit for inventory tracking (e.g., 'un.' for bottles, 'kg' for bulk flour), same as purchaseUnit
  purchaseQuantity: number; // e.g., 1 for a case, 10 for a kg bag
  purchaseUnit: Unit; // The unit of the purchase (e.g., 'un.' for case, 'kg' for bag)
  purchasePrice: number; // Price for one purchaseQuantity
  minStock: number; // Re-order point in `purchaseUnit`
  maxStock: number; // Target quantity after re-ordering in `purchaseUnit`
  
  // Supplier and Costing
  supplier: string; // Supplier Name
  supplierId: string; // Supplier Document ID
  unitCost: number; // The cost of a single `recipeUnit` (e.g., price per gram, per ml)
  recipeUnit: Unit; // The base unit for recipes (e.g., g, ml)
  recipeUnitConversion: number; // How many recipeUnits are in ONE purchaseUnit (e.g., 750ml in 1 un. bottle)
  
  // Meta fields
  allergens?: string[];
  
  // Legacy field for migration
  parLevel?: number;

  // UI-only fields, not in DB
  quantity?: number;
  status?: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

// New type for outlet-specific stock
export type InventoryStockItem = {
  id: string;
  inventoryId: string;
  outletId: string;
  quantity: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

// This is the data received from the form
export type InventoryFormData = {
  materialCode: string;
  name: string;
  category: string;
  purchaseQuantity: number;
  purchaseUnit: Unit;
  purchasePrice: number;
  minStock: number;
  maxStock: number;
  supplierId?: string;
  allergens?: string[];
  quantity?: number; // Optional initial stock for all outlets
  // Optional fields for 'un' conversion
  recipeUnit?: Unit;
  recipeUnitConversion?: number;
}

export type AddInventoryItemData = InventoryFormData;
export type EditInventoryItemData = InventoryFormData;


export type Supplier = {
    id: string;
    name: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
};

export type Allergen = {
  id: string;
  name: string;
};

export type AddAllergenData = Omit<Allergen, 'id'>;

export type IngredientCategory = {
    id: string;
    name: string;
};

export type AddIngredientCategoryData = Omit<IngredientCategory, 'id'>;

export type RecipeIngredient = {
  itemId: string; // Can be an inventory item ID or a sub-recipe ID
  ingredientType: 'inventory' | 'recipe';
  itemCode: string; // materialCode or recipeCode
  name: string;
  quantity: number;
  unit: Unit;
  totalCost: number;
};

export type Recipe = {
  id: string;
  internalCode: string; // Used as the inventory ID for sub-recipes
  sapCode?: string; // Official SAP code, can be added later
  name:string;
  isSubRecipe: boolean;
  category: string;
  menuId?: string; // ID of the menu this recipe belongs to
  yield?: number; // How many portions the recipe makes
  yieldUnit?: Unit;
  notes?: string;
  ingredients: RecipeIngredient[];
  totalCost: number;
  contingencyPercentage?: number;
  foodCostPercentage?: number;
};

export type AddRecipeData = Omit<Recipe, 'id'>;
export type EditRecipeData = Omit<Recipe, 'id'>;

export type MenuItem = {
  recipeId: string;
  name: string;
  category: string;
  totalCost: number;
  sellingPrice: number;
};

export type Menu = {
  id: string;
  name: string;
  items: MenuItem[];
};

export type AddMenuData = Omit<Menu, 'id'>;
export type EditMenuData = Omit<Menu, 'id'>;

export type Sale = {
  id: string;
  menuId: string;
  menuName: string;
  recipeId: string;
  recipeName: string;
  quantity: number;
  totalRevenue: number;
  totalCost: number;
  saleDate: Date;
};

export type AddSaleData = Omit<Sale, 'id'>;

export type ProductionItem = {
  recipeId: string;
  name: string;
  yield: number;
  yieldUnit: string;
  quantityProduced: number;
};

export type LogProductionData = {
  items: ProductionItem[];
};

export type ButcheringItem = {
    itemId: string; // The inventory ID of the yielded item
    name: string;
    weight: number;
    unit: Unit;
    materialCode: string; // The material code of the yielded item
    costDistributionPercentage: number;
    finalCostDistribution?: number; // The redistributed cost percentage
    recipeUnit?: string;
    recipeUnitConversion?: number;
}

export type ButcheringData = {
    primaryItemId: string;
    primaryItemMaterialCode: string;
    quantityUsed: number;
    quantityUnit: Unit;
    yieldedItems: ButcheringItem[];
}

export type YieldItem = {
  id: string; // Material Code
  name: string;
  costDistributionPercentage: number;
}

export type ButcheryTemplate = {
    id: string;
    name: string;
    primaryItemMaterialCode: string; // The material code of the primary inventory item
    yields: YieldItem[];
}

export type PhysicalCountItem = {
    id: string;
    name: string;
    physicalQuantity: number; // The final count in the item's base unit
    theoreticalQuantity: number;
    unit: Unit;
}

export type ProductionLog = {
    id: string;
    logDate: Date;
    user: string;
    producedItems: {
        recipeId: string;
        recipeName: string;
        quantityProduced: number; // i.e., number of batches
        yieldPerBatch: number;
        yieldUnit: string;
    }[];
}

export type ButcheringLog = {
    id: string;
    logDate: Date;
    user: string;
    primaryItem: {
        itemId: string;
        itemName: string;
        quantityUsed: number;
        unit: Unit;
    };
    yieldedItems: {
        itemId: string;
        itemName: string;
        quantityYielded: number;
        unit: Unit;
    }[];
}

export type PurchaseOrderItem = {
    itemId: string;
    name: string;
    orderQuantity: number;
    purchaseUnit: Unit;
    purchasePrice: number;
};

export type PurchaseOrder = {
    id: string;
    poNumber: string; // e.g., PO-2024-001
    supplierId: string;
    supplierName: string;
    items: PurchaseOrderItem[];
    status: 'Pending' | 'Partially Received' | 'Received' | 'Cancelled';
    createdAt: Date;
    receivedAt?: Date;
    notes?: string;
};

export type AddPurchaseOrderData = Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'> & {
    createdAt?: Date; // Optional because server will set it
    items: {
        itemId: string;
        name: string;
        orderQuantity: number;
        purchaseUnit: string;
        purchasePrice: number;
    }[];
};

export type ReceivingItem = {
  itemId: string;
  name: string;
  ordered: number;
  purchaseUnit: string;
  purchasePrice: number;
  received: number;
};

export type ReceivePurchaseOrderData = {
  poId: string;
  items: ReceivingItem[];
  notes?: string;
};

export type Outlet = {
  id: string;
  name: string;
  address?: string;
};

export type AddOutletData = Omit<Outlet, 'id'>;
