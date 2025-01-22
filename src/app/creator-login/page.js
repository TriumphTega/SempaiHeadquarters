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
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/creators-dashboard'); // Redirect to the creator's dashboard upon success
    } catch (err) {
      setError(err.message); // Display the error message
    }
  };

  return (
    <div className="login-container">
      <div className="form-wrapper">
        <h2 className="text-center">Creator Login</h2>
        <form onSubmit={handleLogin} className="login-form">
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
          <button type="submit" className="btn-submit">Login</button>
          <p className="signup-link">
            Don't have an account? <a href="/creator-signup">Sign Up</a>
          </p>
        </form>
      </div>
    </div>
  );
}
