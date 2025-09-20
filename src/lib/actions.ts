'use server';

import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import type { Supplier } from './types';

// We are defining a specific type for adding a supplier
// that doesn't require the `id` field, as it will be auto-generated.
type AddSupplierData = Omit<Supplier, 'id'>;

export async function addSupplier(supplierData: AddSupplierData) {
  try {
    const docRef = await addDoc(collection(db, 'suppliers'), supplierData);
    return { success: true, id: docRef.id };
  } catch (e) {
    console.error('Error adding document: ', e);
    return { success: false, error: 'Failed to add supplier' };
  }
}

export async function deleteSupplier(supplierId: string) {
    try {
        await deleteDoc(doc(db, 'suppliers', supplierId));
        return { success: true };
    } catch (e) {
        console.error('Error deleting document: ', e);
        return { success: false, error: 'Failed to delete supplier' };
    }
}
