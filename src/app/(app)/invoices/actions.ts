
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  unitPrice: z.coerce.number().min(0, "Unit price must be a non-negative number."),
});

export const invoiceFormSchema = z.object({
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

  try {
    const newInvoiceRef = await addDoc(collection(firestore, 'invoices'), {
      ...invoiceData,
      lineItems,
      issueDate: new Date(invoiceData.issueDate),
      dueDate: new Date(invoiceData.dueDate),
      totalAmount,
      status: 'Draft',
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `New invoice created: INV-${newInvoiceRef.id.slice(0,6).toUpperCase()}`,
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

export async function updateInvoiceStatus(invoiceId: string, status: 'Sent' | 'Paid' | 'Void') {
    if (!invoiceId) {
        return { success: false, message: 'Invoice ID is required.' };
    }

    try {
        const invoiceRef = doc(firestore, 'invoices', invoiceId);
        await updateDoc(invoiceRef, { status });

        revalidatePath('/invoices');
        
        // This is a simplified version. A full implementation would also revalidate client and project pages if linked.

        return { success: true, message: `Invoice status updated to ${status}.` };

    } catch (error) {
        console.error("Error updating invoice status:", error);
        return { success: false, message: 'Failed to update status.' };
    }
}
