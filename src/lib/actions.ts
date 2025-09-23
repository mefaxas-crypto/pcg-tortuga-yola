

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
        const outletData = outletDoc.data() as Outlet;
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
      ...(itemSpecData as Omit<InventoryItem, 'id' | 'quantity' | 'status'>),
      quantity: 0, // This is now stored in inventoryStock
      status: 'Out of Stock', // This is now stored in inventoryStock
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

export async function updatePhysicalInventory(items: PhysicalCountItem[]) {
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

                // The physicalQuantity is already converted to the base unit in the frontend
                const newQuantity = item.physicalQuantity;
                const newStatus = getStatus(newQuantity, invItem.minStock);

                transaction.update(itemSnap.ref, {
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
            // Log the variances. In a real app, you might save this to a 'variance' collection.
            console.log("Physical Count Variance Log:", {
                date: new Date().toISOString(),
                variances,
            });
             transaction.set(varianceLogRef, {
                logDate: serverTimestamp(),
                items: variances,
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
        const inventoryRef = doc(db, 'inventory', recipeData.internalCode);
        const unitCost = recipeData.totalCost / (recipeData.yield || 1);
        
        const inventorySpec = {
          materialCode: recipeData.internalCode,
          name: recipeData.name,
          category: 'Sub-recipe',
          // NO quantity or status here, these belong in inventoryStock
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
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Log the sale
      const saleRef = doc(collection(db, 'sales'));
      transaction.set(saleRef, {
        ...saleData,
        saleDate: serverTimestamp(),
      });

      // 2. Fetch the recipe to know which ingredients to deplete
      const recipeRef = doc(db, 'recipes', saleData.recipeId);
      const recipeSnap = await transaction.get(recipeRef);
      if (!recipeSnap.exists()) {
        throw `Recipe with ID ${saleData.recipeId} not found!`;
      }
      const recipe = recipeSnap.data() as Recipe;

      // 3. Deplete each ingredient
      for (const recipeIngredient of recipe.ingredients) {
        let invItemSnap;
        if (recipeIngredient.ingredientType === 'recipe') {
            const itemToDepleteQuery = query(collection(db, 'inventory'), where('materialCode', '==', recipeIngredient.itemCode));
            const querySnapshot = await getDocs(itemToDepleteQuery);
             if (!querySnapshot.empty) {
                invItemSnap = await transaction.get(querySnapshot.docs[0].ref);
            }
        } else {
            const itemToDepleteRef = doc(db, 'inventory', recipeIngredient.itemId);
            invItemSnap = await transaction.get(itemToDepleteRef);
        }

        if (!invItemSnap || !invItemSnap.exists()) {
          console.warn(`Inventory item with ID ${recipeIngredient.itemId} or code ${recipeIngredient.itemCode} not found during sale depletion.`);
          continue;
        }

        const invItem = invItemSnap.data() as InventoryItem;
        const invItemRef = invItemSnap.ref;
        
        const quantityInRecipeUnit = recipeIngredient.quantity * saleData.quantity;
        
        const neededInBaseUnit = convert(quantityInRecipeUnit, recipeIngredient.unit as Unit, invItem.recipeUnit as Unit);

        let quantityToDeplete: number;
        if (invItem.unit === 'un.') {
            const baseUnitsPerInventoryUnit = invItem.recipeUnitConversion || 1;
            if (baseUnitsPerInventoryUnit === 0) throw new Error(`Item ${invItem.name} has a conversion factor of 0.`);
            quantityToDeplete = neededInBaseUnit / baseUnitsPerInventoryUnit;
        } else {
            quantityToDeplete = convert(neededInBaseUnit, invItem.recipeUnit as Unit, invItem.unit as Unit);
        }

        const newQuantity = invItem.quantity - quantityToDeplete;
        const newStatus = getStatus(newQuantity, invItem.minStock);
        
        transaction.update(invItemRef, { 
            quantity: newQuantity,
            status: newStatus
        });
      }
    });

    // 4. Revalidate paths
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
export async function logProduction(data: LogProductionData) {
  try {
    await runTransaction(db, async (transaction) => {
      const subRecipeRefs = data.items.map((item) => doc(db, 'recipes', item.recipeId));
      const subRecipeSnaps = await Promise.all(subRecipeRefs.map((ref) => transaction.get(ref)));
      
      const inventoryRefsToFetch = new Map<string, DocumentReference>();

      for(const subRecipeSnap of subRecipeSnaps) {
        if (!subRecipeSnap.exists()) throw new Error(`Sub-recipe with ID ${subRecipeSnap.id} not found.`);
        const subRecipe = subRecipeSnap.data() as Recipe;

        inventoryRefsToFetch.set(subRecipe.internalCode, doc(db, 'inventory', subRecipe.internalCode));

        for (const ingredient of subRecipe.ingredients) {
          const invItemId = ingredient.ingredientType === 'recipe' ? ingredient.itemCode : ingredient.itemId;
          if(!invItemId) {
              throw new Error(`Recipe "${subRecipe.name}" contains an ingredient with an invalid code. Please fix the recipe.`);
          }
          inventoryRefsToFetch.set(invItemId, doc(db, 'inventory', invItemId));
        }
      }

      const inventorySnaps = await Promise.all(
        Array.from(inventoryRefsToFetch.values()).map(ref => transaction.get(ref))
      );
      const inventorySnapMap = new Map(inventorySnaps.map(snap => [snap.id, snap]));

      for (let i = 0; i < data.items.length; i++) {
        const itemToProduce = data.items[i];
        const subRecipe = subRecipeSnaps[i].data() as Recipe;
        
        for (const ingredient of subRecipe.ingredients) {
          const invItemId = ingredient.ingredientType === 'recipe' ? ingredient.itemCode : ingredient.itemId;
          const invItemSnap = inventorySnapMap.get(invItemId);

          if (!invItemSnap || !invItemSnap.exists()) {
            throw new Error(`Ingredient ${ingredient.name} (${invItemId}) not found. Cannot log production.`);
          }
          const invItem = invItemSnap.data() as InventoryItem;
          
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

          const newQuantity = invItem.quantity - quantityToDeplete;
          transaction.update(invItemSnap.ref, {
            quantity: newQuantity,
            status: getStatus(newQuantity, invItem.minStock),
          });
        }

        const producedItemInvSnap = inventorySnapMap.get(subRecipe.internalCode);
        if (!producedItemInvSnap || !producedItemInvSnap.exists()) {
          throw new Error(`Inventory item for sub-recipe ${subRecipe.name} not found. This should have been created with the recipe.`);
        }
        
        const producedItem = producedItemInvSnap.data() as InventoryItem;
        const totalYieldQuantity = itemToProduce.quantityProduced * (subRecipe.yield || 1);
        const newQuantity = producedItem.quantity + totalYieldQuantity;
        
        transaction.update(producedItemInvSnap.ref, {
          quantity: newQuantity,
          status: getStatus(newQuantity, producedItem.minStock),
        });
      }
      
      const productionLogRef = doc(collection(db, 'productionLogs'));
      transaction.set(productionLogRef, {
        logDate: serverTimestamp(),
        user: 'Chef John Doe', // Placeholder
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

      if (!logSnap.exists()) {
        throw new Error("Production log not found.");
      }
      const logData = logSnap.data() as ProductionLog;

      // Collect all recipe and inventory item references
      const recipeRefs = new Set<DocumentReference>();
      logData.producedItems.forEach(item => {
        recipeRefs.add(doc(db, 'recipes', item.recipeId));
      });
      
      const recipeSnaps = await Promise.all(Array.from(recipeRefs).map(ref => transaction.get(ref)));
      const recipeSnapMap = new Map(recipeSnaps.map(snap => [snap.id, snap]));

      const invItemRefsToFetch = new Set<DocumentReference>();
      for (const recipeSnap of recipeSnaps) {
        if (recipeSnap.exists()) {
          const recipe = recipeSnap.data() as Recipe;
          if(!recipe.internalCode) {
              throw new Error(`Recipe "${recipe.name}" has an invalid internal code.`);
          }
          invItemRefsToFetch.add(doc(db, 'inventory', recipe.internalCode));
          recipe.ingredients.forEach(ing => {
            const invItemId = ing.ingredientType === 'recipe' ? ing.itemCode : ing.itemId;
             if(!invItemId) {
                throw new Error(`An ingredient in recipe "${recipe.name}" has an invalid code.`);
            }
            invItemRefsToFetch.add(doc(db, 'inventory', invItemId));
          });
        }
      }

      // Fetch all unique inventory items
      const invSnaps = await Promise.all(Array.from(invItemRefsToFetch).map(ref => transaction.get(ref)));
      const invSnapMap = new Map(invSnaps.map(snap => [snap.id, snap]));
      
      // --- 2. WRITE PHASE ---
      for (const producedItem of logData.producedItems) {
        const recipeSnap = recipeSnapMap.get(producedItem.recipeId);
        if (!recipeSnap || !recipeSnap.exists()) {
          throw new Error(`Original recipe for "${producedItem.recipeName}" not found.`);
        }
        const recipe = recipeSnap.data() as Recipe;

        // Restore raw ingredients
        const batchesProduced = producedItem.quantityProduced;
        for (const ingredient of recipe.ingredients) {
          const invItemId = ingredient.ingredientType === 'recipe' ? ingredient.itemCode : ingredient.itemId;
          const invItemSnap = invSnapMap.get(invItemId);

          if (!invItemSnap || !invItemSnap.exists()) {
             console.warn(`Ingredient ${ingredient.name} not found in inventory during undo. Skipping.`);
             continue;
          }
          const invItem = invItemSnap.data() as InventoryItem;
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


          const newQuantity = invItem.quantity + quantityToRestore;
          transaction.update(invItemSnap.ref, {
            quantity: newQuantity,
            status: getStatus(newQuantity, invItem.minStock),
          });
        }
        
        // Deplete the produced sub-recipe
        const producedInvItemSnap = invSnapMap.get(recipe.internalCode);
        if (producedInvItemSnap && producedInvItemSnap.exists()) {
            const producedInvItem = producedInvItemSnap.data() as InventoryItem;
            const totalYieldQuantity = producedItem.quantityProduced * (recipe.yield || 1);
            const newQuantity = producedInvItem.quantity - totalYieldQuantity;
            transaction.update(producedInvItemSnap.ref, {
                quantity: newQuantity,
                status: getStatus(newQuantity, producedInvItem.minStock),
            });
        }
      }

      // Delete the log entry
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

export async function logButchering(data: ButcheringData) {
  try {
      await runTransaction(db, async (transaction) => {
          // --- 1. READ PHASE ---
          const primaryItemRef = doc(db, 'inventory', data.primaryItemId);
          const primaryItemSnap = await transaction.get(primaryItemRef);

          if (!primaryItemSnap.exists()) {
              throw new Error('Primary butchering item not found in inventory.');
          }
          const primaryItem = primaryItemSnap.data() as InventoryItem;

          const producedItems = data.yieldedItems.filter(item => item.weight > 0);
          if (producedItems.length === 0) {
              throw new Error("No yielded items with a weight greater than 0 were provided.");
          }

          const yieldedItemRefs = producedItems.map(item => doc(db, 'inventory', item.itemId));
          const yieldedItemSnaps = await Promise.all(yieldedItemRefs.map(ref => transaction.get(ref)));

          // --- 2. CALCULATION PHASE ---
          // Convert the quantity of the primary item used to its base inventory unit (purchaseUnit)
          const quantityUsedInPurchaseUnit = convert(data.quantityUsed, data.quantityUnit as Unit, primaryItem.purchaseUnit as Unit);

          if (quantityUsedInPurchaseUnit > primaryItem.quantity) {
              throw new Error(`Not enough stock for ${primaryItem.name}. Available: ${primaryItem.quantity.toFixed(2)} ${primaryItem.purchaseUnit}, Required: ${quantityUsedInPurchaseUnit.toFixed(2)} ${primaryItem.purchaseUnit}`);
          }
          
          // Calculate the monetary cost of the portion of the primary item that was used
          const costOfButcheredPortion = (primaryItem.purchasePrice / primaryItem.purchaseQuantity) * quantityUsedInPurchaseUnit;

          // --- 3. WRITE PHASE ---
          // Deplete the primary item's stock
          const newPrimaryQuantity = primaryItem.quantity - quantityUsedInPurchaseUnit;
          transaction.update(primaryItemRef, {
              quantity: newPrimaryQuantity,
              status: getStatus(newPrimaryQuantity, primaryItem.minStock),
          });

          const yieldedItemsForLog: ButcheringLog['yieldedItems'] = [];

          for (let i = 0; i < producedItems.length; i++) {
              const yieldedItemData = producedItems[i];
              const yieldedItemSnap = yieldedItemSnaps[i];
              
              if (!yieldedItemSnap.exists()) {
                  throw new Error(`Yielded item "${yieldedItemData.name}" could not be found.`);
              }
              const yieldedItem = yieldedItemSnap.data() as InventoryItem;

              // Calculate the cost to be assigned to this specific yielded item based on its distribution percentage
              const costOfThisYield = costOfButcheredPortion * ((yieldedItemData.finalCostDistribution || 0) / 100);
              
              // The quantity to add is the weight entered in the form. The unit is already the yielded item's purchase unit.
              const quantityToAddInPurchaseUnit = yieldedItemData.weight;
              
              const newQuantity = yieldedItem.quantity + quantityToAddInPurchaseUnit;
              
              // Calculate the new total value of the stock for this yielded item
              const currentTotalValue = yieldedItem.purchasePrice * (yieldedItem.quantity / yieldedItem.purchaseQuantity);
              const newTotalValue = currentTotalValue + costOfThisYield;
              
              // Calculate the new average purchase price per purchase quantity
              const newTotalPurchaseQuantities = newQuantity / yieldedItem.purchaseQuantity;
              const newPurchasePrice = newTotalValue / newTotalPurchaseQuantities;

              transaction.update(yieldedItemSnap.ref, {
                  quantity: newQuantity,
                  status: getStatus(newQuantity, yieldedItem.minStock),
                  purchasePrice: isFinite(newPurchasePrice) ? yieldedItem.purchasePrice : yieldedItem.purchasePrice,
              });

              yieldedItemsForLog.push({
                  itemId: yieldedItemSnap.id,
                  itemName: yieldedItem.name,
                  quantityYielded: quantityToAddInPurchaseUnit,
                  unit: yieldedItem.purchaseUnit as Unit,
              });
          }

          const logRef = doc(collection(db, 'butcheringLogs'));
          transaction.set(logRef, {
              logDate: serverTimestamp(),
              user: 'Chef John Doe', // Placeholder
              primaryItem: {
                  itemId: primaryItemSnap.id,
                  itemName: primaryItem.name,
                  quantityUsed: quantityUsedInPurchaseUnit,
                  unit: primaryItem.purchaseUnit as Unit,
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

            // This action is complex to reverse perfectly without historical cost data.
            // A simpler reversal will be implemented: restore quantities only.
            // A full reversal would require storing the state of the inventory before this transaction.

            // Restore primary item
            const primaryItemRef = doc(db, 'inventory', logData.primaryItem.itemId);
            const primaryItemSnap = await transaction.get(primaryItemRef);
            if (primaryItemSnap.exists()) {
                const primaryItem = primaryItemSnap.data() as InventoryItem;
                const newQuantity = primaryItem.quantity + logData.primaryItem.quantityUsed;
                transaction.update(primaryItemRef, {
                    quantity: newQuantity,
                    status: getStatus(newQuantity, primaryItem.minStock),
                });
            } else {
                 console.warn(`Primary item with ID ${logData.primaryItem.itemId} not found during undo. Stock cannot be restored.`);
            }

            // Deplete yielded items
            for (const yieldedItem of logData.yieldedItems) {
                const yieldedItemRef = doc(db, 'inventory', yieldedItem.itemId);
                const yieldedItemSnap = await transaction.get(yieldedItemRef);
                if (yieldedItemSnap.exists()) {
                    const item = yieldedItemSnap.data() as InventoryItem;
                    const newQuantity = item.quantity - yieldedItem.quantityYielded;
                    transaction.update(yieldedItemRef, {
                        quantity: newQuantity,
                        status: getStatus(newQuantity, item.minStock),
                    });
                } else {
                     console.warn(`Yielded item with ID ${yieldedItem.itemId} not found during undo. Stock cannot be depleted.`);
                }
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
export async function addPurchaseOrder(poData: AddPurchaseOrderData) {
    try {
        await runTransaction(db, async (transaction) => {
            // In a real app, you'd have a counter document to get a sequential PO number
            const poNumber = `PO-${Date.now()}`;
            const poRef = doc(collection(db, 'purchaseOrders'));
            transaction.set(poRef, {
                ...poData,
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
      const receivedItems = data.items.filter((item) => item.received > 0);

      // 1. Fetch all inventory items at once
      const itemRefs = receivedItems.map((item) =>
        doc(db, 'inventory', item.itemId)
      );
      const itemSnaps = await Promise.all(
        itemRefs.map((ref) => transaction.get(ref))
      );

      // 2. Update inventory for each received item
      for (let i = 0; i < receivedItems.length; i++) {
        const receivedItem = receivedItems[i];
        const itemSnap = itemSnaps[i];

        if (!itemSnap.exists()) {
          console.warn(
            `Inventory item "${receivedItem.name}" not found. Cannot update stock.`
          );
          continue;
        }

        const invItem = itemSnap.data() as InventoryItem;
        const invItemRef = itemSnap.ref;
        
        // This quantity is in `purchaseUnit`
        const newQuantity = invItem.quantity + receivedItem.received;
        const newStatus = getStatus(newQuantity, invItem.minStock);

        const updateData: Partial<InventoryItem> = {
          quantity: newQuantity,
          status: newStatus,
        };

        const hasNewPrice = receivedItem.purchasePrice !== invItem.purchasePrice;
        
        if (hasNewPrice) {
          // Weighted-Average Cost Calculation
          const currentPurchaseUnits = invItem.quantity;
          const currentTotalValue = (currentPurchaseUnits / invItem.purchaseQuantity) * invItem.purchasePrice;

          const receivedPurchaseUnits = receivedItem.received;
          const receivedValue = (receivedPurchaseUnits / invItem.purchaseQuantity) * receivedItem.purchasePrice;
          
          const newTotalPurchaseUnits = currentPurchaseUnits + receivedPurchaseUnits;

          if (newTotalPurchaseUnits > 0) {
            const newAveragePrice = ((currentTotalValue + receivedValue) / newTotalPurchaseUnits) * invItem.purchaseQuantity;
            updateData.purchasePrice = newAveragePrice;

            // Recalculate unitCost based on the new average purchase price
            if (invItem.purchaseUnit === 'un.') {
              const totalRecipeUnitsInPurchase = invItem.purchaseQuantity * (invItem.recipeUnitConversion || 1);
              updateData.unitCost = totalRecipeUnitsInPurchase > 0 ? newAveragePrice / totalRecipeUnitsInPurchase : 0;
            } else {
              const baseUnitsPerPurchase = convert(invItem.purchaseQuantity, invItem.purchaseUnit as Unit, invItem.recipeUnit as Unit);
              updateData.unitCost = baseUnitsPerPurchase > 0 ? newAveragePrice / baseUnitsPerPurchase : 0;
            }
          }
        }
        
        transaction.update(invItemRef, updateData);
      }

      // 3. Update Purchase Order status
      const poRef = doc(db, 'purchaseOrders', data.poId);
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
    const docRef = await addDoc(collection(db, 'outlets'), data);
    revalidatePath('/settings/outlets');
    return { success: true, id: docRef.id };
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
    // In a real app, you would also need to handle cleanup of associated
    // inventory stock records for this outlet.
    await deleteDoc(doc(db, 'outlets', id));
    revalidatePath('/settings/outlets');
    return { success: true };
  } catch (error) {
    console.error("Error deleting outlet:", error);
    throw new Error("Failed to delete outlet. Make sure all associated stock is cleared first.");
  }
}
