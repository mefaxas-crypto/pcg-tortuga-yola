export type InventoryItem = {
  id: string;
  materialCode: string;
  name: string;
  category: string;
  quantity: number;
  unit: string; // The unit for recipes (e.g., kg, L, unit)
  purchaseUnit: string; // The unit you buy from the supplier (e.g., Case, Box)
  parLevel: number;
  supplier: string;
  allergens?: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

export type AddInventoryItemData = Omit<InventoryItem, 'id' | 'status'>;

export type Supplier = {
    id: string;
    name: string;
    contactPerson?: string;
    phoneNumber?: string;
    email?: string;
};
