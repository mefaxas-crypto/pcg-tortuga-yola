'use server';

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import {db} from './firebase';
import type {AddInventoryItemData, EditInventoryItemData, Supplier, AddAllergenData, AddRecipeData, EditRecipeData} from './types';
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

function getStatus(quantity: number, parLevel: number): 'In Stock' | 'Low Stock' | 'Out of Stock' {
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

export async function editInventoryItem(id: string, itemData: EditInventoryItemData) {
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
        return { success: true };
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
    return { success: true, id: docRef.id };
  } catch (e) {
    console.error('Error adding allergen: ', e);
    throw new Error('Failed to add allergen');
  }
}

export async function deleteAllergen(allergenId: string) {
  try {
    await deleteDoc(doc(db, 'allergens', allergenId));
    revalidatePath('/settings/allergens');
    return { success: true };
  } catch (e) {
    console.error('Error deleting allergen: ', e);
    throw new Error('Failed to delete allergen');
  }
}

// Recipe Actions
export async function addRecipe(recipeData: AddRecipeData) {
  try {
    // TODO: Calculate totalCost
    const docRef = await addDoc(collection(db, 'recipes'), recipeData);
    revalidatePath('/recipes');
    return { success: true, id: docRef.id };
  } catch (e) {
    console.error('Error adding recipe: ', e);
    throw new Error('Failed to add recipe');
  }
}

export async function editRecipe(id: string, recipeData: EditRecipeData) {
  try {
    // TODO: Calculate totalCost
    const recipeRef = doc(db, 'recipes', id);
    await updateDoc(recipeRef, recipeData);
    revalidatePath('/recipes');
    return { success: true };
  } catch (e) {
    console.error('Error updating recipe: ', e);
    throw new Error('Failed to edit recipe');
  }
}

export async function deleteRecipe(recipeId: string) {
  try {
    await deleteDoc(doc(db, 'recipes', recipeId));
    revalidatePath('/recipes');
    return { success: true };
  } catch (e) {
    console.error('Error deleting recipe: ', e);
    throw new Error('Failed to delete recipe');
  }
}
