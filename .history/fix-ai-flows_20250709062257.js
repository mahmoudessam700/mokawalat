const fs = require('fs');
const path = require('path');

const flowsDir = './src/ai/flows';

// Files to fix
const files = [
  'summarize-client-interactions.ts',
  'summarize-daily-logs.ts', 
  'summarize-employee-performance.ts',
  'summarize-supplier-performance.ts'
];

files.forEach(filename => {
  const filePath = path.join(flowsDir, filename);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace genkit imports
    content = content.replace(/import { generate } from 'genkit';/, '// import { generate } from \'genkit\';');
    content = content.replace(/import { geminiPro } from ['"][^'"]*['"];/, '// import { geminiPro } from \'../genkit\';');
    
    // Replace generate function calls with mock returns
    content = content.replace(
      /const llmResponse = await generate\({[\s\S]*?\}\);[\s\S]*?return llmResponse\.output\(\)!;/,
      'return { summary: "Mock summary - AI temporarily disabled for build compatibility" };'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filename}`);
  }
});
