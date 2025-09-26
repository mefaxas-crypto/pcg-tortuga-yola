
'use server';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  DocumentReference,
} from 'firebase/firestore';
import { db } from '@/firebase';
import type {
  ButcheringLog,
  ButcheryTemplate,
  InventoryItem,
  InventoryStockItem,
  Menu,
  Outlet,
  PhysicalCountItem,
  ProductionLog,
  PurchaseOrder,
  Recipe,
  Supplier,
  VarianceLogItem,
} from './types';
import {revalidatePath} from 'next/cache';
import { Unit, convert, getBaseUnit } from './conversions';
import { 
  supplierSchema, 
  inventoryItemSchema, 
  allergenSchema, 
  ingredientCategorySchema, 
  recipeSchema, 
  menuSchema, 
  saleSchema,
  productionLogSchema,
  butcheringLogSchema,
  purchaseOrderSchema,
  receivePoSchema,
  outletSchema,
  transferInventorySchema
} from './validations';
import { z } from 'zod';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export async function addSupplier(supplierData: z.infer<typeof supplierSchema>) {
  const validatedData = supplierSchema.parse(supplierData);
  const docRefPromise = addDoc(collection(db, 'suppliers'), validatedData);
  
  docRefPromise.then(docRef => {
    revalidatePath('/suppliers');
    revalidatePath('/inventory');
  }).catch(error => {
    const permissionError = new FirestorePermissionError({
        path: 'suppliers',
        operation: 'create',
        requestResourceData: validatedData,
    });
    errorEmitter.emit('permission-error', permissionError);
    console.error('Error adding supplier:', error)
  });

  // We return a promise that resolves with the new supplier for client-side updates.
  return docRefPromise.then(docRef => ({ id: docRef.id, ...validatedData } as Supplier));
}

export async function editSupplier(id: string, supplierData: z.infer<typeof supplierSchema>) {
  const validatedData = supplierSchema.parse(supplierData);
  const supplierRef = doc(db, 'suppliers', id);

  updateDoc(supplierRef, validatedData)
    .then(() => {
        revalidatePath('/suppliers');
        revalidatePath('/inventory');
    })
    .catch(error => {
        const permissionError = new FirestorePermissionError({
            path: supplierRef.path,
            operation: 'update',
            requestResourceData: validatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error updating supplier:', error);
    });
  return {success: true};
}

export async function deleteSupplier(supplierId: string) {
    const batch = writeBatch(db);
    const itemsQuery = query(collection(db, 'inventory'), where('supplierId', '==', supplierId));
    
    getDocs(itemsQuery).then(querySnapshot => {
        querySnapshot.forEach(itemDoc => {
            const itemRef = doc(db, 'inventory', itemDoc.id);
            batch.update(itemRef, {
                supplierId: '',
                supplier: 'Unknown Supplier'
            });
        });

        const supplierRef = doc(db, 'suppliers', supplierId);
        batch.delete(supplierRef);
        
        batch.commit().then(() => {
            revalidatePath('/suppliers');
            revalidatePath('/inventory');
        }).catch(error => {
             const permissionError = new FirestorePermissionError({
                path: supplierRef.path, // Approximate path
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
            console.error('Error committing delete supplier batch:', error);
        });
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: 'inventory',
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error querying items for supplier deletion:', error);
    });

    return {success: true};
}

function getStatus(
  quantity: number,
  minStock: number,
): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (quantity <= 0) {
    return 'Out of Stock';
  } else if (quantity <= minStock) {
    return 'Low Stock';
  } else {
    return 'In Stock';
  }
}

export async function addInventoryItem(formData: z.infer<typeof inventoryItemSchema>) {
  const validatedData = inventoryItemSchema.parse(formData);
  const {
      purchaseQuantity,
      purchaseUnit,
      purchasePrice,
      recipeUnit,
      recipeUnitConversion,
      ...restOfForm
    } = validatedData;

    const inventoryUnit = purchaseUnit;
    const finalRecipeUnit = recipeUnit || getBaseUnit(purchaseUnit as Unit);
    let unitCost = 0;
    let finalRecipeUnitConversion = 1;

    if (purchaseUnit === 'un.') {
      if (!recipeUnitConversion || !recipeUnit) {
        throw new Error("Conversion factor is required for 'un.' items.");
      }
      finalRecipeUnitConversion = recipeUnitConversion;
      const totalRecipeUnitsInPurchase = purchaseQuantity * finalRecipeUnitConversion;
      unitCost =
        totalRecipeUnitsInPurchase > 0
          ? purchasePrice / totalRecipeUnitsInPurchase
          : 0;
    } else {
      finalRecipeUnitConversion = convert(
        1,
        purchaseUnit as Unit,
        finalRecipeUnit as Unit
      );
      const totalBaseUnits = purchaseQuantity * finalRecipeUnitConversion;
      unitCost = totalBaseUnits > 0 ? purchasePrice / totalBaseUnits : 0;
    }
    const supplierName = await getSupplierName(validatedData.supplierId);

    const itemSpecData = {
      ...restOfForm,
      supplier: supplierName,
      supplierId: validatedData.supplierId || '',
      purchaseQuantity,
      purchaseUnit,
      purchasePrice,
      unit: inventoryUnit,
      unitCost: isFinite(unitCost) ? unitCost : 0,
      recipeUnit: finalRecipeUnit,
      recipeUnitConversion: finalRecipeUnitConversion,
    };
    
    const newDocRef = await runTransaction(db, async (transaction) => {
      const docRef = doc(collection(db, 'inventory'));
      transaction.set(docRef, itemSpecData);
      
      const outletsQuery = query(collection(db, 'outlets'));
      const outletsSnapshot = await getDocs(outletsQuery);

      outletsSnapshot.forEach(outletDoc => {
        const stockRef = doc(collection(db, 'inventoryStock'));
        transaction.set(stockRef, {
          inventoryId: docRef.id,
          outletId: outletDoc.id,
          quantity: validatedData.quantity || 0,
          status: getStatus(validatedData.quantity || 0, validatedData.minStock),
        });
      });
      
      return docRef;
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: 'inventory',
            operation: 'write',
            requestResourceData: itemSpecData
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error in addInventoryItem transaction:', error);
        throw error; // Re-throw to indicate failure
    });
    
    revalidatePath('/inventory');
    revalidatePath('/recipes/**');

    const newItem: InventoryItem = {
      id: newDocRef.id,
      ...(itemSpecData as Omit<InventoryItem, 'id'>),
    };
    return newItem;
}

async function getSupplierName(supplierId?: string): Promise<string> {
    if (!supplierId) {
        return 'In-house';
    }
    const supplierRef = doc(db, 'suppliers', supplierId);
    const supplierSnap = await getDoc(supplierRef);
    if (!supplierSnap.exists()) {
      console.warn(`Supplier with ID ${supplierId} not found.`);
      return 'Unknown Supplier';
    }
    return supplierSnap.data().name;
}


export async function editInventoryItem(
  id: string,
  formData: z.infer<typeof inventoryItemSchema>
) {
  const validatedData = inventoryItemSchema.parse(formData);
  const itemRef = doc(db, 'inventory', id);

  const { purchaseQuantity, purchaseUnit, purchasePrice, recipeUnit, recipeUnitConversion, ...restOfForm } = validatedData;
    
  const inventoryUnit = purchaseUnit;
  const finalRecipeUnit = recipeUnit || getBaseUnit(purchaseUnit as Unit);
  let unitCost = 0;
  let finalRecipeUnitConversion = 1;

  if (purchaseUnit === 'un.') {
    if (!recipeUnitConversion || !recipeUnit) {
      throw new Error("Conversion factor is required for 'un.' items.");
    }
    finalRecipeUnitConversion = recipeUnitConversion;
    const totalRecipeUnitsInPurchase = purchaseQuantity * finalRecipeUnitConversion;
    unitCost = totalRecipeUnitsInPurchase > 0 ? purchasePrice / totalRecipeUnitsInPurchase : 0;
  } else {
    finalRecipeUnitConversion = convert(1, purchaseUnit as Unit, finalRecipeUnit as Unit);
    const totalBaseUnits = purchaseQuantity * finalRecipeUnitConversion;
    unitCost = totalBaseUnits > 0 ? purchasePrice / totalBaseUnits : 0;
  }

  const supplierName = await getSupplierName(validatedData.supplierId);

  const dataToUpdate = {
    ...restOfForm,
    supplier: supplierName,
    supplierId: validatedData.supplierId || '',
    purchaseQuantity,
    purchaseUnit,
    purchasePrice,
    unit: inventoryUnit,
    unitCost: isFinite(unitCost) ? unitCost : 0,
    recipeUnit: finalRecipeUnit,
    recipeUnitConversion: finalRecipeUnitConversion,
  };
    
  updateDoc(itemRef, dataToUpdate).then(() => {
      revalidatePath('/inventory');
      revalidatePath('/recipes/**'); 
  }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: itemRef.path,
            operation: 'update',
            requestResourceData: dataToUpdate
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error updating inventory item:', error);
  });
  return {success: true};
}

export async function deleteInventoryItem(itemId: string) {
    runTransaction(db, async (transaction) => {
        const itemRef = doc(db, 'inventory', itemId);
        transaction.delete(itemRef);

        const stockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', itemId));
        const stockSnaps = await getDocs(stockQuery);
        stockSnaps.forEach(stockDoc => {
            transaction.delete(stockDoc.ref);
        });
    }).then(() => {
        revalidatePath('/inventory');
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: `inventory/${itemId}`, // Approximate path
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error in deleteInventoryItem transaction:', error);
    });

    return {success: true};
}

export async function updatePhysicalInventory(items: PhysicalCountItem[], outletId: string) {
    if (!outletId) {
      throw new Error("Outlet ID must be provided to update physical inventory.");
    }
    
    runTransaction(db, async (transaction) => {
        const varianceLogRef = doc(collection(db, 'varianceLogs'));
        const itemRefs = items.map(item => doc(db, 'inventory', item.id));

        const itemSnaps = await Promise.all(itemRefs.map(ref => transaction.get(ref)));
        
        const variances: VarianceLogItem[] = [];
        let totalVarianceValue = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemSnap = itemSnaps[i];

            if (!itemSnap.exists()) {
                console.warn(`Item with ID ${item.id} not found during physical count. Skipping.`);
                continue;
            }
            const invItem = itemSnap.data() as InventoryItem;

            const stockQuery = query(
                collection(db, 'inventoryStock'),
                where('inventoryId', '==', item.id),
                where('outletId', '==', outletId)
            );
            const stockSnaps = await getDocs(stockQuery);

            if (stockSnaps.empty) {
                console.warn(`Stock for item ${item.name} not found at outlet ${outletId}. Skipping.`);
                continue;
            }
            const stockDocRef = stockSnaps.docs[0].ref;

            const newQuantity = item.physicalQuantity;
            const newStatus = getStatus(newQuantity, invItem.minStock);

            transaction.update(stockDocRef, {
                quantity: newQuantity,
                status: newStatus,
            });
            
            const varianceQuantity = item.physicalQuantity - item.theoreticalQuantity;
            const costPerPurchaseUnit = invItem.purchasePrice / (invItem.purchaseQuantity || 1);
            const varianceValue = varianceQuantity * costPerPurchaseUnit;

            variances.push({
                itemId: item.id,
                itemName: item.name,
                theoreticalQuantity: item.theoreticalQuantity,
                physicalQuantity: item.physicalQuantity,
                variance: varianceQuantity,
                unit: item.unit,
                varianceValue: isFinite(varianceValue) ? varianceValue : 0,
            });
            totalVarianceValue += isFinite(varianceValue) ? varianceValue : 0;
        }
         transaction.set(varianceLogRef, {
            logDate: serverTimestamp(),
            outletId: outletId,
            items: variances,
            user: 'Chef John Doe',
            totalVarianceValue: totalVarianceValue,
        });

    }).then(() => {
        revalidatePath('/inventory');
        revalidatePath('/reports');
        revalidatePath('/');
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: `inventoryStock`,
            operation: 'write',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error updating physical inventory:', error);
    });
}


// Allergen Actions
export async function addAllergen(allergenData: z.infer<typeof allergenSchema>) {
  const validatedData = allergenSchema.parse(allergenData);
  addDoc(collection(db, 'allergens'), validatedData).then(() => {
    revalidatePath('/settings/allergens');
  }).catch(error => {
     const permissionError = new FirestorePermissionError({
        path: 'allergens',
        operation: 'create',
        requestResourceData: validatedData,
    });
    errorEmitter.emit('permission-error', permissionError);
    console.error('Error adding allergen:', error);
  });
  return {success: true};
}

export async function deleteAllergen(allergenId: string) {
  const allergenRef = doc(db, 'allergens', allergenId);
  deleteDoc(allergenRef).then(() => {
      revalidatePath('/settings/allergens');
  }).catch(error => {
    const permissionError = new FirestorePermissionError({
        path: allergenRef.path,
        operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
    console.error('Error deleting allergen:', error);
  });
  return {success: true};
}

// Ingredient Category Actions
export async function addIngredientCategory(categoryData: z.infer<typeof ingredientCategorySchema>) {
    const validatedData = ingredientCategorySchema.parse(categoryData);
    addDoc(collection(db, 'ingredientCategories'), validatedData).then(() => {
        revalidatePath('/settings/categories');
        revalidatePath('/inventory');
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: 'ingredientCategories',
            operation: 'create',
            requestResourceData: validatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error adding ingredient category:', error);
    });
    return { success: true };
}

export async function deleteIngredientCategory(categoryId: string) {
    const categoryRef = doc(db, 'ingredientCategories', categoryId);
    deleteDoc(categoryRef).then(() => {
        revalidatePath('/settings/categories');
        revalidatePath('/inventory');
    }).catch(error => {
         const permissionError = new FirestorePermissionError({
            path: categoryRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error deleting ingredient category:', error);
    });
    return { success: true };
}


// Recipe Actions
export async function addRecipe(recipeData: z.infer<typeof recipeSchema>) {
  const validatedData = recipeSchema.parse(recipeData);

  runTransaction(db, async (transaction) => {
    const recipeRef = doc(collection(db, 'recipes'));
    transaction.set(recipeRef, validatedData);

    if (validatedData.isSubRecipe) {
      const inventoryQuery = query(collection(db, 'inventory'), where('materialCode', '==', validatedData.internalCode));
      const existingInv = await getDocs(inventoryQuery);

      if (existingInv.empty) {
        const inventoryRef = doc(collection(db, 'inventory'));
        const unitCost = validatedData.totalCost / (validatedData.yield || 1);
        
        const inventorySpec = {
          materialCode: validatedData.internalCode,
          name: validatedData.name,
          category: 'Sub-recipe',
          unit: validatedData.yieldUnit || 'un.',
          purchaseUnit: validatedData.yieldUnit || 'un.',
          purchaseQuantity: validatedData.yield || 1,
          minStock: 0,
          maxStock: 0,
          supplier: 'In-house',
          supplierId: '',
          purchasePrice: isFinite(unitCost) ? unitCost : 0,
          unitCost: isFinite(unitCost) ? unitCost : 0,
          allergens: [],
          recipeUnit: validatedData.yieldUnit || 'un.',
          recipeUnitConversion: 1,
        };
        transaction.set(inventoryRef, inventorySpec);
      }
    }
  }).then(() => {
      revalidatePath('/recipes');
      revalidatePath('/inventory');
  }).catch(error => {
      const permissionError = new FirestorePermissionError({
        path: 'recipes',
        operation: 'write',
        requestResourceData: validatedData,
      });
      errorEmitter.emit('permission-error', permissionError);
      console.error('Error in addRecipe transaction:', error);
  });

  return {success: true};
}

export async function editRecipe(id: string, recipeData: z.infer<typeof recipeSchema>) {
  const validatedData = recipeSchema.parse(recipeData);
  const recipeRef = doc(db, 'recipes', id);
  updateDoc(recipeRef, validatedData).then(() => {
      if (validatedData.isSubRecipe) {
        const inventoryRef = doc(db, 'inventory', validatedData.internalCode);
        getDoc(inventoryRef).then(invSnap => {
            if (invSnap.exists()) {
                const unitCost = validatedData.totalCost / (validatedData.yield || 1);
                updateDoc(inventoryRef, {
                    name: validatedData.name,
                    unit: validatedData.yieldUnit || 'un.',
                    purchaseUnit: validatedData.yieldUnit || 'un.',
                    purchaseQuantity: validatedData.yield || 1,
                    purchasePrice: isFinite(unitCost) ? unitCost : 0,
                    unitCost: isFinite(unitCost) ? unitCost : 0,
                    recipeUnit: validatedData.yieldUnit || 'un.',
                });
            }
        });
      }
      revalidatePath('/recipes');
      revalidatePath(`/recipes/${id}/edit`);
      revalidatePath('/inventory');
  }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: recipeRef.path,
            operation: 'update',
            requestResourceData: validatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error updating recipe:', error);
  });
  
  return {success: true};
}


export async function deleteRecipe(recipeId: string) {
    const recipeRef = doc(db, 'recipes', recipeId);
    getDoc(recipeRef).then(recipeSnap => {
        if (recipeSnap.exists()) {
            const recipeData = recipeSnap.data() as Recipe;
            if (recipeData.isSubRecipe) {
                const inventoryRef = doc(db, 'inventory', recipeData.internalCode);
                deleteDoc(inventoryRef);
            }
        }
        deleteDoc(recipeRef).then(() => {
            revalidatePath('/recipes');
            revalidatePath('/inventory');
        });
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: recipeRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error deleting recipe:', error);
    });
    return {success: true};
}


// Menu Actions
export async function addMenu(menuData: z.infer<typeof menuSchema>) {
    const validatedData = menuSchema.parse(menuData);
    addDoc(collection(db, 'menus'), validatedData).then(() => {
        revalidatePath('/menus');
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: 'menus',
            operation: 'create',
            requestResourceData: validatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error adding menu:', error);
    });
    return { success: true };
}

export async function editMenu(id: string, menuData: z.infer<typeof menuSchema>) {
    const validatedData = menuSchema.parse(menuData);
    const menuRef = doc(db, 'menus', id);
    updateDoc(menuRef, validatedData).then(() => {
        revalidatePath('/menus');
        revalidatePath(`/menus/${id}/edit`);
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: menuRef.path,
            operation: 'update',
            requestResourceData: validatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error updating menu:', error);
    });
    return { success: true };
}

export async function deleteMenu(menuId: string) {
    const menuRef = doc(db, 'menus', menuId);
    deleteDoc(menuRef).then(() => {
        revalidatePath('/menus');
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: menuRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error deleting menu:', error);
    });
    return { success: true };
}


// Sales Actions
export async function logSale(saleData: z.infer<typeof saleSchema>) {
  const validatedData = saleSchema.parse(saleData);
  if (!validatedData.outletId) {
    throw new Error('An outlet must be specified to log a sale.');
  }

  runTransaction(db, async (transaction) => {
    const recipeRef = doc(db, 'recipes', validatedData.recipeId);
    const recipeSnap = await transaction.get(recipeRef);

    if (!recipeSnap.exists()) {
      throw new Error(`Recipe with ID ${validatedData.recipeId} not found!`);
    }
    const recipe = recipeSnap.data() as Recipe;

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      console.warn(`Recipe "${recipe.name}" has no ingredients. No stock will be depleted.`);
      const saleRef = doc(collection(db, 'sales'));
      transaction.set(saleRef, { ...validatedData, saleDate: serverTimestamp() });
      return;
    }
    
    const ingredientsDataPromises = recipe.ingredients.map(async (recipeIngredient) => {
      const invItemRef = doc(db, 'inventory', recipeIngredient.itemId);
      
      const stockQuery = query(
        collection(db, 'inventoryStock'),
        where('inventoryId', '==', recipeIngredient.itemId),
        where('outletId', '==', validatedData.outletId)
      );
      const stockSnaps = await getDocs(stockQuery);
      if (stockSnaps.empty) {
        console.warn(`Stock record for ingredient ${recipeIngredient.name} (ID: ${recipeIngredient.itemId}) not found at outlet ${validatedData.outletId}. Cannot deplete stock.`);
        return null;
      }
      const stockDocRef = stockSnaps.docs[0].ref;

      const invItemSnap = await transaction.get(invItemRef);
      const stockDocSnap = await transaction.get(stockDocRef);
      
      return {
        recipeIngredient,
        invItemRef,
        stockDocRef,
        invItemSnap,
        stockDocSnap
      };
    });
    
    const ingredientsData = (await Promise.all(ingredientsDataPromises)).filter(Boolean);
    
    const saleRef = doc(collection(db, 'sales'));
    transaction.set(saleRef, {
      ...validatedData,
      saleDate: serverTimestamp(),
    });

    for (const data of ingredientsData) {
      if (!data || !data.invItemSnap.exists() || !data.stockDocSnap.exists()) {
        console.warn(`Missing data for an ingredient, skipping depletion.`);
        continue;
      }

      const invItem = data.invItemSnap.data() as InventoryItem;
      const stockData = data.stockDocSnap.data() as InventoryStockItem;

      const quantityInRecipeUnit = data.recipeIngredient.quantity * validatedData.quantity;
      const neededInBaseUnit = convert(quantityInRecipeUnit, data.recipeIngredient.unit as Unit, invItem.recipeUnit as Unit);
      
      let quantityToDeplete: number;
      if (invItem.unit === 'un.') {
          const baseUnitsPerInventoryUnit = invItem.recipeUnitConversion || 1;
          if (baseUnitsPerInventoryUnit === 0) throw new Error(`Item ${invItem.name} has a conversion factor of 0.`);
          quantityToDeplete = neededInBaseUnit / baseUnitsPerInventoryUnit;
      } else {
          quantityToDeplete = convert(neededInBaseUnit, invItem.recipeUnit as Unit, invItem.unit as Unit);
      }

      const newQuantity = (stockData.quantity ?? 0) - quantityToDeplete;
      const newStatus = getStatus(newQuantity, invItem.minStock);
      
      transaction.update(data.stockDocRef, { 
          quantity: newQuantity,
          status: newStatus
      });
    }
  }).then(() => {
    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/');
  }).catch(error => {
      const permissionError = new FirestorePermissionError({
          path: `sales`,
          operation: 'write',
          requestResourceData: validatedData,
      });
      errorEmitter.emit('permission-error', permissionError);
      console.error('Error logging sale:', error);
  });

  return { success: true };
}

// Production Actions
export async function logProduction(data: z.infer<typeof productionLogSchema>, outletId: string) {
  const validatedData = productionLogSchema.parse(data);
  if (!outletId) {
    throw new Error("Outlet ID must be provided to log production.");
  }
  
  runTransaction(db, async (transaction) => {
    const subRecipeRefs = validatedData.items.map((item) => doc(db, 'recipes', item.recipeId));
    const subRecipeSnaps = await Promise.all(subRecipeRefs.map((ref) => transaction.get(ref)));
    
    const inventoryRefsToFetch = new Map<string, DocumentReference>();
    
    for(const subRecipeSnap of subRecipeSnaps) {
      if (!subRecipeSnap.exists()) throw new Error(`Sub-recipe with ID ${subRecipeSnap.id} not found.`);
      const subRecipe = subRecipeSnap.data() as Recipe;

      const subRecipeInvQuery = query(collection(db, 'inventory'), where('materialCode', '==', subRecipe.internalCode));
      const subRecipeInvDocs = await getDocs(subRecipeInvQuery);
      if (subRecipeInvDocs.empty) throw new Error(`Inventory item for sub-recipe ${subRecipe.name} not found.`);
      const subRecipeInvRef = subRecipeInvDocs.docs[0].ref;
      inventoryRefsToFetch.set(subRecipeInvRef.id, subRecipeInvRef);

      for (const ingredient of subRecipe.ingredients) {
        const invItemId = ingredient.itemId;
        inventoryRefsToFetch.set(invItemId, doc(db, 'inventory', invItemId));
      }
    }

    const invSnaps = await Promise.all(Array.from(inventoryRefsToFetch.values()).map(ref => transaction.get(ref)));
    const invSnapMap = new Map(invSnaps.map(snap => [snap.id, snap]));

    const stockRefsAndSnaps = await Promise.all(
      Array.from(inventoryRefsToFetch.keys()).map(async (invId) => {
        const stockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', invId), where('outletId', '==', outletId));
        const stockDocs = await getDocs(stockQuery);
        if (stockDocs.empty) {
          return { inventoryId: invId, ref: doc(collection(db, 'inventoryStock')), snap: null };
        }
        const stockRef = stockDocs.docs[0].ref;
        const stockSnap = await transaction.get(stockRef);
        return { inventoryId: invId, ref: stockRef, snap: stockSnap };
      })
    );
    const stockDocMap = new Map(stockRefsAndSnaps.map(item => [item.inventoryId, { ref: item.ref, snap: item.snap }]));

    for (let i = 0; i < validatedData.items.length; i++) {
      const itemToProduce = validatedData.items[i];
      const subRecipe = subRecipeSnaps[i].data() as Recipe;
      
      for (const ingredient of subRecipe.ingredients) {
        const invItemSnap = invSnapMap.get(ingredient.itemId);
        if (!invItemSnap || !invItemSnap.exists()) throw new Error(`Ingredient ${ingredient.name} not found.`);
        const invItem = invItemSnap.data() as InventoryItem;

        const stockDocData = stockDocMap.get(ingredient.itemId);
        if (!stockDocData || !stockDocData.snap || !stockDocData.snap.exists()) throw new Error(`Stock for ingredient ${ingredient.name} not found at this outlet.`);
        const stockData = stockDocData.snap.data() as InventoryStockItem;

        const totalIngredientNeededInRecipeUnit = ingredient.quantity * itemToProduce.quantityProduced;
        const neededInBaseUnit = convert(totalIngredientNeededInRecipeUnit, ingredient.unit as Unit, invItem.recipeUnit as Unit);
        let quantityToDeplete: number;
        if (invItem.unit === 'un.') {
            const baseUnitsPerInventoryUnit = invItem.recipeUnitConversion || 1;
            if (baseUnitsPerInventoryUnit === 0) throw new Error(`Item ${invItem.name} has a conversion factor of 0.`);
            quantityToDeplete = neededInBaseUnit / baseUnitsPerInventoryUnit;
        } else {
            quantityToDeplete = convert(neededInBaseUnit, invItem.recipeUnit as Unit, invItem.unit as Unit);
        }

        const newQuantity = (stockData.quantity ?? 0) - quantityToDeplete;
        transaction.update(stockDocData.ref, {
          quantity: newQuantity,
          status: getStatus(newQuantity, invItem.minStock),
        });
      }

      const subRecipeInvSnap = Array.from(invSnapMap.values()).find(snap => snap?.data()?.materialCode === subRecipe.internalCode);
      if (!subRecipeInvSnap || !subRecipeInvSnap.exists()) throw new Error(`Inventory item for sub-recipe ${subRecipe.name} not found.`);
      const producedInvItem = subRecipeInvSnap.data() as InventoryItem;

      const totalYieldQuantity = itemToProduce.quantityProduced * (subRecipe.yield || 1);
      
      const producedStockDocData = stockDocMap.get(subRecipeInvSnap.id);
      if(producedStockDocData) {
          const currentQuantity = producedStockDocData.snap?.data()?.quantity ?? 0;
          const newQuantity = currentQuantity + totalYieldQuantity;
          
          if (producedStockDocData.snap) {
              transaction.update(producedStockDocData.ref, {
                  quantity: newQuantity,
                  status: getStatus(newQuantity, producedInvItem.minStock),
              });
          } else {
              transaction.set(producedStockDocData.ref, {
                  inventoryId: subRecipeInvSnap.id,
                  outletId: outletId,
                  quantity: newQuantity,
                  status: getStatus(newQuantity, producedInvItem.minStock),
              });
          }
      }
    }
    
    const productionLogRef = doc(collection(db, 'productionLogs'));
    transaction.set(productionLogRef, {
      logDate: serverTimestamp(),
      user: 'Chef John Doe',
      outletId: outletId,
      producedItems: validatedData.items.map(item => {
          const subRecipe = subRecipeSnaps.find(snap => snap.id === item.recipeId)?.data() as Recipe;
          return {
              recipeId: item.recipeId,
              recipeName: item.name,
              quantityProduced: item.quantityProduced,
              yieldPerBatch: subRecipe.yield || 1,
              yieldUnit: subRecipe.yieldUnit || 'batch',
          }
      }),
    });
  }).then(() => {
    revalidatePath('/inventory');
    revalidatePath('/recipes');
    revalidatePath('/');
  }).catch(error => {
      const permissionError = new FirestorePermissionError({
          path: `productionLogs`,
          operation: 'write',
          requestResourceData: validatedData,
      });
      errorEmitter.emit('permission-error', permissionError);
      console.error('Error in logProduction transaction:', error);
  });
  return { success: true };
}


export async function undoProductionLog(logId: string) {
  runTransaction(db, async (transaction) => {
    const logRef = doc(db, 'productionLogs', logId);
    const logSnap = await transaction.get(logRef);

    if (!logSnap.exists()) throw new Error("Production log not found.");
    const logData = logSnap.data() as ProductionLog;
    const outletId = logData.outletId;
    if (!outletId) throw new Error("Log is missing an outlet ID, cannot reverse.");
    
    const recipeRefs = new Map<string, DocumentReference>();
    logData.producedItems.forEach(item => {
      recipeRefs.set(item.recipeId, doc(db, 'recipes', item.recipeId));
    });
    
    const recipeSnaps = await Promise.all(Array.from(recipeRefs.values()).map(ref => transaction.get(ref)));
    const recipeSnapMap = new Map(recipeSnaps.map(snap => [snap.id, snap]));

    const invItemRefsToFetch = new Map<string, DocumentReference>();
    for (const recipeSnap of recipeSnaps) {
      if (recipeSnap.exists()) {
        const recipe = recipeSnap.data() as Recipe;
        if(!recipe.internalCode) throw new Error(`Recipe "${recipe.name}" has an invalid internal code.`);
        
        const subRecipeInvQuery = query(collection(db, 'inventory'), where('materialCode', '==', recipe.internalCode));
        const subRecipeInvDocs = await getDocs(subRecipeInvQuery);
        if (subRecipeInvDocs.empty) throw new Error(`Inventory item for ${recipe.name} not found.`);
        invItemRefsToFetch.set(subRecipeInvDocs.docs[0].id, subRecipeInvDocs.docs[0].ref);

        recipe.ingredients.forEach(ing => {
          const invItemId = ing.itemId;
           if(!invItemId) throw new Error(`An ingredient in recipe "${recipe.name}" has an invalid code.`);
          invItemRefsToFetch.set(invItemId, doc(db, 'inventory', invItemId));
        });
      }
    }

    const invSnaps = await Promise.all(Array.from(invItemRefsToFetch.values()).map(ref => transaction.get(ref)));
    const invSnapMap = new Map(invSnaps.map(snap => [snap.id, snap]));

    const stockRefsToFetch: DocumentReference[] = [];
    for(const invId of invItemRefsToFetch.keys()){
      const stockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', invId), where('outletId', '==', outletId));
      const stockDocs = await getDocs(stockQuery);
      if(!stockDocs.empty) stockRefsToFetch.push(stockDocs.docs[0].ref);
    }
    const stockSnaps = await Promise.all(stockRefsToFetch.map(ref => transaction.get(ref)));
    const stockSnapMap = new Map(stockSnaps.map(snap => [snap.data()?.inventoryId, snap]));

    for (const producedItem of logData.producedItems) {
      const recipeSnap = recipeSnapMap.get(producedItem.recipeId);
      if (!recipeSnap || !recipeSnap.exists()) throw new Error(`Original recipe for "${producedItem.recipeName}" not found.`);
      const recipe = recipeSnap.data() as Recipe;

      const batchesProduced = producedItem.quantityProduced;
      for (const ingredient of recipe.ingredients) {
        const invItemSnap = invSnapMap.get(ingredient.itemId);
        if (!invItemSnap || !invItemSnap.exists()) {
           console.warn(`Ingredient ${ingredient.name} not found in inventory during undo. Skipping.`);
           continue;
        }
        const invItem = invItemSnap.data() as InventoryItem;

        const stockSnap = stockSnapMap.get(ingredient.itemId);
        if(!stockSnap || !stockSnap.exists()) {
          console.warn(`Stock for ${ingredient.name} at outlet ${outletId} not found. Cannot restore.`);
          continue;
        }
        const stockData = stockSnap.data() as InventoryStockItem;

        const totalIngredientUsed = ingredient.quantity * batchesProduced;
        const usedInBaseUnit = convert(totalIngredientUsed, ingredient.unit as Unit, invItem.recipeUnit as Unit);
        let quantityToRestore: number;
        if (invItem.unit === 'un.') {
            const baseUnitsPerInventoryUnit = invItem.recipeUnitConversion || 1;
            if (baseUnitsPerInventoryUnit === 0) throw new Error(`Item ${invItem.name} has a conversion factor of 0.`);
            quantityToRestore = usedInBaseUnit / baseUnitsPerInventoryUnit;
        } else {
            quantityToRestore = convert(usedInBaseUnit, invItem.recipeUnit as Unit, invItem.unit as Unit);
        }

        const newQuantity = (stockData.quantity ?? 0) + quantityToRestore;
        transaction.update(stockSnap.ref, {
          quantity: newQuantity,
          status: getStatus(newQuantity, invItem.minStock),
        });
      }
      
      const producedInvItemSnap = Array.from(invSnapMap.values()).find(snap => snap?.data()?.materialCode === recipe.internalCode);
      if (producedInvItemSnap && producedInvItemSnap.exists()) {
          const stockSnap = stockSnapMap.get(producedInvItemSnap.id);
          if (stockSnap && stockSnap.exists()) {
              const producedInvItem = producedInvItemSnap.data() as InventoryItem;
              const stockData = stockSnap.data() as InventoryStockItem;
              const totalYieldQuantity = producedItem.quantityProduced * (recipe.yield || 1);
              const newQuantity = (stockData.quantity ?? 0) - totalYieldQuantity;
              transaction.update(stockSnap.ref, {
                  quantity: newQuantity,
                  status: getStatus(newQuantity, producedInvItem.minStock),
              });
          }
      }
    }
    transaction.delete(logRef);
  }).then(() => {
    revalidatePath('/recipes');
    revalidatePath('/inventory');
  }).catch(error => {
      const permissionError = new FirestorePermissionError({
          path: `productionLogs/${logId}`,
          operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
      console.error('Error undoing production log:', error);
  });
  return { success: true };
}

export async function logButchering(data: z.infer<typeof butcheringLogSchema>, outletId: string) {
  const validatedData = butcheringLogSchema.parse(data);
  if (!outletId) {
    throw new Error("An outlet ID must be provided to log butchering.");
  }
  runTransaction(db, async (transaction) => {
      const primaryItemSpecRef = doc(db, 'inventory', validatedData.primaryItemId);
      const primaryItemSpecSnap = await transaction.get(primaryItemSpecRef);
      if (!primaryItemSpecSnap.exists()) throw new Error('Primary butchering item not found in inventory.');
      const primaryItemSpec = primaryItemSpecSnap.data() as InventoryItem;

      const primaryStockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', validatedData.primaryItemId), where('outletId', '==', outletId));
      const primaryStockDocs = await getDocs(primaryStockQuery);
      if (primaryStockDocs.empty) throw new Error(`Stock for ${primaryItemSpec.name} not found at this outlet.`);
      const primaryStockRef = primaryStockDocs.docs[0].ref;
      const primaryStockSnap = await transaction.get(primaryStockRef);
      const primaryStock = primaryStockSnap.data() as InventoryStockItem;

      const producedItems = validatedData.yieldedItems.filter(item => item.weight > 0);
      if (producedItems.length === 0) throw new Error("No yielded items with a weight greater than 0 were provided.");

      const yieldedItemReads = await Promise.all(producedItems.map(async (item) => {
        const specRef = doc(db, 'inventory', item.itemId);
        const stockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', item.itemId), where('outletId', '==', outletId));
        const stockDocs = await getDocs(stockQuery);
        const stockRef = stockDocs.empty ? doc(collection(db, 'inventoryStock')) : stockDocs.docs[0].ref;
        const stockSnap = stockDocs.empty ? null : await transaction.get(stockRef);
        return { itemData: item, specRef: specRef, specSnap: await transaction.get(specRef), stockSnap, stockRef };
      }));

      const quantityUsedInPurchaseUnit = convert(validatedData.quantityUsed, validatedData.quantityUnit as Unit, primaryItemSpec.purchaseUnit as Unit);
      if (quantityUsedInPurchaseUnit > (primaryStock.quantity ?? 0)) {
          throw new Error(`Not enough stock for ${primaryItemSpec.name}. Available: ${(primaryStock.quantity ?? 0).toFixed(2)} ${primaryItemSpec.purchaseUnit}, Required: ${quantityUsedInPurchaseUnit.toFixed(2)} ${primaryItemSpec.purchaseUnit}`);
      }
      const costOfButcheredPortion = (primaryItemSpec.purchasePrice / (primaryItemSpec.purchaseQuantity || 1)) * quantityUsedInPurchaseUnit;
      
      const newPrimaryQuantity = (primaryStock.quantity ?? 0) - quantityUsedInPurchaseUnit;
      transaction.update(primaryStockRef, {
          quantity: newPrimaryQuantity,
          status: getStatus(newPrimaryQuantity, primaryItemSpec.minStock),
      });

      const yieldedItemsForLog: ButcheringLog['yieldedItems'] = [];

      for (const readData of yieldedItemReads) {
          if (!readData.specSnap.exists()) throw new Error(`Yielded item "${readData.itemData.name}" could not be found.`);
          const yieldedItemSpec = readData.specSnap.data() as InventoryItem;
          
          const costOfThisYield = costOfButcheredPortion * ((readData.itemData.finalCostDistribution || 0) / 100);
          const quantityToAddInPurchaseUnit = readData.itemData.weight;
          
          const newPurchasePrice = quantityToAddInPurchaseUnit > 0 ? costOfThisYield / quantityToAddInPurchaseUnit : 0;

          let currentStockValue = 0;
          let currentStockQty = 0;
          if (readData.stockSnap && readData.stockSnap.exists()) {
              const yieldedStock = readData.stockSnap.data() as InventoryStockItem;
              currentStockQty = yieldedStock.quantity ?? 0;
              currentStockValue = currentStockQty * (yieldedItemSpec.purchasePrice / (yieldedItemSpec.purchaseQuantity || 1));
          }

          const totalValue = currentStockValue + costOfThisYield;
          const totalQuantity = currentStockQty + quantityToAddInPurchaseUnit;
          const newWeightedAveragePrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
          const newUnitCost = newWeightedAveragePrice;
          
          transaction.update(readData.specRef, {
            purchasePrice: isFinite(newWeightedAveragePrice) ? newWeightedAveragePrice : 0,
            purchaseQuantity: 1,
            unitCost: isFinite(newUnitCost) ? newUnitCost : 0,
          });

          if (readData.stockSnap && readData.stockSnap.exists() && readData.stockRef) {
              transaction.update(readData.stockRef, {
                  quantity: totalQuantity,
                  status: getStatus(totalQuantity, yieldedItemSpec.minStock),
              });
          } else if (readData.stockRef) {
              transaction.set(readData.stockRef, {
                inventoryId: readData.itemData.itemId,
                outletId,
                quantity: quantityToAddInPurchaseUnit,
                status: getStatus(quantityToAddInPurchaseUnit, yieldedItemSpec.minStock),
              });
          }

          yieldedItemsForLog.push({
              itemId: readData.specSnap.id,
              itemName: yieldedItemSpec.name,
              quantityYielded: quantityToAddInPurchaseUnit,
              unit: yieldedItemSpec.purchaseUnit as Unit,
          });
      }

      const logRef = doc(collection(db, 'butcheringLogs'));
      transaction.set(logRef, {
          logDate: serverTimestamp(),
          user: 'Chef John Doe',
          outletId,
          primaryItem: {
              itemId: primaryItemSpecSnap.id,
              itemName: primaryItemSpec.name,
              quantityUsed: quantityUsedInPurchaseUnit,
              unit: primaryItemSpec.purchaseUnit as Unit,
          },
          yieldedItems: yieldedItemsForLog,
      });
  }).then(() => {
    revalidatePath('/inventory');
    revalidatePath('/recipes');
    revalidatePath('/');
  }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: `butcheringLogs`,
            operation: 'write',
            requestResourceData: validatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error in logButchering transaction:', error);
  });
  return { success: true };
}

export async function undoButcheringLog(logId: string) {
    runTransaction(db, async (transaction) => {
        const logRef = doc(db, 'butcheringLogs', logId);
        const logSnap = await transaction.get(logRef);

        if (!logSnap.exists()) throw new Error("Butchering log not found.");
        
        const logData = logSnap.data() as ButcheringLog;
        const outletId = logData.outletId;
        if(!outletId) throw new Error("Log missing outlet ID, cannot revert.");

        const primarySpecRef = doc(db, 'inventory', logData.primaryItem.itemId);
        const primaryStockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', logData.primaryItem.itemId), where('outletId', '==', outletId));
        const primaryStockDocs = await getDocs(primaryStockQuery);
        if (primaryStockDocs.empty) throw new Error("Primary item stock not found at outlet.");
        const primaryStockRef = primaryStockDocs.docs[0].ref;
        const primarySpecSnap = await transaction.get(primarySpecRef);
        const primaryStockSnap = await transaction.get(primaryStockRef);

        const yieldedReads = await Promise.all(logData.yieldedItems.map(async (item) => {
          const specRef = doc(db, 'inventory', item.itemId);
          const stockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', item.itemId), where('outletId', '==', outletId));
          const stockDocs = await getDocs(stockQuery);
          if(stockDocs.empty) return null;
          const stockRef = stockDocs.docs[0].ref;
          return {
            logItem: item,
            specSnap: await transaction.get(specRef),
            stockSnap: await transaction.get(stockRef),
          }
        }));

        if (primarySpecSnap.exists() && primaryStockSnap.exists()) {
            const primarySpec = primarySpecSnap.data() as InventoryItem;
            const primaryStock = primaryStockSnap.data() as InventoryStockItem;
            const newQuantity = (primaryStock.quantity ?? 0) + logData.primaryItem.quantityUsed;
            transaction.update(primaryStockRef, {
                quantity: newQuantity,
                status: getStatus(newQuantity, primarySpec.minStock),
            });
        } else {
             console.warn(`Primary item with ID ${logData.primaryItem.itemId} not found during undo. Stock cannot be restored.`);
        }

        for(const yieldedData of yieldedReads) {
          if(!yieldedData || !yieldedData.specSnap.exists() || !yieldedData.stockSnap.exists()) {
            console.warn(`A yielded item was not found during undo. Skipping.`);
            continue;
          }
          const yieldedSpec = yieldedData.specSnap.data() as InventoryItem;
          const yieldedStock = yieldedData.stockSnap.data() as InventoryStockItem;
          const newQuantity = (yieldedStock.quantity ?? 0) - yieldedData.logItem.quantityYielded;
          transaction.update(yieldedData.stockSnap.ref, {
              quantity: newQuantity,
              status: getStatus(newQuantity, yieldedSpec.minStock),
          });
        }
        transaction.delete(logRef);
    }).then(() => {
        revalidatePath('/recipes');
        revalidatePath('/inventory');
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: `butcheringLogs/${logId}`,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error undoing butchering log:', error);
    });
    return { success: true };
}


export async function addButcheryTemplate(templateData: Omit<ButcheryTemplate, 'id'>) {
    const q = query(collection(db, 'butcheryTemplates'), where('primaryItemMaterialCode', '==', templateData.primaryItemMaterialCode));
    getDocs(q).then(existing => {
        if (!existing.empty) {
            throw new Error(`A template for this primary item already exists.`);
        }
        addDoc(collection(db, 'butcheryTemplates'), templateData).then(() => {
            revalidatePath('/settings/butchering-templates');
            revalidatePath('/recipes');
        }).catch(error => {
            const permissionError = new FirestorePermissionError({
                path: 'butcheryTemplates',
                operation: 'create',
                requestResourceData: templateData
            });
            errorEmitter.emit('permission-error', permissionError);
            console.error('Error adding butchery template:', error);
        });
    });
    return { success: true };
}


export async function updateButcheryTemplate(id: string, templateData: Partial<ButcheryTemplate>) {
  const templateRef = doc(db, 'butcheryTemplates', id);
  updateDoc(templateRef, templateData).then(() => {
    revalidatePath('/settings/butchering-templates');
    revalidatePath('/recipes');
  }).catch(error => {
    const permissionError = new FirestorePermissionError({
        path: templateRef.path,
        operation: 'update',
        requestResourceData: templateData
    });
    errorEmitter.emit('permission-error', permissionError);
    console.error('Error updating butchery template:', error);
  });
  return { success: true };
}

export async function deleteButcheryTemplate(id: string) {
    const templateRef = doc(db, 'butcheryTemplates', id);
    deleteDoc(templateRef).then(() => {
        revalidatePath('/settings/butchering-templates');
        revalidatePath('/recipes');
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: templateRef.path,
            operation: 'delete'
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error deleting butchery template:', error);
    });
    return { success: true };
}


// Purchase Order Actions
export async function addPurchaseOrder(poData: z.infer<typeof purchaseOrderSchema>, outletId: string) {
    const validatedData = purchaseOrderSchema.parse(poData);
    if (!outletId) {
      throw new Error("An outlet must be specified to create a purchase order.");
    }

    const itemsToOrder = validatedData.items.filter(item => item.orderQuantity > 0);
    if (itemsToOrder.length === 0) {
        throw new Error("Cannot create a purchase order with no items. Please add a quantity to at least one item.");
    }
    
    runTransaction(db, async (transaction) => {
        const poNumber = `PO-${Date.now()}`;
        const poRef = doc(collection(db, 'purchaseOrders'));
        transaction.set(poRef, {
            ...validatedData,
            items: itemsToOrder,
            outletId,
            poNumber,
            user: 'Chef John Doe',
            createdAt: serverTimestamp(),
        });
    }).then(() => {
        revalidatePath('/purchasing');
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: 'purchaseOrders',
            operation: 'create',
            requestResourceData: validatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error adding purchase order:', error);
    });
    return { success: true };
}


export async function cancelPurchaseOrder(poId: string) {
    const poRef = doc(db, 'purchaseOrders', poId);
    updateDoc(poRef, {
        status: 'Cancelled',
    }).then(() => {
        revalidatePath('/purchasing');
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: poRef.path,
            operation: 'update',
            requestResourceData: { status: 'Cancelled' },
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error cancelling purchase order:', error);
    });
    return { success: true };
}

export async function receivePurchaseOrder(data: z.infer<typeof receivePoSchema>) {
  const validatedData = receivePoSchema.parse(data);
  runTransaction(db, async (transaction) => {
    const poRef = doc(db, 'purchaseOrders', validatedData.poId);
    const poSnap = await transaction.get(poRef);
    if (!poSnap.exists()) throw new Error("Purchase Order not found.");
    const po = poSnap.data() as PurchaseOrder;
    const outletId = po.outletId;
    if (!outletId) throw new Error("PO is not associated with an outlet.");

    const receivedItems = validatedData.items.filter((item) => item.received > 0);

    const itemReads = await Promise.all(receivedItems.map(async (item) => {
      const specRef = doc(db, 'inventory', item.itemId);
      const stockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', item.itemId), where('outletId', '==', outletId));
      const stockDocs = await getDocs(stockQuery);
      
      const stockRef = stockDocs.empty ? doc(collection(db, 'inventoryStock')) : stockDocs.docs[0].ref;
      const stockSnap = stockDocs.empty ? null : await transaction.get(stockRef);

      return {
        receivedItem: item,
        specSnap: await transaction.get(specRef),
        stockSnap,
        stockRef
      };
    }));
    
    const validItemReads = itemReads.filter(Boolean) as NonNullable<typeof itemReads[0]>[];

    for (const { receivedItem, specSnap, stockSnap, stockRef } of validItemReads) {
      if (!specSnap.exists()) {
        console.warn(`Inventory spec for "${receivedItem.name}" not found. Cannot update stock.`);
        continue;
      }

      const invItemSpec = specSnap.data() as InventoryItem;
      
      let currentQuantity = 0;
      if(stockSnap && stockSnap.exists()){
          const invItemStock = stockSnap.data() as InventoryStockItem;
          currentQuantity = invItemStock.quantity ?? 0;
      }
      
      const newQuantity = currentQuantity + receivedItem.received;
      const newStatus = getStatus(newQuantity, invItemSpec.minStock);

      if(stockSnap && stockSnap.exists()) {
           transaction.update(stockRef, {
              quantity: newQuantity,
              status: newStatus,
          });
      } else {
          transaction.set(stockRef, {
              inventoryId: receivedItem.itemId,
              outletId: outletId,
              quantity: newQuantity,
              status: newStatus
          });
      }

      const hasNewPrice = receivedItem.purchasePrice !== invItemSpec.purchasePrice;
      if (hasNewPrice) {
        transaction.update(specSnap.ref, { purchasePrice: receivedItem.purchasePrice });
      }
    }

    const isPartiallyReceived = validatedData.items.some(item => item.received < item.ordered);
    const isFullyReceived = validatedData.items.every(item => item.received >= item.ordered);
    
    let newStatus: PurchaseOrder['status'] = po.status;
    if (isFullyReceived) {
      newStatus = 'Received';
    } else if (isPartiallyReceived || po.status === 'Partially Received') {
      newStatus = 'Partially Received';
    }

    const documentUrl = validatedData.document ? `documents/${validatedData.poId}/${validatedData.document.name}` : '';

    transaction.update(poRef, {
      status: newStatus,
      receivedAt: serverTimestamp(),
      notes: validatedData.notes || '',
      receivedDocumentUrl: documentUrl
    });
  }).then(() => {
    revalidatePath('/purchasing');
    revalidatePath('/inventory');
    revalidatePath('/');
  }).catch(error => {
      const permissionError = new FirestorePermissionError({
          path: `purchaseOrders/${validatedData.poId}`,
          operation: 'write',
          requestResourceData: validatedData,
      });
      errorEmitter.emit('permission-error', permissionError);
      console.error('Error receiving purchase order:', error);
  });
}

// Outlet Actions
export async function addOutlet(data: z.infer<typeof outletSchema>) {
  const validatedData = outletSchema.parse(data);
  runTransaction(db, async (transaction) => {
    const outletRef = doc(collection(db, 'outlets'));
    transaction.set(outletRef, validatedData);
    
    const inventoryQuery = query(collection(db, 'inventory'));
    const inventorySnapshot = await getDocs(inventoryQuery);

    inventorySnapshot.forEach(itemDoc => {
      const itemSpec = itemDoc.data() as InventoryItem;
      const stockRef = doc(collection(db, 'inventoryStock'));
      transaction.set(stockRef, {
        inventoryId: itemDoc.id,
        outletId: outletRef.id,
        quantity: 0,
        status: getStatus(0, itemSpec.minStock),
      });
    });
  }).then(() => {
      revalidatePath('/settings/outlets');
  }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: 'outlets',
            operation: 'create',
            requestResourceData: validatedData,
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error('Error adding outlet:', error);
  });
  return { success: true };
}

export async function editOutlet(id: string, data: Partial<Outlet>) {
  const validatedData = outletSchema.partial().parse(data);
  const outletRef = doc(db, 'outlets', id);
  updateDoc(outletRef, validatedData).then(() => {
    revalidatePath('/settings/outlets');
  }).catch(error => {
    const permissionError = new FirestorePermissionError({
        path: outletRef.path,
        operation: 'update',
        requestResourceData: validatedData,
    });
    errorEmitter.emit('permission-error', permissionError);
    console.error('Error editing outlet:', error);
  });
  return { success: true };
}

export async function deleteOutlet(id: string) {
  runTransaction(db, async (transaction) => {
    const outletRef = doc(db, 'outlets', id);
    transaction.delete(outletRef);

    const stockQuery = query(collection(db, 'inventoryStock'), where('outletId', '==', id));
    const stockSnapshot = await getDocs(stockQuery);
    stockSnapshot.forEach(stockDoc => {
      transaction.delete(stockDoc.ref);
    });
  }).then(() => {
      revalidatePath('/settings/outlets');
  }).catch(error => {
      const permissionError = new FirestorePermissionError({
          path: `outlets/${id}`,
          operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
      console.error('Error deleting outlet:', error);
  });
  return { success: true };
}

export async function transferInventory(data: z.infer<typeof transferInventorySchema>) {
  const validatedData = transferInventorySchema.parse(data);
  runTransaction(db, async (transaction) => {
    const itemRef = doc(db, 'inventory', validatedData.itemId);
    const itemSnap = await transaction.get(itemRef);
    if (!itemSnap.exists()) throw new Error('Inventory item not found.');
    const itemData = itemSnap.data() as InventoryItem;

    const fromOutletRef = doc(db, 'outlets', validatedData.fromOutletId);
    const toOutletRef = doc(db, 'outlets', validatedData.toOutletId);
    const fromOutletSnap = await transaction.get(fromOutletRef);
    const toOutletSnap = await transaction.get(toOutletRef);
    if (!fromOutletSnap.exists() || !toOutletSnap.exists()) throw new Error('One or both outlets not found.');

    const fromStockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', validatedData.itemId), where('outletId', '==', validatedData.fromOutletId));
    const fromStockDocs = await getDocs(fromStockQuery);
    if (fromStockDocs.empty) throw new Error(`Stock for ${itemData.name} not found at source outlet.`);
    const fromStockRef = fromStockDocs.docs[0].ref;
    const fromStockSnap = await transaction.get(fromStockRef);
    const fromStock = fromStockSnap.data() as InventoryStockItem;

    if ((fromStock.quantity ?? 0) < validatedData.quantity) {
      throw new Error(`Not enough stock to transfer. Available: ${fromStock.quantity}, Requested: ${validatedData.quantity}`);
    }
    
    const toStockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', validatedData.itemId), where('outletId', '==', validatedData.toOutletId));
    const toStockDocs = await getDocs(toStockQuery);
    if (toStockDocs.empty) throw new Error(`Stock for ${itemData.name} not found at destination outlet.`);
    const toStockRef = toStockDocs.docs[0].ref;
    const toStockSnap = await transaction.get(toStockRef);
    const toStock = toStockSnap.data() as InventoryStockItem;

    const newFromQuantity = fromStock.quantity - validatedData.quantity;
    transaction.update(fromStockRef, {
      quantity: newFromQuantity,
      status: getStatus(newFromQuantity, itemData.minStock)
    });
    
    const newToQuantity = (toStock.quantity ?? 0) + validatedData.quantity;
    transaction.update(toStockRef, {
      quantity: newToQuantity,
      status: getStatus(newToQuantity, itemData.minStock)
    });

    const transferLogRef = doc(collection(db, 'inventoryTransfers'));
    transaction.set(transferLogRef, {
      transferDate: serverTimestamp(),
      user: 'Chef John Doe',
      itemId: validatedData.itemId,
      itemName: itemData.name,
      quantity: validatedData.quantity,
      unit: itemData.unit,
      fromOutletId: validatedData.fromOutletId,
      fromOutletName: fromOutletSnap.data().name,
      toOutletId: validatedData.toOutletId,
      toOutletName: toOutletSnap.data().name,
      notes: validatedData.notes || '',
    });
  }).then(() => {
    revalidatePath('/inventory');
  }).catch(error => {
      const permissionError = new FirestorePermissionError({
          path: `inventoryStock`,
          operation: 'write',
          requestResourceData: validatedData,
      });
      errorEmitter.emit('permission-error', permissionError);
      console.error('Error in transferInventory transaction:', error);
  });
  return { success: true };
}
