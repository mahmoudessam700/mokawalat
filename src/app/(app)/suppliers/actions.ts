
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

    const supplierSnap = await getDoc(supplierRef);
    const supplierName = supplierSnap.exists() ? supplierSnap.data().name : 'Unknown Supplier';

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Supplier evaluated: ${supplierName} was given a rating of ${validatedFields.data.rating} stars.`,
        type: "SUPPLIER_EVALUATED",
        link: `/suppliers/${supplierId}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${supplierId}`);
    return { message: 'Supplier evaluation updated successfully.', errors: null };
  } catch (error) {
    console.error('Error evaluating supplier:', error);
    return { message: 'Failed to update evaluation.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

const contractFormSchema = z.object({
  title: z.string().min(3, 'Contract title must be at least 3 characters long.'),
  effectiveDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
});

export type ContractFormValues = z.infer<typeof contractFormSchema>;

export async function addContract(supplierId: string, formData: FormData) {
  if (!supplierId) {
    return { message: 'Supplier ID is required.', errors: { _server: ['Supplier ID is missing.'] } };
  }

  const formValues = {
      title: formData.get('title'),
      effectiveDate: formData.get('effectiveDate'),
  };

  const validatedFields = contractFormSchema.safeParse(formValues);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data provided.' };
  }
  
  const file = formData.get('file') as File | null;

  try {
    const newContractRef = doc(collection(firestore, 'suppliers', supplierId, 'contracts'));
    let fileUrl = '';
    let filePath = '';

    if (file && file.size > 0) {
      filePath = `contracts/suppliers/${supplierId}/${newContractRef.id}/${file.name}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      fileUrl = await getDownloadURL(storageRef);
    }
    
    const contractData = {
      ...validatedFields.data,
      effectiveDate: new Date(validatedFields.data.effectiveDate),
      fileUrl: fileUrl,
      filePath: filePath,
      createdAt: serverTimestamp(),
    };

    await setDoc(newContractRef, contractData);

    await addDoc(collection(firestore, 'activityLog'), {
        message: `New contract added for supplier: ${validatedFields.data.title}`,
        type: "CONTRACT_ADDED",
        link: `/suppliers/${supplierId}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath(`/suppliers/${supplierId}`);
    return { message: 'Contract added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding contract:', error);
    return { message: 'Failed to add contract.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteContract(supplierId: string, contractId: string) {
  if (!supplierId || !contractId) {
    return { success: false, message: 'Supplier and Contract ID are required.' };
  }

  try {
    const contractRef = doc(firestore, 'suppliers', supplierId, 'contracts', contractId);
    const contractSnap = await getDoc(contractRef);

    if (contractSnap.exists()) {
        const contractData = contractSnap.data();
        if (contractData.filePath) {
            const fileRef = ref(storage, contractData.filePath);
            await deleteObject(fileRef).catch(err => {
                console.error("Failed to delete contract file from storage:", err);
            });
        }
        await addDoc(collection(firestore, 'activityLog'), {
            message: `Contract "${contractData.title}" deleted from supplier`,
            type: "CONTRACT_DELETED",
            link: `/suppliers/${supplierId}`,
            timestamp: serverTimestamp(),
        });
    }

    await deleteDoc(contractRef);
    revalidatePath(`/suppliers/${supplierId}`);
    return { success: true, message: 'Contract deleted successfully.' };
  } catch (error) {
    console.error('Error deleting contract:', error);
    return { success: false, message: 'Failed to delete contract.' };
  }
}


export async function getSupplierPerformanceSummary(supplierId: string) {
    if (!supplierId) {
        return { error: true, message: 'Supplier ID is required.', data: null };
    }

    try {
        const result = await summarizeSupplierPerformance({ supplierId });
        
        if (result.summary) {
             return { error: false, message: 'Summary generated.', data: result };
        } else {
            return { error: true, message: 'AI could not generate a summary.', data: null };
        }

    } catch(error) {
        console.error('Error generating supplier performance summary:', error);
        return { error: true, message: 'An unexpected error occurred while generating the summary.', data: null };
    }
}
