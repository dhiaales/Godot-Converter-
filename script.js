const BLOCK_START = "=========================================";
const HEADER_LABEL = "[HEADER] FILE PATH: ";
const HEADER_LINE = `${BLOCK_START}\n${HEADER_LABEL}`;
const HEADER_END = `\n${BLOCK_START}\n\n`;
const TRAILING_GAP = "\n\n\n";

const docsData = [
  { category: 'general', title: 'The Point of the App', body: 'Godot uses text files for almost everything (scripts, scenes, resources). An AI can easily hallucinate and break a custom architecture (like a strict SlotData inventory or signal-based loop) if it does not know how your files connect. This app flattens your architecture into an AI-readable prompt, and then safely patches the AI response back into your game without destroying your binary files.' },
  { category: 'forward', title: 'The F & Z Export System', body: 'Files exported from a folder are named "Project Source F". Files from a ZIP are "Project Source Z". The F/Z system defines exactly how your code was flattened.' },
  { category: 'forward', title: 'Baseplate Generation', body: 'Generates a blank text document with strict AI instructions and perfect header formatting. Use this to build new features from scratch on your mobile device.' },
  { category: 'reverse', title: 'Smart Patching', body: 'The update tool uses your Master ZIP as a foundation. It only overwrites the exact text files modified by the AI. It will never touch, delete, or corrupt your binary assets (.png, .wav) already inside the ZIP.' },
  { category: 'reverse', title: 'Handling New Assets', body: 'If the AI references a new asset path (e.g., res://new_icon.png) that is not in your Master ZIP, the project will still compile. Godot will simply show a missing dependency until you drag the actual image into your Godot editor manually.' },
  { category: 'errors', title: '[X] Parse error at block', body: 'What it means: The AI hallucinated or messed up the F/Z divider formatting. It likely forgot the [HEADER] FILE PATH: line or modified the equal signs.<br><br>How to fix: Tell the AI to strictly adhere to the divider format, or manually fix the header in the text file before applying the patch.' },
  { category: 'errors', title: '[X] Validation Failed: Path does not start with res://', body: 'What it means: The AI attempted to save a file outside of Godot’s internal file system.<br><br>How to fix: Find the path in the text file and ensure it starts with res://' },
  { category: 'errors', title: '[X] Validation Failed: Illegal OS character', body: 'What it means: The AI named a file using characters your operating system cannot read (like < > : " | ? *).<br><br>How to fix: Rename the file in the text document using safe characters like underscores.' },
  { category: 'errors', title: '[X] Missing inputs', body: 'What it means: You tried to run the Reverse Compiler without uploading both the Master ZIP and the AI text patch.' }
];

let currentMode = null;

function toggleMenu() {
  const menu = document.getElementById('sideMenu');
  menu.classList.toggle('open');
  menu.setAttribute('aria-hidden', String(!menu.classList.contains('open')));
}

function switchWorkspace(target) {
  document.getElementById('workspaceForward').classList.remove('active');
  document.getElementById('workspaceReverse').classList.remove('active');
  document.getElementById('workspaceDocs').classList.remove('active');

  if (target === 'forward') {
    document.getElementById('workspaceForward').classList.add('active');
  } else if (target === 'reverse') {
    document.getElementById('workspaceReverse').classList.add('active');
  } else if (target === 'docs') {
    document.getElementById('workspaceDocs').classList.add('active');
    renderDocs();
  }

  toggleMenu();
}

function renderDocs() {
  const filterEl = document.getElementById('docFilter');
  const searchEl = document.getElementById('docSearch');
  const container = document.getElementById('docsContainer');

  if (!filterEl || !searchEl || !container) return;

  const filter = filterEl.value;
  const search = searchEl.value.toLowerCase();

  container.innerHTML = "";

  docsData.forEach(doc => {
    if (filter !== 'all' && doc.category !== filter) return;
    if (search && !doc.title.toLowerCase().includes(search) && !doc.body.toLowerCase().includes(search)) return;

    const div = document.createElement('div');
    div.className = 'doc-card';
    div.innerHTML = `<h4>${doc.title}</h4><div>${doc.body}</div>`;
    container.appendChild(div);
  });
}

function setMode(mode) {
  currentMode = mode;
  const label = mode === 'F' ? "Folder" : "ZIP Archive";
  const selected = document.getElementById('selectedSource');
  if (selected) selected.innerText = "Ready: " + label + " selected";
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

function parsePatches(text) {
  const blocks = text.split(HEADER_LINE);
  const results = [];

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const headerEndIndex = block.indexOf(HEADER_END);

    if (headerEndIndex === -1) {
      return { error: `Parse error at block ${i}` };
    }

    const rawPath = block.slice(0, headerEndIndex);
    if (!rawPath.startsWith("res://")) {
      return { error: `Validation Failed: Path does not start with res:// -> ${rawPath}` };
    }

    const cleanPath = rawPath.replace("res://", "");
    if (/[<>:"|?*]/.test(cleanPath)) {
      return { error: `Validation Failed: Illegal OS character in path -> ${cleanPath}` };
    }

    let content = block.slice(headerEndIndex + HEADER_END.length);
    if (content.endsWith(TRAILING_GAP)) {
      content = content.slice(0, -TRAILING_GAP.length);
    }

    results.push({ path: cleanPath, content });
  }

  return { results };
}

async function processForward() {
  const feed = 'statusFeedForward';
  document.getElementById(feed).innerHTML = "";

  const isBaseplate = document.getElementById('baseplateMode').checked;
  const outBox = document.getElementById('outputBox');
  const dLink = document.getElementById('downloadLinkForward');

  dLink.style.display = "none";
  outBox.value = "";

  if (isBaseplate) {
    logStatus(feed, "Generating Master Baseplate...", "thinking");
    let bp = "AI INSTRUCTIONS:\n";
    bp += "1. You are modifying a Godot architecture via text.\n";
    bp += "2. Do not write raw data for images/audio. Use standard res:// paths.\n";
    bp += "3. Assume binary assets exist in the virtual registry.\n\n";
    bp += `${BLOCK_START}\n`;
    bp += `[HEADER] FILE PATH: res://project.godot\n`;
    bp += `${BLOCK_START}\n\n; Write Godot config here\n\n\n`;

    outBox.value = bp;
    logStatus(feed, "Baseplate generated.", "success");
    setupDownload("Project Source Baseplate.txt", bp, dLink, "#ffb7c5", "#0a0a0a");
    return;
  }

  if (!currentMode) {
    logStatus(feed, "No source selected.", "error");
    return;
  }

  const folderIn = document.getElementById('folderInput');
  const zipIn = document.getElementById('zipInput');
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

  outBox.value = finalBody;
  logStatus(feed, `Found ${fileCount} target items. Compilation complete.`, "success");
  const outName = currentMode === 'F' ? "Project Source F.txt" : "Project Source Z.txt";
  setupDownload(outName, finalBody, dLink, "#ffb7c5", "#0a0a0a");
}

async function processReverse() {
  const feed = 'statusFeedReverse';
  document.getElementById(feed).innerHTML = "";

  const masterZipInput = document.getElementById('masterZip');
  const patchTextInput = document.getElementById('patchText');
  const dLink = document.getElementById('downloadLinkReverse');

  if (masterZipInput.files.length === 0 || patchTextInput.files.length === 0) {
    logStatus(feed, "Missing inputs. Upload both ZIP and Text file.", "error");
    return;
  }

  logStatus(feed, "Loading Master Build ZIP container...", "thinking");
  const zipFile = masterZipInput.files[0];
  const zip = await JSZip.loadAsync(zipFile);

  logStatus(feed, "Reading AI code patch document...", "thinking");
  const textFile = patchTextInput.files[0];
  const text = await textFile.text();

  logStatus(feed, "Scanning for system changes...", "thinking");
  const parsed = parsePatches(text);

  if (parsed.error) {
    logStatus(feed, parsed.error, "error");
    return;
  }

  if (parsed.results.length === 0) {
    logStatus(feed, "No valid patched files found to compress.", "error");
    return;
  }

  for (const item of parsed.results) {
    logStatus(feed, `Patching file: ${item.path}`, "thinking");
    zip.file(item.path, item.content);
  }

  logStatus(feed, `Patch detected: ${parsed.results.length} files modified or added.`, "success");
  logStatus(feed, "Compressing updated project archive...", "thinking");

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);

  dLink.href = url;
  dLink.download = "Patched_" + zipFile.name;
  dLink.innerText = "Download Patched ZIP";
  dLink.style.display = "flex";
  dLink.style.backgroundColor = "#478cb5";
  dLink.style.color = "#fff";

  logStatus(feed, "Success! Project archive updated successfully.", "success");
}

function setupDownload(name, data, linkElement, bgCode, textCode) {
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
  renderDocs();
});
