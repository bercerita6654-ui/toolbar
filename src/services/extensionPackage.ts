import JSZip from 'jszip';
import { ExtensionFileItem } from '../types/note';

export const EXTENSION_MANIFEST = `{
  "manifest_version": 3,
  "name": "QuickNotes Pro - Instant Memo, Rich Text & Cloud Sync",
  "version": "1.0.0",
  "description": "Ekstensi Google Chrome modern untuk membuat catatan teks kaya, todo list, kliping web, dan sinkronisasi otomatis Google Drive antar komputer.",
  "permissions": [
    "storage",
    "activeTab",
    "contextMenus",
    "sidePanel",
    "identity",
    "notifications",
    "alarms"
  ],
  "host_permissions": [
    "https://www.googleapis.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Buka QuickNotes (Alt+Shift+N)",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content_script.js"],
      "css": ["content_script.css"]
    }
  ],
  "options_page": "options.html",
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Alt+Shift+N",
        "mac": "Alt+Shift+N"
      },
      "description": "Buka popup QuickNotes"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`;

export const EXTENSION_POPUP_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickNotes Pro</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <!-- Top Header -->
    <header class="popup-header">
      <div class="brand">
        <span class="brand-icon">⚡</span>
        <span class="brand-title">QuickNotes Pro</span>
      </div>
      <div class="header-actions">
        <button id="btn-sync-cloud" class="icon-btn" title="Sinkronisasi Cloud Google Drive">☁️ Sync</button>
        <button id="btn-clip-page" class="icon-btn" title="Klip URL Halaman Ini">🌐 Klip</button>
        <button id="btn-sidepanel" class="icon-btn" title="Buka Side Panel">📌</button>
      </div>
    </header>

    <!-- Cloud Sync Status Bar -->
    <div id="sync-banner" class="sync-banner hidden">
      <span id="sync-status-text">🟢 Tersinkron ke Google Drive</span>
      <button id="btn-sync-now" class="sync-link-btn">Sync Sekarang</button>
    </div>

    <!-- Quick Note Creator with Rich Formatting -->
    <div class="quick-input-card">
      <input type="text" id="note-title-input" placeholder="Judul catatan baru..." />
      
      <!-- Rich Text Toolbar -->
      <div class="format-toolbar">
        <button type="button" class="fmt-btn" data-cmd="bold" title="Tebal (Ctrl+B)"><b>B</b></button>
        <button type="button" class="fmt-btn" data-cmd="italic" title="Miring (Ctrl+I)"><i>I</i></button>
        <button type="button" class="fmt-btn" data-cmd="underline" title="Garis Bawah (Ctrl+U)"><u>U</u></button>
        <button type="button" class="fmt-btn" data-cmd="insertUnorderedList" title="Daftar Berpoin">• List</button>
        <button type="button" class="fmt-btn" id="btn-insert-link" title="Sisipkan Link">🔗 Link</button>
      </div>

      <div id="note-content-editable" class="content-editable" contenteditable="true" placeholder="Tulis catatan atau tempel teks di sini..."></div>
      
      <div class="input-controls">
        <div class="color-picker" id="color-picker">
          <span class="color-dot color-amber active" data-color="amber" title="Amber"></span>
          <span class="color-dot color-emerald" data-color="emerald" title="Emerald"></span>
          <span class="color-dot color-blue" data-color="blue" title="Blue"></span>
          <span class="color-dot color-purple" data-color="purple" title="Purple"></span>
          <span class="color-dot color-rose" data-color="rose" title="Rose"></span>
        </div>
        <div class="action-buttons">
          <input type="datetime-local" id="note-reminder-input" title="Tetapkan Jam Pengingat" class="reminder-input" />
          <select id="note-category-select">
            <option value="ideas">💡 Ide</option>
            <option value="work">💼 Kerja</option>
            <option value="learning">📚 Belajar</option>
            <option value="personal">👤 Pribadi</option>
            <option value="clips">🌐 Klip</option>
          </select>
          <button id="btn-save-note" class="primary-btn">Simpan</button>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs (Notes vs Calendar) -->
    <div class="popup-tabs">
      <button id="tab-btn-notes" class="tab-btn active">📝 Catatan</button>
      <button id="tab-btn-calendar" class="tab-btn">📅 Kalender & Jadwal</button>
    </div>

    <!-- 1. Notes Tab View -->
    <div id="notes-tab-view" class="tab-content">
      <!-- Search and Filter Bar -->
      <div class="search-bar">
        <input type="text" id="search-input" placeholder="🔍 Cari judul, teks, atau #tag..." />
        <span id="notes-counter" class="notes-count">0 Catatan</span>
      </div>

      <!-- Notes List Scrollable -->
      <div id="notes-list" class="notes-list">
        <!-- Injected via popup.js -->
      </div>
    </div>

    <!-- 2. Calendar Tab View -->
    <div id="calendar-tab-view" class="tab-content hidden">
      <div class="cal-header">
        <div class="cal-nav">
          <button id="cal-prev" class="cal-nav-btn" title="Bulan Lalu">&lt;</button>
          <span id="cal-month-title" class="cal-title">Oktober 2026</span>
          <button id="cal-next" class="cal-nav-btn" title="Bulan Depan">&gt;</button>
        </div>
        <button id="cal-today" class="cal-today-btn">Hari Ini</button>
      </div>

      <div class="cal-weekdays">
        <span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span><span style="color:#f43f5e">M</span>
      </div>

      <div id="cal-grid" class="cal-grid">
        <!-- Injected via popup.js -->
      </div>

      <div class="cal-selected-header">
        <span id="cal-selected-date-label">📅 Catatan Hari Ini</span>
        <button id="btn-schedule-on-date" class="cal-action-btn">+ Jadwalkan</button>
      </div>

      <div id="cal-notes-list" class="notes-list cal-notes-list">
        <!-- Injected via popup.js -->
      </div>
    </div>

    <!-- Cloud Sync Modal Popup -->
    <div id="cloud-modal" class="modal-backdrop hidden">
      <div class="modal-box">
        <div class="modal-header">
          <h3>☁️ Sinkronisasi Google Drive</h3>
          <button id="btn-close-modal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">Simpan dan sinkronkan semua catatan Anda dengan Google Drive agar otomatis terupdate saat membuka di komputer lain.</p>
          <div class="form-group">
            <label>Google OAuth Access Token:</label>
            <input type="text" id="cloud-token-input" placeholder="Tempel Google Access Token..." />
          </div>
          <div class="modal-actions">
            <button id="btn-drive-upload" class="primary-btn">⬆️ Unggah ke Drive</button>
            <button id="btn-drive-download" class="secondary-btn">⬇️ Unduh dari Drive</button>
          </div>
          <p id="cloud-log" class="cloud-log"></p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="popup-footer">
      <button id="btn-export-json">💾 Backup JSON</button>
      <button id="btn-clear-all" class="text-danger">Bersihkan</button>
    </footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>`;

export const EXTENSION_POPUP_CSS = `/* QuickNotes Pro Light Styling */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  background-color: #ffffff;
  color: #0f172a;
  width: 380px;
  height: 560px;
  overflow: hidden;
  font-size: 13px;
}

.popup-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #0f172a;
  font-size: 14px;
}

.brand-icon {
  background: #e0f2fe;
  color: #0284c7;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 12px;
}

.header-actions {
  display: flex;
  gap: 6px;
}

.icon-btn {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* Cloud Banner */
.sync-banner {
  background: #f0fdf4;
  border-bottom: 1px solid #bbf7d0;
  padding: 6px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #166534;
}
.sync-banner.hidden { display: none; }
.sync-link-btn {
  background: none;
  border: none;
  color: #0284c7;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  font-size: 11px;
}

/* Note Creator */
.quick-input-card {
  padding: 10px 14px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

#note-title-input {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #0f172a;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  outline: none;
}
#note-title-input:focus {
  border-color: #0284c7;
  background: #ffffff;
}

.format-toolbar {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.fmt-btn {
  background: transparent;
  border: none;
  color: #475569;
  padding: 2px 6px;
  font-size: 11px;
  border-radius: 4px;
  cursor: pointer;
}
.fmt-btn:hover {
  background: #ffffff;
  color: #0284c7;
}

.content-editable {
  min-height: 54px;
  max-height: 90px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #0f172a;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  outline: none;
  overflow-y: auto;
  line-height: 1.4;
}
.content-editable:focus {
  border-color: #0284c7;
  background: #ffffff;
}
.content-editable:empty:before {
  content: attr(placeholder);
  color: #94a3b8;
}

.input-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.color-picker {
  display: flex;
  gap: 5px;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
  border: 1px solid rgba(0,0,0,0.1);
}
.color-dot.active {
  box-shadow: 0 0 0 2px #0f172a;
}
.color-amber { background: #f59e0b; }
.color-emerald { background: #10b981; }
.color-blue { background: #3b82f6; }
.color-purple { background: #8b5cf6; }
.color-rose { background: #f43f5e; }

.action-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
}

.reminder-input {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #334155;
  border-radius: 6px;
  padding: 3px 5px;
  font-size: 10px;
  max-width: 110px;
}

/* Tab Navigation */
.popup-tabs {
  display: flex;
  background: #f1f5f9;
  border-bottom: 1px solid #cbd5e1;
  padding: 4px 8px;
  gap: 6px;
}

.tab-btn {
  flex: 1;
  background: transparent;
  border: 1px solid transparent;
  padding: 5px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #ffffff;
  color: #0284c7;
  border-color: #cbd5e1;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.tab-content.hidden {
  display: none !important;
}

/* Calendar Section Styling */
.cal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.cal-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cal-title {
  font-weight: 700;
  font-size: 12px;
  color: #0f172a;
}

.cal-nav-btn, .cal-today-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}
.cal-nav-btn:hover, .cal-today-btn:hover {
  background: #f1f5f9;
  color: #0284c7;
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  padding: 4px 8px;
  background: #ffffff;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  padding: 4px 8px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.cal-day-cell {
  height: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  background: #f8fafc;
  border: 1px solid transparent;
}
.cal-day-cell:hover {
  background: #e0f2fe;
}
.cal-day-cell.other-month {
  color: #cbd5e1;
  background: transparent;
}
.cal-day-cell.today {
  background: #0284c7;
  color: #ffffff;
  font-weight: 700;
}
.cal-day-cell.selected {
  border-color: #0284c7;
  background: #bae6fd;
  color: #0369a1;
  font-weight: 700;
}
.cal-day-cell.has-note:after {
  content: '';
  position: absolute;
  bottom: 2px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #f59e0b;
}

.cal-selected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #f1f5f9;
  font-size: 11px;
  font-weight: 700;
  color: #334155;
}

.cal-action-btn {
  background: #0284c7;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}

.cal-notes-list {
  max-height: 140px;
  overflow-y: auto;
  padding: 8px 12px;
}

select {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #334155;
  border-radius: 6px;
  padding: 4px 6px;
  font-size: 11px;
}

.primary-btn {
  background: #0284c7;
  border: none;
  color: #fff;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.primary-btn:hover {
  background: #0369a1;
}

.secondary-btn {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.secondary-btn:hover {
  background: #e2e8f0;
}

.search-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.search-bar input {
  background: transparent;
  border: none;
  color: #0f172a;
  font-size: 12px;
  width: 75%;
  outline: none;
}

.notes-count {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
}

.notes-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #f8fafc;
}

.note-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.note-item.amber { border-left: 4px solid #f59e0b; }
.note-item.emerald { border-left: 4px solid #10b981; }
.note-item.blue { border-left: 4px solid #3b82f6; }
.note-item.purple { border-left: 4px solid #8b5cf6; }
.note-item.rose { border-left: 4px solid #f43f5e; }

.note-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.note-item-title {
  font-weight: 600;
  font-size: 12px;
  color: #0f172a;
}

.note-item-content {
  font-size: 12px;
  color: #475569;
  line-height: 1.4;
  max-height: 80px;
  overflow: hidden;
}
.note-item-content a {
  color: #0284c7;
  text-decoration: underline;
}

.note-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-size: 10px;
  color: #94a3b8;
}

.note-actions button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 11px;
  color: #64748b;
}
.note-actions button:hover {
  color: #0f172a;
}

.empty-state {
  text-align: center;
  color: #94a3b8;
  margin-top: 40px;
  font-size: 12px;
}

.popup-footer {
  padding: 8px 14px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
}

.popup-footer button {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-size: 11px;
}
.popup-footer button:hover {
  color: #0f172a;
}
.text-danger:hover {
  color: #e11d48 !important;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 14px;
}
.modal-backdrop.hidden { display: none; }
.modal-box {
  background: #ffffff;
  border-radius: 12px;
  width: 100%;
  max-width: 320px;
  padding: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  border: 1px solid #e2e8f0;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.modal-header h3 { font-size: 13px; color: #0f172a; }
.close-btn { background: none; border: none; font-size: 16px; cursor: pointer; color: #64748b; }
.modal-desc { font-size: 11px; color: #64748b; margin-bottom: 10px; line-height: 1.4; }
.form-group label { font-size: 11px; color: #334155; font-weight: 600; display: block; margin-bottom: 4px; }
.form-group input { width: 100%; padding: 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 10px; }
.modal-actions { display: flex; gap: 6px; }
.cloud-log { font-size: 11px; color: #0284c7; margin-top: 8px; min-height: 16px; }`;

export const EXTENSION_POPUP_JS = `// QuickNotes Pro Chrome Extension Popup Script with Safe DOM Handling
document.addEventListener('DOMContentLoaded', async () => {
  let notes = [];
  let selectedColor = 'amber';

  const titleInput = document.getElementById('note-title-input');
  const contentEditable = document.getElementById('note-content-editable');
  const categorySelect = document.getElementById('note-category-select');
  const saveBtn = document.getElementById('btn-save-note');
  const searchInput = document.getElementById('search-input');
  const notesList = document.getElementById('notes-list');
  const counter = document.getElementById('notes-counter');
  const clipPageBtn = document.getElementById('btn-clip-page');
  const sidepanelBtn = document.getElementById('btn-sidepanel');
  const syncCloudBtn = document.getElementById('btn-sync-cloud');
  const syncBanner = document.getElementById('sync-banner');
  const syncStatusText = document.getElementById('sync-status-text');
  const syncNowBtn = document.getElementById('btn-sync-now');
  const cloudModal = document.getElementById('cloud-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');
  const tokenInput = document.getElementById('cloud-token-input');
  const driveUploadBtn = document.getElementById('btn-drive-upload');
  const driveDownloadBtn = document.getElementById('btn-drive-download');
  const cloudLog = document.getElementById('cloud-log');
  const exportBtn = document.getElementById('btn-export-json');
  const clearBtn = document.getElementById('btn-clear-all');
  const colorDots = document.querySelectorAll('.color-dot');
  const formatButtons = document.querySelectorAll('.fmt-btn[data-cmd]');
  const insertLinkBtn = document.getElementById('btn-insert-link');

  // Rich text formatting actions
  formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd && contentEditable) {
        document.execCommand(cmd, false, null);
        contentEditable.focus();
      }
    });
  });

  if (insertLinkBtn && contentEditable) {
    insertLinkBtn.addEventListener('click', () => {
      const url = prompt('Masukkan URL hyperlink (contoh: https://google.com):');
      if (url) {
        document.execCommand('createLink', false, url);
        contentEditable.focus();
      }
    });
  }

  // Load notes from Chrome storage or localStorage
  async function loadNotes() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get(['notes', 'google_access_token', 'last_synced']);
      notes = data.notes || [];
      if (tokenInput && data.google_access_token) {
        tokenInput.value = data.google_access_token;
      }
      if (syncBanner && data.google_access_token) {
        syncBanner.classList.remove('hidden');
        if (syncStatusText && data.last_synced) {
          syncStatusText.textContent = '🟢 Sync: ' + data.last_synced;
        }
      }
    } else {
      const raw = localStorage.getItem('quicknotes_notes') || '[]';
      try {
        notes = JSON.parse(raw);
      } catch {
        notes = [];
      }
    }
    renderNotes();
  }

  // Save notes to storage & broadcast
  async function persistNotes() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ notes });
    } else {
      localStorage.setItem('quicknotes_notes', JSON.stringify(notes));
    }
    renderNotes();
  }

  // Render notes in list
  function renderNotes(filter = '') {
    if (!notesList) return;

    const query = filter.toLowerCase().trim();
    const filtered = notes
      .filter(n => 
        !n.isDeleted && 
        ((n.title && n.title.toLowerCase().includes(query)) || 
         (n.content && n.content.toLowerCase().includes(query)) ||
         (n.tags && n.tags.some(t => t.toLowerCase().includes(query))))
      )
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });

    if (counter) {
      counter.textContent = \`\${filtered.length} Catatan\`;
    }

    if (filtered.length === 0) {
      notesList.innerHTML = '<div class="empty-state">Belum ada catatan. Tulis catatan pertama Anda di atas! 📝</div>';
      return;
    }

    notesList.innerHTML = filtered.map(note => \`
      <div class="note-item \${note.color || 'amber'} \${note.isPinned ? 'is-pinned' : ''}" data-id="\${note.id}">
        <div class="note-item-header">
          <span class="note-item-title">\${note.isPinned ? '📌 ' : ''}\${escapeHtml(note.title || 'Tanpa Judul')}</span>
          <div class="note-actions">
            <button class="btn-pin" title="\${note.isPinned ? 'Lepas Sematan' : 'Sematkan ke Atas'}" data-id="\${note.id}">\${note.isPinned ? '📌' : '📍'}</button>
            <button class="btn-copy" title="Salin Catatan" data-id="\${note.id}">📋</button>
            <button class="btn-delete" title="Hapus" data-id="\${note.id}">🗑️</button>
          </div>
        </div>
        <div class="note-item-content">\${note.content || ''}</div>
        <div class="note-item-footer">
          <span>\${new Date(note.updatedAt || Date.now()).toLocaleDateString('id-ID')}</span>
          <span>#\${note.category || 'general'}</span>
        </div>
      </div>
    \`).join('');

    // Attach listeners
    document.querySelectorAll('.btn-pin').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        notes = notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: Date.now() } : n);
        notes.sort((a, b) => {
          if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
        persistNotes();
      });
    });

    document.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const item = notes.find(n => n.id === id);
        if (item) {
          const clean = (item.content || '').replace(/<[^>]*>/g, '');
          navigator.clipboard.writeText(\`\${item.title}\\n\\n\${clean}\`);
          btn.textContent = '✅';
          setTimeout(() => { btn.textContent = '📋'; }, 1500);
        }
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        notes = notes.filter(n => n.id !== id);
        persistNotes();
      });
    });
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Calendar state in Extension Popup
  let calDate = new Date();
  let calSelectedDate = new Date();
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const tabNotesBtn = document.getElementById('tab-btn-notes');
  const tabCalBtn = document.getElementById('tab-btn-calendar');
  const notesTabView = document.getElementById('notes-tab-view');
  const calTabView = document.getElementById('calendar-tab-view');
  const calMonthTitle = document.getElementById('cal-month-title');
  const calGrid = document.getElementById('cal-grid');
  const calPrevBtn = document.getElementById('cal-prev');
  const calNextBtn = document.getElementById('cal-next');
  const calTodayBtn = document.getElementById('cal-today');
  const calSelectedDateLabel = document.getElementById('cal-selected-date-label');
  const calNotesList = document.getElementById('cal-notes-list');
  const btnScheduleOnDate = document.getElementById('btn-schedule-on-date');
  const reminderInput = document.getElementById('note-reminder-input');

  // Tab switching
  if (tabNotesBtn && tabCalBtn && notesTabView && calTabView) {
    tabNotesBtn.addEventListener('click', () => {
      tabNotesBtn.classList.add('active');
      tabCalBtn.classList.remove('active');
      notesTabView.classList.remove('hidden');
      calTabView.classList.add('hidden');
    });

    tabCalBtn.addEventListener('click', () => {
      tabCalBtn.classList.add('active');
      tabNotesBtn.classList.remove('active');
      calTabView.classList.remove('hidden');
      notesTabView.classList.add('hidden');
      renderMiniCalendar();
      renderCalNotes();
    });
  }

  // Mini Calendar Navigation
  if (calPrevBtn) {
    calPrevBtn.addEventListener('click', () => {
      calDate = new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1);
      renderMiniCalendar();
    });
  }
  if (calNextBtn) {
    calNextBtn.addEventListener('click', () => {
      calDate = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1);
      renderMiniCalendar();
    });
  }
  if (calTodayBtn) {
    calTodayBtn.addEventListener('click', () => {
      calDate = new Date();
      calSelectedDate = new Date();
      renderMiniCalendar();
      renderCalNotes();
    });
  }

  if (btnScheduleOnDate) {
    btnScheduleOnDate.addEventListener('click', () => {
      const target = new Date(calSelectedDate);
      target.setHours(9, 0, 0, 0);
      const pad = (n) => n.toString().padStart(2, '0');
      const val = \`\${target.getFullYear()}-\${pad(target.getMonth() + 1)}-\${pad(target.getDate())}T\${pad(target.getHours())}:\${pad(target.getMinutes())}\`;
      if (reminderInput) {
        reminderInput.value = val;
      }
      if (contentEditable) {
        contentEditable.focus();
      }
    });
  }

  function renderMiniCalendar() {
    if (!calGrid || !calMonthTitle) return;

    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    calMonthTitle.textContent = \`\${monthNames[month]} \${year}\`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const daysInMonth = lastDay.getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const todayStr = new Date().toDateString();
    const selectedStr = calSelectedDate.toDateString();

    let cellsHtml = '';

    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrev - i);
      const dStr = d.toDateString();
      const hasN = notes.some(n => !n.isDeleted && new Date(n.reminderAt || n.createdAt).toDateString() === dStr);
      cellsHtml += \`<div class="cal-day-cell other-month \${hasN ? 'has-note' : ''}" data-date="\${d.toISOString()}">\${d.getDate()}</div>\`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dStr = d.toDateString();
      const isToday = dStr === todayStr;
      const isSelected = dStr === selectedStr;
      const hasN = notes.some(n => !n.isDeleted && new Date(n.reminderAt || n.createdAt).toDateString() === dStr);
      cellsHtml += \`<div class="cal-day-cell \${isToday ? 'today' : ''} \${isSelected ? 'selected' : ''} \${hasN ? 'has-note' : ''}" data-date="\${d.toISOString()}">\${day}</div>\`;
    }

    const totalCells = startDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dStr = d.toDateString();
      const hasN = notes.some(n => !n.isDeleted && new Date(n.reminderAt || n.createdAt).toDateString() === dStr);
      cellsHtml += \`<div class="cal-day-cell other-month \${hasN ? 'has-note' : ''}" data-date="\${d.toISOString()}">\${i}</div>\`;
    }

    calGrid.innerHTML = cellsHtml;

    calGrid.querySelectorAll('.cal-day-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const iso = cell.getAttribute('data-date');
        if (iso) {
          calSelectedDate = new Date(iso);
          renderMiniCalendar();
          renderCalNotes();
        }
      });
    });
  }

  function renderCalNotes() {
    if (!calNotesList || !calSelectedDateLabel) return;
    const targetStr = calSelectedDate.toDateString();
    calSelectedDateLabel.textContent = '📅 ' + calSelectedDate.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

    const dayNotes = notes.filter(n => !n.isDeleted && new Date(n.reminderAt || n.createdAt).toDateString() === targetStr);

    if (dayNotes.length === 0) {
      calNotesList.innerHTML = '<div class="empty-state" style="padding:10px;font-size:11px;">Tidak ada jadwal pada tanggal ini. Klik "+ Jadwalkan" di atas untuk membuat pengingat.</div>';
      return;
    }

    calNotesList.innerHTML = dayNotes.map(n => \`
      <div class="note-item \${n.color || 'amber'}" style="margin-bottom:6px;padding:6px 8px;">
        <div class="note-item-header">
          <span class="note-item-title">\${n.isPinned ? '📌 ' : ''}\${escapeHtml(n.title || 'Catatan')}</span>
          <span style="font-size:10px;color:#d97706;font-weight:600;">\${n.reminderAt ? '⏰ ' + new Date(n.reminderAt).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : ''}</span>
        </div>
        <div class="note-item-content" style="font-size:11px;margin:2px 0;">\${n.content || ''}</div>
      </div>
    \`).join('');
  }

  // Handle color selection
  colorDots.forEach(dot => {
    dot.addEventListener('click', () => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      selectedColor = dot.getAttribute('data-color') || 'amber';
    });
  });

  // Save new note (supports both Popup and Side Panel)
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const title = titleInput ? titleInput.value.trim() : '';
      const content = contentEditable ? contentEditable.innerHTML.trim() : '';
      const cleanContent = content.replace(/<[^>]*>/g, '').trim();

      if (!cleanContent && !title) return;

      let remTimestamp = null;
      if (reminderInput && reminderInput.value) {
        remTimestamp = new Date(reminderInput.value).getTime();
      }

      const newNote = {
        id: 'note_' + Date.now(),
        title: title || (cleanContent.length > 25 ? cleanContent.substring(0, 25) + '...' : cleanContent) || 'Catatan Baru',
        content: content || \`<p>\${title}</p>\`,
        category: categorySelect ? categorySelect.value : 'ideas',
        color: selectedColor,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        reminderAt: remTimestamp,
        isReminderDismissed: false,
        isPinned: false,
        isDeleted: false,
        tags: [categorySelect ? categorySelect.value : 'ideas']
      };

      notes.unshift(newNote);
      await persistNotes();
      renderMiniCalendar();
      renderCalNotes();

      if (titleInput) titleInput.value = '';
      if (contentEditable) contentEditable.innerHTML = '';
      if (reminderInput) reminderInput.value = '';
    });
  }

  // Search filter
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderNotes(e.target.value);
    });
  }

  // Clip current tab
  if (clipPageBtn) {
    clipPageBtn.addEventListener('click', async () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          if (titleInput) titleInput.value = 'Klip: ' + (tab.title || 'Halaman Web');
          if (contentEditable) {
            contentEditable.innerHTML = \`<p>🌐 Kliping dari: <a href="\${tab.url}" target="_blank">\${tab.url}</a></p>\`;
            contentEditable.focus();
          }
        }
      }
    });
  }

  // Open sidepanel
  if (sidepanelBtn) {
    sidepanelBtn.addEventListener('click', async () => {
      if (typeof chrome !== 'undefined' && chrome.sidePanel && chrome.sidePanel.open) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.windowId) {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        }
      }
    });
  }

  // Cloud Sync Modal Toggle
  if (syncCloudBtn && cloudModal) {
    syncCloudBtn.addEventListener('click', () => {
      cloudModal.classList.remove('hidden');
    });
  }
  if (closeModalBtn && cloudModal) {
    closeModalBtn.addEventListener('click', () => {
      cloudModal.classList.add('hidden');
    });
  }

  // Google Drive Real Sync Handlers
  async function performDriveSync(action) {
    if (!tokenInput || !cloudLog) return;
    const token = tokenInput.value.trim();
    if (!token) {
      cloudLog.textContent = '❌ Masukkan Access Token Google OAuth terlebih dahulu.';
      return;
    }

    cloudLog.textContent = '⏳ Menghubungkan ke Google Drive...';
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ google_access_token: token });
      }

      // Step 1: Find or Create "QuickNotes App" Folder
      const searchFolderUrl = "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='QuickNotes App' and trashed=false";
      let folderRes = await fetch(searchFolderUrl, { headers: { Authorization: 'Bearer ' + token } });
      let folderData = await folderRes.json();
      let folderId = folderData.files && folderData.files[0] ? folderData.files[0].id : null;

      if (!folderId) {
        const createFolderRes = await fetch("https://www.googleapis.com/drive/v3/files", {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify({ name: "QuickNotes App", mimeType: "application/vnd.google-apps.folder" })
        });
        const newFolder = await createFolderRes.json();
        folderId = newFolder.id;
      }

      // Step 2: Upload or Download
      const fileName = "quicknotes_database.json";
      const fileQuery = "https://www.googleapis.com/drive/v3/files?q='" + folderId + "' in parents and name='" + fileName + "' and trashed=false";
      const fileRes = await fetch(fileQuery, { headers: { Authorization: 'Bearer ' + token } });
      const fileData = await fileRes.json();
      const existingFile = fileData.files && fileData.files[0] ? fileData.files[0].id : null;

      if (action === 'upload') {
        const payload = JSON.stringify({ app: "QuickNotes", updatedAt: new Date().toISOString(), notes }, null, 2);
        let targetId = existingFile;

        if (!targetId) {
          const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
            method: "POST",
            headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
            body: JSON.stringify({ name: fileName, mimeType: "application/json", parents: [folderId] })
          });
          const created = await createRes.json();
          targetId = created.id;
        }

        await fetch("https://www.googleapis.com/upload/drive/v3/files/" + targetId + "?uploadType=media", {
          method: "PATCH",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: payload
        });

        const time = new Date().toLocaleTimeString('id-ID');
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({ last_synced: time });
        }
        cloudLog.textContent = '✅ Berhasil mengunggah ' + notes.length + ' catatan ke Drive!';
        if (syncBanner) syncBanner.classList.remove('hidden');
        if (syncStatusText) syncStatusText.textContent = '🟢 Sync: ' + time;
      } else if (action === 'download') {
        if (!existingFile) {
          cloudLog.textContent = '⚠️ File cadangan belum ditemukan di Google Drive.';
          return;
        }

        const downRes = await fetch("https://www.googleapis.com/drive/v3/files/" + existingFile + "?alt=media", {
          headers: { Authorization: 'Bearer ' + token }
        });
        const cloudData = await downRes.json();
        if (cloudData && Array.isArray(cloudData.notes)) {
          notes = cloudData.notes;
          await persistNotes();
          cloudLog.textContent = '✅ Berhasil memuat ' + notes.length + ' catatan dari Drive!';
        }
      }
    } catch (err) {
      cloudLog.textContent = '❌ Gagal: ' + (err.message || 'Periksa token Google Anda.');
    }
  }

  if (driveUploadBtn) driveUploadBtn.addEventListener('click', () => performDriveSync('upload'));
  if (driveDownloadBtn) driveDownloadBtn.addEventListener('click', () => performDriveSync('download'));
  if (syncNowBtn) syncNowBtn.addEventListener('click', () => performDriveSync('upload'));

  // Backup Export
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`quicknotes_backup_\${Date.now()}.json\`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Clear all
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Yakin ingin membersihkan semua catatan?')) {
        notes = [];
        persistNotes();
      }
    });
  }

  // Storage listener for live sync across sidepanel & popup
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.notes) {
        notes = changes.notes.newValue || [];
        renderNotes(searchInput ? searchInput.value : '');
      }
    });
  }

  await loadNotes();
});`;

export const EXTENSION_BACKGROUND_JS = `// Background Service Worker for QuickNotes Manifest V3
chrome.runtime.onInstalled.addListener(() => {
  // Allow user to open sidepanel on clicking extension icon
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }

  // Create Context Menu for web clipping
  chrome.contextMenus.create({
    id: "quicknotes_clip_selection",
    title: "Simpan teks terpilih ke QuickNotes 📝",
    contexts: ["selection"]
  });

  chrome.contextMenus.create({
    id: "quicknotes_clip_page",
    title: "Simpan URL halaman ini ke QuickNotes 🌐",
    contexts: ["page"]
  });
});

// Context Menu Click Listener
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { notes = [] } = await chrome.storage.local.get(["notes"]);
  
  if (info.menuItemId === "quicknotes_clip_selection" && info.selectionText) {
    const newNote = {
      id: "clip_" + Date.now(),
      title: "Kliping: " + (tab?.title?.substring(0, 40) || "Halaman Web"),
      content: "<p>" + info.selectionText + "</p>",
      noteType: "clip",
      category: "clips",
      tags: ["web-clip"],
      color: "blue",
      clippedUrl: tab?.url || "",
      clippedTitle: tab?.title || "",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    notes.unshift(newNote);
    await chrome.storage.local.set({ notes });
    
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { action: "SHOW_CLIP_NOTIFICATION", message: "Catatan berhasil disimpan ke QuickNotes! 🚀" });
    }
  } else if (info.menuItemId === "quicknotes_clip_page" && tab) {
    const newNote = {
      id: "clip_page_" + Date.now(),
      title: tab.title || "Bookmark Catatan",
      content: "<p>🌐 <a href='" + tab.url + "' target='_blank'>" + tab.url + "</a></p>",
      noteType: "clip",
      category: "clips",
      tags: ["bookmark"],
      color: "emerald",
      clippedUrl: tab.url || "",
      clippedTitle: tab.title || "",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    notes.unshift(newNote);
    await chrome.storage.local.set({ notes });
  }
});

// Update extension badge with active notes count
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.notes) {
    const count = (changes.notes.newValue || []).length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
    chrome.action.setBadgeBackgroundColor({ color: "#0284c7" });
  }
});

// Periodic reminder checking alarm (every 1 minute)
chrome.alarms.create("quicknotes_reminder_check", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "quicknotes_reminder_check") {
    const { notes = [] } = await chrome.storage.local.get(["notes"]);
    const now = Date.now();

    notes.forEach((note) => {
      if (note.reminderAt && note.reminderAt <= now && !note.isReminderDismissed) {
        chrome.notifications.create("reminder_" + note.id, {
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: "⏰ Pengingat: " + (note.title || "Catatan QuickNotes"),
          message: (note.content || "").replace(/<[^>]*>/g, "").substring(0, 80) || "Waktu pengingat catatan telah tiba.",
          priority: 2
        });
      }
    });
  }
});`;

export const EXTENSION_CONTENT_SCRIPT_JS = `// Content Script injected into web pages with Site Rules support
console.log("QuickNotes Pro content script loaded.");

// Check site rules from storage before rendering floating pin toolbar
async function initFloatingToolbar() {
  const hostname = window.location.hostname.replace(/^www\\./, '');
  
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const data = await chrome.storage.local.get(['site_rules_mode', 'pinned_sites']);
    const mode = data.site_rules_mode || 'specific_sites';
    const sites = data.pinned_sites || ['wikipedia.org', 'github.com', 'docs.google.com', 'medium.com'];

    let shouldShow = false;
    if (mode === 'all_sites') {
      shouldShow = true;
    } else if (mode === 'specific_sites') {
      shouldShow = sites.some(s => hostname === s || hostname.endsWith('.' + s) || s.endsWith('.' + hostname));
    }

    if (shouldShow) {
      renderFloatingWidget(hostname);
    }
  }
}

function renderFloatingWidget(domain) {
  if (document.getElementById("quicknotes-floating-toolbar")) return;

  const toolbar = document.createElement("div");
  toolbar.id = "quicknotes-floating-toolbar";
  toolbar.innerHTML = \`
    <div class="qn-bar-icon" title="QuickNotes Pin Toolbar (Aktif di \${domain})">⚡</div>
    <div class="qn-bar-actions">
      <button class="qn-btn" id="qn-btn-quick-clip" title="Klip Halaman Ini">🌐</button>
      <button class="qn-btn" id="qn-btn-quick-note" title="Catatan Cepat">📝</button>
    </div>
  \`;

  document.body.appendChild(toolbar);

  const clipBtn = document.getElementById("qn-btn-quick-clip");
  if (clipBtn) {
    clipBtn.addEventListener("click", () => {
      const pageTitle = document.title || "Halaman Web";
      const selText = window.getSelection()?.toString()?.trim() || "";
      const note = {
        id: "clip_" + Date.now(),
        title: "Klip: " + pageTitle.substring(0, 40),
        content: selText ? "<p>" + selText + "</p>" : "<p>🌐 Disimpan dari: <a href='" + window.location.href + "' target='_blank'>" + window.location.href + "</a></p>",
        noteType: "clip",
        category: "clips",
        tags: ["in-page-clip", domain],
        clippedUrl: window.location.href,
        clippedTitle: pageTitle,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["notes"], (res) => {
          const notes = res.notes || [];
          notes.unshift(note);
          chrome.storage.local.set({ notes }, () => {
            showToast("Halaman berhasil dikliping ke QuickNotes! 🌐");
          });
        });
      }
    });
  }

  const noteBtn = document.getElementById("qn-btn-quick-note");
  if (noteBtn) {
    noteBtn.addEventListener("click", () => {
      const text = prompt("Tulis catatan kilat untuk situs " + domain + ":");
      if (text && text.trim()) {
        const note = {
          id: "note_" + Date.now(),
          title: "Catatan di " + domain,
          content: "<p>" + text.trim() + "</p>",
          category: "ideas",
          color: "amber",
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(["notes"], (res) => {
            const notes = res.notes || [];
            notes.unshift(note);
            chrome.storage.local.set({ notes }, () => {
              showToast("Catatan kilat berhasil disimpan! 📝");
            });
          });
        }
      }
    });
  }
}

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "SHOW_CLIP_NOTIFICATION") {
    showToast(request.message);
  }
});

function showToast(text) {
  const existing = document.getElementById("quicknotes-toast-box");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "quicknotes-toast-box";
  toast.textContent = text;
  toast.style.cssText = \`
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #ffffff;
    color: #0284c7;
    border: 1px solid #0284c7;
    padding: 12px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
    z-index: 999999;
    font-family: system-ui, sans-serif;
    transition: all 0.3s ease;
  \`;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Start checking rules on load
initFloatingToolbar();`;

export const EXTENSION_CONTENT_SCRIPT_CSS = `/* In-page styling for QuickNotes web clipper elements & floating toolbar */
#quicknotes-floating-toolbar {
  position: fixed;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 999999;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px;
  gap: 6px;
  font-family: system-ui, -apple-system, sans-serif;
  transition: all 0.2s ease;
}

#quicknotes-floating-toolbar .qn-bar-icon {
  width: 28px;
  height: 28px;
  background: #e0f2fe;
  color: #0284c7;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
}

#quicknotes-floating-toolbar .qn-bar-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

#quicknotes-floating-toolbar .qn-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

#quicknotes-floating-toolbar .qn-btn:hover {
  background: #e0f2fe;
  border-color: #38bdf8;
  transform: scale(1.05);
}`;

export const EXTENSION_SIDEPANEL_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stok & QuickNotes Side Panel</title>
  <link rel="stylesheet" href="popup.css">
  <style>
    body {
      width: 100% !important;
      height: 100vh !important;
      margin: 0;
      padding: 0;
      background: #f8fafc;
      font-family: system-ui, sans-serif;
    }
    .popup-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .panel-nav {
      display: flex;
      background: #e2e8f0;
      padding: 4px;
      gap: 4px;
      border-bottom: 1px solid #cbd5e1;
    }
    .nav-tab {
      flex: 1;
      padding: 6px 10px;
      font-size: 11px;
      font-weight: 600;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
      color: #475569;
    }
    .nav-tab.active {
      background: #ffffff;
      color: #059669;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .tab-content {
      flex: 1;
      overflow-y: auto;
      display: none;
      padding: 12px;
    }
    .tab-content.active {
      display: flex;
      flex-direction: column;
    }
    .stock-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
    }
  </style>
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <div class="brand">
        <span class="brand-icon">📦</span>
        <span class="brand-title">Stok & QuickNotes Side Panel</span>
      </div>
      <div class="header-actions">
        <button id="btn-clip-page" class="icon-btn">🌐 Klip Web</button>
      </div>
    </header>

    <div class="panel-nav">
      <button class="nav-tab active" data-target="tab-stock">📦 Stok Google Sheet</button>
      <button class="nav-tab" data-target="tab-notes">📝 Catatan & Memo</button>
    </div>

    <!-- Tab 1: Stock Google Sheet -->
    <div id="tab-stock" class="tab-content active">
      <div style="margin-bottom: 10px;">
        <input type="text" id="stock-search" placeholder="🔍 Cari SKU, Nama Produk, atau Satuan..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; outline: none; box-sizing: border-box;" />
      </div>
      <div id="stock-products-list" style="display: flex; flex-direction: column; gap: 8px;">
        <div class="stock-card">
          <div style="font-weight: bold; font-size: 12px; color: #0f172a;">📦 [SKU-1001] Wireless Mouse Ergonomic RGB</div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">Qty: 38 pcs • Eceran: Rp 185.000</div>
        </div>
        <div class="stock-card">
          <div style="font-weight: bold; font-size: 12px; color: #0f172a;">📦 [SKU-1002] Mechanical Keyboard 75% RGB</div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">Qty: 12 unit • Eceran: Rp 590.000</div>
        </div>
      </div>
    </div>

    <!-- Tab 2: Notes Editor -->
    <div id="tab-notes" class="tab-content">
      <div class="quick-input-card">
        <input type="text" id="note-title-input" placeholder="Judul catatan Side Panel..." />
        <div class="format-toolbar">
          <button type="button" class="fmt-btn" data-cmd="bold" title="Tebal"><b>B</b></button>
          <button type="button" class="fmt-btn" data-cmd="italic" title="Miring"><i>I</i></button>
          <button type="button" class="fmt-btn" data-cmd="underline" title="Garis Bawah"><u>U</u></button>
          <button type="button" class="fmt-btn" data-cmd="insertUnorderedList" title="List">• List</button>
          <button type="button" class="fmt-btn" id="btn-insert-link" title="Link">🔗 Link</button>
        </div>
        <div id="note-content-editable" class="content-editable" contenteditable="true" placeholder="Tulis sambil membaca halaman web..."></div>
        <div class="input-controls">
          <div class="color-picker" id="color-picker">
            <span class="color-dot color-amber active" data-color="amber"></span>
            <span class="color-dot color-emerald" data-color="emerald"></span>
            <span class="color-dot color-blue" data-color="blue"></span>
            <span class="color-dot color-purple" data-color="purple"></span>
            <span class="color-dot color-rose" data-color="rose"></span>
          </div>
          <div class="action-buttons">
            <select id="note-category-select">
              <option value="learning">📚 Belajar</option>
              <option value="ideas">💡 Ide</option>
              <option value="work">💼 Kerja</option>
              <option value="clips">🌐 Klip</option>
            </select>
            <button id="btn-save-note" class="primary-btn">Simpan</button>
          </div>
        </div>
      </div>

      <div class="search-bar">
        <input type="text" id="search-input" placeholder="🔍 Cari catatan..." />
        <span id="notes-counter" class="notes-count">0 Catatan</span>
      </div>

      <div id="notes-list" class="notes-list"></div>

      <footer class="popup-footer">
        <button id="btn-export-json">💾 Backup JSON</button>
        <button id="btn-clear-all" class="text-danger">Bersihkan</button>
      </footer>
    </div>
  </div>
  <script>
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.target);
        if (target) target.classList.add('active');
      });
    });
  </script>
  <script src="popup.js"></script>
</body>
</html>`;

export const EXTENSION_OPTIONS_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>QuickNotes Settings</title>
  <style>
    body {
      background: #f8fafc;
      color: #0f172a;
      font-family: system-ui, sans-serif;
      padding: 30px;
      max-width: 600px;
      margin: 0 auto;
    }
    h1 { color: #0284c7; font-size: 20px; margin-bottom: 20px; }
    .card { background: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
    label { display: block; margin-bottom: 8px; font-weight: 600; font-size: 13px; }
    button { background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
  </style>
</head>
<body>
  <h1>⚙️ QuickNotes Pro Settings</h1>
  <div class="card">
    <label>Pintasan Keyboard</label>
    <p style="color: #64748b; font-size: 12px; margin-bottom: 10px;">Tekan <strong>Alt + Shift + N</strong> untuk membuka QuickNotes instan dari halaman web mana pun.</p>
  </div>
  <div class="card">
    <label>Sinkronisasi Cloud Google Drive</label>
    <p style="color: #64748b; font-size: 12px; margin-bottom: 10px;">Catatan disimpan lokal di <code>chrome.storage.local</code> dan dapat disinkronkan ke Google Drive akun Anda.</p>
  </div>
</body>
</html>`;

export const EXTENSION_README_MD = `# QuickNotes Pro - Google Chrome Extension (Manifest V3)

Ekstensi Google Chrome modern untuk membuat catatan cepat, format teks kaya (Rich Text), to-do list, kliping teks web otomatis, dan sinkronisasi Google Drive multi-device.

## Cara Memasang di Google Chrome (Load Unpacked):

1. Unduh dan ekstrak file ZIP ekstensi ini ke folder komputer Anda (misal: \`quicknotes-extension\`).
2. Buka browser **Google Chrome**, lalu ketik \`chrome://extensions\` di kolom URL dan tekan Enter.
3. Di pojok kanan atas, aktifkan tombol **"Developer mode" (Mode Pengembang)**.
4. Klik tombol **"Load unpacked" (Muat yang belum dibongkar)** di pojok kiri atas.
5. Pilih folder yang berisi file \`manifest.json\` hasil ekstrak tadi.
6. 🎉 Ekstensi **QuickNotes Pro** selesai dipasang! Sematkan (pin) ikon ekstensi ke toolbar Chrome Anda.

## Fitur Unggulan:
- ⚡ **Popup Memo Kilat**: Tekan \`Alt + Shift + N\` untuk membuka catatan kapan saja.
- 📌 **Chrome Side Panel**: Buka panel samping untuk mencatat berdampingan saat membaca artikel.
- 🌐 **Web Clipper**: Sorot teks apa saja di website > Klik Kanan > "Simpan ke QuickNotes".
- ☁️ **Real Google Cloud Sync**: Sinkronkan catatan otomatis ke Google Drive agar selalu terupdate di komputer mana pun saat Anda login.
- 💾 **Local Persistence**: Data tetap tersimpan cepat di \`chrome.storage.local\`.
`;

export function getExtensionFilesList(): ExtensionFileItem[] {
  return [
    {
      name: 'manifest.json',
      path: 'manifest.json',
      language: 'json',
      description: 'Konfigurasi Chrome Extension Manifest V3 dengan permissions & side panel',
      content: EXTENSION_MANIFEST,
    },
    {
      name: 'popup.html',
      path: 'popup.html',
      language: 'html',
      description: 'Tampilan antarmuka popup toolbar Chrome dengan Rich Text Editor & Cloud Sync',
      content: EXTENSION_POPUP_HTML,
    },
    {
      name: 'popup.js',
      path: 'popup.js',
      language: 'javascript',
      description: 'Logika penyimpanan Chrome Storage, Real Google Drive Sync, Rich Format, & Search',
      content: EXTENSION_POPUP_JS,
    },
    {
      name: 'popup.css',
      path: 'popup.css',
      language: 'css',
      description: 'Styling light mode modern dengan tata letak bersih dan responsif',
      content: EXTENSION_POPUP_CSS,
    },
    {
      name: 'background.js',
      path: 'background.js',
      language: 'javascript',
      description: 'Service Worker MV3 untuk Context Menu kliping web & badge counter',
      content: EXTENSION_BACKGROUND_JS,
    },
    {
      name: 'content_script.js',
      path: 'content_script.js',
      language: 'javascript',
      description: 'Skrip in-page untuk notifikasi toast saat menyimpan kliping teks',
      content: EXTENSION_CONTENT_SCRIPT_JS,
    },
    {
      name: 'sidepanel.html',
      path: 'sidepanel.html',
      language: 'html',
      description: 'Chrome Side Panel untuk mencatat berdampingan saat membaca web',
      content: EXTENSION_SIDEPANEL_HTML,
    },
    {
      name: 'options.html',
      path: 'options.html',
      language: 'html',
      description: 'Halaman opsi ekstensi Chrome untuk konfigurasi & backup',
      content: EXTENSION_OPTIONS_HTML,
    },
    {
      name: 'README.md',
      path: 'README.md',
      language: 'markdown',
      description: 'Panduan langkah demi langkah cara pasang ekstensi di Google Chrome',
      content: EXTENSION_README_MD,
    },
  ];
}

function createSvgIconDataUrl(size: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(1, '#6366f1');
    ctx.fillStyle = grad;
    
    const r = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(size * 0.55)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', size / 2, size / 2);
  }
  return canvas.toDataURL('image/png');
}

export async function generateAndDownloadExtensionZip(): Promise<void> {
  const zip = new JSZip();

  const files = getExtensionFilesList();
  files.forEach(f => {
    zip.file(f.path, f.content);
  });

  zip.file('content_script.css', EXTENSION_CONTENT_SCRIPT_CSS);

  const iconsFolder = zip.folder('icons');
  if (iconsFolder) {
    const icon16Base64 = createSvgIconDataUrl(16).split(',')[1];
    const icon48Base64 = createSvgIconDataUrl(48).split(',')[1];
    const icon128Base64 = createSvgIconDataUrl(128).split(',')[1];

    iconsFolder.file('icon16.png', icon16Base64, { base64: true });
    iconsFolder.file('icon48.png', icon48Base64, { base64: true });
    iconsFolder.file('icon128.png', icon128Base64, { base64: true });
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'quicknotes-chrome-extension-v3.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
