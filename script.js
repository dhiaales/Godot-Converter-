const BLOCK_START = "=========================================";
const HEADER_LABEL = "[HEADER] FILE PATH: ";

let currentMode = null;
let currentSourceName = "";
let outputExpanded = false;

function toggleMenu() {
  const menu = document.getElementById('sideMenu');
  if (!menu) return;

  menu.classList.toggle('open');
  menu.setAttribute('aria-hidden', String(!menu.classList.contains('open')));
}

function switchWorkspace(target) {
  const forward = document.getElementById('workspaceForward');
  if (forward) forward.classList.add('active');
  toggleMenu();
}

function getFolderRootName(files) {
  if (!files || !files.length) return "";
  const first = files[0];
  const relative = first.webkitRelativePath || first.name || "";
  if (relative.includes('/')) return relative.split('/')[0];
  return first.name || "";
}

function stripZipExtension(name) {
  if (!name) return "";
  return name.replace(/\.zip$/i, "");
}

function setMode(mode) {
  currentMode = mode;

  if (mode === 'F') {
    const folderInput = document.getElementById('folderInput');
    currentSourceName = getFolderRootName(Array.from(folderInput?.files || []));
  } else if (mode === 'Z') {
    const zipInput = document.getElementById('zipInput');
    currentSourceName = stripZipExtension(zipInput?.files?.[0]?.name || "");
  } else {
    currentSourceName = "";
  }

  updateSelectedSourceLabel();
}

function updateSelectedSourceLabel() {
  const selected = document.getElementById('selectedSource');
  if (!selected) return;

  if (!currentMode) {
    selected.innerText = "No source selected";
    return;
  }

  const labelName = currentSourceName || "Project Source";
  const suffix = currentMode === 'F' ? "F" : "Z";
  selected.innerText = `Ready: ${labelName} ${suffix} selected`;
}

function setOutputExpanded(force) {
  const shell = document.getElementById('outputShell');
  const toggle = document.getElementById('outputToggle');
  if (!shell || !toggle) return;

  outputExpanded = typeof force === 'boolean' ? force : !outputExpanded;
  shell.classList.toggle('expanded', outputExpanded);
  toggle.innerText = outputExpanded ? "×" : "⤢";
  toggle.setAttribute('aria-label', outputExpanded ? 'Shrink output' : 'Expand output');
}

function toggleOutputView() {
  setOutputExpanded();
}

function logStatus(workspaceId, msg, type = "info") {
  const feed = document.getElementById(workspaceId);
  if (!feed) return;

  const div = document.createElement('div');

  if (type === "thinking") div.innerHTML = `<span style="color:#478cb5">[...]</span> ${msg}`;
  else if (type === "success") div.innerHTML = `<span style="color:#ffb7c5">[✓]</span> <span style="color:#fff">${msg}</span>`;
  else if (type === "error") div.innerHTML = `<span style="color:red">[X]</span> ${msg}`;
  else div.innerHTML = msg;

  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

function buildExportBlock(path, content) {
  return (
    `${BLOCK_START}\n` +
    `${HEADER_LABEL}res://${path}\n` +
    `${BLOCK_START}\n\n` +
    `${content}\n\n\n`
  );
}

function clearForwardOutput() {
  const outBox = document.getElementById('outputBox');
  const dLink = document.getElementById('downloadLinkForward');
  const feed = document.getElementById('statusFeedForward');

  if (outBox) outBox.value = "";
  if (dLink) {
    dLink.style.display = "none";
    dLink.removeAttribute('href');
    dLink.removeAttribute('download');
    dLink.innerText = "";
  }
  if (feed) feed.innerHTML = "<div>Waiting for input...</div>";
}

function resetApp() {
  const folderInput = document.getElementById('folderInput');
  const zipInput = document.getElementById('zipInput');

  if (folderInput) folderInput.value = "";
  if (zipInput) zipInput.value = "";

  currentMode = null;
  currentSourceName = "";
  updateSelectedSourceLabel();
  clearForwardOutput();
  setOutputExpanded(false);
}

async function processForward() {
  const feed = 'statusFeedForward';
  const outBox = document.getElementById('outputBox');
  const dLink = document.getElementById('downloadLinkForward');
  const folderIn = document.getElementById('folderInput');
  const zipIn = document.getElementById('zipInput');

  document.getElementById(feed).innerHTML = "";

  if (outBox) outBox.value = "";
  if (dLink) {
    dLink.style.display = "none";
    dLink.removeAttribute('href');
    dLink.removeAttribute('download');
    dLink.innerText = "";
  }

  if (!currentMode) {
    logStatus(feed, "No source selected.", "error");
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

  logStatus(feed, `Initializing conversion (Mode: ${currentMode})`, "thinking");

  if (currentMode === 'F') {
    const files = Array.from(folderIn.files || []);
    if (files.length > 0 && !currentSourceName) {
      currentSourceName = getFolderRootName(files);
      updateSelectedSourceLabel();
    }

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

      const content = await file.text();
      finalBody += buildExportBlock(path, content);
      fileCount++;
    }
  } else if (currentMode === 'Z') {
    const file = zipIn.files && zipIn.files[0];
    if (!file) {
      logStatus(feed, "No ZIP selected.", "error");
      return;
    }

    if (!currentSourceName) {
      currentSourceName = stripZipExtension(file.name);
      updateSelectedSourceLabel();
    }

    const zip = await JSZip.loadAsync(file);
    const keys = Object.keys(zip.files);

    for (let i = 0; i < keys.length; i++) {
      const zipEntry = zip.files[keys[i]];
      if (zipEntry.dir) continue;

      const path = zipEntry.name;
      const lower = path.toLowerCase();

      if (skipGodot && (lower.includes('/.godot/') || lower.startsWith('.godot/'))) continue;
      if (skipAddons && (lower.includes('/addons/') || lower.startsWith('addons/'))) continue;

      let valid = false;
      if (lower.endsWith('.gd') && wantGd) valid = true;
      else if (lower.endsWith('.tscn') && wantTscn) valid = true;
      else if (lower.endsWith('.tres') && wantTres) valid = true;
      else if ((lower.endsWith('.godot') || lower.endsWith('.cfg') || lower.endsWith('.json')) && wantOther) valid = true;

      if (!valid) continue;

      const content = await zipEntry.async("string");
      finalBody += buildExportBlock(path, content);
      fileCount++;
    }
  }

  if (fileCount === 0) {
    logStatus(feed, "Export failed. No files matched.", "error");
    return;
  }

  if (outBox) outBox.value = finalBody;
  logStatus(feed, `Found ${fileCount} target items. Compilation complete.`, "success");

  const outNameBase = currentSourceName || "Project Source";
  const outName = `${outNameBase} ${currentMode}.txt`;
  setupDownload(outName, finalBody, dLink, "#ffb7c5", "#0a0a0a");
}

function setupDownload(name, data, linkElement, bgCode, textCode) {
  if (!linkElement) return;

  const blob = new Blob([data], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  linkElement.href = url;
  linkElement.download = name;
  linkElement.innerText = "Download " + name;
  linkElement.style.display = "flex";
  linkElement.style.backgroundColor = bgCode;
  linkElement.style.color = textCode;
}

window.addEventListener('DOMContentLoaded', () => {
  updateSelectedSourceLabel();
  setOutputExpanded(false);
});
