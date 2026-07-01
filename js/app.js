(function () {
  "use strict";

  const editor = document.getElementById("editor");
  const docTitle = document.getElementById("docTitle");
  const blockFormat = document.getElementById("blockFormat");
  const wordCountEl = document.getElementById("wordCount");
  const charCountEl = document.getElementById("charCount");
  const readTimeEl = document.getElementById("readTime");
  const saveStatusEl = document.getElementById("saveStatus");
  const aiBanner = document.getElementById("aiBanner");
  const aiFallbackBanner = document.getElementById("aiFallbackBanner");

  const STORAGE_KEY = "inkwell.document";
  const WORDS_PER_MINUTE = 200;

  // ---------- Safari / Apple Intelligence detection ----------
  // There is no public JS API to detect Apple Intelligence itself; Writing Tools is a
  // system-level feature Safari layers over editable content automatically. The best we
  // can do client-side is detect "real Safari" (WebKit, not a Chromium/Firefox browser
  // spoofing the WebKit token) and point the user at the native feature.
  function isRealSafari() {
    const ua = navigator.userAgent;
    const isWebKit = /Safari/.test(ua);
    const isChromiumOrFirefox = /Chrome|CriOS|Chromium|Edg|OPR|Firefox|FxiOS|Android/.test(ua);
    return isWebKit && !isChromiumOrFirefox;
  }

  if (isRealSafari()) {
    aiBanner.hidden = false;
  } else {
    aiFallbackBanner.hidden = false;
  }

  document.getElementById("dismissBanner").addEventListener("click", () => {
    aiBanner.hidden = true;
  });
  document.getElementById("dismissFallback").addEventListener("click", () => {
    aiFallbackBanner.hidden = true;
  });

  // ---------- Toolbar formatting ----------
  document.querySelectorAll(".tb-btn[data-command]").forEach((btn) => {
    btn.addEventListener("click", () => {
      editor.focus();
      document.execCommand(btn.dataset.command, false, null);
      updateToolbarState();
      scheduleSave();
    });
  });

  blockFormat.addEventListener("change", () => {
    editor.focus();
    document.execCommand("formatBlock", false, blockFormat.value);
    scheduleSave();
  });

  function updateToolbarState() {
    document.querySelectorAll(".tb-btn[data-command]").forEach((btn) => {
      const active = document.queryCommandState(btn.dataset.command);
      btn.classList.toggle("is-active", !!active);
    });
  }

  editor.addEventListener("keyup", updateToolbarState);
  editor.addEventListener("mouseup", updateToolbarState);
  document.addEventListener("selectionchange", () => {
    if (document.activeElement === editor) updateToolbarState();
  });

  // ---------- Word / character count ----------
  function updateCounts() {
    const text = editor.innerText.trim();
    const words = text.length ? text.split(/\s+/).length : 0;
    const chars = text.length;
    const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

    wordCountEl.textContent = `${words} word${words === 1 ? "" : "s"}`;
    charCountEl.textContent = `${chars} character${chars === 1 ? "" : "s"}`;
    readTimeEl.textContent = words === 0 ? "0 min read" : `${minutes} min read`;
  }

  // ---------- Autosave ----------
  let saveTimer = null;
  function scheduleSave() {
    saveStatusEl.textContent = "Saving…";
    saveStatusEl.classList.add("saving");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 500);
  }

  function save() {
    const data = {
      title: docTitle.value,
      html: editor.innerHTML,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    saveStatusEl.textContent = "Saved";
    saveStatusEl.classList.remove("saving");
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (typeof data.title === "string") docTitle.value = data.title;
      if (typeof data.html === "string") editor.innerHTML = data.html;
    } catch (e) {
      // ignore corrupt saved state
    }
  }

  editor.addEventListener("input", () => {
    updateCounts();
    scheduleSave();
  });
  docTitle.addEventListener("input", scheduleSave);

  // ---------- New document ----------
  document.getElementById("newDocBtn").addEventListener("click", () => {
    if (!confirm("Start a new document? This will clear the current one.")) return;
    docTitle.value = "";
    editor.innerHTML = "<p><br></p>";
    editor.focus();
    updateCounts();
    save();
  });

  // ---------- Export ----------
  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function currentFileBase() {
    const title = docTitle.value.trim() || "Untitled Document";
    return title.replace(/[\\/:*?"<>|]+/g, "").trim() || "Untitled Document";
  }

  document.getElementById("exportHtmlBtn").addEventListener("click", () => {
    const title = docTitle.value.trim() || "Untitled Document";
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; max-width: 700px; margin: 60px auto; line-height: 1.7; color: #1c1c1e; padding: 0 20px; }
  h1 { font-size: 32px; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${editor.innerHTML}
</body>
</html>`;
    downloadBlob(html, `${currentFileBase()}.html`, "text/html");
  });

  document.getElementById("exportTxtBtn").addEventListener("click", () => {
    const title = docTitle.value.trim() || "Untitled Document";
    const text = `${title}\n\n${editor.innerText}`;
    downloadBlob(text, `${currentFileBase()}.txt`, "text/plain");
  });

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- Init ----------
  load();
  updateCounts();
})();
