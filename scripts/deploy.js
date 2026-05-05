const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Starting SafeSpace deployment...');

// Change to project root
process.chdir('/Users/crystalmae/Downloads/In case of emergency/SafeSpace');

async function runCommand(command, description) {
  console.log(`\n📋 ${description}`);
  console.log(`💻 Running: ${command}`);
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn(`⚠️ Warning: ${stderr}`);
      }
      
      if (stdout) {
        console.log(`✅ Output: ${stdout}`);
      }
      
      resolve(stdout);
    });
  });
}

async function deploy() {
  try {
    // Step 1: Build frontend
    console.log('\n🏗️ Building frontend...');
    await runCommand('cd frontend && npm run build', 'Building React application');
    
    // Step 2: Check if build exists
    await runCommand('ls -la frontend/dist/', 'Checking build output');
    
    // Step 3: Deploy to Firebase
    console.log('\n🔥 Deploying to Firebase...');
    await runCommand('npx firebase-tools deploy --only hosting --project safespace-7c5e3', 'Deploying to Firebase Hosting');
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log('🌐 Your app should be live at: https://safespace-7c5e3.web.app');
    console.log('🔗 Admin panel: https://safespace-7c5e3.web.app/admin/login');
    
  } catch (error) {
    console.error('\n💥 Deployment failed:', error.message);
    
    // Fallback: Try with regular firebase command
    console.log('\n🔄 Trying alternative deployment method...');
    try {
      await runCommand('firebase deploy --only hosting', 'Alternative Firebase deploy');
      console.log('\n🎉 Alternative deployment succeeded!');
    } catch (fallbackError) {
      console.error('\n❌ All deployment methods failed');
      console.log('\n📋 Manual deployment steps:');
      console.log('1. cd frontend && npm run build');
      console.log('2. firebase login');
      console.log('3. firebase deploy --only hosting');
    }
  }
}

deploy();
