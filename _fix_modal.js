const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'pages', 'home.js');
let content = fs.readFileSync(filePath, 'utf8');

// Find the start of the corrupted modal block (everything from the blank line after </div> to the end of TabPerfil closing })
// The anchor: after the last </div> before  );  }  in TabPerfil, before the NOTIF CARD comment
// We'll replace from the blank line + "{/* Main character picker" to "  );\n}\n\n" that closes TabPerfil (before NOTIF CARD)

// First, find the end of the stable part (the });  })} </div> etc.) and the start of what we want to KEEP in the return
// We want to remove everything from "    </div>\r\n\r\n    {/* Main character picker" to "  );\r\n}\r\n" (the TabPerfil close)
// and replace with the correct version

// The stable anchor just before the modal:
// "      </div>\r\n    </div>\r\n\r\n    {/"
// The end of the region we want to replace:
// "    )}\r\n  );\r\n}\r\n"  (closing of showMainPicker condition, then TabPerfil return close)

// Let's find the unique end anchor: the })} that closes showMainPicker, then the ); and } at the top level
// Actually we'll use: from "    </div>\r\n\r\n    {/* Main character"  to and including "  );\r\n}\r\n\r\n" that's before NOTIF CARD

// Find VICTORIA anchor to locate the correct end of match
const victoriaIdx = content.indexOf("VICTORIA' : 'DERROTA'}");
if (victoriaIdx === -1) {
  console.error('Could not find VICTORIA anchor');
  process.exit(1);
}

// We need to find: from right after the stable "})}  </div>  )}  </div>  </div>"
// to the closing "  );\n}\n\n" of TabPerfil

// Find "    </div>\r\n\r\n    {/*" that starts the modal region (or also the corrupted version)
// More precisely, we need to find from two blank-line before the modal to the function closing

// Strategy: replace from the blank line after the history list close to just before NOTIF CARD comment
// The VICTORIA/DERROTA section is before the history list close, which is:
//   </div>  </div>  );  })}  </div>  )}  </div>  </div>
// and the blank line after starts the modal

// Let me find the pattern:  "\r\n    </div>\r\n" that comes right after "      </div>\r\n"
// after VICTORIA

// Simpler: use a regex to find the region from after the last stable chars to before NOTIF CARD

// Find the second </div> after VICTORIA (5 closing divs total + ); + })
const afterVictoria = content.indexOf('\r\n  );\r\n}', victoriaIdx);
if (afterVictoria === -1) {
  console.error('Could not find TabPerfil closing after VICTORIA');
  process.exit(1);
}

// The end index is right after the closing }
const regionEnd = afterVictoria + '\r\n  );\r\n}'.length;
console.log('Region end (start of blank lines/NOTIF CARD):', regionEnd);
console.log('Content at region end:', JSON.stringify(content.substring(regionEnd, regionEnd + 30)));

// Find the start: the blank line + modal start (or just the \r\n\r\n before the modal)
// We need the content before tabPerfil's return closing divs
// Search backward from afterVictoria to find "    </div>\r\n\r\n" 
let blankLineStart = content.lastIndexOf('\r\n\r\n    {', afterVictoria);
if (blankLineStart === -1) {
  // Maybe the original  </div>  </div>  );  } without the modal
  blankLineStart = content.lastIndexOf('    </div>\r\n  );\r\n', afterVictoria);
  if (blankLineStart !== -1) blankLineStart += '    </div>\r\n'.length;
  else {
    console.error('Could not find start of region');
    process.exit(1);
  }
} else {
  blankLineStart += 2; // skip the first \r\n to keep the \r\n after the last </div>
}

console.log('Region start:', blankLineStart);
console.log('Content at region start:', JSON.stringify(content.substring(blankLineStart, blankLineStart + 50)));

const correctModal = `\r\n\r\n    {/* Main character picker modal */}\r\n    {showMainPicker && (\r\n      <div onClick={() => { setShowMainPicker(false); setPickerStep('char'); }} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>\r\n        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '80vh', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>\r\n          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0' }}>\r\n            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />\r\n          </div>\r\n          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>\r\n            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>\r\n              {pickerStep === 'alt' && <button onClick={() => setPickerStep('char')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>\u2190</button>}\r\n              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>{pickerStep === 'char' ? 'Elegir main' : 'Elegir skin'}</p>\r\n            </div>\r\n            <div style={{ display: 'flex', gap: 8 }}>\r\n              {mainChar && pickerStep === 'char' && <button onClick={clearMainChar} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#EF4444' }}>Quitar</button>}\r\n              <button onClick={() => { setShowMainPicker(false); setPickerStep('char'); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>\u2715</button>\r\n            </div>\r\n          </div>\r\n          {pickerStep === 'char' ? (\r\n            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 12px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>\r\n              {Object.entries(CHARACTER_RENDERS).map(([charId, renderFile]) => {\r\n                const charObj = CHARACTERS.find(c => c.id === charId);\r\n                const isSelected = mainChar === charId;\r\n                return (\r\n                  <button key={charId} onClick={() => { if (CHARACTER_ALT_FOLDERS[charId]) { setMainChar(charId); setPickerStep('alt'); } else { selectMainChar(charId, null); } }} style={{ background: isSelected ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', border: \`2px solid \${isSelected ? '#FF8C00' : 'rgba(255,255,255,0.06)'}\`, borderRadius: 12, padding: '8px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>\r\n                    <img src={charRenderPath(renderFile)} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />\r\n                    <span style={{ fontSize: 8, fontWeight: 700, color: isSelected ? '#FF8C00' : 'rgba(255,255,255,0.4)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{charObj?.name || charId}</span>\r\n                  </button>\r\n                );\r\n              })}\r\n            </div>\r\n          ) : (\r\n            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 12px 20px' }}>\r\n              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>\r\n                {CHARACTER_RENDERS[mainChar] && (\r\n                  <button onClick={() => selectMainChar(mainChar, null)} style={{ background: !mainCharAlt ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', border: \`2px solid \${!mainCharAlt ? '#FF8C00' : 'rgba(255,255,255,0.06)'}\`, borderRadius: 12, padding: '10px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>\r\n                    <img src={charRenderPath(CHARACTER_RENDERS[mainChar])} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />\r\n                    <span style={{ fontSize: 9, fontWeight: 700, color: !mainCharAlt ? '#FF8C00' : 'rgba(255,255,255,0.4)' }}>Default</span>\r\n                  </button>\r\n                )}\r\n                {charAltPaths(mainChar).map((altPath, i) => {\r\n                  const isSelected = mainCharAlt === altPath;\r\n                  return (\r\n                    <button key={i} onClick={() => selectMainChar(mainChar, altPath)} style={{ background: isSelected ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', border: \`2px solid \${isSelected ? '#FF8C00' : 'rgba(255,255,255,0.06)'}\`, borderRadius: 12, padding: '10px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>\r\n                      <img src={altPath} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />\r\n                      <span style={{ fontSize: 9, fontWeight: 700, color: isSelected ? '#FF8C00' : 'rgba(255,255,255,0.4)' }}>Alt {i + 3}</span>\r\n                    </button>\r\n                  );\r\n                })}\r\n              </div>\r\n            </div>\r\n          )}\r\n        </div>\r\n      </div>\r\n    )}\r\n  );\r\n}`;

const newContent = content.substring(0, blankLineStart) + correctModal + content.substring(regionEnd);

if (newContent === content) {
  console.error('No change made!');
  process.exit(1);
}

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('SUCCESS: file written correctly');
console.log(`File size: ${newContent.length} chars (was ${content.length})`);
