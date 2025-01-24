import { getFirestore, collection, addDoc, getDocs, doc, updateDoc } from 'firebase/firestore';
import { firebaseApp } from '../firebase/firebase';

const db = getFirestore(firebaseApp);

// Get all novels from Firestore
export const getNovels = async () => {
  const novelsCollection = collection(db, 'novels');
  const snapshot = await getDocs(novelsCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Add a new novel to Firestore
export const addNovel = async (novel) => {
  const novelsCollection = collection(db, 'novels');
  await addDoc(novelsCollection, novel);
};

// Update an existing novel in Firestore
export const updateNovel = async (id, novel) => {
  const novelDoc = doc(db, 'novels', id);
  await updateDoc(novelDoc, novel);
};
