import { Timestamp, type FirestoreDataConverter } from 'firebase/firestore';
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

// Helper to coerce Firestore timestamps/Date fields where needed
function toDate(value: any): Date | undefined { // internal utility only
  if (!value) return undefined;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return undefined;
}

// Generic factory for simple pass-through converters that add id field
function basicConverter<T extends { id: string }>(mapDates?: (data: any) => Partial<T>): FirestoreDataConverter<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    toFirestore(modelObject: T) {
      const { id, ...rest } = modelObject as any; // remove id when writing
      return rest;
    },
    fromFirestore(snapshot) {
      const data = snapshot.data();
      return { id: snapshot.id, ...data, ...(mapDates ? mapDates(data) : {}) } as T;
    },
  };
}

export const inventoryItemConverter = basicConverter<InventoryItem>();
export const inventoryStockItemConverter = basicConverter<InventoryStockItem>();
export const supplierConverter = basicConverter<Supplier>();
export const recipeConverter = basicConverter<Recipe>();
export const menuConverter = basicConverter<Menu>();
export const saleConverter: FirestoreDataConverter<Sale> = {
  toFirestore({ id, saleDate, ...rest }) { return { ...rest, saleDate }; },
  fromFirestore(snap) { const d = snap.data(); return { id: snap.id, ...d, saleDate: toDate(d.saleDate) || new Date() } as Sale; },
};
export const productionLogConverter: FirestoreDataConverter<ProductionLog> = {
  toFirestore({ id, logDate, ...rest }) { return { ...rest, logDate }; },
  fromFirestore(snap) { const d = snap.data(); return { id: snap.id, ...d, logDate: toDate(d.logDate) || new Date() } as ProductionLog; },
};
export const butcheringLogConverter: FirestoreDataConverter<ButcheringLog> = {
  toFirestore({ id, logDate, ...rest }) { return { ...rest, logDate }; },
  fromFirestore(snap) { const d = snap.data(); return { id: snap.id, ...d, logDate: toDate(d.logDate) || new Date() } as ButcheringLog; },
};
export const purchaseOrderConverter: FirestoreDataConverter<PurchaseOrder> = {
  toFirestore({ id, createdAt, ...rest }) { return { ...rest, createdAt }; },
  fromFirestore(snap) { const d = snap.data(); return { id: snap.id, ...d, createdAt: (d.createdAt instanceof Timestamp ? d.createdAt : Timestamp.fromDate(new Date())) } as PurchaseOrder; },
};
export const allergenConverter = basicConverter<Allergen>();
export const ingredientCategoryConverter = basicConverter<IngredientCategory>();
export const inventoryTransferConverter: FirestoreDataConverter<InventoryTransfer> = {
  toFirestore({ id, transferDate, ...rest }) { return { ...rest, transferDate }; },
  fromFirestore(snap) { const d = snap.data(); return { id: snap.id, ...d, transferDate: toDate(d.transferDate) || new Date() } as InventoryTransfer; },
};
export const outletConverter = basicConverter<Outlet>();
export const varianceLogConverter: FirestoreDataConverter<VarianceLog> = {
  toFirestore({ id, logDate, ...rest }) { return { ...rest, logDate }; },
  fromFirestore(snap) { const d = snap.data(); return { id: snap.id, ...d, logDate: toDate(d.logDate) || new Date() } as VarianceLog; },
};
export const butcheryTemplateConverter = basicConverter<ButcheryTemplate>();

export const converters = {
  inventory: inventoryItemConverter,
  inventoryStock: inventoryStockItemConverter,
  suppliers: supplierConverter,
  recipes: recipeConverter,
  menus: menuConverter,
  sales: saleConverter,
  productionLogs: productionLogConverter,
  butcheringLogs: butcheringLogConverter,
  purchaseOrders: purchaseOrderConverter,
  allergens: allergenConverter,
  ingredientCategories: ingredientCategoryConverter,
  inventoryTransfers: inventoryTransferConverter,
  outlets: outletConverter,
  varianceLogs: varianceLogConverter,
  butcheryTemplates: butcheryTemplateConverter,
};
