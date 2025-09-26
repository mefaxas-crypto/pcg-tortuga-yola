
import type { InventoryItem, Supplier } from './types';

export const inventoryItems: InventoryItem[] = [];

// This is now fetched directly in the DashboardStats component
// export const topSellingItems = [
//   { name: 'Filet Mignon (8oz)', category: 'Entrees', unitsSold: 42 },
//   { name: 'Truffle Fries', category: 'Appetizers', unitsSold: 35 },
//   { name: 'Seared Salmon', category: 'Entrees', unitsSold: 28 },
//   { name: 'Classic Old Fashioned', category: 'Beverages', unitsSold: 25 },
//   { name: 'Avocado Toast', category: 'Brunch', unitsSold: 21 },
// ];

// Seed data includes a placeholder userId since Supplier type requires it.
// Replace 'seed-user' with an authenticated user id as needed.
export const suppliers: Supplier[] = [
    { id: '1', userId: 'seed-user', name: 'Prime Cuts Co.', contactPerson: 'John Meat', phoneNumber: '555-123-4567' },
    { id: '2', userId: 'seed-user', name: 'Green Farms', contactPerson: 'Jane Green', phoneNumber: '555-987-6543' },
    { id: '3', userId: 'seed-user', name: 'Artisan Breads', contactPerson: 'Bob Baker', phoneNumber: '555-234-5678' },
    { id: '4', userId: 'seed-user', name: 'Ocean Fresh', contactPerson: 'Sally Seas', phoneNumber: '555-876-5432' },
    { id: '5', userId: 'seed-user', name: 'Gourmet Imports', contactPerson: 'Pierre Fancy', phoneNumber: '555-345-6789' },
    { id: '6', userId: 'seed-user', name: 'Bulk Goods Inc.', contactPerson: 'Bill Bulk', phoneNumber: '555-765-4321' },
];
