const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.assignUserRole = functions.auth.user().onCreate(async (user) => {
  const email = user.email;

  try {
    // Set roles based on email (you can customize this logic)
    let role = "Teacher"; // Default role
    if (email.endsWith("@schooladmin.com")) {
      role = "Admin";
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, {role: "Admin"});
    console.log(`Custom claims set for ${email} with role: ${role}`);
  } catch (error) {
    console.error("Error setting custom claims:", error);
  }
});
