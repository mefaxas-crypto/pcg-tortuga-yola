

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
  DocumentSnapshot,
  setDoc,
} from 'firebase/firestore';
import {db} from './firebase';
import type {
  AddAllergenData,
  AddIngredientCategoryData,
  AddMenuData,
  AddRecipeData,
  AddSaleData,
  ButcheringData,
  ButcheryTemplate,
  InventoryFormData,
  InventoryItem,
  LogProductionData,
  Menu,
  PhysicalCountItem,
  ProductionLog,
  Recipe,
  Supplier,
} from './types';
import {revalidatePath} from 'next/cache';
import { allUnits, Unit, convert, getBaseUnit } from './conversions';
import { butcheryTemplates as initialButcheryTemplates } from './butchery-templates.json';

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
    await deleteDoc(doc(db, 'suppliers', supplierId));
    revalidatePath('/suppliers');
    return {success: true};
  } catch (e) {
    console.error('Error deleting document: ', e);
    throw new Error('Failed to delete supplier');
  }
}

function getStatus(
  quantity: number,
  parLevel: number
): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (quantity <= 0) {
    return 'Out of Stock';
  } else if (quantity < parLevel) {
    return 'Low Stock';
  } else {
    return 'In Stock';
  }
}

export async function addInventoryItem(formData: InventoryFormData) {
  try {
    const { purchaseQuantity, purchaseUnit, purchasePrice, recipeUnit, recipeUnitConversion, ...restOfForm } = formData;
    
    // The unit for inventory tracking is always the purchase unit
    const inventoryUnit = purchaseUnit;

    let unitCost = 0;
    const finalRecipeUnit = recipeUnit || getBaseUnit(purchaseUnit as Unit);
    let finalRecipeUnitConversion = 1;
    
    if (purchaseUnit === 'un.') {
      if (!recipeUnitConversion || !recipeUnit) {
        throw new Error("Conversion factor is required for 'un.' items.");
      }
      finalRecipeUnitConversion = recipeUnitConversion;
      const totalRecipeUnitsInPurchase = purchaseQuantity * finalRecipeUnitConversion;
      unitCost = totalRecipeUnitsInPurchase > 0 ? purchasePrice / totalRecipeUnitsInPurchase : 0;
    } else {
      // For standard units, the recipeUnit is its base, and we find the conversion factor.
      finalRecipeUnitConversion = convert(1, purchaseUnit as Unit, finalRecipeUnit as Unit);
      const totalBaseUnits = purchaseQuantity * finalRecipeUnitConversion;
      unitCost = totalBaseUnits > 0 ? purchasePrice / totalBaseUnits : 0;
    }
    
    const quantity = formData.quantity || 0;
    const status = getStatus(quantity, formData.parLevel);
    const supplierName = await getSupplierName(formData.supplierId);

    const fullItemData = {
      ...restOfForm,
      quantity,
      status,
      supplier: supplierName,
      supplierId: formData.supplierId || '',
      purchaseQuantity: purchaseQuantity,
      purchaseUnit: purchaseUnit,
      purchasePrice,
      unit: inventoryUnit, // This is the same as purchaseUnit
      unitCost: isFinite(unitCost) ? unitCost : 0,
      recipeUnit: finalRecipeUnit,
      recipeUnitConversion: finalRecipeUnitConversion,
    };

    const docRef = await addDoc(collection(db, 'inventory'), fullItemData);

    const newItem: InventoryItem = {
      id: docRef.id,
      ...(fullItemData as Omit<InventoryItem, 'id'>),
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
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) throw new Error("Item not found");
    const currentItem = itemSnap.data() as InventoryItem;

    const { purchaseQuantity, purchaseUnit, purchasePrice, recipeUnit, recipeUnitConversion, ...restOfForm } = formData;
    
    const inventoryUnit = purchaseUnit;

    let unitCost = 0;
    const finalRecipeUnit = recipeUnit || getBaseUnit(purchaseUnit as Unit);
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

    const quantity = currentItem.quantity;
    const status = getStatus(quantity, formData.parLevel);
    const supplierName = await getSupplierName(formData.supplierId);

    const dataToUpdate = {
      ...restOfForm,
      quantity,
      status,
      supplier: supplierName,
      supplierId: formData.supplierId || '',
      purchaseQuantity,
      purchaseUnit,
      purchasePrice,
      unit: inventoryUnit,
      unitCost: isFinite(unitCost) ? unitCost : 0,
      recipeUnit: finalRecipeUnit,
      recipeUnitConversion: finalRecipeUnitConversion,
    };

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
    await deleteDoc(doc(db, 'inventory', itemId));
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
                const newStatus = getStatus(newQuantity, invItem.parLevel);

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
    if (recipeData.isSubRecipe) {
      // For sub-recipes, we use the internalCode as the document ID in the inventory
      const inventoryRef = doc(db, 'inventory', recipeData.internalCode);
      const unitCost = recipeData.totalCost / (recipeData.yield || 1);
      
      await setDoc(inventoryRef, {
        materialCode: recipeData.internalCode,
        name: recipeData.name,
        category: 'Sub-recipe',
        quantity: 0, // Initial quantity is 0 until produced
        unit: recipeData.yieldUnit || 'un.',
        purchaseUnit: recipeData.yieldUnit || 'un.',
        purchaseQuantity: recipeData.yield || 1,
        parLevel: 0, // Should be set manually if needed
        supplier: 'In-house',
        supplierId: '',
        purchasePrice: isFinite(unitCost) ? unitCost : 0, // Price for one "batch"
        unitCost: isFinite(unitCost) ? unitCost : 0, // Cost per base unit (ml, g, etc.)
        allergens: [],
        status: 'Out of Stock',
        recipeUnit: recipeData.yieldUnit || 'un.',
        recipeUnitConversion: 1,
      });
    }

    const docRef = await addDoc(collection(db, 'recipes'), recipeData);
    revalidatePath('/recipes');
    revalidatePath('/inventory');
    return {success: true, id: docRef.id};
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
        const itemToDepleteRef = recipeIngredient.ingredientType === 'recipe' 
          ? query(collection(db, 'inventory'), where('materialCode', '==', recipeIngredient.itemCode))
          : doc(db, 'inventory', recipeIngredient.itemId);

        let invItemSnap;

        if (recipeIngredient.ingredientType === 'recipe') {
            const querySnapshot = await getDocs(itemToDepleteRef as any); // Can't use transaction.get() on queries
            if (!querySnapshot.empty) {
                invItemSnap = await transaction.get(querySnapshot.docs[0].ref);
            }
        } else {
            invItemSnap = await transaction.get(itemToDepleteRef as any);
        }

        if (!invItemSnap || !invItemSnap.exists()) {
          console.warn(`Inventory item with ID ${recipeIngredient.itemId} or code ${recipeIngredient.itemCode} not found during sale depletion.`);
          continue;
        }

        const invItem = invItemSnap.data() as InventoryItem;
        const invItemRef = invItemSnap.ref;
        
        const quantityInRecipeUnit = recipeIngredient.quantity * saleData.quantity;

        // Correctly convert from the recipe's unit to the inventory's tracking unit.
        const neededInBaseUnit = convert(quantityInRecipeUnit, recipeIngredient.unit as Unit, invItem.recipeUnit as Unit);
        
        let quantityToDeplete: number;
        if (invItem.unit === 'un.') {
            // If tracking unit is 'un.', divide by the conversion factor to get fraction of a unit
            quantityToDeplete = neededInBaseUnit / (invItem.recipeUnitConversion || 1);
        } else {
            // Otherwise, convert from base unit to the tracking unit (which should be compatible)
            quantityToDeplete = convert(neededInBaseUnit, invItem.recipeUnit as Unit, invItem.unit as Unit);
        }
        

        const newQuantity = invItem.quantity - quantityToDeplete;
        const newStatus = getStatus(newQuantity, invItem.parLevel);
        
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
              quantityToDeplete = neededInBaseUnit / (invItem.recipeUnitConversion || 1);
          } else {
              quantityToDeplete = convert(neededInBaseUnit, invItem.recipeUnit as Unit, invItem.unit as Unit);
          }

          const newQuantity = invItem.quantity - quantityToDeplete;
          transaction.update(invItemSnap.ref, {
            quantity: newQuantity,
            status: getStatus(newQuantity, invItem.parLevel),
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
          status: getStatus(newQuantity, producedItem.parLevel),
        });
      }
      
      const productionLogRef = doc(collection(db, 'productionLogs'));
      transaction.set(productionLogRef, {
        logDate: serverTimestamp(),
        user: 'Chef John Doe', // Placeholder
        producedItems: data.items.map(item => ({
            recipeId: item.recipeId,
            recipeName: item.name,
            quantityProduced: item.quantityProduced,
            yieldPerBatch: item.yield,
            yieldUnit: item.yieldUnit,
        })),
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
              quantityToRestore = usedInBaseUnit / (invItem.recipeUnitConversion || 1);
          } else {
              quantityToRestore = convert(usedInBaseUnit, invItem.recipeUnit as Unit, invItem.unit as Unit);
          }


          const newQuantity = invItem.quantity + quantityToRestore;
          transaction.update(invItemSnap.ref, {
            quantity: newQuantity,
            status: getStatus(newQuantity, invItem.parLevel),
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
                status: getStatus(newQuantity, producedInvItem.parLevel),
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

      const yieldedItemRefs = data.yieldedItems.map(item => doc(db, 'inventory', item.itemId));
      const yieldedItemSnaps = await Promise.all(yieldedItemRefs.map(ref => transaction.get(ref)));
      
      const totalCostOfButcheredPortion = (primaryItem.purchasePrice / primaryItem.purchaseQuantity) * data.quantityUsed;
      const totalDistributionPercentage = data.yieldedItems.reduce((acc, item) => acc + item.costDistributionPercentage, 0);

      const useWeightBasedCosting = totalDistributionPercentage !== 100;
      if (useWeightBasedCosting) {
        console.warn('Cost distribution percentages do not add up to 100. Falling back to weight-based costing.');
      }
      
      const quantityToDepleteInPurchaseUnit = convert(data.quantityUsed, data.quantityUnit as Unit, primaryItem.purchaseUnit as Unit);
      
      if (quantityToDepleteInPurchaseUnit > primaryItem.quantity) {
          throw new Error(`Not enough stock for ${primaryItem.name}. Available: ${primaryItem.quantity} ${primaryItem.purchaseUnit}, Required: ${quantityToDepleteInPurchaseUnit} ${primaryItem.purchaseUnit}`);
      }

      const newPrimaryQuantity = primaryItem.quantity - quantityToDepleteInPurchaseUnit;
      const newPrimaryStatus = getStatus(newPrimaryQuantity, primaryItem.parLevel);
      
      transaction.update(primaryItemRef, {
        quantity: newPrimaryQuantity,
        status: newPrimaryStatus,
      });
      
      const totalYieldedWeightInKg = data.yieldedItems.reduce((acc, item) => acc + item.weight, 0);

      for (let i = 0; i < data.yieldedItems.length; i++) {
        const yieldedItemData = data.yieldedItems[i];
        const yieldedItemSnap = yieldedItemSnaps[i];
        
        if (!yieldedItemSnap.exists()) {
          throw new Error(`Yielded item "${yieldedItemData.name}" could not be found. Please ensure it exists before logging butchery.`);
        }
        
        const yieldedItem = yieldedItemSnap.data() as InventoryItem;
        
        let costOfThisYield;
        if(useWeightBasedCosting) {
            const yieldedItemCostProportion = totalYieldedWeightInKg > 0 ? (yieldedItemData.weight / totalYieldedWeightInKg) : 0;
            costOfThisYield = totalCostOfButcheredPortion * yieldedItemCostProportion;
        } else {
            costOfThisYield = totalCostOfButcheredPortion * (yieldedItemData.costDistributionPercentage / 100);
        }
        
        const quantityToAdd = convert(yieldedItemData.weight, 'kg' as Unit, yieldedItem.purchaseUnit as Unit);

        const newQuantity = yieldedItem.quantity + quantityToAdd;
        const newStatus = getStatus(newQuantity, yieldedItem.parLevel);
        
        const newPurchasePrice = isFinite(costOfThisYield) ? costOfThisYield : yieldedItem.purchasePrice;

        transaction.update(yieldedItemSnap.ref, {
            quantity: newQuantity,
            status: newStatus,
            purchasePrice: newPurchasePrice,
            purchaseQuantity: quantityToAdd,
        });
      }
    });

    const templateIndex = initialButcheryTemplates.findIndex(t => t.primaryItemMaterialCode === data.primaryItemMaterialCode);
    if (templateIndex > -1) {
      const template = initialButcheryTemplates[templateIndex];
      data.yieldedItems.forEach(yielded => {
        const existingYield = template.yields.find(y => y.id === yielded.materialCode);
        if (existingYield) {
            existingYield.costDistributionPercentage = yielded.costDistributionPercentage;
        } else {
            template.yields.push({ id: yielded.materialCode, name: yielded.name, costDistributionPercentage: yielded.costDistributionPercentage });
        }
      });
    }

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

export async function addButcheryTemplate(template: ButcheryTemplate) {
    try {
        console.log('Adding butchery template:', template);
        // This is a mock implementation. In a real app, you would save this to a database.
        const templateExists = initialButcheryTemplates.some(t => t.id === template.id || t.primaryItemMaterialCode === template.primaryItemMaterialCode);
        if (templateExists) {
            throw new Error("A template for this item already exists.");
        }
        initialButcheryTemplates.push(template);
        revalidatePath('/recipes');
        return { success: true };
    } catch (error) {
        console.error('Error adding butchery template:', error);
        throw new Error('Failed to add butchery template.');
    }
}


export async function updateButcheryTemplate(template: ButcheryTemplate) {
  try {
    console.log('Updating butchery template:', template);
    // This is a mock implementation. In a real app, you would save this to a database.
    const templateIndex = initialButcheryTemplates.findIndex(t => t.id === template.id);
    if (templateIndex > -1) {
      initialButcheryTemplates[templateIndex] = template;
    } else {
      throw new Error("Template not found for update.");
    }
    
    revalidatePath('/recipes');

    return { success: true };
  } catch (error) {
    console.error('Error updating butchery template:', error);
    throw new Error('Failed to update butchery template.');
  }
}
