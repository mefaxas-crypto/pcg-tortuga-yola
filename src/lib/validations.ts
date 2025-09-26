
import { z } from 'zod';
import { allUnits } from './conversions';

const unitEnum = z.custom<keyof typeof allUnits>((val) => {
  return typeof val === 'string' && val in allUnits;
}, {
  message: "Invalid unit provided",
});

export const supplierSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters.'),
  contactPerson: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
});

export const inventoryItemSchema = z.object({
  materialCode: z.string().min(1, 'SAP Code is required.'),
  name: z.string().min(2, 'Ingredient name must be at least 2 characters.'),
  category: z.string().min(1, 'Category is required.'),
  purchaseQuantity: z.coerce.number().min(0.0001, 'Purchase quantity must be positive.'),
  purchaseUnit: unitEnum,
  purchasePrice: z.coerce.number().min(0, 'Cost must be a positive number.'),
  minStock: z.coerce.number().min(0, 'Min stock cannot be negative.'),
  maxStock: z.coerce.number().min(0, 'Max stock cannot be negative.'),
  supplierId: z.string().optional(),
  allergens: z.array(z.string()).optional(),
  quantity: z.coerce.number().optional().default(0),
  recipeUnit: unitEnum.optional(),
  recipeUnitConversion: z.coerce.number().optional(),
});

export const inventoryStockSchema = z.object({
  inventoryId: z.string(),
  outletId: z.string(),
  quantity: z.number(),
  status: z.enum(['In Stock', 'Low Stock', 'Out of Stock']),
});

export const allergenSchema = z.object({
  name: z.string().min(2, 'Allergen name must be at least 2 characters.'),
});

export const ingredientCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters.'),
});

export const recipeIngredientSchema = z.object({
  itemId: z.string(),
  ingredientType: z.enum(['inventory', 'recipe']),
  itemCode: z.string(),
  name: z.string(),
  quantity: z.coerce.number().min(0, 'Quantity must be positive'),
  unit: unitEnum,
  totalCost: z.number(),
});

export const recipeSchema = z.object({
  internalCode: z.string(),
  sapCode: z.string().optional(),
  name: z.string().min(2, 'Recipe name must be at least 2 characters.'),
  isSubRecipe: z.boolean(),
  category: z.string(),
  menuId: z.string().optional(),
  yield: z.coerce.number().min(0).optional(),
  yieldUnit: unitEnum.optional(),
  notes: z.string().optional(),
  ingredients: z.array(recipeIngredientSchema).min(1, 'A recipe must have at least one ingredient.'),
  totalCost: z.number(),
  contingencyPercentage: z.coerce.number().min(0).default(5),
  foodCostPercentage: z.coerce.number().min(0).max(100).default(30),
}).superRefine((data, ctx) => {
  if (!data.isSubRecipe && !data.category) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['category'],
      message: 'Category is required.',
    });
  }
});

export const menuSchema = z.object({
  name: z.string().min(2, 'Menu name must be at least 2 characters.'),
  items: z.array(z.object({
    recipeId: z.string(),
    name: z.string(),
    category: z.string(),
    totalCost: z.number(),
    sellingPrice: z.coerce.number().min(0, 'Price must be positive.'),
  })).min(1, 'A menu must have at least one item.'),
});

export const saleSchema = z.object({
  outletId: z.string(),
  menuId: z.string().min(1, 'Please select a menu.'),
  menuName: z.string(),
  recipeId: z.string().min(1, 'Please select an item.'),
  recipeName: z.string(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
  totalRevenue: z.number(),
  totalCost: z.number(),
  saleDate: z.date(),
});

export const productionLogSchema = z.object({
  items: z.array(z.object({
    recipeId: z.string().min(1, 'Please select a sub-recipe.'),
    name: z.string(),
    yield: z.number(),
    yieldUnit: z.string(),
    quantityProduced: z.coerce.number().min(0.01, 'Quantity must be > 0.'),
  })).min(1, 'Please add at least one sub-recipe to produce.'),
});

const butcheringYieldItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is missing.'),
  name: z.string().min(1, 'Item name is required.'),
  weight: z.coerce.number().min(0, 'Weight must be a positive number.'),
  unit: unitEnum,
  materialCode: z.string(),
  costDistributionPercentage: z.coerce.number().min(0),
  finalCostDistribution: z.coerce.number().min(0).optional(),
});

export const butcheringLogSchema = z.object({
  primaryItemId: z.string().min(1, 'Please select a primary item to butcher.'),
  quantityUsed: z.coerce.number().min(0.01, 'Quantity must be greater than 0.'),
  quantityUnit: unitEnum,
  yieldedItems: z.array(butcheringYieldItemSchema).min(1, 'You must have at least one yielded item.'),
});


export const butcheryTemplateSchema = z.object({
  name: z.string().min(3, 'Template name is required.'),
  primaryItemMaterialCode: z.string().min(1, 'Please select a primary item.'),
  yields: z.array(z.object({
    id: z.string(),
    name: z.string(),
    costDistributionPercentage: z.coerce.number().min(0).max(100),
  })).min(1, 'Template must have at least one yield item.'),
});

export const physicalCountItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  physicalQuantity: z.number(),
  theoreticalQuantity: z.number(),
  unit: unitEnum,
});


export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, 'Please select a supplier.'),
  supplierName: z.string(),
  status: z.enum(['Pending', 'Partially Received', 'Received', 'Cancelled']),
  items: z.array(z.object({
    itemId: z.string(),
    name: z.string(),
    materialCode: z.string(),
    orderQuantity: z.coerce.number().min(0),
    purchaseUnit: unitEnum,
    purchasePrice: z.number(),
  })),
});

export const receivePoSchema = z.object({
  poId: z.string(),
  items: z.array(z.object({
    itemId: z.string(),
    name: z.string(),
    ordered: z.number(),
    purchaseUnit: z.string(),
    purchasePrice: z.coerce.number().min(0),
    received: z.coerce.number().min(0, "Cannot be negative."),
  })),
  notes: z.string().optional(),
  document: z.any().optional().nullable(),
});

export const outletSchema = z.object({
  name: z.string().min(2, 'Outlet name must be at least 2 characters.'),
  address: z.string().optional(),
  theme: z.string().optional(),
});

export const transferInventorySchema = z.object({
  itemId: z.string().min(1, 'Please select an item to transfer.'),
  fromOutletId: z.string().min(1, 'Source outlet is required.'),
  toOutletId: z.string().min(1, 'Destination outlet is required.'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than zero.'),
  notes: z.string().optional(),
}).refine(data => data.fromOutletId !== data.toOutletId, {
    message: "Source and destination outlets cannot be the same.",
    path: ["toOutletId"],
});

export const UserRoles = ['Admin', 'Manager', 'Chef', 'Clerk', 'Cook', 'Pending'] as const;

export const appUserSchema = z.object({
  uid: z.string(),
  email: z.string().email().nullable(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  role: z.enum(UserRoles),
  assignedOutletId: z.string().optional(),
});
