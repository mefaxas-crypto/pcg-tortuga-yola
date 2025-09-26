import { z } from 'zod';

// Basic string and number schemas for reuse
const requiredString = z.string().min(1, "This field is required");
const optionalString = z.string().optional();
const requiredNumber = z.number().min(0, "Must be a non-negative number");

// User schema
export const appUserSchema = z.object({
  uid: z.string(),
  email: z.string().email().nullable(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  role: z.enum(['Admin', 'Manager', 'User', 'Pending']),
  outletId: z.string().optional(), // Optional: if user is assigned to a specific outlet
});
export type AppUser = z.infer<typeof appUserSchema>;

// Outlet schema
export const outletSchema = z.object({
  id: z.string().optional(), // ID is optional because it's not present on creation
  name: requiredString,
  address: optionalString,
});
export type Outlet = z.infer<typeof outletSchema>;

// Supplier schema
export const supplierSchema = z.object({
  id: z.string().optional(),
  name: requiredString,
  contactName: optionalString,
  phone: optionalString,
  email: z.string().email().optional().or(z.literal('')),
});
export type Supplier = z.infer<typeof supplierSchema>;

// Inventory Item schema
export const inventoryItemSchema = z.object({
  id: z.string().optional(),
  name: requiredString,
  unit: requiredString, // e.g., kg, L, piece
  category: optionalString,
  purchasePrice: requiredNumber, // Price per unit from supplier
});
export type InventoryItem = z.infer<typeof inventoryItemSchema>;

// Purchase Order (PO) Item schema
export const poItemSchema = z.object({
  itemId: z.string(),
  name: z.string(), // Denormalized for display
  unit: z.string(), // Denormalized for display
  quantity: requiredNumber,
  cost: requiredNumber, // Cost per unit at the time of order
  quantityReceived: z.number().default(0), // Quantity received so far
});
export type POItem = z.infer<typeof poItemSchema>;

// Purchase Order (PO) Status schema
export const poStatusSchema = z.enum(['Draft', 'Pending', 'Approved', 'Partially Received', 'Completed', 'Cancelled']);

// Purchase Order (PO) schema
export const poSchema = z.object({
  id: z.string().optional(),
  poNumber: requiredString, // e.g., PO-2024-001
  supplierId: requiredString,
  outletId: requiredString,
  date: requiredString.transform((str) => new Date(str).toISOString()),
  items: z.array(poItemSchema).min(1, "PO must have at least one item"),
  status: poStatusSchema.default('Draft',
  ),
  notes: optionalString,
});
export type PO = z.infer<typeof poSchema>;

// Schema for the client-side form for receiving items from a PO
const receivePoItemClientSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  unit: z.string(),
  quantityOrdered: requiredNumber,
  quantityAlreadyReceived: requiredNumber,
  quantityToReceive: requiredNumber,
  cost: requiredNumber.optional(), // Make cost optional on the client
});
export const receivePoClientSchema = z.object({
    poId: z.string(),
    supplierId: z.string(),
    outletId: z.string(),
    items: z.array(receivePoItemClientSchema).min(1, "Must receive at least one item"),
});

// Schema for the server-side action (stricter validation)
const receivePoItemServerSchema = receivePoItemClientSchema.extend({
  cost: requiredNumber, // Cost is required on the server
  quantityToReceive: requiredNumber.min(1, "Quantity to receive must be at least 1"),
}).transform(item => ({
    itemId: item.itemId,
    name: item.name,
    unit: item.unit,
    quantityReceived: item.quantityToReceive, // Rename for clarity in GRN
    cost: item.cost,
}));

export const receivePoSchema = z.object({
  poId: z.string(),
  supplierId: z.string(),
  outletId: z.string(),
  items: z.array(receivePoItemServerSchema).min(1),
});


// Goods Received Note (GRN) schema
export const grnSchema = z.object({
  id: z.string().optional(),
  poId: z.string(),
  outletId: z.string(),
  supplierId: z.string(),
  receivedDate: z.any(), // Typically a server timestamp
  items: z.array(z.object({
    itemId: z.string(),
    name: z.string(),
    unit: z.string(),
    quantityReceived: requiredNumber,
    cost: requiredNumber,
  })),
});
export type GRN = z.infer<typeof grnSchema>;

// Menu schema
export const menuSchema = z.object({
    id: z.string().optional(),
    name: requiredString,
    outletId: requiredString,
    items: z.array(z.object({
        itemId: z.string(), // ID of the item on the menu (e.g., PLU)
        name: requiredString, // Name of the item on the menu (e.g., "Cheeseburger")
        price: requiredNumber, // Selling price
        ingredients: z.array(z.object({
            inventoryItemId: z.string(), // Link to inventory item
            quantity: requiredNumber, // How much of the inventory item is used
        })),
    })),
});

// Inventory Count Item schema
const inventoryCountItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  unit: z.string(),
  countedQuantity: requiredNumber,
  // We can add expectedQuantity if we want to show variance analysis
});

// Inventory Count schema
export const inventoryCountSchema = z.object({
  id: z.string().optional(),
  outletId: requiredString,
  countDate: requiredString.transform((str) => new Date(str).toISOString()),
  items: z.array(inventoryCountItemSchema).min(1, "Count must include at least one item"),
  notes: optionalString,
});
export type InventoryCount = z.infer<typeof inventoryCountSchema>;
