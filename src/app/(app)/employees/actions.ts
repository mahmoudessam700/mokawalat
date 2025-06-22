'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const employeeFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  email: z.string().email("Please enter a valid email address."),
  role: z.string().min(1, "Role is required."),
  department: z.string().min(1, "Department is required."),
  status: z.enum(["Active", "On Leave", "Inactive"]),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export async function addEmployee(values: EmployeeFormValues) {
  const validatedFields = employeeFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    await addDoc(collection(firestore, 'employees'), validatedFields.data);
    revalidatePath('/employees');
    return { message: 'Employee added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding employee:', error);
    return { message: 'Failed to add employee.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteEmployee(employeeId: string) {
  if (!employeeId) {
    return { success: false, message: 'Employee ID is required.' };
  }

  try {
    await deleteDoc(doc(firestore, 'employees', employeeId));
    revalidatePath('/employees');
    return { success: true, message: 'Employee deleted successfully.' };
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { success: false, message: 'Failed to delete employee.' };
  }
}
