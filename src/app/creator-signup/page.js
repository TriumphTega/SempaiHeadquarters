'use client';

import { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import firebaseApp from '../../services/firebase/firebase'; // Ensure this path is correct

export default function CreatorSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const auth = getAuth(firebaseApp); // Use the initialized Firebase app

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => router.push('/creator-login'), 3000); // Redirect to login after 3 seconds
    } catch (err) {
      setError(err.message); // Display the error message
    }
  };

  return (
    <div className="container py-5">
      <h2 className="text-center text-light">Creator Signup</h2>
      <div className="d-flex justify-content-center">
        <form onSubmit={handleSignup} className="bg-dark p-4 rounded shadow" style={{ maxWidth: '400px' }}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label text-light">Email</label>
            <input
              type="email"
              id="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="password" className="form-label text-light">Password</label>
            <input
              type="password"
              id="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <div className="d-grid">
            <button type="submit" className="btn btn-warning">Sign Up</button>
          </div>
          <div className="text-center mt-3">
            <p className="text-light">
              Already have an account?{' '}
              <a href="/creator-login" className="text-warning">Login</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
