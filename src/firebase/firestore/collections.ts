import { collection, type Firestore, type CollectionReference, DocumentData } from 'firebase/firestore';
import {
  inventoryItemConverter,
  inventoryStockItemConverter,
  supplierConverter,
  recipeConverter,
  menuConverter,
  saleConverter,
  productionLogConverter,
  butcheringLogConverter,
  purchaseOrderConverter,
  allergenConverter,
  ingredientCategoryConverter,
  inventoryTransferConverter,
  outletConverter,
  varianceLogConverter,
  butcheryTemplateConverter,
} from './converters';
import type {
  InventoryItem,
  InventoryStockItem,
  Supplier,
  Recipe,
  Menu,
  Sale,
  ProductionLog,
  ButcheringLog,
  PurchaseOrder,
  Allergen,
  IngredientCategory,
  InventoryTransfer,
  Outlet,
  VarianceLog,
  ButcheryTemplate,
} from '@/lib/types';

// Helper to strongly type a collection with its converter result type
function typedCol<T>(db: Firestore, path: string, converter: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return collection(db, path).withConverter(converter) as CollectionReference<T, DocumentData>;
}

// Centralized strongly typed collection accessors. Add more as needed.
export const collections = {
  inventory: (db: Firestore) => typedCol<InventoryItem>(db, 'inventory', inventoryItemConverter),
  inventoryStock: (db: Firestore) => typedCol<InventoryStockItem>(db, 'inventoryStock', inventoryStockItemConverter),
  suppliers: (db: Firestore) => typedCol<Supplier>(db, 'suppliers', supplierConverter),
  recipes: (db: Firestore) => typedCol<Recipe>(db, 'recipes', recipeConverter),
  menus: (db: Firestore) => typedCol<Menu>(db, 'menus', menuConverter),
  sales: (db: Firestore) => typedCol<Sale>(db, 'sales', saleConverter),
  productionLogs: (db: Firestore) => typedCol<ProductionLog>(db, 'productionLogs', productionLogConverter),
  butcheringLogs: (db: Firestore) => typedCol<ButcheringLog>(db, 'butcheringLogs', butcheringLogConverter),
  purchaseOrders: (db: Firestore) => typedCol<PurchaseOrder>(db, 'purchaseOrders', purchaseOrderConverter),
  allergens: (db: Firestore) => typedCol<Allergen>(db, 'allergens', allergenConverter),
  ingredientCategories: (db: Firestore) => typedCol<IngredientCategory>(db, 'ingredientCategories', ingredientCategoryConverter),
  inventoryTransfers: (db: Firestore) => typedCol<InventoryTransfer>(db, 'inventoryTransfers', inventoryTransferConverter),
  outlets: (db: Firestore) => typedCol<Outlet>(db, 'outlets', outletConverter),
  varianceLogs: (db: Firestore) => typedCol<VarianceLog>(db, 'varianceLogs', varianceLogConverter),
  butcheryTemplates: (db: Firestore) => typedCol<ButcheryTemplate>(db, 'butcheryTemplates', butcheryTemplateConverter),
};

export type InventoryCollectionRef = ReturnType<typeof collections.inventory>;
export type InventoryStockCollectionRef = ReturnType<typeof collections.inventoryStock>;
export type SupplierCollectionRef = ReturnType<typeof collections.suppliers>;
export type RecipeCollectionRef = ReturnType<typeof collections.recipes>;
export type MenuCollectionRef = ReturnType<typeof collections.menus>;
export type SaleCollectionRef = ReturnType<typeof collections.sales>;
export type ProductionLogCollectionRef = ReturnType<typeof collections.productionLogs>;
export type ButcheringLogCollectionRef = ReturnType<typeof collections.butcheringLogs>;
export type PurchaseOrderCollectionRef = ReturnType<typeof collections.purchaseOrders>;
export type AllergenCollectionRef = ReturnType<typeof collections.allergens>;
export type IngredientCategoryCollectionRef = ReturnType<typeof collections.ingredientCategories>;
export type InventoryTransferCollectionRef = ReturnType<typeof collections.inventoryTransfers>;
export type OutletCollectionRef = ReturnType<typeof collections.outlets>;
export type VarianceLogCollectionRef = ReturnType<typeof collections.varianceLogs>;
export type ButcheryTemplateCollectionRef = ReturnType<typeof collections.butcheryTemplates>;
