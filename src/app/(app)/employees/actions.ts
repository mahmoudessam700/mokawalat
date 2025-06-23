
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const employeeFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  email: z.string().email("Please enter a valid email address."),
  role: z.string().min(1, "Role is required."),
  department: z.string().min(1, "Department is required."),
  status: z.enum(["Active", "On Leave", "Inactive"]),
  salary: z.coerce.number().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export async function addEmployee(values: EmployeeFormValues) {
  const validatedFields = employeeFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const employeeRef = await addDoc(collection(firestore, 'employees'), {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
    });
    
    await addDoc(collection(firestore, 'activityLog'), {
        message: `New employee hired: ${validatedFields.data.name}`,
        type: "EMPLOYEE_HIRED",
        link: `/employees/${employeeRef.id}`,
        timestamp: serverTimestamp(),
    });
    
    revalidatePath('/employees');
    return { message: 'Employee added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding employee:', error);
    return { message: 'Failed to add employee.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateEmployee(employeeId: string, values: EmployeeFormValues) {
  if (!employeeId) {
    return { message: 'Employee ID is required.', errors: { _server: ['Employee ID not provided.'] } };
  }

  const validatedFields = employeeFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const employeeRef = doc(firestore, 'employees', employeeId);
    await updateDoc(employeeRef, {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
    });
    revalidatePath('/employees');
    return { message: 'Employee updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating employee:', error);
    return { message: 'Failed to update employee.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteEmployee(employeeId: string) {
  if (!employeeId) {
    return { success: false, message: 'Employee ID is required.' };
  }

  try {
    // Check if employee is assigned to any projects
    const projectsQuery = query(collection(firestore, 'projects'), where('teamMemberIds', 'array-contains', employeeId));
    const projectsSnapshot = await getDocs(projectsQuery);
    if (!projectsSnapshot.empty) {
        return { success: false, message: 'Cannot delete employee assigned to one or more projects. Please remove them from project teams first.' };
    }

    await deleteDoc(doc(firestore, 'employees', employeeId));
    revalidatePath('/employees');
    return { success: true, message: 'Employee deleted successfully.' };
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { success: false, message: 'Failed to delete employee.' };
  }
}
