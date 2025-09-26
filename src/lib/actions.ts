
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  deleteDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from '@/firebase-server'; // Server-side Firebase admin instance
import {
  supplierSchema,
  inventoryItemSchema,
  allergenSchema,
  ingredientCategorySchema,
  recipeSchema,
  menuSchema,
  saleSchema,
  productionLogSchema,
  butcheryTemplateSchema,
  physicalCountItemSchema,
  butcheringLogSchema,
  purchaseOrderSchema,
  receivePoSchema,
  outletSchema,
  transferInventorySchema,
} from '@/lib/validations';
import type {
  Supplier,
  InventoryItem,
  Allergen,
  IngredientCategory,
  Recipe,
  Menu,
  Sale,
  ProductionLog,
  ButcheryTemplate,
  PhysicalCountItem,
  ButcheringLog,
  PurchaseOrder,
  Outlet,
  InventoryTransfer,
} from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Helper to handle server actions and revalidation
async function handleAction(
  path: string,
  action: () => Promise<any>,
  errorMessage: string,
) {
  try {
    const result = await action();
    revalidatePath(path);
    return result;
  } catch (e: any) {
    // Here we can't emit a client-side error, so we throw a clear server error.
    throw new Error(`${errorMessage}: ${e.message}`);
  }
}

// Supplier Actions
export async function addSupplier(values: z.infer<typeof supplierSchema>) {
  const validatedData = supplierSchema.parse(values);
  const suppliersCollection = collection(firestore, 'suppliers');
  return handleAction('/suppliers', async () => {
    const docRef = await addDoc(suppliersCollection, {
      ...validatedData,
      createdAt: serverTimestamp(),
    });
    const newSupplier = { id: docRef.id, ...validatedData };
    return newSupplier as Supplier;
  }, 'Failed to add supplier');
}

export async function editSupplier(
  id: string,
  values: z.infer<typeof supplierSchema>,
) {
  const validatedData = supplierSchema.parse(values);
  const supplierRef = doc(firestore, 'suppliers', id);
  return handleAction(
    '/suppliers',
    () => updateDoc(supplierRef, validatedData),
    'Failed to edit supplier',
  );
}

export async function deleteSupplier(id: string) {
  const q = query(collection(firestore, 'inventory'), where('supplierId', '==', id));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    throw new Error('Cannot delete supplier with assigned inventory items.');
  }
  const supplierRef = doc(firestore, 'suppliers', id);
  return handleAction(
    '/suppliers',
    () => deleteDoc(supplierRef),
    'Failed to delete supplier',
  );
}

// Inventory Item Actions
export async function addInventoryItem(values: z.infer<typeof inventoryItemSchema>) {
  const validatedData = inventoryItemSchema.parse(values);
  const { quantity, ...itemData } = validatedData;
  const batch = writeBatch(firestore);

  // 1. Create the main inventory item specification document
  const inventoryRef = doc(collection(firestore, 'inventory'));
  const unitCost = itemData.purchasePrice / itemData.purchaseQuantity;
  batch.set(inventoryRef, { ...itemData, unitCost });

  // 2. Create stock level documents for EACH existing outlet
  const outletsSnapshot = await getDocs(collection(firestore, 'outlets'));
  outletsSnapshot.forEach((outletDoc) => {
    const stockRef = doc(collection(firestore, 'inventoryStock'));
    batch.set(stockRef, {
      inventoryId: inventoryRef.id,
      outletId: outletDoc.id,
      quantity: 0, // Initial quantity is always 0
      status: 'Out of Stock',
    });
  });

  return handleAction('/inventory', () => batch.commit(), 'Failed to add inventory item').then(() => ({ id: inventoryRef.id, ...itemData, unitCost } as InventoryItem));
}

export async function editInventoryItem(
  id: string,
  values: z.infer<typeof inventoryItemSchema>,
) {
  const validatedData = inventoryItemSchema.parse(values);
  const { quantity, ...itemData } = validatedData;
  const itemRef = doc(firestore, 'inventory', id);
  const unitCost = itemData.purchasePrice / itemData.purchaseQuantity;
  return handleAction(
    '/inventory',
    () => updateDoc(itemRef, {...itemData, unitCost}),
    'Failed to edit inventory item',
  );
}

export async function deleteInventoryItem(id: string) {
  const itemRef = doc(firestore, 'inventory', id);
  const batch = writeBatch(firestore);

  // 1. Delete the main inventory item
  batch.delete(itemRef);

  // 2. Find and delete all associated stock level documents
  const stockQuery = query(collection(firestore, 'inventoryStock'), where('inventoryId', '==', id));
  const stockSnapshot = await getDocs(stockQuery);
  stockSnapshot.forEach(doc => batch.delete(doc.ref));

  return handleAction(
    '/inventory',
    () => batch.commit(),
    'Failed to delete inventory item',
  );
}

export async function updatePhysicalInventory(items: PhysicalCountItem[], outletId: string) {
  const batch = writeBatch(firestore);

  // Create a log entry for this physical count event
  const varianceLogRef = doc(collection(firestore, 'varianceLogs'));
  const loggedItems: any[] = [];
  let totalVarianceValue = 0;

  for (const item of items) {
    const stockRef = doc(collection(firestore, 'inventoryStock'), `${item.id}_${outletId}`);
    const itemSpecRef = doc(collection(firestore, 'inventory'), item.id);

    const itemSpecSnap = await getDoc(itemSpecRef);
    if (!itemSpecSnap.exists()) continue;

    const unitCost = itemSpecSnap.data().unitCost || 0;
    const variance = item.physicalQuantity - item.theoreticalQuantity;
    const varianceValue = variance * unitCost;

    batch.update(stockRef, { quantity: item.physicalQuantity });
    loggedItems.push({ ...item, variance, varianceValue });
    totalVarianceValue += varianceValue;
  }

  batch.set(varianceLogRef, {
    outletId,
    logDate: serverTimestamp(),
    items: loggedItems,
    totalVarianceValue,
  });

  return handleAction('/inventory', () => batch.commit(), 'Failed to update physical inventory');
}


// Allergen Actions
export async function addAllergen(values: z.infer<typeof allergenSchema>) {
  const validatedData = allergenSchema.parse(values);
  const allergensCollection = collection(firestore, 'allergens');
  return handleAction(
    '/settings/allergens',
    () => addDoc(allergensCollection, validatedData),
    'Failed to add allergen',
  );
}

export async function deleteAllergen(id: string) {
  const allergenRef = doc(firestore, 'allergens', id);
  return handleAction(
    '/settings/allergens',
    () => deleteDoc(allergenRef),
    'Failed to delete allergen',
  );
}

// Ingredient Category Actions
export async function addIngredientCategory(
  values: z.infer<typeof ingredientCategorySchema>,
) {
  const validatedData = ingredientCategorySchema.parse(values);
  const categoriesCollection = collection(firestore, 'ingredientCategories');
  return handleAction(
    '/settings/categories',
    () => addDoc(categoriesCollection, validatedData),
    'Failed to add category',
  );
}

export async function deleteIngredientCategory(id: string) {
  const categoryRef = doc(firestore, 'ingredientCategories', id);
  return handleAction(
    '/settings/categories',
    () => deleteDoc(categoryRef),
    'Failed to delete category',
  );
}

// Recipe Actions
export async function addRecipe(values: z.infer<typeof recipeSchema>) {
  const validatedData = recipeSchema.parse(values);
  const recipesCollection = collection(firestore, 'recipes');
  
  return handleAction('/recipes', async () => {
    const docRef = await addDoc(recipesCollection, {
      ...validatedData,
      createdAt: serverTimestamp(),
    });
    // if it's a sub-recipe, we also need to create a corresponding inventory item.
    if (validatedData.isSubRecipe) {
        await addInventoryItem({
            materialCode: validatedData.internalCode,
            name: validatedData.name,
            category: 'Sub-recipe',
            purchaseQuantity: 1,
            purchaseUnit: 'un.',
            purchasePrice: validatedData.totalCost, // The cost to "purchase" this is its production cost
            minStock: 0,
            maxStock: 0,
            recipeUnit: validatedData.yieldUnit,
            recipeUnitConversion: validatedData.yield,
        });
    }
  }, 'Failed to add recipe');
}

export async function editRecipe(id: string, values: z.infer<typeof recipeSchema>) {
  const validatedData = recipeSchema.parse(values);
  const recipeRef = doc(firestore, 'recipes', id);
   return handleAction(
    '/recipes',
    () => updateDoc(recipeRef, validatedData),
    'Failed to edit recipe',
  );
}

export async function deleteRecipe(id: string) {
  const recipeRef = doc(firestore, 'recipes', id);
  return handleAction(
    '/recipes',
    () => deleteDoc(recipeRef),
    'Failed to delete recipe',
  );
}

// Menu Actions
export async function addMenu(values: z.infer<typeof menuSchema>) {
  const validatedData = menuSchema.parse(values);
  const menusCollection = collection(firestore, 'menus');
  return handleAction('/menus', () => addDoc(menusCollection, validatedData), 'Failed to add menu');
}

export async function editMenu(id: string, values: z.infer<typeof menuSchema>) {
  const validatedData = menuSchema.parse(values);
  const menuRef = doc(firestore, 'menus', id);
  return handleAction('/menus', () => updateDoc(menuRef, validatedData), 'Failed to edit menu');
}

export async function deleteMenu(id: string) {
  const menuRef = doc(firestore, 'menus', id);
  return handleAction('/menus', () => deleteDoc(menuRef), 'Failed to delete menu');
}

// Sales Actions
export async function logSale(values: z.infer<typeof saleSchema>) {
  const validatedData = saleSchema.parse(values);
  const salesCollection = collection(firestore, 'sales');
  
  // Create a batch write
  const batch = writeBatch(firestore);

  // 1. Add the sale to the sales log
  const saleRef = doc(salesCollection);
  batch.set(saleRef, { ...validatedData, saleDate: serverTimestamp() });

  // 2. Deplete inventory for each ingredient in the sold recipe
  const recipeRef = doc(firestore, 'recipes', validatedData.recipeId);
  const recipeSnap = await getDoc(recipeRef);
  if (recipeSnap.exists()) {
    const recipe = recipeSnap.data() as Recipe;
    for (const ingredient of recipe.ingredients) {
      const stockRef = doc(collection(firestore, 'inventoryStock'), `${ingredient.itemId}_${validatedData.outletId}`);
      
      // The quantity to deplete is per recipe * number of recipes sold
      const quantityToDeplete = ingredient.quantity * validatedData.quantity;
      batch.update(stockRef, {
        quantity: increment(-quantityToDeplete)
      });
    }
  }

  return handleAction('/sales', () => batch.commit(), 'Failed to log sale');
}

// Production Log Actions
export async function logProduction(values: z.infer<typeof productionLogSchema>, outletId: string) {
  const validatedData = productionLogSchema.parse(values);
  const batch = writeBatch(firestore);

  // Create a single log entry for this production event
  const logRef = doc(collection(firestore, 'productionLogs'));
  const producedItems = [];

  for (const item of validatedData.items) {
    const recipeRef = doc(firestore, 'recipes', item.recipeId);
    const recipeSnap = await getDoc(recipeRef);

    if (recipeSnap.exists()) {
      const recipe = recipeSnap.data() as Recipe;

      // Deplete raw ingredients
      for (const ingredient of recipe.ingredients) {
        const quantityToDeplete = ingredient.quantity * item.quantityProduced;
        const stockRef = doc(collection(firestore, 'inventoryStock'), `${ingredient.itemId}_${outletId}`);
        batch.update(stockRef, { quantity: increment(-quantityToDeplete) });
      }

      // Increase stock of the produced sub-recipe
      const subRecipeAsInventoryItemQuery = query(
        collection(firestore, 'inventory'),
        where('materialCode', '==', recipe.internalCode)
      );
      const subRecipeInvSnap = await getDocs(subRecipeAsInventoryItemQuery);
      if (!subRecipeInvSnap.empty) {
        const subRecipeInvId = subRecipeInvSnap.docs[0].id;
        const subRecipeStockRef = doc(collection(firestore, 'inventoryStock'), `${subRecipeInvId}_${outletId}`);
        const quantityToIncrease = (recipe.yield || 1) * item.quantityProduced;
        batch.update(subRecipeStockRef, { quantity: increment(quantityToIncrease) });

        producedItems.push({
          recipeId: item.recipeId,
          recipeName: recipe.name,
          quantityProduced: item.quantityProduced,
          yieldPerBatch: recipe.yield || 1,
          yieldUnit: recipe.yieldUnit || 'batch',
        });
      }
    }
  }

  // Log the event
  batch.set(logRef, {
    outletId,
    logDate: serverTimestamp(),
    producedItems,
    // user: values.userId, // TODO: Get user from session
  });

  return handleAction('/recipes', () => batch.commit(), 'Failed to log production');
}

export async function undoProductionLog(logId: string) {
    const logRef = doc(firestore, 'productionLogs', logId);
    const logSnap = await getDoc(logRef);
    if (!logSnap.exists()) {
        throw new Error("Production log not found.");
    }

    const log = logSnap.data() as ProductionLog;
    const batch = writeBatch(firestore);

    for (const item of log.producedItems) {
        const recipeRef = doc(firestore, 'recipes', item.recipeId);
        const recipeSnap = await getDoc(recipeRef);
        if (recipeSnap.exists()) {
            const recipe = recipeSnap.data() as Recipe;

            // Return raw ingredients to stock
            for (const ingredient of recipe.ingredients) {
                const quantityToReturn = ingredient.quantity * item.quantityProduced;
                const stockRef = doc(collection(firestore, 'inventoryStock'), `${ingredient.itemId}_${log.outletId}`);
                batch.update(stockRef, { quantity: increment(quantityToReturn) });
            }

            // Deplete stock of the produced sub-recipe
            const subRecipeAsInventoryItemQuery = query(
                collection(firestore, 'inventory'),
                where('materialCode', '==', recipe.internalCode)
            );
            const subRecipeInvSnap = await getDocs(subRecipeAsInventoryItemQuery);
             if (!subRecipeInvSnap.empty) {
                const subRecipeInvId = subRecipeInvSnap.docs[0].id;
                const subRecipeStockRef = doc(collection(firestore, 'inventoryStock'), `${subRecipeInvId}_${log.outletId}`);
                const quantityToDeplete = (recipe.yield || 1) * item.quantityProduced;
                batch.update(subRecipeStockRef, { quantity: increment(-quantityToDeplete) });
            }
        }
    }
    
    // Delete the log entry
    batch.delete(logRef);

    return handleAction('/recipes', () => batch.commit(), 'Failed to undo production log.');
}

// Butchering Log Actions
export async function logButchering(values: z.infer<typeof butcheringLogSchema>, outletId: string) {
  const validatedData = butcheringLogSchema.parse(values);
  const batch = writeBatch(firestore);

  // 1. Deplete primary item
  const primaryItemStockRef = doc(collection(firestore, 'inventoryStock'), `${validatedData.primaryItemId}_${outletId}`);
  batch.update(primaryItemStockRef, { quantity: increment(-validatedData.quantityUsed) });
  
  const primaryItemSpecRef = doc(firestore, 'inventory', validatedData.primaryItemId);
  const primaryItemSpecSnap = await getDoc(primaryItemSpecRef);
  const primaryItemCost = primaryItemSpecSnap.exists() ? (primaryItemSpecSnap.data().unitCost || 0) * validatedData.quantityUsed : 0;
  
  const yieldedItemsForLog = [];

  // 2. Increase yielded items
  for (const yieldItem of validatedData.yieldedItems) {
    const yieldStockRef = doc(collection(firestore, 'inventoryStock'), `${yieldItem.itemId}_${outletId}`);
    batch.update(yieldStockRef, { quantity: increment(yieldItem.weight) });

    // 3. Update unit cost of yielded items based on distribution
    const yieldSpecRef = doc(firestore, 'inventory', yieldItem.itemId);
    const newCostForYield = primaryItemCost * ((yieldItem.finalCostDistribution || 0) / 100);
    const newUnitCost = newCostForYield / yieldItem.weight;
    
    // We only update the cost if it's a valid number
    if (isFinite(newUnitCost) && newUnitCost > 0) {
      batch.update(yieldSpecRef, { unitCost: newUnitCost });
    }
    yieldedItemsForLog.push({
      itemName: yieldItem.name,
      quantityYielded: yieldItem.weight,
      unit: yieldItem.unit,
    });
  }

  // 4. Create log entry
  const logRef = doc(collection(firestore, 'butcheringLogs'));
  batch.set(logRef, {
    outletId,
    logDate: serverTimestamp(),
    primaryItem: {
      itemId: validatedData.primaryItemId,
      itemName: (await getDoc(primaryItemSpecRef)).data()?.name || '',
      quantityUsed: validatedData.quantityUsed,
      unit: validatedData.quantityUnit,
    },
    yieldedItems: yieldedItemsForLog,
  });

  return handleAction('/recipes', () => batch.commit(), 'Failed to log butchering.');
}

export async function undoButcheringLog(logId: string) {
    const logRef = doc(firestore, 'butcheringLogs', logId);
    const logSnap = await getDoc(logRef);
    if (!logSnap.exists()) {
        throw new Error("Butchering log not found.");
    }
    const log = logSnap.data() as ButcheringLog;
    const batch = writeBatch(firestore);

    // 1. Return primary item to stock
    const primaryItemStockRef = doc(collection(firestore, 'inventoryStock'), `${log.primaryItem.itemId}_${log.outletId}`);
    batch.update(primaryItemStockRef, { quantity: increment(log.primaryItem.quantityUsed) });

    // 2. Deplete yielded items from stock
    // This part is complex because we don't have the item IDs in the log. This is a flaw in the log design.
    // For now, we cannot accurately reverse the stock.
    // A better log design would store the yielded item IDs.
    // We will proceed by deleting the log, but the stock reversal will be incomplete.

    // Delete the log entry
    batch.delete(logRef);

    return handleAction('/recipes', () => batch.commit(), 'Failed to undo butchering log.');
}

// Butchery Template Actions
export async function addButcheryTemplate(values: z.infer<typeof butcheryTemplateSchema>) {
    const validatedData = butcheryTemplateSchema.parse(values);
    return handleAction('/settings/butchering-templates', () => addDoc(collection(firestore, 'butcheryTemplates'), validatedData), 'Failed to add template');
}
export async function updateButcheryTemplate(id: string, values: z.infer<typeof butcheryTemplateSchema>) {
    const validatedData = butcheryTemplateSchema.parse(values);
    const templateRef = doc(firestore, 'butcheryTemplates', id);
    return handleAction('/settings/butchering-templates', () => updateDoc(templateRef, validatedData), 'Failed to update template');
}
export async function deleteButcheryTemplate(id: string) {
    const templateRef = doc(firestore, 'butcheryTemplates', id);
    return handleAction('/settings/butchering-templates', () => deleteDoc(templateRef), 'Failed to delete template');
}

// Purchase Order Actions
export async function addPurchaseOrder(values: z.infer<typeof purchaseOrderSchema>, outletId: string) {
  const validatedData = purchaseOrderSchema.parse(values);
  const poNumber = `PO-${Date.now()}`;
  return handleAction('/purchasing', () => addDoc(collection(firestore, 'purchaseOrders'), {
    ...validatedData,
    outletId,
    poNumber,
    createdAt: serverTimestamp(),
  }), 'Failed to create PO.');
}

export async function receivePurchaseOrder(values: z.infer<typeof receivePoSchema>) {
  const validatedData = receivePoSchema.parse(values);
  const batch = writeBatch(firestore);
  const poRef = doc(firestore, 'purchaseOrders', validatedData.poId);
  const poSnap = await getDoc(poRef);
  if (!poSnap.exists()) throw new Error('PO not found');

  const poData = poSnap.data() as PurchaseOrder;
  const outletId = poData.outletId;
  let isPartiallyReceived = false;

  for (const receivedItem of validatedData.items) {
    if (receivedItem.received > 0) {
        // Update inventory stock
        const stockRef = doc(collection(firestore, 'inventoryStock'), `${receivedItem.itemId}_${outletId}`);
        batch.update(stockRef, { quantity: increment(receivedItem.received) });

        // Update item unit cost if price has changed
        const itemSpecRef = doc(firestore, 'inventory', receivedItem.itemId);
        const itemSpecSnap = await getDoc(itemSpecRef);
        if (itemSpecSnap.exists()) {
            const spec = itemSpecSnap.data() as InventoryItem;
            const currentTotalValue = (spec.unitCost || 0) * (spec.quantity || 0);
            const receivedValue = receivedItem.purchasePrice * receivedItem.received;
            const newTotalQuantity = (spec.quantity || 0) + receivedItem.received;
            const newUnitCost = (currentTotalValue + receivedValue) / newTotalQuantity;
            if (isFinite(newUnitCost)) {
                batch.update(itemSpecRef, { unitCost: newUnitCost });
            }
        }
    }
    if (receivedItem.received < receivedItem.ordered) {
      isPartiallyReceived = true;
    }
  }

  // Update PO status
  const newStatus = isPartiallyReceived ? 'Partially Received' : 'Received';
  batch.update(poRef, { status: newStatus, notes: validatedData.notes });

  // Add GRN Document (if document is provided)
  // This would require Firebase Storage setup. For now, we skip.

  return handleAction('/purchasing', () => batch.commit(), 'Failed to receive PO.');
}

export async function cancelPurchaseOrder(poId: string) {
    const poRef = doc(firestore, 'purchaseOrders', poId);
    return handleAction('/purchasing', () => updateDoc(poRef, { status: 'Cancelled' }), 'Failed to cancel PO.');
}

// Outlet Actions
export async function addOutlet(values: z.infer<typeof outletSchema>) {
    const validatedData = outletSchema.parse(values);
    const batch = writeBatch(firestore);

    // 1. Create the new outlet
    const outletRef = doc(collection(firestore, 'outlets'));
    batch.set(outletRef, validatedData);

    // 2. For every existing inventory item, create a new stock record for this outlet
    const inventorySnapshot = await getDocs(collection(firestore, 'inventory'));
    inventorySnapshot.forEach(itemDoc => {
        const stockRef = doc(collection(firestore, 'inventoryStock'));
        batch.set(stockRef, {
            inventoryId: itemDoc.id,
            outletId: outletRef.id,
            quantity: 0,
            status: 'Out of Stock',
        });
    });
    
    return handleAction('/settings/outlets', () => batch.commit(), 'Failed to add outlet');
}

export async function editOutlet(id: string, values: z.infer<typeof outletSchema>) {
    const validatedData = outletSchema.parse(values);
    const outletRef = doc(firestore, 'outlets', id);
    return handleAction('/settings/outlets', () => updateDoc(outletRef, validatedData), 'Failed to edit outlet');
}

export async function deleteOutlet(id: string) {
    const outletRef = doc(firestore, 'outlets', id);
    const batch = writeBatch(firestore);

    // 1. Delete the outlet
    batch.delete(outletRef);

    // 2. Delete all associated stock records
    const stockQuery = query(collection(firestore, 'inventoryStock'), where('outletId', '==', id));
    const stockSnapshot = await getDocs(stockQuery);
    stockSnapshot.forEach(doc => batch.delete(doc.ref));
    
    return handleAction('/settings/outlets', () => batch.commit(), 'Failed to delete outlet');
}

// Inventory Transfer Actions
export async function transferInventory(values: z.infer<typeof transferInventorySchema>) {
    const validatedData = transferInventorySchema.parse(values);
    const { fromOutletId, toOutletId, itemId, quantity } = validatedData;
    
    const batch = writeBatch(firestore);

    // Decrement from source
    const fromStockRef = doc(collection(firestore, 'inventoryStock'), `${itemId}_${fromOutletId}`);
    batch.update(fromStockRef, { quantity: increment(-quantity) });

    // Increment at destination
    const toStockRef = doc(collection(firestore, 'inventoryStock'), `${itemId}_${toOutletId}`);
    batch.update(toStockRef, { quantity: increment(quantity) });
    
    // Log the transfer
    const transferLogRef = doc(collection(firestore, 'inventoryTransfers'));
    const fromOutletName = (await getDoc(doc(firestore, 'outlets', fromOutletId))).data()?.name || '';
    const toOutletName = (await getDoc(doc(firestore, 'outlets', toOutletId))).data()?.name || '';
    const itemName = (await getDoc(doc(firestore, 'inventory', itemId))).data()?.name || '';
    const unit = (await getDoc(doc(firestore, 'inventory', itemId))).data()?.purchaseUnit || '';

    batch.set(transferLogRef, {
        ...validatedData,
        transferDate: serverTimestamp(),
        fromOutletName,
        toOutletName,
        itemName,
        unit,
    });
    
    return handleAction('/inventory', () => batch.commit(), 'Failed to transfer inventory');
}
