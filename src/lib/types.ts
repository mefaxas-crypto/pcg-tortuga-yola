export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  parLevel: number;
  supplier: string;
  expirationDate: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

export type Supplier = {
    id: string;
    name: string;
    contactPerson: string;
    phoneNumber: string;
};
