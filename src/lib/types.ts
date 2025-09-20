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
  allergens?: string;
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
