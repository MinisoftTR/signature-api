#!/usr/bin/env node

const SignatureOrganizer = require('./utils/signatureOrganizer');
const path = require('path');

async function main() {
  console.log('🗂️  Starting signature organization process...\n');

  // Initialize organizer
  const organizer = new SignatureOrganizer('./signature-requests');

  try {
    // Process existing logs
    console.log('📋 Processing signature request logs...');
    await organizer.processExistingLogs('./@data/signatures/signature_requests.log');

    console.log('\n📁 Processing generated signature files...');
    await organizer.processExistingSignatures('./generated-signatures');

    console.log('\n📊 Generating organization report...');
    const report = organizer.generateReport();

    console.log('\n✅ Organization complete!');
    console.log('\n📂 New folder structure:');
    console.log(`   signature-requests/`);
    console.log(`   ├── YYYY-MM-DD/`);
    console.log(`   │   └── user_name/`);
    console.log(`   │       ├── signatures/`);
    console.log(`   │       ├── logs/`);
    console.log(`   │       └── summary.json`);
    console.log(`   ├── logs/`);
    console.log(`   │   ├── daily/`);
    console.log(`   │   └── users/`);
    console.log(`   ├── stats/`);
    console.log(`   └── organization-report.json`);

  } catch (error) {
    console.error('❌ Error during organization:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SignatureOrganizer };