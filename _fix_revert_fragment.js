const fs = require('fs');

const filePath = 'pages/home.js';
let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Remove the incorrectly added <> from the wrong component (TabInicio/TabAmigos around line 1552)
// Pattern that was INCORRECTLY changed: "  return (\r\n    <>\r\n    <div style={{ paddingBottom: 32 }}>"
// Should be: "  return (\r\n    <div style={{ paddingBottom: 32 }}>"  (the original)
const wrongFragment = '  return (\r\n    <>\r\n    <div style={{ paddingBottom: 32 }}>';

// But wait - there might be TWO occurrences of this if TabPerfil was also changed.
// Let's check: TabInicio is at line ~1156, TabAmigos at ~1341, TabPerfil at ~2209
// The script matched the FIRST occurrence which should be TabInicio or TabAmigos
let idx1 = content.indexOf(wrongFragment);
if (idx1 !== -1) {
  const lineNum = content.substring(0, idx1).split('\n').length;
  console.log('Wrong fragment found at line:', lineNum, 'index:', idx1);
  // Remove the <> from this location
  content = content.substring(0, idx1) + '  return (\r\n    <div style={{ paddingBottom: 32 }}>' + content.substring(idx1 + wrongFragment.length);
  console.log('Removed incorrect <> fragment');
} else {
  console.log('Wrong fragment not found (may have already been correct)');
}

// Step 2: Remove the incorrect </> added before the TabPerfil closing
// The incorrect addition: "\r\n    </>\r\n  );\r\n}" at some point
// We need to check if this exists in the NoticCard or TabPerfil area
const wrongClose = '\r\n    </>\r\n  );\r\n}';
// Find all occurrences
let searchFrom = 0;
let count = 0;
while (true) {
  const idx = content.indexOf(wrongClose, searchFrom);
  if (idx === -1) break;
  const lineNum = content.substring(0, idx).split('\n').length;
  console.log('Found </> close at line:', lineNum, 'index:', idx);
  searchFrom = idx + 1;
  count++;
}

// The one we want to remove should be in TabPerfil context (after showMainPicker)
// TabPerfil ends around line 3040-3050
const showMainPickerIdx = content.indexOf('showMainPicker && (');
if (showMainPickerIdx === -1) {
  console.error('Cannot find showMainPicker');
  process.exit(1);
}
const wrongCloseIdx = content.indexOf(wrongClose, showMainPickerIdx);
if (wrongCloseIdx !== -1) {
  const lineNum = content.substring(0, wrongCloseIdx).split('\n').length;
  console.log('Wrong </> close in TabPerfil at line:', lineNum);
  // Replace: "\r\n    </>\r\n  );\r\n}" with "\r\n  );\r\n}"
  content = content.substring(0, wrongCloseIdx) + '\r\n  );\r\n}' + content.substring(wrongCloseIdx + wrongClose.length);
  console.log('Removed incorrect </> close');
} else {
  console.log('Wrong </> close not found in TabPerfil area');
}

// Now verify the current state of TabPerfil's return
const tabPerfilIdx = content.indexOf('function TabPerfil(');
const returnInTabPerfil = content.indexOf('  return (', tabPerfilIdx);
const lineNum = content.substring(0, returnInTabPerfil).split('\n').length;
console.log('\nTabPerfil return at line:', lineNum);
console.log('Context:', JSON.stringify(content.substring(returnInTabPerfil, returnInTabPerfil + 80)));

fs.writeFileSync(filePath, content, 'utf8');
console.log('\nFile written. Size:', content.length);
