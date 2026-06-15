const BLOCK_START = "=========================================";
const HEADER_LABEL = "[HEADER] FILE PATH: ";

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

function buildExportBlock(path, content) {
  return `${BLOCK_START}\n${HEADER_LABEL}res://${path}\n${BLOCK_START}\n\n${content}\n\n\n`;
}

async function processFolder() {
  document.getElementById('statusFeed').innerHTML = "";
  const outBox = document.getElementById('outputBox');
  const dLink = document.getElementById('downloadLink');
  const isBaseplate = document.getElementById('baseplateMode').checked;
  
  dLink.style.display = "none";
  outBox.value = "";

  if (isBaseplate) {
    logStatus("Generating Master Baseplate...", "thinking");
    let bp = "AI INSTRUCTIONS:\n1. You are modifying a Godot architecture via text.\n2. Do not write raw data for images/audio. Use standard res:// paths.\n\n";
    bp += `${BLOCK_START}\n${HEADER_LABEL}res://project.godot\n${BLOCK_START}\n\n; Write Godot config here\n\n\n`;
    outBox.value = bp;
    setupDownload("Godot_Baseplate.txt", bp);
    logStatus("Baseplate generated.", "success");
    return;
  }

  const folderIn = document.getElementById('folderInput');
  const files = Array.from(folderIn.files || []);
  
  if (files.length === 0) {
    logStatus("No files found or folder picker cancelled.", "error");
    return;
  }

  const skipGodot = document.getElementById('skipGodot').checked;
  const skipAddons = document.getElementById('skipAddons').checked;
  const wantGd = document.getElementById('incGd').checked;
  const wantTscn = document.getElementById('incTscn').checked;
  const wantTres = document.getElementById('incTres').checked;
  const wantOther = document.getElementById('incOther').checked;

  let finalBody = "";
  let fileCount = 0;

  logStatus("Scanning folder...", "thinking");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const path = file.webkitRelativePath || file.name;
    const lower = path.toLowerCase();

    if (skipGodot && (lower.includes('/.godot/') || lower.startsWith('.godot/'))) continue;
    if (skipAddons && (lower.includes('/addons/') || lower.startsWith('addons/'))) continue;

    let valid = false;
    if (lower.endsWith('.gd') && wantGd) valid = true;
    else if (lower.endsWith('.tscn') && wantTscn) valid = true;
    else if (lower.endsWith('.tres') && wantTres) valid = true;
    else if ((lower.endsWith('.godot') || lower.endsWith('.cfg') || lower.endsWith('.json')) && wantOther) valid = true;

    if (!valid) continue;

    try {
      const content = await file.text();
      finalBody += buildExportBlock(path, content);
      fileCount++;
    } catch (err) {
      logStatus(`Skipped unreadable file: ${path}`, "error");
    }
  }

  if (fileCount === 0) {
    logStatus("Export failed. No valid text files found.", "error");
    return;
  }

  outBox.value = finalBody;
  setupDownload("Godot_Export.txt", finalBody);
  logStatus(`Found ${fileCount} target items. Compilation complete.`, "success");
}

function setupDownload(name, data) {
  const linkElement = document.getElementById('downloadLink');
  const blob = new Blob([data], { type: "text/plain" });
  linkElement.href = URL.createObjectURL(blob);
  linkElement.download = name;
  linkElement.innerText = "Download " + name;
  linkElement.style.display = "block";
  }
                                           
