const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.helloWorld = functions.https.onCall((data, context) => {
  return {
    message: "Hello from the backend! The function is deploying successfully."
  };
}); 