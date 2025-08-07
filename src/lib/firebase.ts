
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, type Auth, type User } from "firebase/auth";
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

const initializeFirebase = () => {
    if (typeof window === "undefined") {
      throw new Error("Firebase can only be initialized on the client.");
    }
    const firebaseConfig = window.__firebase_config;
    if (!firebaseConfig) {
      throw new Error("Firebase config `window.__firebase_config` is missing.");
    }
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    const token = window.__initial_auth_token;
    if (token) {
      signInWithCustomToken(auth, token).catch((error) => {
        console.error("Custom token sign-in failed, trying anonymous.", error);
        signInAnonymously(auth);
      });
    } else {
      signInAnonymously(auth).catch(err => console.error("Anonymous sign-in failed", err));
    }
}


const getFirebaseInstances = () => {
  if (!getApps().length) {
    initializeFirebase();
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  }
  return { app, auth, db };
};

const tasksCollection = () => {
  const { db } = getFirebaseInstances();
  const appId = typeof window !== 'undefined' ? window.__app_id || "default-app" : "default-app";
  // As per prompt, use a specific collection path
  return collection(db, `artifacts/${appId}/public/data/tasks`);
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
  const { auth } = getFirebaseInstances();
  return onAuthStateChanged(auth, callback);
};

export const connectToFirebase = () => {
  if (typeof window !== "undefined") {
    return getFirebaseInstances();
  }
  return null;
};
