
'use server';
/**
 * @fileOverview An AI agent that analyzes construction projects for potential risks.
 *
 * - analyzeProjectRisks - A function that handles the project risk analysis process.
 * - ProjectRiskAnalysisInput - The input type for the analyzeProjectRisks function.
 * - ProjectRiskAnalysisOutput - The return type for the analyzeProjectRisks function.
 */
import {ai} from '@/ai';
import * as z from 'zod';

const ProjectRiskAnalysisInputSchema = z.object({
  name: z.string().describe('The name of the construction project.'),
  description: z.string().describe('A detailed description of the project.'),
  budget: z.number().describe('The total budget for the project in the local currency.'),
  location: z.string().describe('The physical location of the project.'),
});
export type ProjectRiskAnalysisInput = z.infer<typeof ProjectRiskAnalysisInputSchema>;

const RiskSchema = z.object({
    risk: z.string().describe('A concise description of a single potential risk.'),
    severity: z.enum(['Low', 'Medium', 'High']).describe('The potential severity of the risk.'),
    mitigation: z.string().describe('A practical, actionable suggestion to mitigate this specific risk.'),
});

const ProjectRiskAnalysisOutputSchema = z.object({
  risks: z.array(RiskSchema).describe('An array of potential risks identified for the project.'),
});
export type ProjectRiskAnalysisOutput = z.infer<typeof ProjectRiskAnalysisOutputSchema>;

export async function analyzeProjectRisks(
  input: ProjectRiskAnalysisInput
): Promise<ProjectRiskAnalysisOutput> {
  const prompt = `You are an expert risk management consultant specializing in large-scale construction projects.

  Based on the following project details, identify a list of potential risks. For each risk, provide a severity level (Low, Medium, or High) and a practical suggestion for mitigation. Focus on common construction risks such as budget overruns, schedule delays, safety hazards, supplier issues, and regulatory hurdles. Also consider location-specific risks (e.g., geological, weather, local regulations).

  Project Name: ${input.name}
  Project Budget: ${input.budget}
  Project Location: ${input.location}
  Project Description: ${input.description}
  `;
  
  const llmResponse = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: prompt,
      output: {
          schema: ProjectRiskAnalysisOutputSchema
      }
  });
  
  return llmResponse.output()!;
}
