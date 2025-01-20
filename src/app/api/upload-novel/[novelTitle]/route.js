import { storage } from '../../../services/firebase/firebase'; // Ensure this path is correct
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../../services/firebase/firebase'; // Firestore
import { doc, setDoc } from 'firebase/firestore';

export async function POST(req) {
  const { novelTitle } = req.query;
  const body = await req.json();

  let imageUrl = '';
  if (body.image) {
    // Upload image to Firebase Storage if present
    const imageRef = ref(storage, `novels/${novelTitle}/image.jpg`);
    await uploadBytes(imageRef, body.image);
    imageUrl = await getDownloadURL(imageRef);
  }

  // Create or update the novel document in Firestore
  const novelData = {
    title: body.title,
    image: imageUrl, // This will be an empty string if no image is uploaded
    chapters: body.chapters || [],
  };

  try {
    await setDoc(doc(db, 'novels', novelTitle), novelData);
    return new Response(JSON.stringify({ success: true, novel: novelData }));
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
  }
}
