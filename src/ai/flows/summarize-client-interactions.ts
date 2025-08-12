
'use server';

/**
 * @fileOverview Provides an AI-driven summary of client interactions.
 *
 * - summarizeClientInteractions - A function that generates a summary of client interactions.
 * - SummarizeClientInteractionsInput - The input type for the summarizeClientInteractions function.
 * - SummarizeClientInteractionsOutput - The return type for the summarizeClientInteractions function.
 */
import {ai} from '@/ai';
import * as z from 'zod';

const SummarizeClientInteractionsInputSchema = z.object({
  interactionLog: z
    .string()
    .describe('A chronological log of all interactions with a client, including dates, types, and notes.'),
});
export type SummarizeClientInteractionsInput = z.infer<
  typeof SummarizeClientInteractionsInputSchema
>;

const SummarizeClientInteractionsOutputSchema = z.object({
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
  const prompt = `You are an expert CRM assistant. Based on the following interaction log, provide a concise summary of the client relationship. 
  
  The summary should highlight:
  - Key events or decisions made.
  - The most recent topics of discussion.
  - The overall sentiment or health of the client relationship (e.g., positive, neutral, needs attention).

  Interaction Log:
  ${input.interactionLog}
  `;

  const llmResponse = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: prompt,
      output: {
          schema: SummarizeClientInteractionsOutputSchema
      }
  });
  
  return llmResponse.output()!;
}
