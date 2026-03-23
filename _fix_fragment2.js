const fs = require('fs');

const filePath = 'pages/home.js';
let content = fs.readFileSync(filePath, 'utf8');

// TabPerfil return is currently:
//   return (
//     <div style={{ paddingBottom: 32 }}>
//       ...
//     </div>
//
//     {/* Main character picker modal */}
//     {showMainPicker && (...)}
//   );
// }
//
// We need:
//   return (
//     <>
//     <div style={{ paddingBottom: 32 }}>
//       ...
//     </div>
//
//     {/* Main character picker modal */}
//     {showMainPicker && (...)}
//     </>
//   );
// }

// Step 1: Find TabPerfil's return and add <> after it
const tabPerfilIdx = content.indexOf('function TabPerfil(');
if (tabPerfilIdx === -1) { console.error('TabPerfil not found'); process.exit(1); }

const returnInTabPerfil = content.indexOf('  return (\r\n    <div style={{ paddingBottom: 32 }}>', tabPerfilIdx);
if (returnInTabPerfil === -1) { console.error('TabPerfil return not found'); process.exit(1); }

const lineNum = content.substring(0, returnInTabPerfil).split('\n').length;
console.log('TabPerfil return at line:', lineNum, 'index:', returnInTabPerfil);

// Add <> wrapper
const oldReturn = '  return (\r\n    <div style={{ paddingBottom: 32 }}>';
const newReturn = '  return (\r\n    <>\r\n    <div style={{ paddingBottom: 32 }}>';
content = content.substring(0, returnInTabPerfil) + newReturn + content.substring(returnInTabPerfil + oldReturn.length);

// Step 2: Find the closing of TabPerfil's return after the modal
// We need to find "    )}\r\n  );\r\n}" that comes after showMainPicker
// and change it to "    )}\r\n    </>\r\n  );\r\n}"
const showPickerIdx = content.indexOf('showMainPicker && (', tabPerfilIdx);
if (showPickerIdx === -1) { console.error('showMainPicker not found'); process.exit(1); }

const closePattern = '\r\n    )}\r\n  );\r\n}';
const closeIdx = content.indexOf(closePattern, showPickerIdx);
if (closeIdx === -1) { console.error('Close pattern not found after modal'); process.exit(1); }

const closeLine = content.substring(0, closeIdx).split('\n').length;
console.log('Close pattern at line:', closeLine, 'index:', closeIdx);

// Replace with </> before the );
const oldClose = '\r\n    )}\r\n  );\r\n}';
const newClose = '\r\n    )}\r\n    </>\r\n  );\r\n}';
content = content.substring(0, closeIdx) + newClose + content.substring(closeIdx + oldClose.length);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fragment added correctly');
console.log('File size:', content.length);
