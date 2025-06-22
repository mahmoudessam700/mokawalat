'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/iso-compliance-suggestions.ts';
import '@/ai/flows/project-risk-analysis.ts';
