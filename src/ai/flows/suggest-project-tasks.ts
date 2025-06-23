'use server';
/**
 * @fileOverview An AI agent that suggests a list of tasks for a construction project.
 *
 * - suggestProjectTasks - A function that handles the task suggestion process.
 * - SuggestProjectTasksInput - The input type for the suggestProjectTasks function.
 * - SuggestProjectTasksOutput - The return type for the suggestProjectTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const SuggestProjectTasksInputSchema = z.object({
  projectName: z.string().describe('The name of the construction project.'),
  projectDescription: z.string().describe('A detailed description of the project.'),
});
export type SuggestProjectTasksInput = z.infer<typeof SuggestProjectTasksInputSchema>;

const TaskSchema = z.object({
    name: z.string().describe('A concise name for a single project task.'),
});

export const SuggestProjectTasksOutputSchema = z.object({
  tasks: z.array(TaskSchema).describe('An array of suggested tasks for the project.'),
});
export type SuggestProjectTasksOutput = z.infer<typeof SuggestProjectTasksOutputSchema>;

export async function suggestProjectTasks(
  input: SuggestProjectTasksInput
): Promise<SuggestProjectTasksOutput> {
  return suggestProjectTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestProjectTasksPrompt',
  input: {schema: SuggestProjectTasksInputSchema},
  output: {schema: SuggestProjectTasksOutputSchema},
  prompt: `You are an expert construction project manager. Based on the following project details, generate a comprehensive list of common tasks required for such a project. The tasks should be logical and sequential where appropriate.

  Project Name: {{{projectName}}}
  Project Description: {{{projectDescription}}}
  `,
});

const suggestProjectTasksFlow = ai.defineFlow(
  {
    name: 'suggestProjectTasksFlow',
    inputSchema: SuggestProjectTasksInputSchema,
    outputSchema: SuggestProjectTasksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
