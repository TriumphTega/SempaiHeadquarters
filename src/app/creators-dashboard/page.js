'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { novels } from '../../novelsData';  // Import the novels data
import BootstrapProvider from "../../components/BootstrapProvider";
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import {auth} from '../../services/firebase/firebase'
import LoadingPage from '../../components/LoadingPage';

export default function CreatorsDashboard() {
  const [novelTitle, setNovelTitle] = useState('');
  const [novelImage, setNovelImage] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [novelsList, setNovelsList] = useState(Object.values(novels));  // Set initial state from novelsData.js
  const [selectedNovel, setSelectedNovel] = useState(null);  // To edit existing novels
  const [isLoggedIn, setIsLoggedIn] = useState(false);  // Track login status
  const [novelSummary, setNovelSummary] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterContent, setNewChapterContent] = useState('');
  const [additionalChapters, setAdditionalChapters] = useState([]); // For storing additional chapters


  // Function to handle the form submission for both new and existing novels
  // const handleNovelSubmit = async (e) => {
  //   e.preventDefault();
  
  //   const newNovel = {
  //     title: novelTitle,
  //     image: novelImage,
  //     summary: novelSummary, // Include summary
  //     chapters: {
  //       1: { title: chapterTitle, content: chapterContent },
  //       ...additionalChapters.reduce((acc, chapter, index) => {
  //         acc[index + 2] = chapter; // Add additional chapters starting from index 2
  //         return acc;
  //       }, {}),
  //     },
  //   };
  
  //   const url = selectedNovel ? `/api/upload-novel/${selectedNovel.title}` : '/api/upload-novel';

  // Function to handle the form submission for both new and existing novels
const handleNovelSubmit = async (e) => {
  e.preventDefault(); // Prevent the default form submission behavior

  // Temporary: Do nothing when the form is submitted
  console.log('Form submission is currently disabled.');
};

  
    // Send the novel data to the backend API
    // const response = await fetch(url, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(newNovel),
    // });
  
    // const data = await response.json();
  
    // if (data.success) {
    //   setNovelsList(Object.values(novels)); // Update novels list
    //   setSelectedNovel(null); // Reset the selected novel for new entries
    // }
  
    // Reset form fields
  //   setNovelTitle('');
  //   setNovelImage('');
  //   setNovelSummary('');
  //   setChapterTitle('');
  //   setChapterContent('');
  //   setAdditionalChapters([]);
  // };
  

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
       <LoadingPage />
      {/* Navbar */}

      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
  <div className="container">
    {/* Brand Logo */}
    <Link href="/" className="navbar-brand">
      <img src="images/ursa.jpg" alt="Sempai HQ" className="navbar-logo" />
    </Link>
    {/* Toggle Button for Mobile View */}
    <button
      className="navbar-toggler"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarNav"
      aria-controls="navbarNav"
      aria-expanded="false"
      aria-label="Toggle navigation"
    >
      <span className="navbar-toggler-icon"></span>
    </button>
    {/* Navbar Links */}
    <div className="collapse navbar-collapse" id="navbarNav">
      <ul className="navbar-nav me-auto">
        <li className="nav-item">
          <Link href="/" className="nav-link text-light fw-semibold hover-effect">
            Home
          </Link>
        </li>
        <li className="nav-item">
          <Link href="/swap" className="nav-link text-light fw-semibold hover-effect">
            Swap
          </Link>
        </li>
      </ul>
      {/* Wallet and Creator Dashboard */}
      <ul className="navbar-nav ms-auto align-items-center">
        
        <li className="nav-item">
        {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="btn btn-danger"
            >
              Logout
            </button>
          )}
        </li>
      </ul>
    </div>
  </div>
</nav>


      {/* Hero Section */}
      <header className="bg-orange py-5 text-center text-white" style={{ background: 'linear-gradient(135deg,rgb(243, 99, 22), #feb47b)' }}>        <div className="container">
          <h1 className="display-4">Creator's Dashboard</h1>
          <p className="lead">Upload or Update your novel and chapters here!</p>
        </div>
      </header>

      {/* Novel Upload Form */}
      <div className="container my-5">
  <     h2 className="mb-4">{selectedNovel ? 'Update Novel' : 'Upload New Novel'}</h2>
      <form onSubmit={handleNovelSubmit} className="bubble-form">
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
        <label htmlFor="novelSummary" className="form-label">Novel Summary</label>
        <textarea
          id="novelSummary"
          className="form-control"
          value={novelSummary}
          onChange={(e) => setNovelSummary(e.target.value)}
          rows="3"
          required
        />
      </div>
      <div className="mb-3">
        <label htmlFor="chapterTitle" className="form-label">Initial Chapter Title</label>
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
        <label htmlFor="chapterContent" className="form-label">Initial Chapter Content</label>
        <textarea
          id="chapterContent"
          className="form-control"
          value={chapterContent}
          onChange={(e) => setChapterContent(e.target.value)}
          rows="5"
          required
        />
      </div>

      {/* Section for Additional Chapters */}
      <h4>Add Additional Chapters</h4>
      <div className="mb-3">
        <label htmlFor="newChapterTitle" className="form-label">New Chapter Title</label>
        <input
          type="text"
          id="newChapterTitle"
          className="form-control"
          value={newChapterTitle}
          onChange={(e) => setNewChapterTitle(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label htmlFor="newChapterContent" className="form-label">New Chapter Content</label>
        <textarea
          id="newChapterContent"
          className="form-control"
          value={newChapterContent}
          onChange={(e) => setNewChapterContent(e.target.value)}
          rows="5"
        />
      </div>
      <button
        type="button"
        className="btn btn-secondary mb-3"
        onClick={() => {
          if (newChapterTitle && newChapterContent) {
            setAdditionalChapters([...additionalChapters, { title: newChapterTitle, content: newChapterContent }]);
            setNewChapterTitle('');
            setNewChapterContent('');
          } else {
            alert('Please provide both title and content for the chapter.');
          }
        }}
      >
        Add Chapter
      </button>

      {/* Display Added Chapters */}
      {additionalChapters.length > 0 && (
        <div className="mb-3">
          <h5>Added Chapters:</h5>
          <ul>
            {additionalChapters.map((chapter, index) => (
              <li key={index}>
                <strong>{chapter.title}:</strong> {chapter.content.slice(0, 50)}...
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="submit" className="btn btn-dark">
        {selectedNovel ? 'Update Novel' : 'Submit Novel'}
      </button>
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