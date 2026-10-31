const MENU_ID = 'pngrab-save-as-png';

function ensureMenu() {
  try {
    const result = chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Save as PNG',
      contexts: ['image']
    });
    if (result && typeof result.catch === 'function') {
      result.catch((err) => {
        const msg = String(err && err.message ? err.message : err);
        if (!msg.includes('duplicate')) console.error('PNGrab: menu create failed ->', msg);
      });
    }
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    console.error('PNGrab: menu create failed ->', msg);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'PNGRAB_ENSURE_MENU') {
    ensureMenu();
    sendResponse({ ok: true });
  }
});

ensureMenu();
chrome.runtime.onInstalled.addListener(ensureMenu);
chrome.runtime.onStartup.addListener(ensureMenu);

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.srcUrl) return;

  const tabId = tab?.id;
  if (tabId == null) return;

  try {
    // Inject the content script into the active tab. Host access is granted
    // temporarily via the activeTab permission on this explicit user gesture,
    // so no broad host_permissions are required.
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });

    const converted = await convertViaContentScript(tabId, info.srcUrl);

    if (!converted.ok) {
      throw new Error(converted.error || 'Could not convert the image.');
    }

    const downloadId = await download(converted.dataUrl, converted.filename);

    chrome.storage.local.set({
      lastSaved: {
        name: converted.filename,
        size: converted.size,
        time: Date.now(),
        downloadId
      }
    });

    notifyTab(tabId, `Saved as ${converted.filename}`);
  } catch (err) {
    console.error('PNGrab:', err);
    notifyTab(tabId, (err && err.message) || 'Something went wrong while saving the PNG.', true);
  }
});

function convertViaContentScript(tabId, srcUrl) {
  return new Promise((resolve) => {
    chrome.tabs
      .sendMessage(tabId, { type: 'PNGRAB_CONVERT', srcUrl })
      .then(resolve)
      .catch(() => resolve({ ok: false }));
  });
}

function download(dataUrl, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      { url: dataUrl, filename, saveAs: true },
      (id) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(id);
      }
    );
  });
}

function notifyTab(tabId, message, error = false) {
  if (tabId == null) return;
  chrome.tabs
    .sendMessage(tabId, { type: 'PNGRAB_STATUS', message, error })
    .catch(() => {});
}
