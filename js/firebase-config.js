// Firebase Configuration & Global Helper Services
const firebaseConfig = {
  apiKey: "AIzaSyD__Qpt9nre-b7EH9fGaQh4W-IO7DIZrjw",
  authDomain: "thumbnail-spy.firebaseapp.com",
  projectId: "thumbnail-spy",
  storageBucket: "thumbnail-spy.firebasestorage.app",
  messagingSenderId: "100072708111",
  appId: "1:100072708111:web:39e34609ae78f339866b7a"
};

// Initialize Firebase if loaded via CDN
let auth = null;
let db = null;

if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  auth = firebase.auth();
  db = firebase.firestore();
}

/**
 * Sign in with Google Auth Provider
 */
async function signInWithGoogle() {
  if (!auth) throw new Error("Firebase Auth is not initialized");
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await auth.signInWithPopup(provider);
  const user = result.user;
  
  if (user) {
    await syncUserProfileDoc(user);
  }
  return user;
}

/**
 * Sign out current user and immediately redirect to index.html
 */
async function signOutUser() {
  if (!auth) return;
  await auth.signOut();
  window.location.href = 'index.html';
}

/**
 * Synchronize user profile document in Firestore
 */
async function syncUserProfileDoc(user) {
  if (!db || !user) return null;
  try {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();
    const currentMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-08"

    if (!doc.exists) {
      const newUserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || '',
        usageCount: 0,
        maxLimit: 7, // 7 Free Credits per month
        plan: 'free', // 'free' | 'pro' | 'lifetime'
        lastRefilledMonth: currentMonth,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await userRef.set(newUserData);
      return newUserData;
    } else {
      const data = doc.data();
      const updates = {
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // 1. Pro Subscription Expiration Check
      if (data.plan === 'pro' && data.subscriptionExpiresAt) {
        const expiresAtMs = data.subscriptionExpiresAt.toMillis ? data.subscriptionExpiresAt.toMillis() : new Date(data.subscriptionExpiresAt).getTime();
        if (Date.now() > expiresAtMs) {
          console.log('[Subscription] Monthly Pro plan expired for user', user.uid);
          updates.plan = 'free';
          updates.maxLimit = 7;
          updates.usageCount = 0;
          updates.lastRefilledMonth = currentMonth;
          data.plan = 'free';
          data.maxLimit = 7;
          data.usageCount = 0;
        }
      }

      // 2. Free Tier Monthly Refill Check (7 credits refilled each month)
      if ((data.plan === 'free' || !data.plan) && data.lastRefilledMonth !== currentMonth) {
        console.log('[Refill] Resetting monthly free 7 credits for user', user.uid);
        updates.usageCount = 0;
        updates.maxLimit = 7;
        updates.lastRefilledMonth = currentMonth;
        data.usageCount = 0;
        data.maxLimit = 7;
        data.lastRefilledMonth = currentMonth;
      }

      await userRef.update(updates);
      return { ...data, ...updates };
    }
  } catch (err) {
    console.error('Error syncing Firestore user profile:', err);
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || '',
      usageCount: 0,
      maxLimit: 7,
      plan: 'free'
    };
  }
}

/**
 * Get user profile data from Firestore
 */
async function getUserProfile(uid) {
  if (!db || !uid) return null;
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data() : null;
}

/**
 * Atomically increment usage count for user in Firestore
 */
async function incrementUserUsage(uid) {
  if (!db || !uid) return null;
  const userRef = db.collection('users').doc(uid);
  await userRef.update({
    usageCount: firebase.firestore.FieldValue.increment(1)
  });
  const updatedDoc = await userRef.get();
  return updatedDoc.data();
}

/**
 * Subscribe to Auth state changes
 */
function onAuthStateChanged(callback) {
  if (!auth) return () => {};
  return auth.onAuthStateChanged(async (user) => {
    if (user) {
      const profile = await syncUserProfileDoc(user);
      callback(user, profile);
    } else {
      callback(null, null);
    }
  });
}
