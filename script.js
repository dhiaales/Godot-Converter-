const BLOCK_START = "=========================================";
const HEADER_LABEL = "[HEADER] FILE PATH: ";

// ---- UI LOGIC ----
function logStatus(msg, type = "info") {
  const feed = document.getElementById('statusFeed');
  const div = document.createElement('div');
  if (type === "thinking") div.innerHTML = `<span style="color:#478cb5">[...]</span> ${msg}`;
  else if (type === "success") div.innerHTML = `<span style="color:#ffb7c5">[✓]</span> <span style="color:#fff">${msg}</span>`;
  else if (type === "error") div.innerHTML = `<span style="color:red">[X]</span> ${msg}`;
  else div.innerHTML = msg;
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

function resetUI() {
  document.getElementById('statusFeed').innerHTML = "";
  document.getElementById('outputBox').value = "";
  document.getElementById('downloadLink').style.display = "none";
}

// ---- COMPILER LOGIC ----
function buildExportBlock(path, content) {
  return `${BLOCK_START}\n${HEADER_LABEL}res://${path}\n${BLOCK_START}\n\n${content}\n\n\n`;
}

function getSettings() {
  return {
    skipGodot: document.getElementById('skipGodot').checked,
    skipAddons: document.getElementById('skipAddons').checked,
    wantGd: document.getElementById('incGd').checked,
    wantTscn: document.getElementById('incTscn').checked,
    wantTres: document.getElementById('incTres').checked,
    wantOther: document.getElementById('incOther').checked
  };
}

function isValidFile(lowerPath, s) {
  // Folder filters
  if (s.skipGodot && (lowerPath.includes('/.godot/') || lowerPath.startsWith('.godot/'))) return false;
  if (s.skipAddons && (lowerPath.includes('/addons/') || lowerPath.startsWith('addons/'))) return false;

  // Extension filters
  if (lowerPath.endsWith('.gd') && s.wantGd) return true;
  if (lowerPath.endsWith('.tscn') && s.wantTscn) return true;
  if (lowerPath.endsWith('.tres') && s.wantTres) return true;
  if ((lowerPath.endsWith('.godot') || lowerPath.endsWith('.cfg') || lowerPath.endsWith('.json')) && s.wantOther) return true;

  return false;
}

function finalizeExport(finalBody, fileCount, errorCount, defaultName) {
  if (fileCount === 0) {
    if (errorCount > 0) logStatus("Export failed. File access blocked by OS.", "error");
    else logStatus("Export failed. No valid text files found.", "error");
    return;
  }

  document.getElementById('outputBox').value = finalBody;
  
  const linkElement = document.getElementById('downloadLink');
  const blob = new Blob([finalBody], { type: "text/plain" });
  linkElement.href = URL.createObjectURL(blob);
  linkElement.download = defaultName;
  linkElement.innerText = "Download Compiled Text";
  linkElement.style.display = "block";
  
  logStatus(`Successfully compiled ${fileCount} files.`, "success");
}

// ---- FOLDER PROCESSOR ----
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("File unreadable"));
    reader.readAsText(file);
  });
}

async function processFolder() {
  resetUI();
  const folderIn = document.getElementById('folderInput');
  const files = Array.from(folderIn.files || []);
  if (files.length === 0) return;

  const s = getSettings();
  let finalBody = "";
  let fileCount = 0;
  let errorCount = 0;

  logStatus(`Scanning ${files.length} items from folder...`, "thinking");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const path = file.webkitRelativePath || file.name;
    const lower = path.toLowerCase();

    if (!isValidFile(lower, s)) continue;

    try {
      const content = await readFileAsText(file);
      if (content === "" && file.size > 0) throw new Error("Blocked by Scoped Storage");
      finalBody += buildExportBlock(path, content);
      fileCount++;
    } catch (err) {
      logStatus(`Skipped unreadable file: ${path}`, "error");
      errorCount++;
    }
  }

  finalizeExport(finalBody, fileCount, errorCount, "Godot_Folder_Export.txt");
  folderIn.value = ""; // Reset input so you can select again
}

// ---- ZIP PROCESSOR ----
async function processZip() {
  resetUI();
  const zipIn = document.getElementById('zipInput');
  const file = zipIn.files && zipIn.files[0];
  if (!file) return;

  const s = getSettings();
  let finalBody = "";
  let fileCount = 0;

  logStatus("Loading ZIP archive...", "thinking");

  try {
    const zip = await JSZip.loadAsync(file);
    const keys = Object.keys(zip.files);
    
    logStatus("Extracting and filtering files...", "thinking");

    for (let i = 0; i < keys.length; i++) {
      const zipEntry = zip.files[keys[i]];
      if (zipEntry.dir) continue;

      const path = zipEntry.name;
      const lower = path.toLowerCase();

      if (!isValidFile(lower, s)) continue;

      try {
        const content = await zipEntry.async("string");
        finalBody += buildExportBlock(path, content);
        fileCount++;
      } catch (err) {
         logStatus(`Could not read file inside ZIP: ${path}`, "error");
      }
    }

    finalizeExport(finalBody, fileCount, 0, "Godot_ZIP_Export.txt");

  } catch (error) {
    logStatus("Failed to open ZIP. Make sure it is a valid archive.", "error");
  }
  zipIn.value = ""; // Reset input so you can select again
                          }
      
