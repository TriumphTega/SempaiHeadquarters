import { db } from '../../../services/firebase/firebase'; // Ensure this path is correct
import { collection, addDoc } from 'firebase/firestore';

export async function POST(req) {
  const { title, image, chapters } = await req.json(); // Get novel data from request body

  try {
    const novelRef = await addDoc(collection(db, 'novels'), {
      title,
      image,
      chapters,
      createdAt: new Date(),
    });

    return new Response(
      JSON.stringify({ success: true, novelId: novelRef.id }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error creating novel:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Novel creation failed' }),
      { status: 500 }
    );
  }
}
