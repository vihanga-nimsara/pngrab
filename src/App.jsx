import { useEffect, useState } from 'react';

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function App() {
  const [last, setLast] = useState(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'PNGRAB_ENSURE_MENU' }).catch(() => {});
  }, []);

  useEffect(() => {
    const refresh = (items) => {
      setLast(items.lastSaved);
    };
    chrome.storage.local.get(['lastSaved'], refresh);
    const onChanged = (changes, area) => {
      if (area !== 'local') return;
      const patch = {};
      if (changes.lastSaved) patch.lastSaved = changes.lastSaved.newValue;
      if (Object.keys(patch).length) refresh(patch);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  async function showInFolder() {
    if (last?.downloadId) {
      try {
        await chrome.downloads.show(last.downloadId);
        return;
      } catch (e) {
        console.error('PNGrab: stale download id', e);
      }
    }
    try {
      const items = await chrome.downloads.search({
        limit: 1,
        orderBy: ['-startTime']
      });
      if (items[0]) await chrome.downloads.show(items[0].id);
    } catch (e) {
      console.error('PNGrab: could not show download', e);
    }
  }

  return (
    <div className="app">
      <header>
        <img src="pngrab.png" alt="PNGrab" className="logo" />
      </header>

      <p className="howto">
        Right-click any image on a web page and choose <strong>Save as PNG</strong>.
      </p>

      {last ? (
        <div className="card">
          <div className="card-label">Last saved</div>
          <div className="card-name" title={last.name}>
            {last.name}
          </div>
          <div className="card-footer">
            <span className="card-meta">
              {formatSize(last.size)} · {new Date(last.time).toLocaleTimeString()}
            </span>
            <button
              className="folder-btn"
              onClick={showInFolder}
              title="Show in folder"
              aria-label="Show in folder"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="empty">No images saved yet.</div>
      )}
    </div>
  );
}

export default App;
