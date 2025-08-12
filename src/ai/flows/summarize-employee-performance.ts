
'use server';

/**
 * @fileOverview Provides an AI-driven summary of employee performance based on project assignments.
 *
 * - summarizeEmployeePerformance - A function that generates a summary of an employee's performance.
 * - SummarizeEmployeePerformanceInput - The input type for the summarizeEmployeePerformance function.
 */
import { ai } from '@/ai';
import * as z from 'zod';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const SummarizeEmployeePerformanceInputSchema = z.object({
  employeeId: z.string().describe('The ID of the employee to summarize.'),
});
export type SummarizeEmployeePerformanceInput = z.infer<typeof SummarizeEmployeePerformanceInputSchema>;

const SummarizeEmployeePerformanceOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the employee\'s performance, highlighting their role, number of projects, and key responsibilities based on their project involvement.'),
});
type SummarizeEmployeePerformanceOutput = z.infer<
  typeof SummarizeEmployeePerformanceOutputSchema
>;

export async function summarizeEmployeePerformance(
  input: SummarizeEmployeePerformanceInput
): Promise<SummarizeEmployeePerformanceOutput> {
  const { employeeId } = input;
    
  // Fetch employee details
  const employeeRef = doc(firestore, 'employees', employeeId);
  const employeeSnap = await getDoc(employeeRef);
  if (!employeeSnap.exists()) {
      throw new Error('Employee not found.');
  }
  const employeeData = employeeSnap.data();

  // Fetch projects
  const projectsQuery = query(collection(firestore, 'projects'), where('teamMemberIds', 'array-contains', employeeId));
  const projectsSnapshot = await getDocs(projectsQuery);
  const projectsLog = projectsSnapshot.docs.map(d => `- ${d.data().name} (Status: ${d.data().status})`).join('\n');

  let performanceData = `
  **Employee Details:**
  Name: ${employeeData.name}
  Role: ${employeeData.role}
  Department: ${employeeData.department}
  Status: ${employeeData.status}

  **Assigned Projects:**
  ${projectsLog.length > 0 ? projectsLog : 'No projects assigned.'}
  `;
  
  const prompt = `You are an expert HR manager writing a performance review. Based on the following data for an employee, provide a concise summary.
  
  The summary should highlight:
  - Their primary role.
  - The number and names of projects they are assigned to.
  - A brief, positive sentiment summary of their involvement.

  Employee Performance Data:
  ${performanceData}
  `;

  const llmResponse = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: prompt,
      output: {
          format: 'json',
          schema: SummarizeEmployeePerformanceOutputSchema
      }
  });

  return llmResponse.output()!;
}
