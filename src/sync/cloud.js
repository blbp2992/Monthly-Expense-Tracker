// Firebase-backed sync. Loaded lazily so the app still starts fast (and works
// fully offline in local-only mode) when cloud sync isn't used.
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  onSnapshot,
  writeBatch,
  getDocsFromServer
} from 'firebase/firestore';
import { firebaseConfig } from '../firebaseConfig';

const BATCH_LIMIT = 450; // Firestore allows 500 writes per batch

let services = null;
const getServices = () => {
  if (!services) {
    const app = initializeApp(firebaseConfig);
    services = {
      auth: getAuth(app),
      db: initializeFirestore(app, {
        // Offline cache: changes save locally first and upload when back online
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        ignoreUndefinedProperties: true
      })
    };
  }
  return services;
};

// --- Auth -------------------------------------------------------------------

export const watchAuth = (callback) => onAuthStateChanged(getServices().auth, callback);

export const signIn = (email, password) =>
  signInWithEmailAndPassword(getServices().auth, email, password);

export const signUp = (email, password) =>
  createUserWithEmailAndPassword(getServices().auth, email, password);

export const resetPassword = (email) => sendPasswordResetEmail(getServices().auth, email);

export const signOut = () => firebaseSignOut(getServices().auth);

export const describeAuthError = (err) => {
  switch (err?.code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists — sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in the Firebase console.';
    default:
      return err?.message || 'Something went wrong.';
  }
};

// --- Data sync ----------------------------------------------------------------

// Drops undefined values and gives a key-order-independent string for comparisons
const clean = (data) => JSON.parse(JSON.stringify(data));
const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const commitInBatches = async (db, ops) => {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch));
    await batch.commit();
  }
};

const userCollection = (uid, name) => collection(getServices().db, 'users', uid, name);

// First sign-in on a device: upload local records the cloud doesn't have yet.
// Records already in the cloud win. Needs a connection (reads from the server).
export const mergeLocalIntoCloud = async (uid, name, spec, localValue) => {
  const { db } = getServices();
  const colRef = userCollection(uid, name);
  const snap = await getDocsFromServer(colRef);
  const remoteIds = new Set(snap.docs.map((d) => d.id));
  const ops = spec
    .toEntries(localValue)
    .filter(([id]) => id && !remoteIds.has(id))
    .map(([id, data]) => (batch) => batch.set(doc(colRef, id), clean(data)));
  await commitInBatches(db, ops);
  return ops.length;
};

// Keeps one piece of app state in sync with users/{uid}/{name}.
// - Remote snapshots replace local state, re-applying any local edits not yet pushed.
// - push(value) diffs state against the last known cloud copy and writes only changes.
export const createCollectionSync = ({ uid, name, spec, onRemote, onStatus, onError }) => {
  const { db } = getServices();
  const colRef = userCollection(uid, name);
  let baseline = null; // Map docId -> stable string of the cloud copy

  const unsubscribe = onSnapshot(
    colRef,
    { includeMetadataChanges: true },
    (snap) => {
      onStatus({
        ready: true,
        fromCache: snap.metadata.fromCache,
        pendingWrites: snap.metadata.hasPendingWrites
      });
      if (baseline && snap.docChanges().length === 0) return; // metadata-only update
      // An empty offline cache (e.g. evicted by the browser) isn't the real cloud
      // state; keep showing local data until the server responds
      if (!baseline && snap.metadata.fromCache && snap.empty) return;

      const previousBaseline = baseline;
      const remoteEntries = snap.docs.map((d) => [d.id, d.data()]);
      baseline = new Map(remoteEntries.map(([id, data]) => [id, stableStringify(data)]));

      onRemote((prev) => {
        if (!previousBaseline) return spec.fromEntries(remoteEntries, prev);
        // Keep local changes made since the last push so a snapshot can't wipe them
        const merged = new Map(remoteEntries);
        const localEntries = spec.toEntries(prev);
        const localIds = new Set();
        localEntries.forEach(([id, data]) => {
          localIds.add(id);
          if (previousBaseline.get(id) !== stableStringify(clean(data))) merged.set(id, data);
        });
        previousBaseline.forEach((_, id) => {
          if (!localIds.has(id)) merged.delete(id);
        });
        return spec.fromEntries([...merged.entries()], prev);
      });
    },
    (err) => {
      console.error(`[CloudSync] ${name} listener failed:`, err);
      onStatus({ ready: false, error: err.code || err.message });
      onError?.(err);
    }
  );

  const push = (value) => {
    // Until the first snapshot arrives we don't know the cloud state, so never
    // write (that could re-upload stale data or delete newer cloud records)
    if (!baseline) return;
    const ops = [];
    const seen = new Set();
    spec.toEntries(value).forEach(([id, data]) => {
      if (!id) return;
      seen.add(id);
      const cleaned = clean(data);
      const str = stableStringify(cleaned);
      if (baseline.get(id) !== str) {
        baseline.set(id, str);
        ops.push((batch) => batch.set(doc(colRef, id), cleaned));
      }
    });
    [...baseline.keys()].forEach((id) => {
      if (!seen.has(id)) {
        baseline.delete(id);
        ops.push((batch) => batch.delete(doc(colRef, id)));
      }
    });
    if (ops.length === 0) return;
    // Resolves once the server confirms; the local cache updates immediately
    commitInBatches(db, ops).catch((err) => {
      console.error(`[CloudSync] ${name} write failed:`, err);
      onStatus({ ready: true, error: err.code || err.message });
      onError?.(err);
    });
  };

  return { push, stop: unsubscribe };
};
