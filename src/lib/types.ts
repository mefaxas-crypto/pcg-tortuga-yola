

export type InventoryItem = {
  id: string;
  materialCode: string;
  name: string;
  category: string;
  quantity: number; // Current stock in the `unit`
  unit: string; // The base unit for inventory tracking and costing (e.g., g, ml, each).
  purchaseUnit: string; // The unit of the purchaseQuantity (e.g., kg, L, Case)
  conversionFactor: number; // How many of the `unit` are in one `purchaseUnit`. e.g. purchaseUnit=kg, unit=g, conversionFactor=1000
  parLevel: number; // Re-order point in the base `unit`
  supplier: string; // Supplier Name
  supplierId: string; // Supplier Document ID
  purchasePrice: number; // Price for one purchaseUnit
  unitCost: number; // The cost of a single recipe unit (e.g., price per gram)
  allergens?: string[];
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

// This is the data received from the form
export type InventoryFormData = {
  materialCode: string;
  name: string;
  category: string;
  purchaseQuantity: number;
  purchaseUnit: string;
  purchasePrice: number;
  parLevel: number;
  supplierId?: string;
  allergens?: string[];
  quantity?: number; // Optional initial stock
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

export type RecipeIngredient = {
  itemId: string; // Can be an inventory item ID or a sub-recipe ID
  ingredientType: 'inventory' | 'recipe';
  itemCode: string; // materialCode or recipeCode
  name: string;
  quantity: number;
  unit: string;
  totalCost: number;
};

export type Recipe = {
  id: string;
  recipeCode: string;
  name:string;
  isSubRecipe: boolean;
  category: string;
  menuId?: string; // ID of the menu this recipe belongs to
  yield?: number; // How many portions the recipe makes
  yieldUnit?: string;
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
    quantityUnit: string;
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
