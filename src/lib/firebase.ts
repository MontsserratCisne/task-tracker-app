import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, onIdTokenChanged, signInAnonymously, type Auth, type User } from "firebase/auth";
import { getFirestore, collection, query, onSnapshot, addDoc, updateDoc, doc, arrayUnion, orderBy, type Firestore, type Unsubscribe, setDoc } from "firebase/firestore";
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

// This function ensures Firebase is initialized only once.
const initializeFirebase = () => {
  if (typeof window === 'undefined') {
    return; // Do not initialize on the server
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
};

// Call initialization right away for client-side execution
initializeFirebase();

const tasksCollection = (uid: string) => {
  if (!uid) {
      throw new Error("User not authenticated, cannot get tasks collection.");
  }
  return collection(db, `users/${uid}/tasks`);
};

export const onTasksUpdate = (
  uid: string,
  callback: (tasks: Task[]) => void, 
  onError: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(tasksCollection(uid), orderBy("createdAt", "desc"));
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

export const addTask = async (uid: string, name: string) => {
  if (!uid) throw new Error("User not authenticated");

  const newTask = {
    name,
    statusHistory: [
      { status: "TO DO", timestamp: Date.now() }
    ],
    createdAt: Date.now()
  };
  await addDoc(tasksCollection(uid), newTask);
};

export const updateTaskStatus = async (uid: string, taskId: string, newStatus: string) => {
  if (!uid) throw new Error("User not authenticated");

  const taskDocRef = doc(tasksCollection(uid), taskId);
  const newStatusEntry: StatusHistoryEntry = {
    status: newStatus,
    timestamp: Date.now()
  };
  await updateDoc(taskDocRef, {
    statusHistory: arrayUnion(newStatusEntry)
  });
};

export const updateTaskName = async (uid: string, taskId: string, newName: string) => {
  if (!uid) throw new Error("User not authenticated");
  const taskDocRef = doc(tasksCollection(uid), taskId);
  await updateDoc(taskDocRef, {
    name: newName
  });
};

let authUnsubscribe: Unsubscribe | null = null;

export const onAuthChange = (callback: (user: User | null) => void) => {
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
