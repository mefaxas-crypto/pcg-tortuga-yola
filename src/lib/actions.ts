





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
  setDoc,
} from 'firebase/firestore';
import {db} from './firebase';
import type {
  AddAllergenData,
  AddIngredientCategoryData,
  AddMenuData,
  AddOutletData,
  AddPurchaseOrderData,
  AddRecipeData,
  AddSaleData,
  ButcheringData,
  ButcheringLog,
  ButcheryTemplate,
  InventoryFormData,
  InventoryItem,
  InventoryStockItem,
  LogProductionData,
  Menu,
  Outlet,
  PhysicalCountItem,
  ProductionLog,
  PurchaseOrder,
  Recipe,
  ReceivePurchaseOrderData,
  Supplier,
} from './types';
import {revalidatePath} from 'next/cache';
import { Unit, convert, getBaseUnit } from './conversions';

// We are defining a specific type for adding a supplier
// that doesn't require the `id` field, as it will be auto-generated.
type AddSupplierData = Omit<Supplier, 'id'>;
type EditSupplierData = Omit<Supplier, 'id'>;

export async function addSupplier(supplierData: AddSupplierData) {
  try {
    const docRef = await addDoc(collection(db, 'suppliers'), supplierData);
    revalidatePath('/suppliers');
    revalidatePath('/inventory');
    const newSupplier: Supplier = { id: docRef.id, ...supplierData };
    return newSupplier;
  } catch (e) {
    console.error('Error adding document: ', e);
    throw new Error('Failed to add supplier');
  }
}

export async function editSupplier(id: string, supplierData: EditSupplierData) {
  try {
    const supplierRef = doc(db, 'suppliers', id);
    await updateDoc(supplierRef, supplierData);
    revalidatePath('/suppliers');
    revalidatePath('/inventory');
    return {success: true};
  } catch (e) {
    console.error('Error updating document: ', e);
    throw new Error('Failed to edit supplier');
  }
}

export async function deleteSupplier(supplierId: string) {
  try {
    // Before deleting the supplier, find all inventory items associated with them
    const itemsQuery = query(collection(db, 'inventory'), where('supplierId', '==', supplierId));
    const querySnapshot = await getDocs(itemsQuery);
    
    const batch = writeBatch(db);

    // Update each item to remove the supplier link
    querySnapshot.forEach(itemDoc => {
      const itemRef = doc(db, 'inventory', itemDoc.id);
      batch.update(itemRef, {
        supplierId: '',
        supplier: 'Unknown Supplier'
      });
    });
    
    // Delete the supplier document
    const supplierRef = doc(db, 'suppliers', supplierId);
    batch.delete(supplierRef);
    
    // Commit all operations
    await batch.commit();

    revalidatePath('/suppliers');
    revalidatePath('/inventory');
    return {success: true};
  } catch (e) {
    console.error('Error deleting document: ', e);
    throw new Error('Failed to delete supplier');
  }
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

export async function addInventoryItem(formData: InventoryFormData) {
  try {
    // Separate form data
    const {
      purchaseQuantity,
      purchaseUnit,
      purchasePrice,
      recipeUnit,
      recipeUnitConversion,
      minStock,
      maxStock,
      ...restOfForm
    } = formData;

    const inventoryUnit = purchaseUnit;
    const finalRecipeUnit = recipeUnit || getBaseUnit(purchaseUnit as Unit);
    let unitCost = 0;
    let finalRecipeUnitConversion = 1;

    // Calculate conversion and unit cost
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
    const supplierName = await getSupplierName(formData.supplierId);

    // This is the master inventory item data (the "spec")
    const itemSpecData = {
      ...restOfForm,
      supplier: supplierName,
      supplierId: formData.supplierId || '',
      purchaseQuantity,
      purchaseUnit,
      purchasePrice,
      minStock,
      maxStock,
      unit: inventoryUnit,
      unitCost: isFinite(unitCost) ? unitCost : 0,
      recipeUnit: finalRecipeUnit,
      recipeUnitConversion: finalRecipeUnitConversion,
    };
    
    // We use a transaction to ensure both the main item and its stock records are created atomically.
    const newDocRef = await runTransaction(db, async (transaction) => {
      // 1. Create the main inventory item document
      const docRef = doc(collection(db, 'inventory'));
      transaction.set(docRef, itemSpecData);
      
      // 2. Fetch all existing outlets
      const outletsQuery = query(collection(db, 'outlets'));
      const outletsSnapshot = await getDocs(outletsQuery); // Use getDocs, not transaction.get

      // 3. For each outlet, create a new stock record with quantity 0
      outletsSnapshot.forEach(outletDoc => {
        const stockRef = doc(collection(db, 'inventoryStock'));
        transaction.set(stockRef, {
          inventoryId: docRef.id,
          outletId: outletDoc.id,
          quantity: formData.quantity || 0,
          status: getStatus(formData.quantity || 0, itemSpecData.minStock),
        });
      });
      
      return docRef;
    });

    const newItem: InventoryItem = {
      id: newDocRef.id,
      ...(itemSpecData as Omit<InventoryItem, 'id'>),
    };

    revalidatePath('/inventory');
    revalidatePath('/recipes/**');
    return newItem;

  } catch (e) {
    console.error('Error adding document: ', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to add inventory item: ${errorMessage}`);
  }
}

async function getSupplierName(supplierId?: string): Promise<string> {
    if (!supplierId) {
        return 'In-house'; // Default for butchered items etc.
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
  formData: InventoryFormData
) {
  try {
    const itemRef = doc(db, 'inventory', id);

    const { purchaseQuantity, purchaseUnit, purchasePrice, recipeUnit, recipeUnitConversion, minStock, maxStock, ...restOfForm } = formData;
    
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

    const supplierName = await getSupplierName(formData.supplierId);

    const dataToUpdate = {
      ...restOfForm,
      supplier: supplierName,
      supplierId: formData.supplierId || '',
      purchaseQuantity,
      purchaseUnit,
      purchasePrice,
      minStock,
      maxStock,
      unit: inventoryUnit,
      unitCost: isFinite(unitCost) ? unitCost : 0,
      recipeUnit: finalRecipeUnit,
      recipeUnitConversion: finalRecipeUnitConversion,
    };
    
    // Here we only update the main spec. Stock levels are updated separately.
    await updateDoc(itemRef, dataToUpdate);

    revalidatePath('/inventory');
    revalidatePath('/recipes/**'); 
    return {success: true};
  } catch (e) {
    console.error('Error updating document: ', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to edit inventory item: ${errorMessage}`);
  }
}

export async function deleteInventoryItem(itemId: string) {
  try {
    await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, 'inventory', itemId);
        // Delete the main item spec
        transaction.delete(itemRef);

        // Find and delete all associated stock records
        const stockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', itemId));
        const stockSnaps = await getDocs(stockQuery);
        stockSnaps.forEach(stockDoc => {
            transaction.delete(stockDoc.ref);
        });
    });

    revalidatePath('/inventory');
    return {success: true};
  } catch (e) {
    console.error('Error deleting document: ', e);
    throw new Error('Failed to delete inventory item');
  }
}

export async function updatePhysicalInventory(items: PhysicalCountItem[], outletId: string) {
    if (!outletId) {
      throw new Error("Outlet ID must be provided to update physical inventory.");
    }
    try {
        await runTransaction(db, async (transaction) => {
            const varianceLogRef = doc(collection(db, 'varianceLogs'));
            const itemRefs = items.map(item => doc(db, 'inventory', item.id));

            // Perform all reads first
            const itemSnaps = await Promise.all(itemRefs.map(ref => transaction.get(ref)));
            
            const variances = [];
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
                // This read needs to be outside the transaction write phase.
                // It's safe here because we're inside runTransaction's callback.
                const stockSnaps = await getDocs(stockQuery);

                if (stockSnaps.empty) {
                    console.warn(`Stock for item ${item.name} not found at outlet ${outletId}. Skipping.`);
                    continue;
                }
                const stockDocRef = stockSnaps.docs[0].ref;

                // The physicalQuantity is already converted to the base unit in the frontend
                const newQuantity = item.physicalQuantity;
                const newStatus = getStatus(newQuantity, invItem.minStock);

                transaction.update(stockDocRef, {
                    quantity: newQuantity,
                    status: newStatus,
                });

                variances.push({
                    itemId: item.id,
                    itemName: item.name,
                    theoreticalQuantity: item.theoreticalQuantity,
                    physicalQuantity: item.physicalQuantity,
                    variance: item.physicalQuantity - item.theoreticalQuantity,
                    unit: item.unit,
                });
            }
            // Log the variances.
             transaction.set(varianceLogRef, {
                logDate: serverTimestamp(),
                outletId: outletId,
                items: variances,
                user: 'Chef John Doe' // Placeholder
            });

        });
        revalidatePath('/inventory');
        revalidatePath('/'); // For dashboard stats
    } catch (e) {
        console.error('Error updating physical inventory:', e);
        throw new Error('Failed to update physical inventory.');
    }
}


// Allergen Actions
export async function addAllergen(allergenData: AddAllergenData) {
  try {
    const docRef = await addDoc(collection(db, 'allergens'), allergenData);
    revalidatePath('/settings/allergens');
    return {success: true, id: docRef.id};
  } catch (e) {
    console.error('Error adding allergen: ', e);
    throw new Error('Failed to add allergen');
  }
}

export async function deleteAllergen(allergenId: string) {
  try {
    await deleteDoc(doc(db, 'allergens', allergenId));
    revalidatePath('/settings/allergens');
    return {success: true};
  } catch (e) {
    console.error('Error deleting allergen: ', e);
    throw new Error('Failed to delete allergen');
  }
}

// Ingredient Category Actions
export async function addIngredientCategory(categoryData: AddIngredientCategoryData) {
    try {
        const docRef = await addDoc(collection(db, 'ingredientCategories'), categoryData);
        revalidatePath('/settings/categories');
        revalidatePath('/inventory');
        return { success: true, id: docRef.id };
    } catch (e) {
        console.error('Error adding ingredient category: ', e);
        throw new Error('Failed to add ingredient category');
    }
}

export async function deleteIngredientCategory(categoryId: string) {
    try {
        await deleteDoc(doc(db, 'ingredientCategories', categoryId));
        revalidatePath('/settings/categories');
        revalidatePath('/inventory');
        return { success: true };
    } catch (e) {
        console.error('Error deleting ingredient category: ', e);
        throw new Error('Failed to delete ingredient category');
    }
}


// Recipe Actions
export async function addRecipe(recipeData: AddRecipeData) {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Create the recipe document itself
      const recipeRef = doc(collection(db, 'recipes'));
      transaction.set(recipeRef, recipeData);

      // 2. If it's a sub-recipe, create its master inventory item spec (but NO stock records)
      if (recipeData.isSubRecipe) {
        const inventoryQuery = query(collection(db, 'inventory'), where('materialCode', '==', recipeData.internalCode));
        const existingInv = await getDocs(inventoryQuery);

        if (existingInv.empty) {
          const inventoryRef = doc(collection(db, 'inventory'));
          const unitCost = recipeData.totalCost / (recipeData.yield || 1);
          
          const inventorySpec = {
            materialCode: recipeData.internalCode,
            name: recipeData.name,
            category: 'Sub-recipe',
            unit: recipeData.yieldUnit || 'un.',
            purchaseUnit: recipeData.yieldUnit || 'un.',
            purchaseQuantity: recipeData.yield || 1,
            minStock: 0,
            maxStock: 0,
            supplier: 'In-house',
            supplierId: '',
            purchasePrice: isFinite(unitCost) ? unitCost : 0,
            unitCost: isFinite(unitCost) ? unitCost : 0,
            allergens: [],
            recipeUnit: recipeData.yieldUnit || 'un.',
            recipeUnitConversion: 1,
          };
          transaction.set(inventoryRef, inventorySpec);
        }
      }
    });

    revalidatePath('/recipes');
    revalidatePath('/inventory');
    return {success: true};
  } catch (e) {
    console.error('Error adding recipe: ', e);
    throw new Error('Failed to add recipe');
  }
}

export async function editRecipe(id: string, recipeData: Omit<Recipe, 'id'>) {
  try {
    const recipeRef = doc(db, 'recipes', id);
    await updateDoc(recipeRef, recipeData);
    
    // If it's a sub-recipe, update its corresponding inventory item
    if (recipeData.isSubRecipe) {
      const inventoryRef = doc(db, 'inventory', recipeData.internalCode);
      const invSnap = await getDoc(inventoryRef);
      if (invSnap.exists()) {
        const unitCost = recipeData.totalCost / (recipeData.yield || 1);
        await updateDoc(inventoryRef, {
          name: recipeData.name,
          unit: recipeData.yieldUnit || 'un.',
          purchaseUnit: recipeData.yieldUnit || 'un.',
          purchaseQuantity: recipeData.yield || 1,
          purchasePrice: isFinite(unitCost) ? unitCost : 0,
          unitCost: isFinite(unitCost) ? unitCost : 0,
          recipeUnit: recipeData.yieldUnit || 'un.',
        });
      }
    }

    revalidatePath('/recipes');
    revalidatePath(`/recipes/${id}/edit`);
    revalidatePath('/inventory');
    return {success: true};
  } catch (e) {
    console.error('Error updating recipe: ', e);
    throw new Error('Failed to edit recipe');
  }
}


export async function deleteRecipe(recipeId: string) {
  try {
    const recipeRef = doc(db, 'recipes', recipeId);
    const recipeSnap = await getDoc(recipeRef);
    if (recipeSnap.exists()) {
      const recipeData = recipeSnap.data() as Recipe;
      if (recipeData.isSubRecipe) {
        // If it's a sub-recipe, delete its corresponding inventory item.
        const inventoryRef = doc(db, 'inventory', recipeData.internalCode);
        await deleteDoc(inventoryRef);
      }
    }
    await deleteDoc(recipeRef);
    revalidatePath('/recipes');
    revalidatePath('/inventory');
    return {success: true};
  } catch (e) {
    console.error('Error deleting recipe: ', e);
    throw new Error('Failed to delete recipe');
  }
}


// Menu Actions
export async function addMenu(menuData: AddMenuData) {
    try {
        const docRef = await addDoc(collection(db, 'menus'), menuData);
        revalidatePath('/menus');
        return { success: true, id: docRef.id };
    } catch (e) {
        console.error('Error adding menu: ', e);
        throw new Error('Failed to add menu');
    }
}

export async function editMenu(id: string, menuData: Omit<Menu, 'id'>) {
    try {
        const menuRef = doc(db, 'menus', id);
        await updateDoc(menuRef, menuData);
        revalidatePath('/menus');
        revalidatePath(`/menus/${id}/edit`);
        return { success: true };
    } catch (e) {
        console.error('Error updating menu: ', e);
        throw new Error('Failed to edit menu');
    }
}

export async function deleteMenu(menuId: string) {
    try {
        await deleteDoc(doc(db, 'menus', menuId));
        revalidatePath('/menus');
        return { success: true };
    } catch (e) {
        console.error('Error deleting menu: ', e);
        throw new Error('Failed to delete menu');
    }
}


// Sales Actions
export async function logSale(saleData: AddSaleData) {
  if (!saleData.outletId) {
    throw new Error('An outlet must be specified to log a sale.');
  }

  try {
    await runTransaction(db, async (transaction) => {
      // --- READ PHASE ---
      const recipeRef = doc(db, 'recipes', saleData.recipeId);
      const recipeSnap = await transaction.get(recipeRef);

      if (!recipeSnap.exists()) {
        throw new Error(`Recipe with ID ${saleData.recipeId} not found!`);
      }
      const recipe = recipeSnap.data() as Recipe;

      const ingredientsDataPromises = recipe.ingredients.map(async (recipeIngredient) => {
        const invItemRef = doc(db, 'inventory', recipeIngredient.itemId);
        
        const stockQuery = query(
          collection(db, 'inventoryStock'),
          where('inventoryId', '==', recipeIngredient.itemId),
          where('outletId', '==', saleData.outletId)
        );
        // Execute this query outside the transaction's `transaction.get`
        const stockSnaps = await getDocs(stockQuery);
        if (stockSnaps.empty) {
          console.warn(`Stock record for ingredient ${recipeIngredient.name} (ID: ${recipeIngredient.itemId}) not found at outlet ${saleData.outletId}. Cannot deplete stock.`);
          return null; // Skip this ingredient
        }
        const stockDocRef = stockSnaps.docs[0].ref;

        // Now read the documents within the transaction
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
      
      // --- WRITE PHASE ---
      const saleRef = doc(collection(db, 'sales'));
      transaction.set(saleRef, {
        ...saleData,
        saleDate: serverTimestamp(),
      });

      for (const data of ingredientsData) {
        if (!data || !data.invItemSnap.exists() || !data.stockDocSnap.exists()) {
          console.warn(`Missing data for an ingredient, skipping depletion.`);
          continue;
        }

        const invItem = data.invItemSnap.data() as InventoryItem;
        const stockData = data.stockDocSnap.data() as InventoryStockItem;

        const quantityInRecipeUnit = data.recipeIngredient.quantity * saleData.quantity;
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
    });

    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/'); // Revalidate dashboard for low stock items

    return { success: true };
  } catch (error) {
    console.error('Error logging sale and depleting inventory: ', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to log sale: ${errorMessage}`);
  }
}

// Production Actions
export async function logProduction(data: LogProductionData, outletId: string) {
  if (!outletId) {
    throw new Error("Outlet ID must be provided to log production.");
  }
  try {
    await runTransaction(db, async (transaction) => {
      // --- READ PHASE ---
      const subRecipeRefs = data.items.map((item) => doc(db, 'recipes', item.recipeId));
      const subRecipeSnaps = await Promise.all(subRecipeRefs.map((ref) => transaction.get(ref)));
      
      const inventoryRefsToFetch = new Map<string, DocumentReference>();
      
      for(const subRecipeSnap of subRecipeSnaps) {
        if (!subRecipeSnap.exists()) throw new Error(`Sub-recipe with ID ${subRecipeSnap.id} not found.`);
        const subRecipe = subRecipeSnap.data() as Recipe;

        // --- Refs for the produced sub-recipe itself ---
        const subRecipeInvQuery = query(collection(db, 'inventory'), where('materialCode', '==', subRecipe.internalCode));
        const subRecipeInvDocs = await getDocs(subRecipeInvQuery); // Read outside transaction
        if (subRecipeInvDocs.empty) throw new Error(`Inventory item for sub-recipe ${subRecipe.name} not found.`);
        const subRecipeInvRef = subRecipeInvDocs.docs[0].ref;
        inventoryRefsToFetch.set(subRecipeInvRef.id, subRecipeInvRef);

        // --- Refs for the ingredients of the sub-recipe ---
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
            // If stock doesn't exist, we can't read it in the transaction, but we can create it later.
            return { inventoryId: invId, ref: doc(collection(db, 'inventoryStock')), snap: null };
          }
          const stockRef = stockDocs.docs[0].ref;
          const stockSnap = await transaction.get(stockRef);
          return { inventoryId: invId, ref: stockRef, snap: stockSnap };
        })
      );
      const stockDocMap = new Map(stockRefsAndSnaps.map(item => [item.inventoryId, { ref: item.ref, snap: item.snap }]));

      // --- WRITE PHASE ---
      for (let i = 0; i < data.items.length; i++) {
        const itemToProduce = data.items[i];
        const subRecipe = subRecipeSnaps[i].data() as Recipe;
        
        // Deplete raw ingredients
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

        // Increase produced sub-recipe stock
        const subRecipeInvSnap = Array.from(invSnapMap.values()).find(snap => snap?.data()?.materialCode === subRecipe.internalCode);
        if (!subRecipeInvSnap || !subRecipeInvSnap.exists()) throw new Error(`Inventory item for sub-recipe ${subRecipe.name} not found.`);
        const producedInvItem = subRecipeInvSnap.data() as InventoryItem;

        const totalYieldQuantity = itemToProduce.quantityProduced * (subRecipe.yield || 1);
        
        const producedStockDocData = stockDocMap.get(subRecipeInvSnap.id);
        if(producedStockDocData) {
            const currentQuantity = producedStockDocData.snap?.data()?.quantity ?? 0;
            const newQuantity = currentQuantity + totalYieldQuantity;
            
            if (producedStockDocData.snap) { // Update existing
                transaction.update(producedStockDocData.ref, {
                    quantity: newQuantity,
                    status: getStatus(newQuantity, producedInvItem.minStock),
                });
            } else { // Create new
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
        user: 'Chef John Doe', // Placeholder
        outletId: outletId,
        producedItems: data.items.map(item => {
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
    });

    revalidatePath('/inventory');
    revalidatePath('/recipes');
    revalidatePath('/'); // Revalidate dashboard
    return { success: true };
  } catch (error) {
    console.error('Error during production logging:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to log production: ${errorMessage}`);
  }
}


export async function undoProductionLog(logId: string) {
  try {
    await runTransaction(db, async (transaction) => {
      // --- 1. READ PHASE ---
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

      // --- 2. WRITE PHASE ---
      for (const producedItem of logData.producedItems) {
        const recipeSnap = recipeSnapMap.get(producedItem.recipeId);
        if (!recipeSnap || !recipeSnap.exists()) throw new Error(`Original recipe for "${producedItem.recipeName}" not found.`);
        const recipe = recipeSnap.data() as Recipe;

        // Restore raw ingredients
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
        
        // Deplete the produced sub-recipe
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
    });

    revalidatePath('/recipes');
    revalidatePath('/inventory');
    return { success: true };
  } catch (error) {
    console.error('Error undoing production log:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to undo production log: ${errorMessage}`);
  }
}

export async function logButchering(data: ButcheringData, outletId: string) {
  if (!outletId) {
    throw new Error("An outlet ID must be provided to log butchering.");
  }
  try {
      await runTransaction(db, async (transaction) => {
          // --- 1. READ PHASE ---
          const primaryItemSpecRef = doc(db, 'inventory', data.primaryItemId);
          const primaryItemSpecSnap = await transaction.get(primaryItemSpecRef);
          if (!primaryItemSpecSnap.exists()) throw new Error('Primary butchering item not found in inventory.');
          const primaryItemSpec = primaryItemSpecSnap.data() as InventoryItem;

          const primaryStockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', data.primaryItemId), where('outletId', '==', outletId));
          const primaryStockDocs = await getDocs(primaryStockQuery);
          if (primaryStockDocs.empty) throw new Error(`Stock for ${primaryItemSpec.name} not found at this outlet.`);
          const primaryStockRef = primaryStockDocs.docs[0].ref;
          const primaryStockSnap = await transaction.get(primaryStockRef);
          const primaryStock = primaryStockSnap.data() as InventoryStockItem;

          const producedItems = data.yieldedItems.filter(item => item.weight > 0);
          if (producedItems.length === 0) throw new Error("No yielded items with a weight greater than 0 were provided.");

          const yieldedItemReads = await Promise.all(producedItems.map(async (item) => {
            const specRef = doc(db, 'inventory', item.itemId);
            const stockQuery = query(collection(db, 'inventoryStock'), where('inventoryId', '==', item.itemId), where('outletId', '==', outletId));
            const stockDocs = await getDocs(stockQuery);
            const stockRef = stockDocs.empty ? doc(collection(db, 'inventoryStock')) : stockDocs.docs[0].ref;
            const stockSnap = stockDocs.empty ? null : await transaction.get(stockRef);
            return { itemData: item, specSnap: await transaction.get(specRef), stockSnap, stockRef };
          }));

          // --- 2. CALCULATION PHASE ---
          const quantityUsedInPurchaseUnit = convert(data.quantityUsed, data.quantityUnit as Unit, primaryItemSpec.purchaseUnit as Unit);
          if (quantityUsedInPurchaseUnit > (primaryStock.quantity ?? 0)) {
              throw new Error(`Not enough stock for ${primaryItemSpec.name}. Available: ${(primaryStock.quantity ?? 0).toFixed(2)} ${primaryItemSpec.purchaseUnit}, Required: ${quantityUsedInPurchaseUnit.toFixed(2)} ${primaryItemSpec.purchaseUnit}`);
          }
          const costOfButcheredPortion = (primaryItemSpec.purchasePrice / primaryItemSpec.purchaseQuantity) * quantityUsedInPurchaseUnit;

          // --- 3. WRITE PHASE ---
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
              
              if (readData.stockSnap && readData.stockSnap.exists() && readData.stockRef) { // Existing stock
                  const yieldedStock = readData.stockSnap.data() as InventoryStockItem;
                  const newQuantity = (yieldedStock.quantity ?? 0) + quantityToAddInPurchaseUnit;
                  transaction.update(readData.stockRef, {
                      quantity: newQuantity,
                      status: getStatus(newQuantity, yieldedItemSpec.minStock),
                  });
              } else if (readData.stockRef) { // New stock
                  transaction.set(readData.stockRef, {
                    inventoryId: readData.itemData.itemId,
                    outletId,
                    quantity: quantityToAddInPurchaseUnit,
                    status: getStatus(quantityToAddInPurchaseUnit, yieldedItemSpec.minStock),
                  });
              }
              // Note: Weighted-average cost update on butchering is complex and has been omitted for simplicity.

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
              user: 'Chef John Doe', // Placeholder
              outletId,
              primaryItem: {
                  itemId: primaryItemSpecSnap.id,
                  itemName: primaryItemSpec.name,
                  quantityUsed: quantityUsedInPurchaseUnit,
                  unit: primaryItemSpec.purchaseUnit as Unit,
              },
              yieldedItems: yieldedItemsForLog,
          });
      });

      revalidatePath('/inventory');
      revalidatePath('/recipes');
      revalidatePath('/');
      return { success: true };
  } catch (error) {
      console.error('Error during butchering log:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to log butchering: ${errorMessage}`);
  }
}

export async function undoButcheringLog(logId: string) {
    try {
        await runTransaction(db, async (transaction) => {
            const logRef = doc(db, 'butcheringLogs', logId);
            const logSnap = await transaction.get(logRef);

            if (!logSnap.exists()) throw new Error("Butchering log not found.");
            
            const logData = logSnap.data() as ButcheringLog;
            const outletId = logData.outletId;
            if(!outletId) throw new Error("Log missing outlet ID, cannot revert.");

            // --- READ ---
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

            // --- WRITE ---
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
        });

        revalidatePath('/recipes');
        revalidatePath('/inventory');
        return { success: true };
    } catch (error) {
        console.error('Error undoing butchering log:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to undo butchering log: ${errorMessage}`);
    }
}


export async function addButcheryTemplate(templateData: Omit<ButcheryTemplate, 'id'>) {
    try {
        const q = query(collection(db, 'butcheryTemplates'), where('primaryItemMaterialCode', '==', templateData.primaryItemMaterialCode));
        const existing = await getDocs(q);
        if (!existing.empty) {
            throw new Error(`A template for this primary item already exists.`);
        }

        const docRef = await addDoc(collection(db, 'butcheryTemplates'), templateData);
        revalidatePath('/settings/butchering-templates');
        revalidatePath('/recipes');
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('Error adding butchery template:', error);
        throw new Error(`Failed to add butchery template: ${error instanceof Error ? error.message : String(error)}`);
    }
}


export async function updateButcheryTemplate(id: string, templateData: Partial<ButcheryTemplate>) {
  try {
    const templateRef = doc(db, 'butcheryTemplates', id);
    await updateDoc(templateRef, templateData);
    
    revalidatePath('/settings/butchering-templates');
    revalidatePath('/recipes');

    return { success: true };
  } catch (error) {
    console.error('Error updating butchery template:', error);
    throw new Error('Failed to update butchery template.');
  }
}

export async function deleteButcheryTemplate(id: string) {
    try {
        await deleteDoc(doc(db, 'butcheryTemplates', id));
        revalidatePath('/settings/butchering-templates');
        revalidatePath('/recipes');
        return { success: true };
    } catch (e) {
        console.error('Error deleting butchery template: ', e);
        throw new Error('Failed to delete butchery template');
    }
}


// Purchase Order Actions
export async function addPurchaseOrder(poData: AddPurchaseOrderData, outletId: string) {
    if (!outletId) {
      throw new Error("An outlet must be specified to create a purchase order.");
    }

    const itemsToOrder = poData.items.filter(item => item.orderQuantity > 0);
    if (itemsToOrder.length === 0) {
        throw new Error("Cannot create a purchase order with no items. Please add a quantity to at least one item.");
    }

    try {
        await runTransaction(db, async (transaction) => {
            // In a real app, you'd have a counter document to get a sequential PO number
            const poNumber = `PO-${Date.now()}`;
            const poRef = doc(collection(db, 'purchaseOrders'));
            transaction.set(poRef, {
                ...poData,
                items: itemsToOrder, // Save only the items being ordered
                outletId,
                poNumber,
                createdAt: serverTimestamp(),
            });
        });
        revalidatePath('/purchasing');
        return { success: true };
    } catch (e) {
        console.error('Error adding purchase order: ', e);
        throw new Error('Failed to add purchase order');
    }
}


export async function cancelPurchaseOrder(poId: string) {
    try {
        const poRef = doc(db, 'purchaseOrders', poId);
        await updateDoc(poRef, {
            status: 'Cancelled',
        });
        revalidatePath('/purchasing');
        return { success: true };
    } catch (e) {
        console.error('Error cancelling purchase order: ', e);
        throw new Error('Failed to cancel purchase order');
    }
}

export async function receivePurchaseOrder(data: ReceivePurchaseOrderData) {
  
  try {
    await runTransaction(db, async (transaction) => {
      // --- READS ---
      const poRef = doc(db, 'purchaseOrders', data.poId);
      const poSnap = await transaction.get(poRef);
      if (!poSnap.exists()) throw new Error("Purchase Order not found.");
      const outletId = poSnap.data().outletId;
      if (!outletId) throw new Error("PO is not associated with an outlet.");

      const receivedItems = data.items.filter((item) => item.received > 0);

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

      // --- WRITES ---
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

        if(stockSnap && stockSnap.exists()) { // If stock document exists, update it
             transaction.update(stockRef, {
                quantity: newQuantity,
                status: newStatus,
            });
        } else { // Otherwise create it
            transaction.set(stockRef, {
                inventoryId: receivedItem.itemId,
                outletId: outletId,
                quantity: newQuantity,
                status: newStatus
            });
        }


        const hasNewPrice = receivedItem.purchasePrice !== invItemSpec.purchasePrice;
        if (hasNewPrice) {
          // Note: Weighted-average cost update is complex and can be added later.
          // For now, we'll just update the master item's price.
          transaction.update(specSnap.ref, { purchasePrice: receivedItem.purchasePrice });
        }
      }

      const isPartiallyReceived = data.items.some(item => item.received < item.ordered);
      const newStatus: PurchaseOrder['status'] = isPartiallyReceived ? 'Partially Received' : 'Received';

      transaction.update(poRef, {
        status: newStatus,
        receivedAt: serverTimestamp(),
        notes: data.notes || '',
      });
    });

    revalidatePath('/purchasing');
    revalidatePath('/inventory');
    revalidatePath('/');
  } catch (error) {
    console.error('Error receiving purchase order:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to receive purchase order: ${errorMessage}`);
  }
}

// Outlet Actions
export async function addOutlet(data: AddOutletData) {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Create the new outlet document.
      const outletRef = doc(collection(db, 'outlets'));
      transaction.set(outletRef, data);
      
      // 2. Fetch all existing inventory item specifications.
      const inventoryQuery = query(collection(db, 'inventory'));
      const inventorySnapshot = await getDocs(inventoryQuery);

      // 3. For each inventory item, create a new stock record for the new outlet with 0 quantity.
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
    });

    revalidatePath('/settings/outlets');
    return { success: true };
  } catch (error) {
    console.error("Error adding outlet:", error);
    throw new Error("Failed to add outlet.");
  }
}

export async function editOutlet(id: string, data: Partial<Outlet>) {
  try {
    await updateDoc(doc(db, 'outlets', id), data);
    revalidatePath('/settings/outlets');
    return { success: true };
  } catch (error) {
    console.error("Error editing outlet:", error);
    throw new Error("Failed to edit outlet.");
  }
}

export async function deleteOutlet(id: string) {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Delete the outlet document itself.
      const outletRef = doc(db, 'outlets', id);
      transaction.delete(outletRef);

      // 2. Find and delete all inventory stock records associated with this outlet.
      const stockQuery = query(collection(db, 'inventoryStock'), where('outletId', '==', id));
      const stockSnapshot = await getDocs(stockQuery);
      stockSnapshot.forEach(stockDoc => {
        transaction.delete(stockDoc.ref);
      });
    });

    revalidatePath('/settings/outlets');
    return { success: true };
  } catch (error) {
    console.error("Error deleting outlet:", error);
    throw new Error("Failed to delete outlet. Make sure all associated stock is cleared first.");
  }
}
