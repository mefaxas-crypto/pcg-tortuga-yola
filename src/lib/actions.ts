

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
  AddInventoryItemData,
  AddMenuData,
  AddRecipeData,
  AddSaleData,
  ButcheringData,
  EditInventoryItemData,
  EditMenuData,
  EditRecipeData,
  InventoryItem,
  LogProductionData,
  Recipe,
  Supplier,
} from './types';
import {revalidatePath} from 'next/cache';
import { Unit, convert } from './conversions';
import { butcheryTemplates } from './butchery-templates.json';

// We are defining a specific type for adding a supplier
// that doesn't require the `id` field, as it will be auto-generated.
type AddSupplierData = Omit<Supplier, 'id'>;
type EditSupplierData = Omit<Supplier, 'id'>;

export async function addSupplier(supplierData: AddSupplierData) {
  try {
    const docRef = await addDoc(collection(db, 'suppliers'), supplierData);
    revalidatePath('/suppliers');
    return {success: true, id: docRef.id};
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

export async function addInventoryItem(itemData: AddInventoryItemData) {
  try {
    const status = getStatus(itemData.quantity, itemData.parLevel);

    const supplierName = await getSupplierName(itemData.supplierId);

    const unitCost = itemData.purchasePrice > 0 && itemData.conversionFactor > 0 
        ? itemData.purchasePrice / itemData.conversionFactor 
        : itemData.unitCost || 0;

    const fullItemData = {
      ...itemData,
      status,
      supplier: supplierName,
      unitCost,
      supplierId: itemData.supplierId || '', // Ensure supplierId is not undefined
    };

    const docRef = await addDoc(collection(db, 'inventory'), fullItemData);

    const newItem: InventoryItem = {
      id: docRef.id,
      ...fullItemData,
    };

    revalidatePath('/inventory');
    revalidatePath('/recipes/**');
    return newItem;
  } catch (e) {
    console.error('Error adding document: ', e);
    throw new Error('Failed to add inventory item');
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
  itemData: EditInventoryItemData
) {
  try {
    const itemRef = doc(db, 'inventory', id);
    const status = getStatus(itemData.quantity, itemData.parLevel);

    const supplierName = await getSupplierName(itemData.supplierId);

    const unitCost = itemData.purchasePrice > 0 && itemData.conversionFactor > 0 
        ? itemData.purchasePrice / itemData.conversionFactor 
        : itemData.unitCost || 0;

    await updateDoc(itemRef, {
      ...itemData,
      status,
      supplier: supplierName,
      unitCost,
    });
    revalidatePath('/inventory');
    revalidatePath('/recipes/**'); 
    return {success: true};
  } catch (e) {
    console.error('Error updating document: ', e);
    throw new Error('Failed to edit inventory item');
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

export async function editRecipe(id: string, recipeData: EditRecipeData) {
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
    return {success: true, id: docRef.id};
  } catch (e) {
    console.error('Error adding menu: ', e);
    throw new Error('Failed to add menu');
  }
}

export async function editMenu(id: string, menuData: EditMenuData) {
  try {
    const menuRef = doc(db, 'menus', id);
    await updateDoc(menuRef, menuData);
    revalidatePath('/menus');
    revalidatePath(`/menus/${id}/edit`);
    return {success: true};
  } catch (e) {
    console.error('Error updating menu: ', e);
    throw new Error('Failed to edit menu');
  }
}

export async function deleteMenu(menuId: string) {
  try {
    await deleteDoc(doc(db, 'menus', menuId));
    revalidatePath('/menus');
    return {success: true};
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

        // Convert the recipe ingredient's unit to the inventory item's base unit
        const quantityToDepleteInBaseUnit = convert(
            recipeIngredient.quantity * saleData.quantity,
            recipeIngredient.unit as any,
            invItem.unit as any,
        );

        const newQuantity = invItem.quantity - quantityToDepleteInBaseUnit;
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

          const quantityToDeplete = convert(
            ingredient.quantity * item.quantityProduced,
            ingredient.unit as any,
            invItem.unit as any
          );

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
          const newQuantity = (subRecipe.yield || 1) * item.quantityProduced;

          transaction.set(newInvItemRef, {
            materialCode: subRecipe.recipeCode,
            name: subRecipe.name,
            category: subRecipe.category,
            quantity: newQuantity,
            unit: subRecipe.yieldUnit || 'unit',
            purchaseUnit: 'Production',
            conversionFactor: 1,
            parLevel: 0, // Default par level
            supplierId: '',
            supplier: 'In-house',
            purchasePrice: 0,
            unitCost: subRecipe.totalCost / (subRecipe.yield || 1),
            allergens: [], // Sub-recipes inherit allergens, this could be improved
            status: getStatus(newQuantity, 0),
          });
        } else {
          const producedItemRef = producedItemSnap.ref;
          const producedItem = producedItemSnap.data() as InventoryItem;

          const quantityToAdd = (subRecipe.yield || 1) * item.quantityProduced;
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
    throw new Error('Failed to log production.');
  }
}

export async function logButchering(data: ButcheringData) {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Fetch and validate the primary item
      const primaryItemRef = doc(db, 'inventory', data.primaryItemId);
      const primaryItemSnap = await transaction.get(primaryItemRef);

      if (!primaryItemSnap.exists()) {
        throw new Error('Primary butchering item not found in inventory.');
      }
      const primaryItem = primaryItemSnap.data() as InventoryItem;

      // 2. Deplete the primary item's stock
      const quantityToDeplete = convert(data.quantityUsed, data.quantityUnit as Unit, primaryItem.unit as Unit);
      
      if (primaryItem.quantity < quantityToDeplete) {
        throw new Error(`Not enough stock for ${primaryItem.name}. You have ${primaryItem.quantity} ${primaryItem.unit} but need ${quantityToDeplete} ${primaryItem.unit}.`);
      }

      const newPrimaryQuantity = primaryItem.quantity - quantityToDeplete;
      const newPrimaryStatus = getStatus(newPrimaryQuantity, primaryItem.parLevel);
      transaction.update(primaryItemRef, {
        quantity: newPrimaryQuantity,
        status: newPrimaryStatus,
      });

      const totalCostOfButcheredPortion = primaryItem.unitCost * quantityToDeplete;

      // 3. Add or update the yielded items
      for (const yieldedItemData of data.yieldedItems) {
        const yieldedItemRef = doc(db, 'inventory', yieldedItemData.itemId);
        const yieldedItemSnap = await transaction.get(yieldedItemRef);
        
        if (!yieldedItemSnap.exists()) {
            throw new Error(`Yielded item ${yieldedItemData.name} could not be found in inventory.`)
        }

        const yieldedItem = yieldedItemSnap.data() as InventoryItem;
        // The cost of the new item is proportional to its yield percentage of the total cost of the portion being butchered.
        const newYieldedItemCost = (totalCostOfButcheredPortion * (yieldedItemData.yieldPercentage / 100)) / yieldedItemData.weight;
        
        const newQuantity = yieldedItem.quantity + yieldedItemData.weight;
        const newStatus = getStatus(newQuantity, yieldedItem.parLevel);

        transaction.update(yieldedItemRef, {
            quantity: newQuantity,
            status: newStatus,
            // Update the cost based on this butchering event if it's a valid number
            unitCost: isFinite(newYieldedItemCost) ? newYieldedItemCost : yieldedItem.unitCost, 
        });
      }
    });

    // 4. Update the butchery template (this is a placeholder for a real database implementation)
    // This is NOT safe for concurrent use, but for this demo it illustrates the concept.
    // In a real app, this should be a database transaction or a more robust system.
    const templateIndex = butcheryTemplates.findIndex(t => t.primaryItemMaterialCode === data.primaryItemMaterialCode);
    const primaryItem = await getDoc(doc(db, 'inventory', data.primaryItemId)).then(d => d.data() as InventoryItem);
    
    if (templateIndex > -1) {
      // Update existing template
      const template = butcheryTemplates[templateIndex];
      data.yieldedItems.forEach(yielded => {
        if (!template.yields.some(y => y.id === yielded.materialCode)) {
          template.yields.push({ id: yielded.materialCode, name: yielded.name });
        }
      });
    } else {
      // Create new template
      butcheryTemplates.push({
        id: `template-${data.primaryItemMaterialCode}-${Date.now()}`,
        name: `${primaryItem.name} Breakdown`,
        primaryItemMaterialCode: data.primaryItemMaterialCode,
        yields: data.yieldedItems.map(y => ({ id: y.materialCode, name: y.name }))
      });
    }
    // Note: This does not actually save the JSON file on the server. This is a conceptual demonstration.

    revalidatePath('/inventory');
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Error during butchering log:', error);
    throw new Error(`Failed to log butchering: ${error instanceof Error ? error.message : String(error)}`);
  }
}

