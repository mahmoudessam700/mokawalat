
'use server';

/**
 * @fileOverview Provides an AI-driven summary of supplier performance.
 *
 * - summarizeSupplierPerformance - A function that generates a summary of supplier performance.
 * - SummarizeSupplierPerformanceInput - The input type for the summarizeSupplierPerformance function.
 */
import { ai } from '@/ai';
import * as z from 'zod';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, doc, getDoc, where } from 'firebase/firestore';
import { format } from 'date-fns';

const SummarizeSupplierPerformanceInputSchema = z.object({
  supplierId: z.string().describe('The ID of the supplier to summarize.'),
});
export type SummarizeSupplierPerformanceInput = z.infer<typeof SummarizeSupplierPerformanceInputSchema>;

const SummarizeSupplierPerformanceOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the supplier\'s performance, highlighting reliability, contract history, and overall sentiment based on evaluations.'),
});
export type SummarizeSupplierPerformanceOutput = z.infer<
  typeof SummarizeSupplierPerformanceOutputSchema
>;

export async function summarizeSupplierPerformance(
  input: SummarizeSupplierPerformanceInput
): Promise<SummarizeSupplierPerformanceOutput> {
  const { supplierId } = input;
    
  // Fetch supplier details
  const supplierRef = doc(firestore, 'suppliers', supplierId);
  const supplierSnap = await getDoc(supplierRef);
  if (!supplierSnap.exists()) {
      throw new Error('Supplier not found.');
  }
  const supplierData = supplierSnap.data();

  // Fetch contracts
  const contractsQuery = query(collection(firestore, 'suppliers', supplierId, 'contracts'), orderBy('effectiveDate', 'desc'));
  const contractsSnapshot = await getDocs(contractsQuery);
  const contractsLog = contractsSnapshot.docs.map(d => {
      const data = d.data();
      const date = data.effectiveDate ? format((data.effectiveDate as Timestamp).toDate(), 'PPP') : 'N/A';
      return `- Contract: ${data.title}, Effective: ${date}`;
  }).join('\n');

  // Fetch Purchase Orders
  const poQuery = query(collection(firestore, 'procurement'), where('supplierId', '==', supplierId), orderBy('requestedAt', 'desc'));
  const poSnapshot = await getDocs(poQuery);
  const poLog = poSnapshot.docs.map(d => {
      const data = d.data();
      const date = data.requestedAt ? format((data.requestedAt as Timestamp).toDate(), 'PPP') : 'N/A';
      return `- PO: ${data.quantity}x ${data.itemName}, Status: ${data.status}, Date: ${date}`;
  }).join('\n');

  let performanceData = `
  **Evaluation:**
  Rating: ${supplierData.rating || 'Not Rated'} / 5
  Notes: ${supplierData.evaluationNotes || 'No notes.'}

  **Contracts:**
  ${contractsLog.length > 0 ? contractsLog : 'No contracts on record.'}

  **Purchase Order History:**
  ${poLog.length > 0 ? poLog : 'No purchase orders on record.'}
  `;

  const prompt = `You are an expert procurement analyst. Based on the following performance data for a supplier, provide a concise summary.
  
  The summary should highlight:
  - Reliability based on purchase order history (e.g., number of orders, statuses).
  - Key contract information.
  - Overall sentiment or performance based on internal ratings and notes.

  Supplier Performance Data:
  ${performanceData}
  `;

  const llmResponse = await ai.generate({
      model: 'googleai/gemini-pro',
      prompt: prompt,
      output: {
          format: 'json',
          schema: SummarizeSupplierPerformanceOutputSchema,
      }
  });

  return llmResponse.output()!;
}
