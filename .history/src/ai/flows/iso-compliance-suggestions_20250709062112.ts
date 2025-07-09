
'use server';

/**
 * @fileOverview Provides AI-driven suggestions for improving ERP operations to align with ISO 9001 standards.
 *
 * - suggestISOComplianceImprovements - A function that suggests improvements for ISO 9001 compliance.
 * - SuggestISOComplianceImprovementsInput - The input type for the suggestISOComplianceImprovements function.
 * - SuggestISOComplianceImprovementsOutput - The return type for the suggestISOComplianceImprovements function.
 */
// Temporarily disabled for build compatibility
// import { generate } from 'genkit';
// import { geminiPro } from '@/ai/genkit';
import * as z from 'zod';

const SuggestISOComplianceImprovementsInputSchema = z.object({
  erpDescription: z
    .string()
    .describe('A detailed description of the current ERP operations.'),
});
export type SuggestISOComplianceImprovementsInput = z.infer<
  typeof SuggestISOComplianceImprovementsInputSchema
>;

const SuggestISOComplianceImprovementsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe(
      'A list of actionable suggestions for improving ERP operations to better align with ISO 9001 standards, focusing on feedback collection and continuous improvement.'
    ),
});
export type SuggestISOComplianceImprovementsOutput = z.infer<
  typeof SuggestISOComplianceImprovementsOutputSchema
>;

export async function suggestISOComplianceImprovements(
  input: SuggestISOComplianceImprovementsInput
): Promise<SuggestISOComplianceImprovementsOutput> {
  const prompt = `You are an expert in ISO 9001 compliance and ERP systems.

  Based on the following description of current ERP operations, provide a list of actionable suggestions for improvement. Focus on changes that will facilitate the collection of feedback and continuous improvement, in line with ISO 9001 standards. Suggestions should be specific and practical.

  ERP Operations Description: ${input.erpDescription}
  `;

  const llmResponse = await generate({
    model: geminiPro,
    prompt: prompt,
    output: {
        format: 'json',
        schema: SuggestISOComplianceImprovementsOutputSchema,
    },
  });

  return llmResponse.output()!;
}
