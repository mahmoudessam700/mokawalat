import { NextResponse } from 'next/server';
import { z } from 'zod';
import { suggestISOComplianceImprovements } from '@/ai/flows/iso-compliance-suggestions';

const bodySchema = z.object({
  erpDescription: z
    .string()
    .min(50, 'Please provide a more detailed description (at least 50 characters).'),
});

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.flatten().fieldErrors.erpDescription?.[0] || 'Invalid input.',
          data: null,
          error: true,
        },
        { status: 400 }
      );
    }

    const result = await suggestISOComplianceImprovements({
      erpDescription: parsed.data.erpDescription,
    });

    if (result.suggestions && result.suggestions.length > 0) {
      return NextResponse.json(
        { message: 'Suggestions generated successfully.', data: result, error: false },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        message: 'No suggestions could be generated based on the provided description.',
        data: null,
        error: true,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: 'An unexpected error occurred. Please try again.', data: null, error: true },
      { status: 500 }
    );
  }
}
