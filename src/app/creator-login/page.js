'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '../../services/firebase/firebase'; // Import auth directly

export default function CreatorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password); // Use the imported auth instance
      router.push('/creators-dashboard'); // Redirect to the creator's dashboard upon success
    } catch (err) {
      setError(err.message); // Display the error message
    }
  };

  return (
    <div className="container py-5">
      <h2 className="text-center text-light">Creator Login</h2>
      <div className="d-flex justify-content-center">
        <form onSubmit={handleLogin} className="bg-dark p-4 rounded shadow" style={{ maxWidth: '400px' }}>
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
          <div className="d-grid">
            <button type="submit" className="btn btn-warning">Login</button>
          </div>
          <div className="text-center mt-3">
            <p className="text-light">
              Don't have an account?{' '}
              <a href="/creator-signup" className="text-warning">Sign Up</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
