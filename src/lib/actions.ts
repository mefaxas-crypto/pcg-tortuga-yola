'use server';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import {db} from './firebase';
import type {
  AddInventoryItemData,
  EditInventoryItemData,
  Supplier,
  AddAllergenData,
  AddRecipeData,
  EditRecipeData,
  InventoryItem,
  RecipeIngredient,
} from './types';
import {revalidatePath} from 'next/cache';

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

    // Fetch supplier name from the supplierId
    const supplierRef = doc(db, 'suppliers', itemData.supplierId);
    const supplierSnap = await getDoc(supplierRef);
    if (!supplierSnap.exists()) {
      throw new Error('Supplier not found');
    }
    const supplierName = supplierSnap.data().name;

    const docRef = await addDoc(collection(db, 'inventory'), {
      ...itemData,
      status,
      supplier: supplierName,
    });
    revalidatePath('/inventory');
    return {success: true, id: docRef.id};
  } catch (e) {
    console.error('Error adding document: ', e);
    throw new Error('Failed to add inventory item');
  }
}

export async function editInventoryItem(
  id: string,
  itemData: EditInventoryItemData
) {
  try {
    const itemRef = doc(db, 'inventory', id);
    const status = getStatus(itemData.quantity, itemData.parLevel);

    // Fetch supplier name from the supplierId
    const supplierRef = doc(db, 'suppliers', itemData.supplierId);
    const supplierSnap = await getDoc(supplierRef);
    if (!supplierSnap.exists()) {
      throw new Error('Supplier not found');
    }
    const supplierName = supplierSnap.data().name;

    await updateDoc(itemRef, {
      ...itemData,
      status,
      supplier: supplierName,
    });
    revalidatePath('/inventory');
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

async function calculateRecipeCost(ingredients: RecipeIngredient[]): Promise<number> {
  let totalCost = 0;

  if (ingredients.length === 0) {
    return 0;
  }
  
  // Create a map of inventory item IDs to their quantities
  const ingredientIds = ingredients.map(i => i.inventoryItemId);

  // Fetch all the necessary inventory items in one query
  const inventoryQuery = query(collection(db, 'inventory'), where('__name__', 'in', ingredientIds));
  const querySnapshot = await getDocs(inventoryQuery);
  
  const inventoryItemsMap = new Map<string, InventoryItem>();
  querySnapshot.forEach(doc => {
    inventoryItemsMap.set(doc.id, { id: doc.id, ...doc.data() } as InventoryItem);
  });

  for (const ingredient of ingredients) {
    const inventoryItem = inventoryItemsMap.get(ingredient.inventoryItemId);

    if (inventoryItem) {
      // This is a simplification. It assumes the purchase unit and recipe unit are the same.
      // E.g., if purchase price is per 'kg', and recipe uses 'g', this won't be accurate yet.
      // We need a conversion factor for a real-world scenario.
      const costPerUnit = inventoryItem.purchasePrice / (inventoryItem.quantity || 1);
      const ingredientCost = costPerUnit * ingredient.quantity;
      totalCost += ingredientCost;
    }
  }

  return totalCost;
}


// Recipe Actions
export async function addRecipe(recipeData: AddRecipeData) {
  try {
    const totalCost = await calculateRecipeCost(recipeData.ingredients);
    const docRef = await addDoc(collection(db, 'recipes'), {...recipeData, totalCost});
    revalidatePath('/recipes');
    return {success: true, id: docRef.id};
  } catch (e) {
    console.error('Error adding recipe: ', e);
    throw new Error('Failed to add recipe');
  }
}

export async function editRecipe(id: string, recipeData: EditRecipeData) {
  try {
    const totalCost = await calculateRecipeCost(recipeData.ingredients);
    const recipeRef = doc(db, 'recipes', id);
    await updateDoc(recipeRef, {...recipeData, totalCost});
    revalidatePath('/recipes');
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
