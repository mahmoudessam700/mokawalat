
'use server';

import { firestore, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { getDownloadURL, ref, uploadBytes, deleteObject } from 'firebase/storage';

// Internal schema for validation, not exported.
const companyProfileValidationSchema = z.object({
  name: z.string().min(2, "Company name is required."),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
});

export type CompanyProfileFormValues = {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  logoPath?: string;
};

const profileDocRef = doc(firestore, 'company', 'main');

export async function getCompanyProfile(): Promise<CompanyProfileFormValues | null> {
  try {
    const docSnap = await getDoc(profileDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as CompanyProfileFormValues;
    }
    return null;
  } catch (error) {
    console.error("Error fetching company profile:", error);
    return null;
  }
}

export async function updateCompanyProfile(formData: FormData) {
  const values = {
    name: formData.get('name'),
    address: formData.get('address'),
    phone: formData.get('phone'),
    email: formData.get('email'),
  };

  const validatedFields = companyProfileValidationSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }
  
  const logoFile = formData.get('logo') as File | null;
  const currentData: Partial<CompanyProfileFormValues> = (await getCompanyProfile()) ?? {};

  try {
  let { logoUrl, logoPath } = currentData;
    
    if (logoFile && logoFile.size > 0) {
      // Delete old logo if it exists
      if (currentData.logoPath) {
        const oldLogoRef = ref(storage, currentData.logoPath);
        await deleteObject(oldLogoRef).catch(err => console.error("Could not delete old logo:", err));
      }
      
      // Upload new logo
      logoPath = `company/logo/${logoFile.name}`;
      const newLogoRef = ref(storage, logoPath);
      await uploadBytes(newLogoRef, logoFile);
      logoUrl = await getDownloadURL(newLogoRef);
    }
    
    const dataToSave = {
      ...validatedFields.data,
      logoUrl: logoUrl || '',
      logoPath: logoPath || '',
      updatedAt: serverTimestamp(),
    };

    await setDoc(profileDocRef, dataToSave, { merge: true });
    
    revalidatePath('/settings/company');
    return { message: 'Company profile updated successfully.', errors: null };

  } catch (error) {
    console.error("Error updating company profile:", error);
    return { message: 'Failed to update profile.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}
