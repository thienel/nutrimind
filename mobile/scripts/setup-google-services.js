#!/usr/bin/env node
/**
 * scripts/setup-google-services.js
 *
 * Tạo google-services.json và GoogleService-Info.plist từ environment variables.
 * Chạy trước khi build: node scripts/setup-google-services.js
 *
 * Required env vars:
 *   GOOGLE_SERVICES_JSON       — base64 của google-services.json
 *   GOOGLE_SERVICE_INFO_PLIST  — base64 của GoogleService-Info.plist
 *
 * Cách encode (chạy 1 lần, lưu vào CI secrets):
 *   [Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json"))     # PowerShell
 *   base64 -w0 google-services.json                                                  # Linux/Mac
 */

const fs = require("fs");
const path = require("path");

function writeFromBase64(envVar, destPath) {
  const b64 = process.env[envVar];
  if (!b64) {
    console.warn(`⚠️  ${envVar} not set — skipping ${path.basename(destPath)}`);
    return false;
  }
  const buf = Buffer.from(b64, "base64");
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
  console.log(`✅  Written: ${destPath}`);
  return true;
}

const root = path.resolve(__dirname, "..");

writeFromBase64(
  "GOOGLE_SERVICES_JSON",
  path.join(root, "android", "app", "google-services.json")
);

writeFromBase64(
  "GOOGLE_SERVICE_INFO_PLIST",
  path.join(root, "GoogleService-Info.plist")
);
