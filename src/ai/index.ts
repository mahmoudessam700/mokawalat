
import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { generate, generateStream } from '@genkit-ai/ai';

// Initialize Genkit once for the server runtime
configureGenkit({
  plugins: [googleAI()],
  enableTracingAndMetrics: true,
});

// Minimal wrapper to keep existing callsites: ai.generate(...)
export const ai = {
  generate,
  generateStream,
};
