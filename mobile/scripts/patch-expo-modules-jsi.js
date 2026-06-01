// Fixes expo-modules-jsi build on macOS when GNU sed (Homebrew) overrides BSD sed.
// The build-xcframework.sh script uses `sed -i ''` which is BSD sed syntax.
// GNU sed treats `''` as a separate argument (the script), breaking the command.
// This patch replaces `sed` with `/usr/bin/sed` to always use macOS BSD sed.
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '../node_modules/expo-modules-jsi/apple/scripts/build-xcframework.sh',
);

if (!fs.existsSync(target)) {
  console.log('patch-expo-modules-jsi: file not found, skipping.');
  process.exit(0);
}

let content = fs.readFileSync(target, 'utf8');
const patched = content.replace(
  /-exec sed -i ''/g,
  "-exec /usr/bin/sed -i ''",
);

if (patched === content) {
  console.log('patch-expo-modules-jsi: already patched or pattern not found.');
} else {
  fs.writeFileSync(target, patched);
  console.log('patch-expo-modules-jsi: patched build-xcframework.sh to use /usr/bin/sed');
}
