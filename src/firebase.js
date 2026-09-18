const firebaseConfig = {
  apiKey: 'AIzaSyClG9RrK09tSU5USRgaAczdrbQTxHysyxc',
  authDomain: 'cosmo-slimes.firebaseapp.com',
  projectId: 'cosmo-slimes',
  storageBucket: 'cosmo-slimes.firebasestorage.app',
  messagingSenderId: '556018642213',
  appId: '1:556018642213:web:de37189269a3b10f503ecc',
  measurementId: 'G-Y7QCRT7WM5'
};

let appPromise = null;

export function getFirebaseApp() {
  if (!appPromise) {
    appPromise = import('firebase/app').then(({ initializeApp, getApps, getApp }) => {
      if (getApps().length === 0) return initializeApp(firebaseConfig);
      return getApp();
    });
  }
  return appPromise;
}

export async function getFirestoreModule() {
  const app = await getFirebaseApp();
  const { getFirestore, collection, query, doc, where, orderBy, limit, setDoc, onSnapshot, getDocs, getCountFromServer } = await import('firebase/firestore');
  return { db: getFirestore(app), collection, query, doc, where, orderBy, limit, setDoc, onSnapshot, getDocs, getCountFromServer };
}

export async function initFirebaseAnalytics() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  try {
    if (typeof window.matchMedia !== 'function') return null;
    const app = await getFirebaseApp();
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    if (!(await isSupported())) return null;
    return getAnalytics(app);
  } catch (e) {
    return null;
  }
}

export async function getAnonymousUid() {
  const app = await getFirebaseApp();
  const { getAuth } = await import('firebase/auth');
  const auth = getAuth(app);
  if (auth.currentUser) return auth.currentUser.uid;
  const { signInAnonymously } = await import('firebase/auth');
  try {
    const cred = await signInAnonymously(auth);
    return cred.user ? cred.user.uid : null;
  } catch (e) {
    try {
      return auth.currentUser ? auth.currentUser.uid : null;
    } catch (e2) {
      return null;
    }
  }
}

export const FIREBASE_RULES_HINT = `Firestore rules for /leaderboard/{uid}:
  match /leaderboard/{uid} {
    allow read: if true;
    allow create: if request.auth != null && request.auth.uid == uid;
    allow update: if request.auth != null && request.auth.uid == uid;
  }`;