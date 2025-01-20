// src/app/api/novels/route.js
import { db } from '../../../services/firebase/firebase'; // Make sure the path is correct
import { collection, getDocs } from 'firebase/firestore';

export async function GET(req) {
  try {
    // Fetch the novels from Firestore
    const novelsCollection = collection(db, 'novels');
    const querySnapshot = await getDocs(novelsCollection);

    // Map through the snapshot and return the novels
    const novels = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Return the novels in the response
    return new Response(JSON.stringify({ novels }), {
      status: 200,
    });
  } catch (error) {
    console.error('Error fetching novels:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch novels' }), {
      status: 500,
    });
  }
}
