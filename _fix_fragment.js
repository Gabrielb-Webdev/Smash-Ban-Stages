const fs = require('fs');

const filePath = 'pages/home.js';
let content = fs.readFileSync(filePath, 'utf8');

// We need to:
// 1. Add <> after "return (" in TabPerfil (around line 2356)
// 2. Change the ");\n}" closing of TabPerfil to add </>

// Find the exact return ( in TabPerfil context
// The return is unique enough with "paddingBottom: 32"
const returnAnchor = '  return (\r\n    <div style={{ paddingBottom: 32 }}>';
const idx = content.indexOf(returnAnchor);
if (idx === -1) {
  console.error('Could not find return anchor');
  process.exit(1);
}
console.log('Return anchor found at:', idx);

// Replace "return (\r\n    <div" with "return (\r\n    <>\r\n    <div"
content = content.replace(returnAnchor, '  return (\r\n    <>\r\n    <div style={{ paddingBottom: 32 }}>');

// Now we need to change the closing of the TabPerfil return
// The current closing is:
//     )}\r\n  );\r\n}\r\n  (where the }) closes showMainPicker, then ); closes return, then } closes function)
// We need to insert </> before the );
// Pattern: "\r\n    )}\r\n  );\r\n}" (closes showMainPicker modal, then return, then function)

const closeAnchor = '\r\n    )}\r\n  );\r\n}';
// This might appear in multiple places. Let's find the one after showMainPicker
const modalIdx = content.indexOf('showMainPicker && (');
if (modalIdx === -1) {
  console.error('Could not find showMainPicker &&');
  process.exit(1);
}

const closeIdx = content.indexOf(closeAnchor, modalIdx);
if (closeIdx === -1) {
  console.error('Could not find closing anchor after modal');
  process.exit(1);
}
console.log('Close anchor found at:', closeIdx);

// Replace the closing: add </> before );
content = content.substring(0, closeIdx) + '\r\n    </>\r\n  );\r\n}' + content.substring(closeIdx + closeAnchor.length);

fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: Fragment wrapper added');
console.log('File size:', content.length);
