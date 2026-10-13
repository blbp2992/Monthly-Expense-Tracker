import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

// Each build gives the main bundle a new hashed name, e.g. "index-CkwtQ3Za.js"
const bundleName = (text) => text?.match(/assets\/(index-[^"'/]+\.js)/)?.[1] || null;

const runningBundle = () =>
  bundleName(document.querySelector('script[type="module"][src*="/assets/index-"]')?.getAttribute('src'));

// Compares the live index.html with the running bundle. The query string keeps the
// service worker and browser cache from answering with an old copy.
const isNewVersionLive = async () => {
  const running = runningBundle();
  if (!running) return false;
  const res = await fetch(`${import.meta.env.BASE_URL}?version-check=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) return false;
  const live = bundleName(await res.text());
  return Boolean(live) && live !== running;
};

// Shows a refresh bar when a newer version has been deployed, checked on open,
// whenever the app comes back to the foreground, and every 30 minutes
export const UpdateBanner = () => {
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD) return undefined;

    const check = () => {
      if (document.visibilityState !== 'visible') return;
      isNewVersionLive()
        .then((isNew) => isNew && setUpdateReady(true))
        .catch(() => {}); // offline: try again later
    };

    check();
    document.addEventListener('visibilitychange', check);
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    return () => {
      document.removeEventListener('visibilitychange', check);
      clearInterval(timer);
    };
  }, []);

  if (!updateReady || dismissed) return null;

  return (
    <div className="update-banner" role="status">
      <span>A new version is available</span>
      <button type="button" className="update-banner-refresh" onClick={() => window.location.reload()}>
        <RefreshCw size={14} />
        <span>Refresh</span>
      </button>
      <button type="button" className="update-banner-close" aria-label="Dismiss" onClick={() => setDismissed(true)}>
        <X size={14} />
      </button>
    </div>
  );
};
