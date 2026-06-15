const BLOCK_START = "=========================================";
const HEADER_LABEL = "[HEADER] FILE PATH: ";
function toggleMenu() { document.getElementById('sidebar').classList.toggle('active'); document.getElementById('overlay').classList.toggle('active'); }
function resetApp() { document.getElementById('statusFeed').innerText = "Ready. Select an import method."; document.getElementById('outputBox').value = ""; document.getElementById('downloadLink').style.display = "none"; toggleMenu(); }
function triggerFolder() { toggleMenu(); document.getElementById('folderInput').click(); }
function triggerZip() { toggleMenu(); document.getElementById('zipInput').click(); }
function logStatus(msg) { document.getElementById('statusFeed').innerText = msg; }
async function processFolder() {
const files = Array.from(document.getElementById('folderInput').files);
const s = { skipGodot: document.getElementById('skipGodot').checked, skipAddons: document.getElementById('skipAddons').checked, wantGd: document.getElementById('incGd').checked, wantTscn: document.getElementById('incTscn').checked, wantTres: document.getElementById('incTres').checked, wantOther: document.getElementById('incOther').checked };
let finalBody = "";
let count = 0;
for (let file of files) {
const path = file.webkitRelativePath || file.name;
const lower = path.toLowerCase();
if (s.skipGodot && lower.includes('/.godot/')) continue;
if (s.skipAddons && lower.includes('/addons/')) continue;
if (!(lower.endsWith('.gd') && s.wantGd || lower.endsWith('.tscn') && s.wantTscn || lower.endsWith('.tres') && s.wantTres || ((lower.endsWith('.godot') || lower.endsWith('.cfg') || lower.endsWith('.json')) && s.wantOther))) continue;
try {
const content = await new Response(file).text();
finalBody += `${BLOCK_START}\n${HEADER_LABEL}res://${path}\n${BLOCK_START}\n\n${content}\n\n\n`;
count++;
} catch(e) { continue; }
}
document.getElementById('outputBox').value = finalBody;
setupDownload(finalBody);
logStatus(`Processed ${count} files.`);
}
async function processZip() {
const file = document.getElementById('zipInput').files[0];
const zip = await JSZip.loadAsync(file);
let finalBody = "";
let count = 0;
for (let path in zip.files) {
if (zip.files[path].dir) continue;
const content = await zip.files[path].async("string");
finalBody += `${BLOCK_START}\n${HEADER_LABEL}res://${path}\n${BLOCK_START}\n\n${content}\n\n\n`;
count++;
}
document.getElementById('outputBox').value = finalBody;
setupDownload(finalBody);
logStatus(`Processed ${count} files.`);
}
function setupDownload(data) {
const blob = new Blob([data], { type: "text/plain" });
const link = document.getElementById('downloadLink');
link.href = URL.createObjectURL(blob);
link.download = "Exported_Godot_Project.txt";
link.style.display = "block";
  }
