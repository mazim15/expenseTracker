// Grants (or revokes) the `admin` custom claim checked by firestore.rules and the admin logs page.
// This script requires Firebase Admin SDK and a service account key:
//   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json node scripts/set-admin.js <uid> [--revoke]
// The user must sign out and back in (or wait up to an hour) for the claim to take effect.

const admin = require("firebase-admin");

admin.initializeApp();

async function setAdmin() {
  const uid = process.argv[2];
  const revoke = process.argv.includes("--revoke");
  if (!uid) {
    console.error("Usage: node scripts/set-admin.js <uid> [--revoke]");
    process.exit(1);
  }

  await admin.auth().setCustomUserClaims(uid, revoke ? { admin: null } : { admin: true });
  console.log(`${revoke ? "Revoked" : "Granted"} admin claim for ${uid}`);
}

setAdmin().catch((error) => {
  console.error("Error setting admin claim:", error);
  process.exit(1);
});
