

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
  AddMenuData,
  AddRecipeData,
  AddSaleData,
  ButcheringData,
  ButcheryTemplate,
  InventoryFormData,
  InventoryItem,
  LogProductionData,
  Recipe,
  Supplier,
} from './types';
import {revalidatePath} from 'next/cache';
import { allUnits, Unit, convert } from './conversions';
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

// Determines the base unit for an item (e.g., g, ml, or un)
function getBaseUnit(purchaseUnit: Unit): Unit {
    const unitInfo = allUnits[purchaseUnit];
    if (unitInfo.type === 'weight') return 'g';
    if (unitInfo.type === 'volume') return 'ml';
    return 'un'; // Default to 'un' for items like 'each', 'bottle', etc.
}

export async function addInventoryItem(formData: InventoryFormData) {
  try {
    const { purchaseQuantity, purchaseUnit, purchasePrice, recipeUnit, recipeUnitConversion, ...restOfForm } = formData;
    
    // The unit for inventory tracking is the purchase unit itself if it's 'un', otherwise it's the base unit.
    const inventoryUnit = purchaseUnit === 'un' ? 'un' : getBaseUnit(purchaseUnit as Unit);

    let unitCost = 0;
    // If we have a conversion, we can calculate the cost per recipe unit.
    if (recipeUnit && recipeUnitConversion) {
      const totalRecipeUnitsInPurchase = purchaseQuantity * recipeUnitConversion;
      unitCost = totalRecipeUnitsInPurchase > 0 ? purchasePrice / totalRecipeUnitsInPurchase : 0;
    } else {
      // Otherwise, the cost is per purchase unit.
      unitCost = purchaseQuantity > 0 ? purchasePrice / purchaseQuantity : 0;
    }
    
    const quantity = formData.quantity || 0; // Initial stock
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
      unit: inventoryUnit, // The unit we track stock in (e.g., 'un' for bottles, 'g' for flour)
      unitCost: isFinite(unitCost) ? unitCost : 0, // Cost per recipeUnit or per purchaseUnit
      recipeUnit: recipeUnit || inventoryUnit, // The unit for recipes (e.g., 'ml' for wine bottle)
      recipeUnitConversion: recipeUnitConversion || 1, // How many recipe units are in one purchase unit
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
  formData: InventoryFormData
) {
  try {
    const itemRef = doc(db, 'inventory', id);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) throw new Error("Item not found");
    const currentItem = itemSnap.data() as InventoryItem;

    const { purchaseQuantity, purchaseUnit, purchasePrice, recipeUnit, recipeUnitConversion, ...restOfForm } = formData;
    
    const inventoryUnit = purchaseUnit === 'un' ? 'un' : getBaseUnit(purchaseUnit as Unit);

    let unitCost = 0;
    if (recipeUnit && recipeUnitConversion) {
      const totalRecipeUnitsInPurchase = purchaseQuantity * recipeUnitConversion;
      unitCost = totalRecipeUnitsInPurchase > 0 ? purchasePrice / totalRecipeUnitsInPurchase : 0;
    } else {
      unitCost = purchaseQuantity > 0 ? purchasePrice / purchaseQuantity : 0;
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
      recipeUnit: recipeUnit || inventoryUnit,
      recipeUnitConversion: recipeUnitConversion || 1,
    };

    await updateDoc(itemRef, dataToUpdate);

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

        // Convert the recipe ingredient's unit to the inventory item's base unit for costing
        const quantityToDepleteInCostingUnit = convert(
            recipeIngredient.quantity * saleData.quantity,
            recipeIngredient.unit as any,
            invItem.recipeUnit as any,
        );

        // Convert that to the inventory tracking unit for depletion
        const quantityToDepleteInInventoryUnit = quantityToDepleteInCostingUnit / invItem.recipeUnitConversion;

        const newQuantity = invItem.quantity - quantityToDepleteInInventoryUnit;
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

          // Convert recipe ingredient unit to the costing unit of the inventory item
           const quantityToDepleteInCostingUnit = convert(
            ingredient.quantity * item.quantityProduced,
            ingredient.unit as any,
            invItem.recipeUnit as any
          );

          // Convert that to the inventory tracking unit for depletion
          const quantityToDepleteInInventoryUnit = quantityToDepleteInCostingUnit / invItem.recipeUnitConversion;


          const newQuantity = invItem.quantity - quantityToDepleteInInventoryUnit;
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
          
          const newQuantity = item.quantityProduced; // We are producing N batches, which are 'un'

          transaction.set(newInvItemRef, {
            materialCode: subRecipe.recipeCode,
            name: subRecipe.name,
            category: subRecipe.category,
            quantity: newQuantity,
            unit: 'un', // Sub-recipes are tracked in 'un' (batches)
            purchaseUnit: 'Production',
            purchaseQuantity: 1,
            parLevel: 0, // Default par level
            supplierId: '',
            supplier: 'In-house',
            purchasePrice: 0,
            unitCost: subRecipe.totalCost / (subRecipe.yield || 1), // Cost per yieldUnit (e.g. per gram)
            allergens: [],
            status: getStatus(newQuantity, 0),
            recipeUnit: subRecipe.yieldUnit || 'un',
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
    throw new Error('Failed to log production.');
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

      // Get all yielded item documents
      const yieldedItemRefs = data.yieldedItems.map(item => doc(db, 'inventory', item.itemId));
      const yieldedItemSnaps = await Promise.all(yieldedItemRefs.map(ref => transaction.get(ref)));

      for (let i = 0; i < yieldedItemSnaps.length; i++) {
        if (!yieldedItemSnaps[i].exists()) {
          throw new Error(`Yielded item ${data.yieldedItems[i].name} could not be found in inventory.`);
        }
      }

      // --- 2. CALCULATION/LOGIC PHASE ---
      const primaryItem = primaryItemSnap.data() as InventoryItem;

      // Convert quantity used to the primary item's costing unit
      const quantityToDepleteInCostingUnit = convert(data.quantityUsed, data.quantityUnit as Unit, primaryItem.recipeUnit as Unit);
      
      // Convert that to the inventory tracking unit for depletion
      const quantityToDepleteInInventoryUnit = quantityToDepleteInCostingUnit / primaryItem.recipeUnitConversion;

      // if (primaryItem.quantity < quantityToDepleteInInventoryUnit) {
      //   throw new Error(`Not enough stock for ${primaryItem.name}. You have ${primaryItem.quantity} ${primaryItem.unit} but need ${quantityToDepleteInInventoryUnit} ${primaryItem.unit}.`);
      // }
      
      const newPrimaryQuantity = primaryItem.quantity - quantityToDepleteInInventoryUnit;
      const newPrimaryStatus = getStatus(newPrimaryQuantity, primaryItem.parLevel);
      const totalCostOfButcheredPortion = primaryItem.unitCost * quantityToDepleteInCostingUnit;


      // --- 3. WRITE PHASE ---
      // Update the primary item
      transaction.update(primaryItemRef, {
        quantity: newPrimaryQuantity,
        status: newPrimaryStatus,
      });

      // Update all the yielded items
      for (let i = 0; i < yieldedItemSnaps.length; i++) {
        const yieldedItemSnap = yieldedItemSnaps[i];
        const yieldedItemData = data.yieldedItems[i];
        const yieldedItem = yieldedItemSnap.data() as InventoryItem;

        // The cost of the new item is proportional to its yield percentage of the total cost of the portion being butchered.
        // We divide by the weight in the base unit of the yielded item (e.g. grams) to get cost per gram
        const yieldedItemWeightInBase = convert(yieldedItemData.weight, 'kg' as Unit, yieldedItem.recipeUnit as Unit);
        const newYieldedItemCost = (totalCostOfButcheredPortion * (yieldedItemData.yieldPercentage / 100)) / yieldedItemWeightInBase;
        
        const newQuantity = yieldedItem.quantity + yieldedItemWeightInBase;
        const newStatus = getStatus(newQuantity, yieldedItem.parLevel);

        transaction.update(yieldedItemSnap.ref, {
            quantity: newQuantity,
            status: newStatus,
            unitCost: isFinite(newYieldedItemCost) ? newYieldedItemCost : yieldedItem.unitCost, 
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
    throw new Error(`Failed to log butchering: ${error instanceof Error ? error.message : String(error)}`);
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
