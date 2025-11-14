// Lazy Firebase loader using ESM from gstatic. Works in MV3 service workers and pages.
export async function initFirebase() {
  const { firebaseConfig } = await chrome.storage.local.get('firebaseConfig');
  if (!firebaseConfig) throw new Error('No Firebase config in storage');
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js');
  const { getFirestore, doc, getDoc, setDoc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  return {
    app,
    firestore: {
      collection: (name) => ({
        doc: (id) => ({
          async get() { return await getDoc(doc(db, name, id)); },
          async set(data, opts) { return await setDoc(doc(db, name, id), data, opts); },
          onSnapshot(cb) { return onSnapshot(doc(db, name, id), cb); }
        })
      })
    }
  };
}
