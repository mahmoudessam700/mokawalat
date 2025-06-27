
'use server';

import { firestore, storage } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { summarizeSupplierPerformance } from '@/ai/flows/summarize-supplier-performance';

const supplierFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  contactPerson: z.string().min(2, "Contact person must be at least 2 characters long."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  status: z.enum(["Active", "Inactive"]),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export async function addSupplier(values: SupplierFormValues) {
  const validatedFields = supplierFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const supplierRef = await addDoc(collection(firestore, 'suppliers'), {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `New supplier added: ${validatedFields.data.name}`,
        type: "SUPPLIER_ADDED",
        link: `/suppliers/${supplierRef.id}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/suppliers');
    return { message: 'Supplier added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding supplier:', error);
    return { message: 'Failed to add supplier.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateSupplier(supplierId: string, values: SupplierFormValues) {
  if (!supplierId) {
    return { message: 'Supplier ID is required.', errors: { _server: ['Supplier ID not provided.'] } };
  }

  const validatedFields = supplierFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const supplierRef = doc(firestore, 'suppliers', supplierId);
    await updateDoc(supplierRef, {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
    });
    
    await addDoc(collection(firestore, 'activityLog'), {
        message: `Supplier updated: ${validatedFields.data.name}`,
        type: "SUPPLIER_UPDATED",
        link: `/suppliers/${supplierId}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${supplierId}`);
    return { message: 'Supplier updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating supplier:', error);
    return { message: 'Failed to update supplier.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteSupplier(supplierId: string) {
  if (!supplierId) {
    return { success: false, message: 'Supplier ID is required.' };
  }

  try {
    const supplierRef = doc(firestore, 'suppliers', supplierId);
    const supplierSnap = await getDoc(supplierRef);
    if (!supplierSnap.exists()) {
        return { success: false, message: 'Supplier not found.' };
    }
    const supplierName = supplierSnap.data().name;

    // Check for linked purchase orders
    const poQuery = query(collection(firestore, 'procurement'), where('supplierId', '==', supplierId));
    const poSnapshot = await getDocs(poQuery);
    if (!poSnapshot.empty) {
      return { success: false, message: 'Cannot delete supplier with existing purchase orders. Please re-assign or delete them first.' };
    }

    await deleteDoc(supplierRef);

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Supplier deleted: ${supplierName}`,
        type: "SUPPLIER_DELETED",
        link: `/suppliers`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/suppliers');
    return { success: true, message: 'Supplier deleted successfully.' };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { success: false, message: 'Failed to delete supplier.' };
  }
}
