

export type InventoryItem = {
  id: string;
  materialCode: string;
  name: string;
  category: string;
  quantity: number;
  unit: string; // The unit for recipes (e.g., kg, L, unit)
  purchaseUnit: string; // The unit you buy from the supplier (e.g., Case, Box)
  conversionFactor: number; // How many recipe units are in one purchase unit
  parLevel: number;
  supplier: string; // Supplier Name
  supplierId: string; // Supplier Document ID
  purchasePrice: number;
  unitCost: number; // The cost of a single recipe unit (e.g., price per gram)
  allergens?: string[]; // This is now an array of strings
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

export type AddInventoryItemData = Omit<InventoryItem, 'id' | 'status' | 'supplier' | 'unitCost'>;
export type EditInventoryItemData = Omit<InventoryItem, 'id' | 'status' | 'supplier' | 'unitCost'>;


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
  recipeId: string; // The ID of the sub-recipe to produce
  quantityProduced: number; // How many batches/yields were made
};

export type LogProductionData = {
  items: ProductionItem[];
};
