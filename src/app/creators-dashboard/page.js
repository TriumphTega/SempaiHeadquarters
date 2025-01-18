'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { novels } from '../../novelsData';  // Import the novels data
import BootstrapProvider from "../../components/BootstrapProvider";
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../services/firebase/firebase'

export default function CreatorsDashboard() {
  const [novelTitle, setNovelTitle] = useState('');
  const [novelImage, setNovelImage] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [novelsList, setNovelsList] = useState(Object.values(novels));  // Set initial state from novelsData.js
  const [selectedNovel, setSelectedNovel] = useState(null);  // To edit existing novels
  const [isLoggedIn, setIsLoggedIn] = useState(false);  // Track login status

  // Function to handle the form submission for both new and existing novels
  const handleNovelSubmit = async (e) => {
    e.preventDefault();

    const newNovel = {
      title: novelTitle,
      image: novelImage,
      chapters: {
        1: { title: chapterTitle, content: chapterContent },
      },
    };

    const url = selectedNovel ? `/api/upload-novel/${selectedNovel.title}` : '/api/upload-novel';

    // Send the novel data to the backend API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newNovel),
    });

    const data = await response.json();

    if (data.success) {
      setNovelsList(Object.values(novels));  // Update novels list
      setSelectedNovel(null); // Reset the selected novel for new entries
    }

    // Reset form fields
    setNovelTitle('');
    setNovelImage('');
    setChapterTitle('');
    setChapterContent('');
  };

  // Function to edit an existing novel
  const handleEditNovel = (novel) => {
    setSelectedNovel(novel);
    setNovelTitle(novel.title);
    setNovelImage(novel.image);
    setChapterTitle(novel.chapters[1].title);
    setChapterContent(novel.chapters[1].content);
  };

  // Handle Logout
  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      alert('You have been logged out successfully.');
      setIsLoggedIn(false);
      window.location.href = '/'; // Redirect to the homepage or login page
    } catch (error) {
      console.error('Logout failed:', error.message);
      alert('Failed to log out. Please try again.');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user); // Set login status based on user
    });
  
    return () => unsubscribe();
  }, []);

  return (
    <div>
      <BootstrapProvider />
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-dark">
        <div className="container">
          <Link href="/" className="navbar-brand">Sempai HQ</Link>
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="btn btn-danger"
            >
              Logout
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header className="bg-orange py-5 text-center text-white">
        <div className="container">
          <h1 className="display-4">Creator's Dashboard</h1>
          <p className="lead">Upload or Update your novel and chapters here!</p>
        </div>
      </header>

      {/* Novel Upload Form */}
      <div className="container my-5">
        <h2>{selectedNovel ? 'Update Novel' : 'Upload New Novel'}</h2>
        <form onSubmit={handleNovelSubmit}>
          <div className="mb-3">
            <label htmlFor="novelTitle" className="form-label">Novel Title</label>
            <input
              type="text"
              id="novelTitle"
              className="form-control"
              value={novelTitle}
              onChange={(e) => setNovelTitle(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="novelImage" className="form-label">Novel Image URL</label>
            <input
              type="text"
              id="novelImage"
              className="form-control"
              value={novelImage}
              onChange={(e) => setNovelImage(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="chapterTitle" className="form-label">Chapter Title</label>
            <input
              type="text"
              id="chapterTitle"
              className="form-control"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="chapterContent" className="form-label">Chapter Content</label>
            <textarea
              id="chapterContent"
              className="form-control"
              value={chapterContent}
              onChange={(e) => setChapterContent(e.target.value)}
              rows="5"
              required
            />
          </div>
          <button type="submit" className="btn btn-dark">{selectedNovel ? 'Update Novel' : 'Submit Novel'}</button>
        </form>
      </div>

      {/* Display Uploaded Novels */}
      <div className="container my-5">
        <h2>Uploaded Novels</h2>
        <div className="row">
          {novelsList.map((novel, index) => (
            <div key={index} className="col-md-4">
              <div className="card">
                <img src={novel.image} className="card-img-top" alt={novel.title} />
                <div className="card-body">
                  <h5 className="card-title">{novel.title}</h5>
                  <p className="card-text">Chapter 1: {novel.chapters[1].title}</p>
                  <button
                    onClick={() => handleEditNovel(novel)}
                    className="btn btn-warning"
                  >
                    Edit Novel
                  </button>
                  <Link href={`/novel/${index + 1}`} className="btn btn-dark">
                    View Novel
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark py-4 text-center text-white">
        <p>&copy; 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}
