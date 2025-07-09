
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, query, getDocs, limit } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  unitPrice: z.coerce.number().min(0, "Unit price must be a non-negative number."),
});

const invoiceFormSchema = z.object({
  clientId: z.string().min(1, "A client is required."),
  projectId: z.string().optional(),
  issueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid issue date.',
  }),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid due date.',
  }),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export async function addInvoice(values: InvoiceFormValues) {
  const validatedFields = invoiceFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  const { lineItems, ...invoiceData } = validatedFields.data;

  const totalAmount = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

  try {
    await addDoc(collection(firestore, 'invoices'), {
      ...invoiceData,
      lineItems,
      issueDate: new Date(invoiceData.issueDate),
      dueDate: new Date(invoiceData.dueDate),
      totalAmount,
      status: 'Draft',
      invoiceNumber,
      invoiceNumber_lowercase: invoiceNumber.toLowerCase(),
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `New invoice created: ${invoiceNumber}`,
        type: "INVOICE_CREATED",
        link: `/invoices`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/invoices');
    revalidatePath(`/clients/${invoiceData.clientId}`);
    return { message: 'Invoice created successfully.', errors: null };
  } catch (error) {
    console.error('Error adding invoice:', error);
    return { message: 'Failed to create invoice.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateInvoice(invoiceId: string, values: InvoiceFormValues) {
  const validatedFields = invoiceFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  const invoiceRef = doc(firestore, 'invoices', invoiceId);
  const invoiceSnap = await getDoc(invoiceRef);

  if (!invoiceSnap.exists()) {
    return { message: 'Invoice not found.', errors: { _server: ['Invoice not found.'] } };
  }

  if (invoiceSnap.data().status !== 'Draft') {
    return { message: 'Only draft invoices can be edited.', errors: { _server: ['Only draft invoices can be edited.'] } };
  }

  const { lineItems, ...invoiceData } = validatedFields.data;
  const totalAmount = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);

  try {
    await updateDoc(invoiceRef, {
      ...invoiceData,
      lineItems,
      issueDate: new Date(invoiceData.issueDate),
      dueDate: new Date(invoiceData.dueDate),
      totalAmount,
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Invoice ${invoiceSnap.data().invoiceNumber} was edited.`,
        type: "INVOICE_STATUS_CHANGED",
        link: `/invoices/${invoiceId}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    return { message: 'Invoice updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating invoice:', error);
    return { message: 'Failed to update invoice.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateInvoiceStatus(invoiceId: string, status: 'Sent' | 'Void') {
    if (!invoiceId) {
        return { success: false, message: 'Invoice ID is required.' };
    }

    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    
    try {
        const invoiceSnap = await getDoc(invoiceRef);
        if (!invoiceSnap.exists()) {
            throw new Error("Invoice not found.");
        }
        const invoiceData = invoiceSnap.data();
        
        await updateDoc(invoiceRef, { status });

        await addDoc(collection(firestore, 'activityLog'), {
            message: `Invoice ${invoiceData.invoiceNumber} status updated to ${status}`,
            type: "INVOICE_STATUS_CHANGED",
            link: `/invoices/${invoiceId}`,
            timestamp: serverTimestamp(),
        });

        revalidatePath('/invoices');
        revalidatePath(`/invoices/${invoiceId}`);
        
        return { success: true, message: `Invoice status updated to ${status}.` };

    } catch (error: any) {
        console.error("Error updating invoice status:", error);
        return { success: false, message: error.message || 'Failed to update status.' };
    }
}

const markAsPaidSchema = z.object({
  accountId: z.string().min(1, 'An account is required.'),
});

export type MarkAsPaidFormValues = z.infer<typeof markAsPaidSchema>;

export async function markInvoiceAsPaid(invoiceId: string, values: MarkAsPaidFormValues) {
    if (!invoiceId) {
        return { success: false, message: 'Invoice ID is required.' };
    }
    
    const validatedFields = markAsPaidSchema.safeParse(values);
    if (!validatedFields.success) {
        return { success: false, message: 'Invalid data provided.' };
    }
    const { accountId } = validatedFields.data;

    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    
    try {
        const invoiceSnap = await getDoc(invoiceRef);
        if (!invoiceSnap.exists()) {
            throw new Error("Invoice not found.");
        }
        const invoiceData = invoiceSnap.data();

        // 1. Create the income transaction
        await addDoc(collection(firestore, 'transactions'), {
            description: `Payment for Invoice ${invoiceData.invoiceNumber}`,
            amount: invoiceData.totalAmount,
            type: 'Income',
            date: serverTimestamp(),
            accountId: accountId,
            clientId: invoiceData.clientId,
            projectId: invoiceData.projectId,
            createdAt: serverTimestamp(),
        });

        // 2. Log the financial transaction
        await addDoc(collection(firestore, 'activityLog'), {
            message: `Payment of ${invoiceData.totalAmount.toLocaleString()} received for invoice ${invoiceData.invoiceNumber}`,
            type: "TRANSACTION_ADDED",
            link: `/financials`,
            timestamp: serverTimestamp(),
        });

        // 3. Update the invoice status to 'Paid'
        await updateDoc(invoiceRef, { status: 'Paid' });

        // 4. Log the status change
        await addDoc(collection(firestore, 'activityLog'), {
            message: `Invoice ${invoiceData.invoiceNumber} status updated to Paid`,
            type: "INVOICE_STATUS_CHANGED",
            link: `/invoices/${invoiceId}`,
            timestamp: serverTimestamp(),
        });
        
        // 5. Revalidate paths
        revalidatePath('/invoices');
        revalidatePath(`/invoices/${invoiceId}`);
        revalidatePath('/financials');
        revalidatePath('/financials/accounts');
        if (invoiceData?.clientId) {
            revalidatePath(`/clients/${invoiceData.clientId}`);
        }
        
        return { success: true, message: `Invoice marked as paid and transaction recorded.` };

    } catch (error: any) {
        console.error("Error marking invoice as paid:", error);
        return { success: false, message: error.message || 'Failed to process payment.' };
    }
}
