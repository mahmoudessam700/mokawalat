
'use server';
/**
 * @fileOverview An AI agent that suggests a list of tasks for a construction project.
 *
 * - suggestProjectTasks - A function that handles the task suggestion process.
 * - SuggestProjectTasksInput - The input type for the suggestProjectTasks function.
 * - SuggestProjectTasksOutput - The return type for the suggestProjectTasks function.
 */
// Temporarily disabled for build compatibility
// import { generate } from 'genkit';
import * as z from 'zod';
// import { geminiPro } from '../genkit';

const SuggestProjectTasksInputSchema = z.object({
  projectName: z.string().describe('The name of the construction project.'),
  projectDescription: z.string().describe('A detailed description of the project.'),
});
export type SuggestProjectTasksInput = z.infer<typeof SuggestProjectTasksInputSchema>;

const TaskSchema = z.object({
    name: z.string().describe('A concise name for a single project task.'),
});

const SuggestProjectTasksOutputSchema = z.object({
  tasks: z.array(TaskSchema).describe('An array of suggested tasks for the project.'),
});
export type SuggestProjectTasksOutput = z.infer<typeof SuggestProjectTasksOutputSchema>;

export async function suggestProjectTasks(
  input: SuggestProjectTasksInput
): Promise<SuggestProjectTasksOutput> {
  // Temporarily returning mock data for build compatibility
  return {
    tasks: [
      { name: 'Site survey and preparation' },
      { name: 'Obtain building permits' },
      { name: 'Foundation excavation' },
      { name: 'Foundation pouring' },
      { name: 'Structural framing' },
      { name: 'Electrical rough-in' },
      { name: 'Plumbing rough-in' },
      { name: 'Insulation installation' },
      { name: 'Drywall installation' },
      { name: 'Final inspections' }
    ]
  };
}
