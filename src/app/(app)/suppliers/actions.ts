'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

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
    await addDoc(collection(firestore, 'suppliers'), validatedFields.data);
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
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const supplierRef = doc(firestore, 'suppliers', supplierId);
    await updateDoc(supplierRef, validatedFields.data);
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
    await deleteDoc(doc(firestore, 'suppliers', supplierId));
    revalidatePath('/suppliers');
    return { success: true, message: 'Supplier deleted successfully.' };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { success: false, message: 'Failed to delete supplier.' };
  }
}

const evaluateSupplierFormSchema = z.object({
  rating: z.coerce.number().min(1, "Rating is required").max(5),
  evaluationNotes: z.string().optional(),
});

export type EvaluateSupplierFormValues = z.infer<typeof evaluateSupplierFormSchema>;

export async function evaluateSupplier(supplierId: string, values: EvaluateSupplierFormValues) {
  if (!supplierId) {
    return { message: 'Supplier ID is required.', errors: { _server: ['Supplier ID not provided.'] } };
  }

  const validatedFields = evaluateSupplierFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const supplierRef = doc(firestore, 'suppliers', supplierId);
    await updateDoc(supplierRef, {
      rating: validatedFields.data.rating,
      evaluationNotes: validatedFields.data.evaluationNotes || '',
    });
    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${supplierId}`);
    return { message: 'Supplier evaluation updated successfully.', errors: null };
  } catch (error) {
    console.error('Error evaluating supplier:', error);
    return { message: 'Failed to update evaluation.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}