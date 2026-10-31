const MAX_BYTES = 25 * 1024 * 1024;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'PNGRAB_STATUS') {
    showToast(msg.message, msg.error ? '#7f1d1d' : '#065f46');
    return;
  }

  if (msg?.type === 'PNGRAB_CONVERT') {
    convertToPng(msg.srcUrl)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((err) => sendResponse({ ok: false, error: err.message || 'Failed to convert.' }));
    return true;
  }
});

async function convertToPng(srcUrl) {
  if (!srcUrl) throw new Error('No image URL provided.');

  const fetchInit = { cache: 'force-cache', credentials: 'include' };

  let res;
  try {
    res = await fetch(srcUrl, fetchInit);
  } catch (e) {
    throw new Error('Could not fetch the image (network/CORS blocked).');
  }
  if (!res.ok) {
    throw new Error('The image could not be downloaded (HTTP ' + res.status + ').');
  }

  const blob = await res.blob();
  if (blob.size > MAX_BYTES) {
    throw new Error('Image is too large to convert (over 25 MB).');
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch (e) {
    throw new Error('Could not decode the image format.');
  }

  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);

  let png;
  try {
    png = await canvas.convertToBlob({ type: 'image/png' });
  } catch (e) {
    throw new Error('Could not encode the image as PNG (maybe CORS-protected).');
  }

  return {
    dataUrl: await blobToDataUrl(png),
    filename: buildFilename(srcUrl),
    size: png.size
  };
}

async function blobToDataUrl(blob) {
  const buf = await blob.arrayBuffer();
  return 'data:image/png;base64,' + base64FromArrayBuffer(buf);
}

function base64FromArrayBuffer(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildFilename(srcUrl) {
  let base = 'image';
  try {
    const last = new URL(srcUrl).pathname.split('/').filter(Boolean).pop();
    if (last) {
      base =
        last
          .replace(/\.(jpe?g|webp|gif|avif|png|bmp|svg|ico)$/i, '')
          .replace(/[^a-z0-9\-_]+/gi, '-')
          .slice(0, 80) || 'image';
    }
  } catch (e) {}
  const ts = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
  return `${base}-${ts}.png`;
}

function showToast(message, background = '#2f3542') {
  const el = document.createElement('div');
  el.textContent = message;
  Object.assign(el.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    zIndex: '2147483647',
    background,
    color: '#ffffff',
    padding: '10px 14px',
    borderRadius: '8px',
    font: '13px/1.4 system-ui, sans-serif',
    boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
    maxWidth: '300px'
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
