'use server';

import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { z } from 'zod';

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
