#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Source file locations
const sources = [
  'c:\\Users\\Vipul preetham\\Desktop\\ClinicCRM\\reminder_processor_index.ts',
  'c:\\Users\\Vipul preetham\\Desktop\\ClinicCRM\\clinic-crm\\supabase\\functions\\reminder-processor.ts'
];

// Destination
const dest = 'c:\\Users\\Vipul preetham\\Desktop\\ClinicCRM\\clinic-crm\\supabase\\functions\\reminder-processor\\index.ts';
const destDir = path.dirname(dest);

// Create the directory structure
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`Created directory: ${destDir}`);
}

// Read from the first available source
let content = null;
for (const source of sources) {
  if (fs.existsSync(source)) {
    content = fs.readFileSync(source, 'utf8');
    console.log(`Read from: ${source}`);
    break;
  }
}

if (!content) {
  console.error('No source file found!');
  process.exit(1);
}

// Write to destination
fs.writeFileSync(dest, content, 'utf8');
console.log(`✓ Created: ${dest}`);

// Clean up temporary files
const tempFiles = [
  'c:\\Users\\Vipul preetham\\Desktop\\ClinicCRM\\reminder_processor_index.ts',
  'c:\\Users\\Vipul preetham\\Desktop\\ClinicCRM\\clinic-crm\\supabase\\functions\\reminder-processor.ts',
  'c:\\Users\\Vipul preetham\\Desktop\\ClinicCRM\\clinic-crm\\supabase\\functions\\whatsapp-send\\reminder-processor.ts',
  'c:\\Users\\Vipul preetham\\Desktop\\ClinicCRM\\clinic-crm\\supabase\\functions\\whatsapp-webhook\\reminder-processor-index.ts'
];

tempFiles.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`Cleaned up: ${file}`);
    }
  } catch (err) {
    console.log(`Could not clean up ${file}: ${err.message}`);
  }
});

console.log('\n✓ reminder-processor Edge Function created successfully!');
