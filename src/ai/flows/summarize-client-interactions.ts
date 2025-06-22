'use server';

/**
 * @fileOverview Provides an AI-driven summary of client interactions.
 *
 * - summarizeClientInteractions - A function that generates a summary of client interactions.
 * - SummarizeClientInteractionsInput - The input type for the summarizeClientInteractions function.
 * - SummarizeClientInteractionsOutput - The return type for the summarizeClientInteractions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const SummarizeClientInteractionsInputSchema = z.object({
  interactionLog: z
    .string()
    .describe('A chronological log of all interactions with a client, including dates, types, and notes.'),
});
export type SummarizeClientInteractionsInput = z.infer<
  typeof SummarizeClientInteractionsInputSchema
>;

export const SummarizeClientInteractionsOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the client relationship based on the interaction history, highlighting key events, recent topics, and overall sentiment.'),
});
export type SummarizeClientInteractionsOutput = z.infer<
  typeof SummarizeClientInteractionsOutputSchema
>;

export async function summarizeClientInteractions(
  input: SummarizeClientInteractionsInput
): Promise<SummarizeClientInteractionsOutput> {
  return summarizeClientInteractionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeClientInteractionsPrompt',
  input: {schema: SummarizeClientInteractionsInputSchema},
  output: {schema: SummarizeClientInteractionsOutputSchema},
  prompt: `You are an expert CRM assistant. Based on the following interaction log, provide a concise summary of the client relationship. 
  
  The summary should highlight:
  - Key events or decisions made.
  - The most recent topics of discussion.
  - The overall sentiment or health of the client relationship (e.g., positive, neutral, needs attention).

  Interaction Log:
  {{{interactionLog}}}
  `,
});

const summarizeClientInteractionsFlow = ai.defineFlow(
  {
    name: 'summarizeClientInteractionsFlow',
    inputSchema: SummarizeClientInteractionsInputSchema,
    outputSchema: SummarizeClientInteractionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
