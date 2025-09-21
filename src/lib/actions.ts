

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
    const docRef = await addDoc(collection(db, 'recipes'), recipeData);
    revalidatePath('/recipes');
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
    revalidatePath('/recipes');
    revalidatePath(`/recipes/${id}/edit`);
    return {success: true};
  } catch (e) {
    console.error('Error updating recipe: ', e);
    throw new Error('Failed to edit recipe');
  }
}

export async function deleteRecipe(recipeId: string) {
  try {
    await deleteDoc(doc(db, 'recipes', recipeId));
    revalidatePath('/recipes');
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
        
        // The quantity in the recipe is already in the correct `recipeUnit`
        const quantityInRecipeUnit = recipeIngredient.quantity * saleData.quantity;

        // Convert the total recipe quantity needed to the inventory's MAIN tracking unit for depletion.
        const quantityToDeplete = convert(
            quantityInRecipeUnit,
            invItem.recipeUnit as Unit,
            invItem.unit as Unit
        );

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
    throw new Error('Failed to log sale.');
  }
}

// Production Actions
export async function logProduction(data: LogProductionData) {
  try {
    await runTransaction(db, async (transaction) => {
      for (const item of data.items) {
        // 1. Fetch the sub-recipe being produced
        const subRecipeRef = doc(db, 'recipes', item.recipeId);
        const subRecipeSnap = await transaction.get(subRecipeRef);
        if (!subRecipeSnap.exists() || !subRecipeSnap.data().isSubRecipe) {
          throw new Error('Invalid sub-recipe selected for production.');
        }
        const subRecipe = subRecipeSnap.data() as Recipe;

        // 2. Deplete the raw ingredients used in the production
        for (const ingredient of subRecipe.ingredients) {
          const invItemRef = doc(db, 'inventory', ingredient.itemId);
          const invItemSnap = await transaction.get(invItemRef);
          if (!invItemSnap.exists()) {
            console.warn(
              `Ingredient ${ingredient.name} not found in inventory. Skipping depletion.`
            );
            continue;
          }
          const invItem = invItemSnap.data() as InventoryItem;

          // Convert recipe ingredient unit to the inventory's main tracking unit for depletion.
          let quantityToDeplete;
          try {
            quantityToDeplete = convert(
                ingredient.quantity * item.quantityProduced,
                ingredient.unit as Unit,
                invItem.unit as Unit
            );
          } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            throw new Error(`Conversion failed for ingredient "${invItem.name}": ${err}`);
          }

          const newQuantity = invItem.quantity - quantityToDeplete;
          const newStatus = getStatus(newQuantity, invItem.parLevel);

          transaction.update(invItemRef, {
            quantity: newQuantity,
            status: newStatus,
          });
        }

        // 3. Increase the stock of the produced sub-recipe
        const producedItemQuery = query(
          collection(db, 'inventory'),
          where('materialCode', '==', subRecipe.recipeCode)
        );
        
        const producedItemSnaps = await getDocs(producedItemQuery);
        let producedItemSnap: any = null;
        if (!producedItemSnaps.empty) {
            producedItemSnap = await transaction.get(producedItemSnaps.docs[0].ref);
        }

        if (!producedItemSnap || !producedItemSnap.exists()) {
          console.warn(
            `Sub-recipe ${subRecipe.name} not found in inventory. Creating a new entry.`
          );
          const newInvItemRef = doc(collection(db, 'inventory'));
          
          const newQuantity = item.quantityProduced; // We are producing N batches, which are 'un.'

          transaction.set(newInvItemRef, {
            materialCode: subRecipe.recipeCode,
            name: subRecipe.name,
            category: subRecipe.category,
            quantity: newQuantity,
            unit: 'un.', // Sub-recipes are tracked in 'un.' (batches)
            purchaseUnit: 'un.',
            purchaseQuantity: 1,
            parLevel: 0, // Default par level
            supplierId: '',
            supplier: 'In-house',
            purchasePrice: subRecipe.totalCost, // Price of one batch is the cost of its ingredients
            unitCost: subRecipe.totalCost / (subRecipe.yield || 1), // Cost per yieldUnit (e.g. per gram)
            allergens: [],
            status: getStatus(newQuantity, 0),
            recipeUnit: subRecipe.yieldUnit || 'un.',
            recipeUnitConversion: subRecipe.yield || 1,
          });
        } else {
          const producedItemRef = producedItemSnap.ref;
          const producedItem = producedItemSnap.data() as InventoryItem;

          const quantityToAdd = item.quantityProduced; // Add N batches
          const newQuantity = producedItem.quantity + quantityToAdd;
          const newStatus = getStatus(newQuantity, producedItem.parLevel);

          transaction.update(producedItemRef, {
            quantity: newQuantity,
            status: newStatus,
          });
        }
      }
    });

    revalidatePath('/inventory');
    revalidatePath('/'); // Revalidate dashboard

    return { success: true };
  } catch (error) {
    console.error('Error during production logging:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to log production: ${errorMessage}`);
  }
}

export async function logButchering(data: ButcheringData) {
  try {
    await runTransaction(db, async (transaction) => {
      // --- 1. READ PHASE ---
      // Get the primary item document
      const primaryItemRef = doc(db, 'inventory', data.primaryItemId);
      const primaryItemSnap = await transaction.get(primaryItemRef);
      if (!primaryItemSnap.exists()) {
        throw new Error('Primary butchering item not found in inventory.');
      }
      const primaryItem = primaryItemSnap.data() as InventoryItem;

      // Get all yielded item documents
      const yieldedItemRefs = data.yieldedItems.map(item => {
        const q = query(collection(db, 'inventory'), where('materialCode', '==', item.materialCode));
        return q; // Storing query, not ref, as we need to execute it outside transaction.get
      });

      // Execute queries outside the transaction to get the document references
      const yieldedItemDocRefs = (await Promise.all(yieldedItemRefs.map(q => getDocs(q)))).map(snap => !snap.empty ? snap.docs[0].ref : null);

      // Now, use the transaction to get the snapshots
      const yieldedItemSnaps = await Promise.all(
          yieldedItemDocRefs.map(ref => ref ? transaction.get(ref) : Promise.resolve(null))
      );

      for (let i = 0; i < yieldedItemSnaps.length; i++) {
        const yieldedItemData = data.yieldedItems[i];
        if (!yieldedItemSnaps[i] || !yieldedItemSnaps[i]!.exists()) {
          throw new Error(`Yielded item "${yieldedItemData.name}" could not be found in inventory. Please ensure it exists before logging butchery.`);
        }
      }

      // --- 2. CALCULATION/LOGIC PHASE ---
      const quantityToDepleteInPurchaseUnit = convert(data.quantityUsed, data.quantityUnit as Unit, primaryItem.purchaseUnit as Unit);
      
      const newPrimaryQuantity = primaryItem.quantity - quantityToDepleteInPurchaseUnit;
      const newPrimaryStatus = getStatus(newPrimaryQuantity, primaryItem.parLevel);
      
      const totalCostOfButcheredPortion = (primaryItem.purchasePrice / primaryItem.purchaseQuantity) * quantityToDepleteInPurchaseUnit;

      // --- 3. WRITE PHASE ---
      // Update the primary item
      transaction.update(primaryItemRef, {
        quantity: newPrimaryQuantity,
        status: newPrimaryStatus,
      });

      // Update all the yielded items
      for (let i = 0; i < yieldedItemSnaps.length; i++) {
        const yieldedItemSnap = yieldedItemSnaps[i];
        if (!yieldedItemSnap) continue;

        const yieldedItemData = data.yieldedItems[i];
        const yieldedItem = yieldedItemSnap.data() as InventoryItem;

        const totalYieldedWeightInKg = data.yieldedItems.reduce((acc, item) => acc + item.weight, 0);

        const yieldedItemCostProportion = (yieldedItemData.weight / totalYieldedWeightInKg);
        const costOfThisYield = totalCostOfButcheredPortion * yieldedItemCostProportion;
        
        // Quantity to add is its weight, converted to its own purchase unit
        const quantityToAdd = convert(yieldedItemData.weight, 'kg' as Unit, yieldedItem.purchaseUnit as Unit);

        const newQuantity = yieldedItem.quantity + quantityToAdd;
        const newStatus = getStatus(newQuantity, yieldedItem.parLevel);
        
        // The new purchase price of the yielded item is its proportional cost.
        const newPurchasePrice = isFinite(costOfThisYield) ? costOfThisYield : yieldedItem.purchasePrice;

        transaction.update(yieldedItemSnap.ref, {
            quantity: newQuantity,
            status: newStatus,
            purchasePrice: newPurchasePrice,
            // We assume the purchase quantity of the yielded item is what we just produced.
            purchaseQuantity: quantityToAdd,
        });
      }
    });

    // 4. Update the butchery template
    const templateIndex = initialButcheryTemplates.findIndex(t => t.primaryItemMaterialCode === data.primaryItemMaterialCode);
    const primaryItem = await getDoc(doc(db, 'inventory', data.primaryItemId)).then(d => d.data() as InventoryItem);
    
    if (templateIndex > -1) {
      const template = initialButcheryTemplates[templateIndex];
      data.yieldedItems.forEach(yielded => {
        if (!template.yields.some(y => y.id === yielded.materialCode)) {
          template.yields.push({ id: yielded.materialCode, name: yielded.name });
        }
      });
    } else {
      initialButcheryTemplates.push({
        id: `template-${data.primaryItemMaterialCode}-${Date.now()}`,
        name: `${primaryItem.name} Breakdown`,
        primaryItemMaterialCode: data.primaryItemMaterialCode,
        yields: data.yieldedItems.map(y => ({ id: y.materialCode, name: y.name }))
      });
    }

    revalidatePath('/inventory');
    revalidatePath('/recipes');
revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Error during butchering log:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Not enough stock")) {
        return { success: false, error: errorMessage };
    }
    throw new Error(`Failed to log butchering: ${errorMessage}`);
  }
}

export async function updateButcheryTemplate(template: ButcheryTemplate) {
  try {
    console.log('Updating butchery template:', template);

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

    