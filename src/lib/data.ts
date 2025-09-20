import type { InventoryItem, Supplier } from './types';

export const inventoryItems: InventoryItem[] = [];

export const lowStockItems = inventoryItems.filter(
  (item) => item.status === 'Low Stock'
);

export const topSellingItems = [
  { name: 'Filet Mignon (8oz)', category: 'Entrees', unitsSold: 42 },
  { name: 'Truffle Fries', category: 'Appetizers', unitsSold: 35 },
  { name: 'Seared Salmon', category: 'Entrees', unitsSold: 28 },
  { name: 'Classic Old Fashioned', category: 'Beverages', unitsSold: 25 },
  { name: 'Avocado Toast', category: 'Brunch', unitsSold: 21 },
];

export const suppliers: Supplier[] = [
    { id: '1', name: 'Prime Cuts Co.', contactPerson: 'John Meat', phoneNumber: '555-123-4567' },
    { id: '2', name: 'Green Farms', contactPerson: 'Jane Green', phoneNumber: '555-987-6543' },
    { id: '3', name: 'Artisan Breads', contactPerson: 'Bob Baker', phoneNumber: '555-234-5678' },
    { id: '4', name: 'Ocean Fresh', contactPerson: 'Sally Seas', phoneNumber: '555-876-5432' },
    { id: '5', name: 'Gourmet Imports', contactPerson: 'Pierre Fancy', phoneNumber: '555-345-6789' },
    { id: '6', name: 'Bulk Goods Inc.', contactPerson: 'Bill Bulk', phoneNumber: '555-765-4321' },
];
