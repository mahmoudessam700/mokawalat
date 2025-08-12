
'use server';

import { suggestISOComplianceImprovements, SuggestISOComplianceImprovementsOutput } from '@/ai/flows/iso-compliance-suggestions';
import { z } from 'zod';

export interface FormState {
  message: string | null;
  data: SuggestISOComplianceImprovementsOutput | null;
  error: boolean;
}

const erpDescriptionSchema = z.string().min(50, {
  message: 'Please provide a more detailed description (at least 50 characters).',
});

export async function getComplianceSuggestions(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = erpDescriptionSchema.safeParse(
    formData.get('erpDescription')
  );

  if (!validatedFields.success) {
    const flat = validatedFields.error.flatten();
  const errMsg = (flat.formErrors && flat.formErrors[0]) || 'Invalid input.';
    return {
      message: errMsg,
      data: null,
      error: true,
    };
  }

  try {
    const result = await suggestISOComplianceImprovements({ erpDescription: validatedFields.data });
    if (result.suggestions && result.suggestions.length > 0) {
      return {
        message: 'Suggestions generated successfully.',
        data: result,
        error: false,
      };
    } else {
       return {
        message: 'No suggestions could be generated based on the provided description.',
        data: null,
        error: true,
      };
    }
  } catch (error) {
    console.error(error);
    return {
      message: 'An unexpected error occurred. Please try again.',
      data: null,
      error: true,
    };
  }
}
