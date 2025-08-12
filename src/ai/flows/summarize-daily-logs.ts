
'use server';

/**
 * @fileOverview Provides an AI-driven summary of project daily logs.
 *
 * - summarizeDailyLogs - A function that generates a summary of daily logs for a project.
 * - SummarizeDailyLogsInput - The input type for the summarizeDailyLogs function.
 */
import { ai } from '@/ai';
import * as z from 'zod';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, orderBy, query, type Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

const SummarizeDailyLogsInputSchema = z.object({
  projectId: z.string().describe('The ID of the project to summarize logs for.'),
});
export type SummarizeDailyLogsInput = z.infer<typeof SummarizeDailyLogsInputSchema>;

const SummarizeDailyLogsOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the project\'s status based on the daily logs, highlighting key progress, blockers, and overall sentiment.'),
});
type SummarizeDailyLogsOutput = z.infer<typeof SummarizeDailyLogsOutputSchema>;

export async function summarizeDailyLogs(
  input: SummarizeDailyLogsInput
): Promise<SummarizeDailyLogsOutput> {
    const { projectId } = input;
    const logsQuery = query(
        collection(firestore, 'projects', projectId, 'dailyLogs'),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(logsQuery);
    
    if (snapshot.empty) {
        return { summary: 'No daily logs have been recorded for this project yet. Cannot generate a summary.' };
    }
    
    const logHistory = snapshot.docs.map(doc => {
        const data = doc.data() as { createdAt: Timestamp; authorEmail: string; notes: string };
        const date = data.createdAt ? format(data.createdAt.toDate(), 'PPP') : 'N/A';
        return `- Date: ${date}, Author: ${data.authorEmail}\n  Log: ${data.notes}`;
    }).join('\n\n');

    const prompt = `You are an expert construction project manager's assistant. Based on the following daily log history, provide a concise summary of the project's status. 
  
    The summary should highlight:
    - Key progress and achievements.
    - Any mentioned blockers, risks, or issues.
    - The overall sentiment or momentum of the project (e.g., on track, delayed, facing challenges).
  
    Daily Log History:
    ${logHistory}
    `;

    const llmResponse = await ai.generate({
        model: 'googleai/gemini-pro',
        prompt: prompt,
        output: {
            format: 'json',
            schema: SummarizeDailyLogsOutputSchema
        }
    });

    return llmResponse.output()!;
}
