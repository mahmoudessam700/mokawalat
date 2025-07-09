
'use server';

import { firestore, storage } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, setDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const employeeFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  email: z.string().email("Please enter a valid email address."),
  role: z.string().min(1, "Role is required."),
  department: z.string().min(1, "Department is required."),
  status: z.enum(["Active", "On Leave", "Inactive"]),
  salary: z.coerce.number().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export async function addEmployee(formData: FormData) {
  const formValues = {
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
    department: formData.get('department'),
    status: formData.get('status'),
    salary: formData.get('salary') ? Number(formData.get('salary')) : undefined,
  }

  const validatedFields = employeeFormSchema.safeParse(formValues);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data provided.' };
  }
  
  const photoFile = formData.get('photo') as File | null;

  try {
    const newEmployeeRef = doc(collection(firestore, 'employees'));
    let photoUrl = '';
    let photoPath = '';

    if (photoFile && photoFile.size > 0) {
      photoPath = `employees/${newEmployeeRef.id}/profile-${photoFile.name}`;
      const storageRef = ref(storage, photoPath);
      await uploadBytes(storageRef, photoFile);
      photoUrl = await getDownloadURL(storageRef);
    }
    
    await setDoc(newEmployeeRef, {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
      photoUrl,
      photoPath,
    });
    
    await addDoc(collection(firestore, 'activityLog'), {
        message: `New employee hired: ${validatedFields.data.name}`,
        type: "EMPLOYEE_HIRED",
        link: `/employees/${newEmployeeRef.id}`,
        timestamp: serverTimestamp(),
    });
    
    revalidatePath('/employees');
    return { message: 'Employee added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding employee:', error);
    return { message: 'Failed to add employee.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateEmployee(employeeId: string, formData: FormData) {
  if (!employeeId) {
    return { message: 'Employee ID is required.', errors: { _server: ['Employee ID not provided.'] } };
  }
  
  const formValues = {
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
    department: formData.get('department'),
    status: formData.get('status'),
    salary: formData.get('salary') ? Number(formData.get('salary')) : undefined,
  }

  const validatedFields = employeeFormSchema.safeParse(formValues);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data provided.' };
  }
  
  const photoFile = formData.get('photo') as File | null;
  const employeeRef = doc(firestore, 'employees', employeeId);

  try {
    const currentDoc = await getDoc(employeeRef);
    const currentData = currentDoc.data() || {};
    let { photoUrl, photoPath } = currentData;

    if (photoFile && photoFile.size > 0) {
      if (photoPath) {
        await deleteObject(ref(storage, photoPath)).catch(err => console.error("Could not delete old photo:", err));
      }
      photoPath = `employees/${employeeId}/profile-${photoFile.name}`;
      const storageRef = ref(storage, photoPath);
      await uploadBytes(storageRef, photoFile);
      photoUrl = await getDownloadURL(storageRef);
    }

    await updateDoc(employeeRef, {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
      photoUrl,
      photoPath,
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Employee updated: ${validatedFields.data.name}`,
        type: "EMPLOYEE_UPDATED",
        link: `/employees/${employeeId}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/employees');
    revalidatePath(`/employees/${employeeId}`);
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
    const employeeRef = doc(firestore, 'employees', employeeId);
    const employeeSnap = await getDoc(employeeRef);
    if (!employeeSnap.exists()) {
        return { success: false, message: 'Employee not found.' };
    }
    const employeeData = employeeSnap.data();

    // Check if employee is assigned to any projects
    const projectsQuery = query(collection(firestore, 'projects'), where('teamMemberIds', 'array-contains', employeeId));
    const projectsSnapshot = await getDocs(projectsQuery);
    if (!projectsSnapshot.empty) {
        return { success: false, message: 'Cannot delete employee assigned to one or more projects. Please remove them from project teams first.' };
    }

    // Delete profile photo from storage
    if (employeeData.photoPath) {
        await deleteObject(ref(storage, employeeData.photoPath)).catch(err => console.error("Could not delete photo:", err));
    }

    await deleteDoc(employeeRef);

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Employee deleted: ${employeeData.name}`,
        type: "EMPLOYEE_DELETED",
        link: `/employees`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/employees');
    return { success: true, message: 'Employee deleted successfully.' };
  } catch (error) {
    console.error('Error deleting employee:', error);
    return { success: false, message: 'Failed to delete employee.' };
  }
}
