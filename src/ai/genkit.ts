import {configureGenkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// In Genkit v0.x, we define and export the model instances we want to use.
export const geminiPro = googleAI.model('gemini-pro');

// The `configureGenkit` function is used to initialize Genkit with plugins and settings.
configureGenkit({
  plugins: [
    googleAI(),
  ],
  // We can enable logging to help with debugging.
  logLevel: 'debug',
  // This is recommended for production environments.
  enableTracingAndMetrics: true,
});
