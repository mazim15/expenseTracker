// This script requires Firebase Admin SDK
// Run with: node scripts/reset-password.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
// const serviceAccount = require('./path/to/your/service-account-key.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

async function updateUserPassword() {
  try {
    const uid = 'CKp1WUjvLAd11B6BwVF5cUQrmb63';
    const newPassword = '456456@Azeem';
    
    await admin.auth().updateUser(uid, {
      password: newPassword
    });
    
    console.log('Password updated successfully');
  } catch (error) {
    console.error('Error updating password:', error);
  }
}

// updateUserPassword();