'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../services/firebase/firebase';

export default function CreatorSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      // Create a new user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Prepare the data for the users collection
      const userData = {
        uid: user.uid,
        email,
        name,
        isWriter: false, // Default value
        isSuperuser: false, // Default value
      };

      // Add the user to the Firestore users collection
      await setDoc(doc(db, 'users', user.uid), userData);

      // Show success message and redirect
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => router.push('/creator-login'), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="signup-container">
      <div className="form-wrapper">
        <h2 className="text-center">Creator Signup</h2>
        <form onSubmit={handleSignup} className="signup-form">
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <button type="submit" className="btn-submit">Sign Up</button>
          <p className="login-link">
            Already have an account? <a href="/creator-login">Login</a>
          </p>
        </form>
      </div>
    </div>
  );
}
