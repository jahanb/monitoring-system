// scripts/verify-setup.js
// Run with: node scripts/verify-setup.js

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  // Components
  'components/layout/MainLayout.tsx',
  'components/monitors/MonitorForm.tsx',
  
  // Pages
  'app/layout.tsx',
  'app/page.tsx',
  'app/dashboard/page.tsx',
  'app/monitors/page.tsx',
  'app/monitors/new/page.tsx',
  'app/monitors/[id]/edit/page.tsx',
  
  // API Routes
  'app/api/monitors/route.ts',
  'app/api/monitors/[id]/route.ts',
  'app/api/health/route.ts',
  
  // Library
  'lib/db/mongodb.ts',
  'lib/models/Monitor.ts',
  'lib/models/TimeSeries.ts',
  'lib/theme.ts',
  
  // Config
  'package.json',
  'tsconfig.json',
  'next.config.js',
];

const requiredDirs = [
  'components/layout',
  'components/monitors',
  'app/api/monitors/[id]',
  'app/monitors/new',
  'app/monitors/[id]/edit',
  'app/dashboard',
  'lib/db',
  'lib/models',
];

console.log('🔍 Verifying project setup...\n');

let missingFiles = [];
let missingDirs = [];

// Check directories
console.log('📁 Checking directories...');
requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    missingDirs.push(dir);
    console.log(`❌ Missing: ${dir}`);
  } else {
    console.log(`✅ Found: ${dir}`);
  }
});

console.log('\n📄 Checking files...');
// Check files
requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
    console.log(`❌ Missing: ${file}`);
  } else {
    console.log(`✅ Found: ${file}`);
  }
});

// Check .env.local
console.log('\n⚙️  Checking configuration...');
if (!fs.existsSync('.env.local')) {
  console.log('⚠️  Warning: .env.local not found');
  console.log('   Copy .env.local.example to .env.local and configure it');
} else {
  console.log('✅ Found: .env.local');
}

// Check tsconfig.json paths
if (fs.existsSync('tsconfig.json')) {
  const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
    console.log('✅ TypeScript paths configured');
  } else {
    console.log('⚠️  Warning: TypeScript paths not configured');
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY\n');
console.log(`Total Files Checked: ${requiredFiles.length}`);
console.log(`✅ Found: ${requiredFiles.length - missingFiles.length}`);
console.log(`❌ Missing: ${missingFiles.length}`);
console.log(`\nTotal Directories Checked: ${requiredDirs.length}`);
console.log(`✅ Found: ${requiredDirs.length - missingDirs.length}`);
console.log(`❌ Missing: ${missingDirs.length}`);

if (missingFiles.length > 0 || missingDirs.length > 0) {
  console.log('\n❌ Setup is INCOMPLETE\n');
  
  if (missingDirs.length > 0) {
    console.log('Create missing directories:');
    missingDirs.forEach(dir => {
      console.log(`  mkdir -p ${dir}`);
    });
  }
  
  if (missingFiles.length > 0) {
    console.log('\nMissing files need to be created:');
    missingFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
  }
  
  process.exit(1);
} else {
  console.log('\n✅ Setup is COMPLETE!\n');
  console.log('Next steps:');
  console.log('  1. Configure .env.local with your MongoDB URI');
  console.log('  2. Run: npm run init-db');
  console.log('  3. Run: npm run dev');
  console.log('  4. Visit: http://localhost:3000\n');
  process.exit(0);
}