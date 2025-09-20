
export type InventoryItem = {
  id: string;
  materialCode: string;
  name: string;
  category: string;
  quantity: number;
  unit: string; // The unit for recipes (e.g., kg, L, unit)
  purchaseUnit: string; // The unit you buy from the supplier (e.g., Case, Box)
  parLevel: number;
  supplier: string; // Supplier Name
  supplierId: string; // Supplier Document ID
  purchasePrice: number;
  unitCost: number; // The cost of a single recipe unit (e.g., price per gram)
  allergens?: string[]; // This is now an array of strings
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

export type AddInventoryItemData = Omit<InventoryItem, 'id' | 'status' | 'supplier'>;
export type EditInventoryItemData = Omit<InventoryItem, 'id' | 'status' | 'supplier'>;


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
  inventoryItemId: string;
  name: string;
  materialCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
};

export type Recipe = {
  id: string;
  recipeCode: string;
  name: string;
  isSubRecipe: boolean;
  category: string;
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
