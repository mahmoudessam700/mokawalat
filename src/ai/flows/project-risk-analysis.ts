'use server';
/**
 * @fileOverview An AI agent that analyzes construction projects for potential risks.
 *
 * - analyzeProjectRisks - A function that handles the project risk analysis process.
 * - ProjectRiskAnalysisInput - The input type for the analyzeProjectRisks function.
 * - ProjectRiskAnalysisOutput - The return type for the analyzeProjectRisks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const ProjectRiskAnalysisInputSchema = z.object({
  name: z.string().describe('The name of the construction project.'),
  description: z.string().describe('A detailed description of the project.'),
  budget: z.number().describe('The total budget for the project in the local currency.'),
});
export type ProjectRiskAnalysisInput = z.infer<typeof ProjectRiskAnalysisInputSchema>;

const RiskSchema = z.object({
    risk: z.string().describe('A concise description of a single potential risk.'),
    severity: z.enum(['Low', 'Medium', 'High']).describe('The potential severity of the risk.'),
    mitigation: z.string().describe('A practical, actionable suggestion to mitigate this specific risk.'),
});

export const ProjectRiskAnalysisOutputSchema = z.object({
  risks: z.array(RiskSchema).describe('An array of potential risks identified for the project.'),
});
export type ProjectRiskAnalysisOutput = z.infer<typeof ProjectRiskAnalysisOutputSchema>;

export async function analyzeProjectRisks(
  input: ProjectRiskAnalysisInput
): Promise<ProjectRiskAnalysisOutput> {
  return projectRiskAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'projectRiskAnalysisPrompt',
  input: {schema: ProjectRiskAnalysisInputSchema},
  output: {schema: ProjectRiskAnalysisOutputSchema},
  prompt: `You are an expert risk management consultant specializing in large-scale construction projects.

  Based on the following project details, identify a list of potential risks. For each risk, provide a severity level (Low, Medium, or High) and a practical suggestion for mitigation. Focus on common construction risks such as budget overruns, schedule delays, safety hazards, supplier issues, and regulatory hurdles.

  Project Name: {{{name}}}
  Project Budget: {{{budget}}}
  Project Description: {{{description}}}
  `,
});

const projectRiskAnalysisFlow = ai.defineFlow(
  {
    name: 'projectRiskAnalysisFlow',
    inputSchema: ProjectRiskAnalysisInputSchema,
    outputSchema: ProjectRiskAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
