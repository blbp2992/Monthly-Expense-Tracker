import { useEffect, useMemo, useRef, useState } from 'react';
import { isCloudConfigured } from '../firebaseConfig';
import { loadFromStorage, saveToStorage } from '../utils/storage';
import { SYNC_NAMES, SYNC_SPECS } from './specs';

// Connects app state to Firestore when the user is signed in.
// `bindings` maps each SYNC_NAMES entry to { value, setValue }.
export const useCloudSync = (bindings, addToast) => {
  const cloudRef = useRef(null);
  const enginesRef = useRef({});
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  const [authReady, setAuthReady] = useState(!isCloudConfigured);
  const [user, setUser] = useState(null);
  const [statuses, setStatuses] = useState({});
  const [mergeState, setMergeState] = useState('idle'); // idle | merging | waiting-offline | done
  const [retryTick, setRetryTick] = useState(0);

  // Load Firebase lazily and follow the signed-in user
  useEffect(() => {
    if (!isCloudConfigured) return undefined;
    let cancelled = false;
    let unsubscribe;
    import('./cloud')
      .then((cloud) => {
        if (cancelled) return;
        cloudRef.current = cloud;
        unsubscribe = cloud.watchAuth((firebaseUser) => {
          setUser(firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email } : null);
          setAuthReady(true);
        });
      })
      .catch((err) => {
        console.error('[CloudSync] Failed to load Firebase:', err);
        setAuthReady(true);
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // Start syncing every collection for the signed-in user
  useEffect(() => {
    const cloud = cloudRef.current;
    if (!user || !cloud) return undefined;

    let stopped = false;
    const engines = {};
    const mergedKey = `cloud_merged_${user.uid}`;

    const start = async () => {
      if (!loadFromStorage(mergedKey, false)) {
        setMergeState('merging');
        try {
          let uploaded = 0;
          for (const name of SYNC_NAMES) {
            uploaded += await cloud.mergeLocalIntoCloud(
              user.uid,
              name,
              SYNC_SPECS[name],
              bindingsRef.current[name].value
            );
          }
          saveToStorage(mergedKey, true);
          if (uploaded > 0) addToast(`Uploaded ${uploaded} records from this device to your cloud account`);
        } catch (err) {
          console.warn('[CloudSync] First sync needs a connection; will retry when online.', err);
          if (!stopped) setMergeState('waiting-offline');
          return;
        }
      }
      if (stopped) return;
      setMergeState('done');

      let errorShown = false;
      SYNC_NAMES.forEach((name) => {
        engines[name] = cloud.createCollectionSync({
          uid: user.uid,
          name,
          spec: SYNC_SPECS[name],
          onRemote: (updater) => bindingsRef.current[name].setValue(updater),
          onStatus: (status) => setStatuses((prev) => ({ ...prev, [name]: status })),
          onError: (err) => {
            if (errorShown) return;
            errorShown = true;
            addToast(
              err.code === 'permission-denied'
                ? 'Cloud sync was blocked by Firestore security rules.'
                : `Cloud sync error: ${err.message}`,
              'error'
            );
          }
        });
      });
      enginesRef.current = engines;
    };

    start();

    return () => {
      stopped = true;
      Object.values(engines).forEach((engine) => engine.stop());
      enginesRef.current = {};
      setStatuses({});
      setMergeState('idle');
    };
  }, [user, retryTick]);

  // Retry the first sync when the connection comes back
  useEffect(() => {
    if (mergeState !== 'waiting-offline') return undefined;
    const retry = () => setRetryTick((t) => t + 1);
    window.addEventListener('online', retry);
    const timer = setInterval(retry, 30000);
    return () => {
      window.removeEventListener('online', retry);
      clearInterval(timer);
    };
  }, [mergeState]);

  // Push local changes (engines ignore pushes until they've seen the cloud state)
  SYNC_NAMES.forEach((name) => {
    const value = bindings[name].value;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      enginesRef.current[name]?.push(value);
    }, [value]);
  });

  const status = useMemo(() => {
    if (!isCloudConfigured) return 'not-configured';
    if (!authReady) return 'loading';
    if (!user) return 'signed-out';
    if (mergeState === 'merging') return 'syncing';
    if (mergeState === 'waiting-offline') return 'offline';
    const list = SYNC_NAMES.map((name) => statuses[name]);
    if (list.some((s) => s?.error)) return 'error';
    if (list.some((s) => !s?.ready)) return 'syncing';
    if (list.some((s) => s.fromCache)) return 'offline';
    if (list.some((s) => s.pendingWrites)) return 'syncing';
    return 'synced';
  }, [authReady, user, mergeState, statuses]);

  const errorDetail = SYNC_NAMES.map((name) => statuses[name]?.error).find(Boolean) || null;

  const withCloud = async (fn) => {
    if (!cloudRef.current) throw new Error('Cloud sync is still loading. Try again in a moment.');
    try {
      return await fn(cloudRef.current);
    } catch (err) {
      throw new Error(cloudRef.current.describeAuthError(err));
    }
  };

  return {
    cloudConfigured: isCloudConfigured,
    cloudUser: user,
    cloudStatus: status,
    cloudError: errorDetail,
    cloudSignIn: (email, password) => withCloud((c) => c.signIn(email, password)),
    cloudSignUp: (email, password) => withCloud((c) => c.signUp(email, password)),
    cloudResetPassword: (email) => withCloud((c) => c.resetPassword(email)),
    cloudSignOut: () => withCloud((c) => c.signOut())
  };
};
