
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, onIdTokenChanged, signInAnonymously, type Auth, type User } from "firebase/auth";
import { getFirestore, collection, query, onSnapshot, addDoc, updateDoc, doc, arrayUnion, orderBy, type Firestore, type Unsubscribe } from "firebase/firestore";
import type { Task, StatusHistoryEntry } from "@/types";

declare global {
  interface Window {
    __app_id?: string;
    __firebase_config?: object;
    __initial_auth_token?: string;
  }
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let lastUid: string | null = null;
let userPromise: Promise<User | null> | null = null;


const initializeFirebase = () => {
    if (typeof window === "undefined") {
      throw new Error("Firebase can only be initialized on the client.");
    }
    if (getApps().length) return;

    const firebaseConfig = window.__firebase_config;
    if (!firebaseConfig) {
      throw new Error("Firebase config `window.__firebase_config` is missing.");
    }
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    userPromise = new Promise((resolve) => {
      onIdTokenChanged(auth, async (user) => {
        if (user) {
          lastUid = user.uid;
          resolve(user);
        } else if (!lastUid) {
          // Only sign in anonymously if we haven't had a user before.
          // This prevents re-signing in on sign-out.
          try {
            const userCredential = await signInAnonymously(auth);
            lastUid = userCredential.user.uid;
            resolve(userCredential.user);
          } catch (error) {
            console.error("Anonymous sign-in failed", error);
            resolve(null);
          }
        } else {
            resolve(null);
        }
      });
    });
}


const getFirebaseInstances = () => {
  if (!getApps().length) {
    initializeFirebase();
  }
  return { app, auth, db, userPromise };
};

const tasksCollection = () => {
  const { db, auth } = getFirebaseInstances();
  const uid = auth.currentUser?.uid;
  if (!uid) {
      // This should not happen if we wait for auth
      throw new Error("User not authenticated, cannot get tasks collection.");
  }
  // Use a user-specific path for tasks
  return collection(db, `users/${uid}/tasks`);
};

export const onTasksUpdate = (
  callback: (tasks: Task[]) => void, 
  onError: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(tasksCollection(), orderBy("createdAt", "desc"));
    return onSnapshot(q, (querySnapshot) => {
      const tasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Task));
      callback(tasks);
    }, (error) => {
      console.error("Firestore snapshot error:", error);
      onError(error);
    });
  } catch(error: any) {
    onError(error);
    return () => {};
  }
};

export const addTask = async (name: string) => {
  const { auth } = getFirebaseInstances();
  if (!auth.currentUser) throw new Error("User not authenticated");

  const newTask = {
    name,
    statusHistory: [
      { status: "TO DO", timestamp: Date.now() }
    ],
    createdAt: Date.now()
  };
  await addDoc(tasksCollection(), newTask);
};

export const updateTaskStatus = async (taskId: string, newStatus: string) => {
  const { auth } = getFirebaseInstances();
  if (!auth.currentUser) throw new Error("User not authenticated");

  const taskDocRef = doc(tasksCollection(), taskId);
  const newStatusEntry: StatusHistoryEntry = {
    status: newStatus,
    timestamp: Date.now()
  };
  await updateDoc(taskDocRef, {
    statusHistory: arrayUnion(newStatusEntry)
  });
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  const { userPromise } = getFirebaseInstances();
  userPromise?.then(user => callback(user));

  // Also, return an onAuthStateChanged to notify of subsequent changes
  // although with our current anonymous-only flow, this might not be strictly necessary
  // but it's good practice.
  return onIdTokenChanged(getAuth(), callback);
};

export const connectToFirebase = () => {
  if (typeof window !== "undefined") {
    return getFirebaseInstances();
  }
  return null;
};
