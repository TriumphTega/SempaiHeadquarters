'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase/firebase';
import LoadingPage from '../../components/LoadingPage';

export default function CreatorsDashboard() {
  const [writers, setWriters] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchWriters = async (user) => {
      try {
        const writersQuery = query(
          collection(db, 'users'),
          where('isWriter', '==', true),
          where('uid', '==', user.uid) // Match the logged-in user's UID
        );

        const querySnapshot = await getDocs(writersQuery);

        if (querySnapshot.empty) {
          console.error('No writers found for the current user.');
          setWriters([]);
        } else {
          const writersList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setWriters(writersList);
        }
      } catch (error) {
        console.error('Error fetching writers:', error.message);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchWriters(user);
      } else {
        router.push('/login'); // Redirect to login if not authenticated
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="container my-5">
      <h1 className="text-center">Writers List</h1>
      {writers.length > 0 ? (
        <ul className="list-group">
          {writers.map((writer) => (
            <li key={writer.id} className="list-group-item">
              <h5>{writer.name}</h5>
              <p>Email: {writer.email}</p>
              <p>UID: {writer.uid}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center">No writers found.</p>
      )}
    </div>
  );
}
