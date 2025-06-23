
'use server';

import { summarizeEmployeePerformance } from '@/ai/flows/summarize-employee-performance';

export async function getEmployeePerformanceSummary(employeeId: string) {
    if (!employeeId) {
        return { error: true, message: 'Employee ID is required.', data: null };
    }

    try {
        const result = await summarizeEmployeePerformance({ employeeId });
        
        if (result.summary) {
             return { error: false, message: 'Summary generated.', data: result };
        } else {
            return { error: true, message: 'AI could not generate a summary.', data: null };
        }

    } catch(error) {
        console.error('Error generating employee performance summary:', error);
        return { error: true, message: 'An unexpected error occurred while generating the summary.', data: null };
    }
}
