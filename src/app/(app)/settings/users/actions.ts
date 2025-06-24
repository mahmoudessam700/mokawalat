
'use server';

import { firestore } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'user']),
});

export type UpdateUserRoleFormValues = z.infer<typeof updateUserRoleSchema>;

export async function updateUserRole(userId: string, values: UpdateUserRoleFormValues) {
  if (!userId) {
    return { message: 'User ID is required.', errors: { _server: ['User ID not provided.'] } };
  }
  
  const validatedFields = updateUserRoleSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
      role: validatedFields.data.role,
    });
    revalidatePath('/settings/users');
    return { message: 'User role updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { message: 'Failed to update user role.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}
