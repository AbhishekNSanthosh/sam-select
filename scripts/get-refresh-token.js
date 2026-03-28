// scripts/get-refresh-token.js
// Run this file once locally to generate a persistent Refresh Token.
// Usage: node scripts/get-refresh-token.js

const { google } = require("googleapis");
const http = require("http");
const url = require("url");
require("dotenv").config({ path: ".env.local" });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/api/auth/callback/google";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authorizeUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", 
  scope: ["https://www.googleapis.com/auth/drive"],
  prompt: "consent", 
});

const server = http.createServer(async (req, res) => {
  try {
    if (req.url && req.url.startsWith("/api/auth/callback/google")) {
      const q = url.parse(req.url, true).query;
      
      if (q.error) {
        console.log("Error:" + q.error);
        res.end("Error occurred. Check console.");
      } else if (q.code) {
        const { tokens } = await oauth2Client.getToken(q.code);
        
        console.log("\n--- SUCCESS ---");
        console.log("\nAdd this to your .env.local file:");
        console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
        console.log("\n-----------------\n");
        
        res.end("Success! Check your terminal for the Refresh Token. You may close this tab.");
        process.exit(0);
      }
    }
  } catch (e) {
    console.error(e);
    res.end("Error occurred. Check console.");
  }
}).listen(3000, () => {
  console.log("\n1. CLICK THIS URL TO AUTHORIZE:");
  console.log("-----------------------------------------");
  console.log(authorizeUrl);
  console.log("-----------------------------------------\n");
});
