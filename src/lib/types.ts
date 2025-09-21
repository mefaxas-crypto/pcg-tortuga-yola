

import type { Unit } from './conversions';

export type InventoryItem = {
  id: string;
  materialCode: string;
  name: string;
  category: string;
  quantity: number; // Current stock in the `unit` of tracking
  unit: Unit; // The unit for inventory tracking (e.g., 'un.' for bottles, 'kg' for bulk flour), same as purchaseUnit
  purchaseQuantity: number; // e.g., 1 for a case, 10 for a kg bag
  purchaseUnit: Unit; // The unit of the purchase (e.g., 'un.' for case, 'kg' for bag)
  purchasePrice: number; // Price for one purchaseQuantity
  parLevel: number; // Re-order point in the `purchaseUnit`
  supplier: string; // Supplier Name
  supplierId: string; // Supplier Document ID
  // Costing fields
  unitCost: number; // The cost of a single `recipeUnit` (e.g., price per gram, per ml)
  recipeUnit: Unit; // The base unit for recipes (e.g., g, ml)
  recipeUnitConversion: number; // How many recipeUnits are in ONE purchaseUnit (e.g., 750ml in 1 un. bottle)
  // Meta fields
  allergens?: string[];
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};


// This is the data received from the form
export type InventoryFormData = {
  materialCode: string;
  name: string;
  category: string;
  purchaseQuantity: number;
  purchaseUnit: Unit;
  purchasePrice: number;
  parLevel: number;
  supplierId?: string;
  allergens?: string[];
  quantity?: number; // Optional initial stock
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
    yieldPercentage: number;
    materialCode: string; // The material code of the yielded item
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
        quantityProduced: number;
        yieldUnit: string;
    }[];
}
