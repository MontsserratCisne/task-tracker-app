
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

const getFirebaseInstances = () => {
  if (typeof window === 'undefined') {
    // This case should ideally not be hit on the client-side.
    // If it is, it means we're trying to use Firebase on the server, which this setup doesn't support for auth/firestore client SDKs.
    throw new Error("Firebase can only be used on the client.");
  }
  
  if (!getApps().length) {
    const firebaseConfig = window.__firebase_config;
    if (!firebaseConfig) {
      throw new Error("Firebase config `window.__firebase_config` is missing. This should be set in layout.tsx.");
    }
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  auth = getAuth(app);
  db = getFirestore(app);

  return { app, auth, db };
};


const tasksCollection = () => {
  const { db, auth } = getFirebaseInstances();
  const uid = auth.currentUser?.uid;
  if (!uid) {
      throw new Error("User not authenticated, cannot get tasks collection.");
  }
  return collection(db, `users/${uid}/tasks`);
};

export const onTasksUpdate = (
  callback: (tasks: Task[]) => void, 
  onError: (error: Error) => void
): Unsubscribe => {
  try {
    getFirebaseInstances(); // Ensure firebase is initialized
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

let authUnsubscribe: Unsubscribe | null = null;

export const onAuthChange = (callback: (user: User | null) => void) => {
    const { auth } = getFirebaseInstances();

    if (authUnsubscribe) {
        authUnsubscribe();
    }

    authUnsubscribe = onIdTokenChanged(auth, async (user) => {
        if (user) {
            callback(user);
        } else {
            try {
                const userCredential = await signInAnonymously(auth);
                callback(userCredential.user);
            } catch (error) {
                console.error("Anonymous sign-in failed", error);
                callback(null);
            }
        }
    });

    return authUnsubscribe;
};

export const connectToFirebase = () => {
  if (typeof window !== "undefined") {
    return getFirebaseInstances();
  }
  return null;
};
