
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  getDocs,
  query,
  where,
  getDoc,
  increment,
} from 'firebase/firestore';
import { firestore } from '@/firebase/firebase-server'; // Server-side Firebase admin instance
import {
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  createBatchedWrite,
  newDocumentRef,
} from '@/firebase/non-blocking-updates';
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
  Recipe,
  Sale,
  ProductionLog,
  ButcheringLog,
  PurchaseOrder,
} from '@/lib/types';


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
    throw new Error(`${errorMessage}: ${e.message}`);
  }
}

// Supplier Actions
export async function addSupplier(values: z.infer<typeof supplierSchema>) {
  const validatedData = supplierSchema.parse(values);
  const suppliersCollection = collection(firestore, 'suppliers');
  const docRef = newDocumentRef(firestore, 'suppliers');
  
  await handleAction('/suppliers', async () => {
    setDocumentNonBlocking(docRef, {
      ...validatedData,
      createdAt: serverTimestamp(),
    }, { source: 'addSupplier' });
  }, 'Failed to add supplier');
  
  return { id: docRef.id, ...validatedData } as Supplier;
}

export async function editSupplier(
  id: string,
  values: z.infer<typeof supplierSchema>,
) {
  const validatedData = supplierSchema.parse(values);
  const supplierRef = doc(firestore, 'suppliers', id);
  return handleAction(
    '/suppliers',
    () => updateDocumentNonBlocking(supplierRef, validatedData, { source: 'editSupplier' }),
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
    () => deleteDocumentNonBlocking(supplierRef, { source: 'deleteSupplier' }),
    'Failed to delete supplier',
  );
}

// Inventory Item Actions
export async function addInventoryItem(values: z.infer<typeof inventoryItemSchema>) {
  const validatedData = inventoryItemSchema.parse(values);
  const { quantity, ...itemData } = validatedData;
  
  const batch = createBatchedWrite(firestore, { source: 'addInventoryItem' });

  const inventoryRef = newDocumentRef(firestore, 'inventory');
  const unitCost = itemData.purchasePrice / itemData.purchaseQuantity;
  batch.set(inventoryRef, { ...itemData, unitCost });

  const outletsSnapshot = await getDocs(collection(firestore, 'outlets'));
  outletsSnapshot.forEach((outletDoc) => {
    const stockRef = doc(collection(firestore, 'inventoryStock'), `${inventoryRef.id}_${outletDoc.id}`);
    batch.set(stockRef, {
      inventoryId: inventoryRef.id,
      outletId: outletDoc.id,
      quantity: 0,
      status: 'Out of Stock',
    });
  });

  const { error } = await batch.commit();
  if (error) {
      throw new Error(`Failed to add inventory item: ${error.message}`);
  }
  revalidatePath('/inventory');
  return { id: inventoryRef.id, ...itemData, unitCost } as InventoryItem;
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
    () => updateDocumentNonBlocking(itemRef, {...itemData, unitCost}, { source: 'editInventoryItem' }),
    'Failed to edit inventory item',
  );
}

export async function deleteInventoryItem(id: string) {
    const batch = createBatchedWrite(firestore, { source: 'deleteInventoryItem' });
    const itemRef = doc(firestore, 'inventory', id);
    batch.delete(itemRef);

    const stockQuery = query(collection(firestore, 'inventoryStock'), where('inventoryId', '==', id));
    const stockSnapshot = await getDocs(stockQuery);
    stockSnapshot.forEach(doc => batch.delete(doc.ref));

    const { error } = await batch.commit();
    if (error) {
        throw new Error(`Failed to delete inventory item: ${error.message}`);
    }
    revalidatePath('/inventory');
}

export async function updatePhysicalInventory(items: z.infer<typeof physicalCountItemSchema>[], outletId: string) {
    const batch = createBatchedWrite(firestore, { source: 'updatePhysicalInventory' });
    const varianceLogRef = newDocumentRef(firestore, 'varianceLogs');
    const loggedItems: any[] = [];
    let totalVarianceValue = 0;

    for (const item of items) {
        const stockRef = doc(firestore, `inventoryStock/${item.id}_${outletId}`);
        const itemSpecRef = doc(firestore, 'inventory', item.id);
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

    const { error } = await batch.commit();
    if (error) {
        throw new Error(`Failed to update inventory: ${error.message}`);
    }
    revalidatePath('/inventory');
}


// Allergen Actions
export async function addAllergen(values: z.infer<typeof allergenSchema>) {
  const validatedData = allergenSchema.parse(values);
  const docRef = newDocumentRef(firestore, 'allergens');
  return handleAction(
    '/settings/allergens',
    () => setDocumentNonBlocking(docRef, validatedData, { source: 'addAllergen' }),
    'Failed to add allergen',
  );
}

export async function deleteAllergen(id: string) {
  const allergenRef = doc(firestore, 'allergens', id);
  return handleAction(
    '/settings/allergens',
    () => deleteDocumentNonBlocking(allergenRef, { source: 'deleteAllergen' }),
    'Failed to delete allergen',
  );
}

// Ingredient Category Actions
export async function addIngredientCategory(
  values: z.infer<typeof ingredientCategorySchema>,
) {
  const validatedData = ingredientCategorySchema.parse(values);
  const docRef = newDocumentRef(firestore, 'ingredientCategories');
  return handleAction(
    '/settings/categories',
    () => setDocumentNonBlocking(docRef, validatedData, { source: 'addIngredientCategory' }),
    'Failed to add category',
  );
}

export async function deleteIngredientCategory(id: string) {
  const categoryRef = doc(firestore, 'ingredientCategories', id);
  return handleAction(
    '/settings/categories',
    () => deleteDocumentNonBlocking(categoryRef, { source: 'deleteIngredientCategory' }),
    'Failed to delete category',
  );
}

// Recipe Actions
export async function addRecipe(values: z.infer<typeof recipeSchema>) {
  const validatedData = recipeSchema.parse(values);
  const docRef = newDocumentRef(firestore, 'recipes');
  
  return handleAction('/recipes', async () => {
    setDocumentNonBlocking(docRef, {
      ...validatedData,
      createdAt: serverTimestamp(),
    }, { source: 'addRecipe' });
    
    if (validatedData.isSubRecipe) {
        await addInventoryItem({
            materialCode: validatedData.internalCode,
            name: validatedData.name,
            category: 'Sub-recipe',
            purchaseQuantity: 1,
            purchaseUnit: 'un.',
            purchasePrice: validatedData.totalCost,
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
    () => updateDocumentNonBlocking(recipeRef, validatedData, { source: 'editRecipe' }),
    'Failed to edit recipe',
  );
}

export async function deleteRecipe(id: string) {
  const recipeRef = doc(firestore, 'recipes', id);
  return handleAction(
    '/recipes',
    () => deleteDocumentNonBlocking(recipeRef, { source: 'deleteRecipe' }),
    'Failed to delete recipe',
  );
}

// Menu Actions
export async function addMenu(values: z.infer<typeof menuSchema>) {
  const validatedData = menuSchema.parse(values);
  const docRef = newDocumentRef(firestore, 'menus');
  return handleAction('/menus', () => setDocumentNonBlocking(docRef, validatedData, { source: 'addMenu' }), 'Failed to add menu');
}

export async function editMenu(id: string, values: z.infer<typeof menuSchema>) {
  const validatedData = menuSchema.parse(values);
  const menuRef = doc(firestore, 'menus', id);
  return handleAction('/menus', () => updateDocumentNonBlocking(menuRef, validatedData, { source: 'editMenu' }), 'Failed to edit menu');
}

export async function deleteMenu(id: string) {
  const menuRef = doc(firestore, 'menus', id);
  return handleAction('/menus', () => deleteDocumentNonBlocking(menuRef, { source: 'deleteMenu' }), 'Failed to delete menu');
}

// Sales Actions
export async function logSale(values: z.infer<typeof saleSchema>) {
  const validatedData = saleSchema.parse(values);
  const batch = createBatchedWrite(firestore, { source: 'logSale' });
  const saleRef = newDocumentRef(firestore, 'sales');
  batch.set(saleRef, { ...validatedData, saleDate: serverTimestamp() });

  const recipeRef = doc(firestore, 'recipes', validatedData.recipeId);
  const recipeSnap = await getDoc(recipeRef);
  if (recipeSnap.exists()) {
    const recipe = recipeSnap.data() as Recipe;
    for (const ingredient of recipe.ingredients) {
      const stockRef = doc(firestore, `inventoryStock/${ingredient.itemId}_${validatedData.outletId}`);
      const quantityToDeplete = ingredient.quantity * validatedData.quantity;
      batch.update(stockRef, {
        quantity: increment(-quantityToDeplete)
      });
    }
  }

  const { error } = await batch.commit();
  if (error) {
      throw new Error(`Failed to log sale: ${error.message}`);
  }
  revalidatePath('/sales');
  revalidatePath('/');
}

// Production Log Actions
export async function logProduction(values: z.infer<typeof productionLogSchema>, outletId: string) {
  const validatedData = productionLogSchema.parse(values);
  const batch = createBatchedWrite(firestore, { source: 'logProduction' });
  const logRef = newDocumentRef(firestore, 'productionLogs');
  const producedItems = [];

  for (const item of validatedData.items) {
    const recipeRef = doc(firestore, 'recipes', item.recipeId);
    const recipeSnap = await getDoc(recipeRef);
    if (recipeSnap.exists()) {
      const recipe = recipeSnap.data() as Recipe;
      for (const ingredient of recipe.ingredients) {
        const quantityToDeplete = ingredient.quantity * item.quantityProduced;
        const stockRef = doc(firestore, `inventoryStock/${ingredient.itemId}_${outletId}`);
        batch.update(stockRef, { quantity: increment(-quantityToDeplete) });
      }

      const subRecipeAsInvQuery = query(collection(firestore, 'inventory'), where('materialCode', '==', recipe.internalCode));
      const subRecipeInvSnap = await getDocs(subRecipeAsInvQuery);
      if (!subRecipeInvSnap.empty) {
        const subRecipeInvId = subRecipeInvSnap.docs[0].id;
        const subRecipeStockRef = doc(firestore, `inventoryStock/${subRecipeInvId}_${outletId}`);
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

  batch.set(logRef, {
    outletId,
    logDate: serverTimestamp(),
    producedItems,
  });

  const { error } = await batch.commit();
  if (error) {
      throw new Error(`Failed to log production: ${error.message}`);
  }
  revalidatePath('/recipes');
}

export async function undoProductionLog(logId: string) {
    const logRef = doc(firestore, 'productionLogs', logId);
    const logSnap = await getDoc(logRef);
    if (!logSnap.exists()) {
        throw new Error("Production log not found.");
    }

    const log = logSnap.data() as ProductionLog;
    const batch = createBatchedWrite(firestore, { source: 'undoProductionLog' });

    for (const item of log.producedItems) {
        const recipeRef = doc(firestore, 'recipes', item.recipeId);
        const recipeSnap = await getDoc(recipeRef);
        if (recipeSnap.exists()) {
            const recipe = recipeSnap.data() as Recipe;

            for (const ingredient of recipe.ingredients) {
                const quantityToReturn = ingredient.quantity * item.quantityProduced;
                const stockRef = doc(firestore, `inventoryStock/${ingredient.itemId}_${log.outletId}`);
                batch.update(stockRef, { quantity: increment(quantityToReturn) });
            }

            const subRecipeAsInvQuery = query(collection(firestore, 'inventory'), where('materialCode', '==', recipe.internalCode));
            const subRecipeInvSnap = await getDocs(subRecipeAsInvQuery);
             if (!subRecipeInvSnap.empty) {
                const subRecipeInvId = subRecipeInvSnap.docs[0].id;
                const subRecipeStockRef = doc(firestore, `inventoryStock/${subRecipeInvId}_${log.outletId}`);
                const quantityToDeplete = (recipe.yield || 1) * item.quantityProduced;
                batch.update(subRecipeStockRef, { quantity: increment(-quantityToDeplete) });
            }
        }
    }
    
    batch.delete(logRef);

    const { error } = await batch.commit();
    if (error) {
        throw new Error(`Failed to undo production log: ${error.message}`);
    }
    revalidatePath('/recipes');
}

// Butchering Log Actions
export async function logButchering(values: z.infer<typeof butcheringLogSchema>, outletId: string) {
    const validatedData = butcheringLogSchema.parse(values);
    const batch = createBatchedWrite(firestore, { source: 'logButchering' });
    const primaryItemStockRef = doc(firestore, `inventoryStock/${validatedData.primaryItemId}_${outletId}`);
    batch.update(primaryItemStockRef, { quantity: increment(-validatedData.quantityUsed) });
    
    const primaryItemSpecRef = doc(firestore, 'inventory', validatedData.primaryItemId);
    const primaryItemSpecSnap = await getDoc(primaryItemSpecRef);
    const primaryItemCost = primaryItemSpecSnap.exists() ? (primaryItemSpecSnap.data().unitCost || 0) * validatedData.quantityUsed : 0;
    const yieldedItemsForLog = [];

    for (const yieldItem of validatedData.yieldedItems) {
        const yieldStockRef = doc(firestore, `inventoryStock/${yieldItem.itemId}_${outletId}`);
        batch.update(yieldStockRef, { quantity: increment(yieldItem.weight) });

        const yieldSpecRef = doc(firestore, 'inventory', yieldItem.itemId);
        const newCostForYield = primaryItemCost * ((yieldItem.finalCostDistribution || 0) / 100);
        const newUnitCost = newCostForYield / yieldItem.weight;
        
        if (isFinite(newUnitCost) && newUnitCost > 0) {
            batch.update(yieldSpecRef, { unitCost: newUnitCost });
        }
        yieldedItemsForLog.push({
            itemName: yieldItem.name,
            quantityYielded: yieldItem.weight,
            unit: yieldItem.unit,
        });
    }

    const logRef = newDocumentRef(firestore, 'butcheringLogs');
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

    const { error } = await batch.commit();
    if (error) {
        throw new Error(`Failed to log butchering: ${error.message}`);
    }
    revalidatePath('/recipes');
}

export async function undoButcheringLog(logId: string) {
    const logRef = doc(firestore, 'butcheringLogs', logId);
    const logSnap = await getDoc(logRef);
    if (!logSnap.exists()) {
        throw new Error("Butchering log not found.");
    }
    const log = logSnap.data() as ButcheringLog;
    const batch = createBatchedWrite(firestore, { source: 'undoButcheringLog' });

    const primaryItemStockRef = doc(firestore, `inventoryStock/${log.primaryItem.itemId}_${log.outletId}`);
    batch.update(primaryItemStockRef, { quantity: increment(log.primaryItem.quantityUsed) });
    
    // This action is imperfect as we don't have enough info to reverse cost changes.
    // We will reverse the quantity changes and delete the log.
    
    batch.delete(logRef);

    const { error } = await batch.commit();
    if (error) {
        throw new Error(`Failed to undo butchering: ${error.message}`);
    }
    revalidatePath('/recipes');
}

// Butchery Template Actions
export async function addButcheryTemplate(values: z.infer<typeof butcheryTemplateSchema>) {
    const validatedData = butcheryTemplateSchema.parse(values);
    const docRef = newDocumentRef(firestore, 'butcheryTemplates');
    return handleAction('/settings/butchering-templates', () => setDocumentNonBlocking(docRef, validatedData, { source: 'addButcheryTemplate' }), 'Failed to add template');
}
export async function updateButcheryTemplate(id: string, values: z.infer<typeof butcheryTemplateSchema>) {
    const validatedData = butcheryTemplateSchema.parse(values);
    const templateRef = doc(firestore, 'butcheryTemplates', id);
    return handleAction('/settings/butchering-templates', () => updateDocumentNonBlocking(templateRef, validatedData, { source: 'updateButcheryTemplate' }), 'Failed to update template');
}
export async function deleteButcheryTemplate(id: string) {
    const templateRef = doc(firestore, 'butcheryTemplates', id);
    return handleAction('/settings/butchering-templates', () => deleteDocumentNonBlocking(templateRef, { source: 'deleteButcheryTemplate' }), 'Failed to delete template');
}

// Purchase Order Actions
export async function addPurchaseOrder(values: z.infer<typeof purchaseOrderSchema>, outletId: string) {
  const validatedData = purchaseOrderSchema.parse(values);
  const poNumber = `PO-${Date.now()}`;
  const docRef = newDocumentRef(firestore, 'purchaseOrders');
  return handleAction('/purchasing', () => setDocumentNonBlocking(docRef, {
    ...validatedData,
    outletId,
    poNumber,
    createdAt: serverTimestamp(),
  }, { source: 'addPurchaseOrder' }), 'Failed to create PO.');
}

export async function receivePurchaseOrder(values: z.infer<typeof receivePoSchema>) {
  const validatedData = receivePoSchema.parse(values);
  const batch = createBatchedWrite(firestore, { source: 'receivePurchaseOrder' });
  const poRef = doc(firestore, 'purchaseOrders', validatedData.poId);
  const poSnap = await getDoc(poRef);
  if (!poSnap.exists()) throw new Error('PO not found');

  const poData = poSnap.data() as PurchaseOrder;
  const outletId = poData.outletId;
  let isPartiallyReceived = false;

  for (const receivedItem of validatedData.items) {
    if (receivedItem.received > 0) {
        const stockRef = doc(firestore, `inventoryStock/${receivedItem.itemId}_${outletId}`);
        batch.update(stockRef, { quantity: increment(receivedItem.received) });

        const itemSpecRef = doc(firestore, 'inventory', receivedItem.itemId);
        const itemSpecSnap = await getDoc(itemSpecRef);
        if (itemSpecSnap.exists()) {
            const spec = itemSpecSnap.data() as InventoryItem;
            const stockSnap = await getDoc(stockRef);
            const currentStock = stockSnap.exists() ? stockSnap.data().quantity : 0;
            const currentTotalValue = (spec.unitCost || 0) * (currentStock || 0);
            const receivedValue = receivedItem.purchasePrice * receivedItem.received;
            const newTotalQuantity = (currentStock || 0) + receivedItem.received;
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

  const newStatus = isPartiallyReceived ? 'Partially Received' : 'Received';
  batch.update(poRef, { status: newStatus, notes: validatedData.notes });
  
  const { error } = await batch.commit();
  if (error) {
      throw new Error(`Failed to receive PO: ${error.message}`);
  }
  revalidatePath('/purchasing');
}

export async function cancelPurchaseOrder(poId: string) {
    const poRef = doc(firestore, 'purchaseOrders', poId);
    return handleAction('/purchasing', () => updateDocumentNonBlocking(poRef, { status: 'Cancelled' }, { source: 'cancelPurchaseOrder' }), 'Failed to cancel PO.');
}

// Outlet Actions
export async function addOutlet(values: z.infer<typeof outletSchema>) {
    const validatedData = outletSchema.parse(values);
    const batch = createBatchedWrite(firestore, { source: 'addOutlet' });
    const outletRef = newDocumentRef(firestore, 'outlets');
    batch.set(outletRef, validatedData);

    const inventorySnapshot = await getDocs(collection(firestore, 'inventory'));
    inventorySnapshot.forEach(itemDoc => {
        const stockRef = doc(firestore, `inventoryStock/${itemDoc.id}_${outletRef.id}`);
        batch.set(stockRef, {
            inventoryId: itemDoc.id,
            outletId: outletRef.id,
            quantity: 0,
            status: 'Out of Stock',
        });
    });
    
    const { error } = await batch.commit();
    if (error) {
        throw new Error(`Failed to add outlet: ${error.message}`);
    }
    revalidatePath('/settings/outlets');
}

export async function editOutlet(id: string, values: z.infer<typeof outletSchema>) {
    const validatedData = outletSchema.parse(values);
    const outletRef = doc(firestore, 'outlets', id);
    return handleAction('/settings/outlets', () => updateDocumentNonBlocking(outletRef, validatedData, { source: 'editOutlet' }), 'Failed to edit outlet');
}

export async function deleteOutlet(id: string) {
    const batch = createBatchedWrite(firestore, { source: 'deleteOutlet' });
    const outletRef = doc(firestore, 'outlets', id);
    batch.delete(outletRef);

    const stockQuery = query(collection(firestore, 'inventoryStock'), where('outletId', '==', id));
    const stockSnapshot = await getDocs(stockQuery);
    stockSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const { error } = await batch.commit();
    if (error) {
        throw new Error(`Failed to delete outlet: ${error.message}`);
    }
    revalidatePath('/settings/outlets');
}

// Inventory Transfer Actions
export async function transferInventory(values: z.infer<typeof transferInventorySchema>) {
    const validatedData = transferInventorySchema.parse(values);
    const { fromOutletId, toOutletId, itemId, quantity } = validatedData;
    
    const batch = createBatchedWrite(firestore, { source: 'transferInventory' });

    const fromStockRef = doc(firestore, `inventoryStock/${itemId}_${fromOutletId}`);
    batch.update(fromStockRef, { quantity: increment(-quantity) });

    const toStockRef = doc(firestore, `inventoryStock/${itemId}_${toOutletId}`);
    batch.update(toStockRef, { quantity: increment(quantity) });
    
    const transferLogRef = newDocumentRef(firestore, 'inventoryTransfers');
    const fromOutletName = (await getDoc(doc(firestore, 'outlets', fromOutletId))).data()?.name || '';
    const toOutletName = (await getDoc(doc(firestore, 'outlets', toOutletId))).data()?.name || '';
    const itemData = (await getDoc(doc(firestore, 'inventory', itemId))).data();
    const itemName = itemData?.name || '';
    const unit = itemData?.purchaseUnit || '';

    batch.set(transferLogRef, {
        ...validatedData,
        transferDate: serverTimestamp(),
        fromOutletName,
        toOutletName,
        itemName,
        unit,
    });
    
    const { error } = await batch.commit();
    if (error) {
        throw new Error(`Failed to transfer inventory: ${error.message}`);
    }
    revalidatePath('/inventory');
}


    