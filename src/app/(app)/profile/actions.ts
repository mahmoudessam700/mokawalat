'use server';

import { auth, firestore, storage } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { z } from 'zod';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { revalidatePath } from 'next/cache';

const emailSchema = z.string().email();

export async function sendPasswordReset(email: string) {
    const validatedEmail = emailSchema.safeParse(email);
    if (!validatedEmail.success) {
        return { success: false, message: 'Invalid email address.' };
    }

    try {
        await sendPasswordResetEmail(auth, validatedEmail.data);
        return { success: true, message: 'Password reset email sent. Please check your inbox.' };
    } catch (error: any) {
        console.error("Password reset error:", error);
        return { success: false, message: 'Failed to send password reset email. Please try again later.' };
    }
}


export async function updateMyProfilePhoto(userId: string, formData: FormData) {
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }

    const photoFile = formData.get('photo') as File | null;
    if (!photoFile || photoFile.size === 0) {
        return { success: false, message: 'No photo file provided.' };
    }
    
    // Validate file type and size
    if (photoFile.size > 5 * 1024 * 1024) { // 5MB limit
      return { success: false, message: 'Photo must be less than 5MB.' };
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photoFile.type)) {
      return { success: false, message: 'Please upload a JPG, PNG, or WEBP image.' };
    }

    try {
        const userRef = doc(firestore, 'users', userId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            return { success: false, message: 'User profile not found.' };
        }
        const userEmail = userDoc.data().email;
        
        const employeeQuery = query(collection(firestore, 'employees'), where('email', '==', userEmail), limit(1));
        const employeeSnapshot = await getDocs(employeeQuery);

        if (employeeSnapshot.empty) {
            return { success: false, message: 'No associated employee record found to update.' };
        }
        
        const employeeDocRef = employeeSnapshot.docs[0].ref;
        const employeeData = employeeSnapshot.docs[0].data();
        
        let { photoUrl, photoPath } = employeeData;

        // Delete old photo if it exists
        if (photoPath) {
            await deleteObject(ref(storage, photoPath)).catch(err => console.error("Could not delete old photo:", err));
        }

        // Upload new photo
        photoPath = `employees/${employeeDocRef.id}/profile-${photoFile.name}-${Date.now()}`;
        const newPhotoRef = ref(storage, photoPath);
        await uploadBytes(newPhotoRef, photoFile);
        photoUrl = await getDownloadURL(newPhotoRef);

        // Update employee document
        await updateDoc(employeeDocRef, {
            photoUrl,
            photoPath,
        });

        revalidatePath('/profile');
        revalidatePath(`/employees/${employeeDocRef.id}`);

        return { success: true, message: 'Profile picture updated successfully.' };

    } catch (error: any) {
        console.error("Error updating profile photo:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}
