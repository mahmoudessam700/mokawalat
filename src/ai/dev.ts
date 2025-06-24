
'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/iso-compliance-suggestions.ts';
import '@/ai/flows/project-risk-analysis.ts';
import '@/ai/flows/summarize-client-interactions.ts';
import '@/ai/flows/summarize-daily-logs.ts';
import '@/ai/flows/summarize-supplier-performance.ts';
import '@/ai/flows/suggest-project-tasks.ts';
import '@/ai/flows/summarize-employee-performance.ts';
