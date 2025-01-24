'use client';

import { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import Link from 'next/link';
import BootstrapProvider from "../../components/BootstrapProvider";
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase/firebase';
import { getNovels, addNovel, updateNovel } from '../../services/firebase/firestore';
import LoadingPage from '../../components/LoadingPage';

export default function CreatorsDashboard() {
  const [novelTitle, setNovelTitle] = useState('');
  const [novelImage, setNovelImage] = useState('');  // To store Base64 string
  const [novelSummary, setNovelSummary] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [additionalChapters, setAdditionalChapters] = useState([]);
  const [novelsList, setNovelsList] = useState([]);
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [editingChapterIndex, setEditingChapterIndex] = useState(null);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterContent, setNewChapterContent] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [imageText, setImageText] = useState(''); // To store the Base64 string

  // Firestore reference
  const db = getFirestore();

  // Handle image change (Convert image to Base64)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setImageText(reader.result); // Set the Base64 string
      };

      reader.readAsDataURL(file); // Convert image to Base64
    }
  };

  // Fetch novels from Firestore on page load
  useEffect(() => {
    const fetchNovels = async () => {
      const novels = await getNovels();
      setNovelsList(novels);
    };
    fetchNovels();
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert('You have been logged out successfully.');
      setIsLoggedIn(false);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error.message);
      alert('Failed to log out. Please try again.');
    }
  };

  // Track user login status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  // Handle form submission for new or existing novels
  const handleNovelSubmit = async (e) => {
    e.preventDefault();

    const updatedChapters = { ...selectedNovel?.chapters };

    // Update the selected chapter
    if (editingChapterIndex !== null) {
      updatedChapters[editingChapterIndex] = {
        title: chapterTitle,
        content: chapterContent,
      };
    }

    // Add new chapters if additional chapters exist
    additionalChapters.forEach((chapter, index) => {
      updatedChapters[Object.keys(updatedChapters).length + 1] = chapter;
    });

    const newNovel = {
      title: novelTitle,
      image: imageText, // Save Base64 string of image
      summary: novelSummary,
      chapters: updatedChapters,
    };

    if (selectedNovel) {
      // Update existing novel
      await updateNovel(selectedNovel.id, newNovel);
      alert('Novel updated successfully!');
    } else {
      // Add a new novel
      await addNovel(newNovel);
      alert('Novel added successfully!');
    }

    // Reset form fields
    setNovelTitle('');
    setNovelImage('');
    setNovelSummary('');
    setChapterTitle('');
    setChapterContent('');
    setAdditionalChapters([]);
    setSelectedNovel(null);
    setEditingChapterIndex(null);

    // Refresh the novels list
    const novels = await getNovels();
    setNovelsList(novels);
  };

  // Handle selecting a novel to edit
  const handleEditNovel = (novel) => {
    setSelectedNovel(novel);
    setNovelTitle(novel.title);
    setNovelImage(novel.image);  // The Base64 image string
    setNovelSummary(novel.summary);
    setEditingChapterIndex(null);
    setChapterTitle('');
    setChapterContent('');
  };

  // Handle selecting a chapter to edit
  const handleEditChapter = (index) => {
    const chapter = selectedNovel.chapters[index];
    setEditingChapterIndex(index);
    setChapterTitle(chapter.title);
    setChapterContent(chapter.content);
  };

  return (
    <div>
  <LoadingPage />
  <div className="container my-5">
    <h2>Upload Novel</h2>
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
        <label htmlFor="novelImage" className="form-label">Novel Image</label>
        <input
          type="file"
          id="novelImage"
          className="form-control"
          accept="image/*"
          onChange={handleImageChange}
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
{/* Select Chapter to Edit */}
{selectedNovel && (
  <div className="mb-3">
    <label htmlFor="chapterSelector" className="form-label">Select Chapter to Edit</label>
    <select
      id="chapterSelector"
      className="form-select"
      value={editingChapterIndex ?? ''}
      onChange={(e) => {
        const index = e.target.value;
        if (index !== '') {
          const selectedChapter = selectedNovel.chapters[index];
          setEditingChapterIndex(index);
          setChapterTitle(selectedChapter.title);
          setChapterContent(selectedChapter.content);
        } else {
          setEditingChapterIndex(null);
          setChapterTitle('');
          setChapterContent('');
        }
      }}
    >
      <option value="">Select a chapter</option>
      {Object.entries(selectedNovel.chapters).map(([index, chapter]) => (
        <option key={index} value={index}>
          Chapter {index}: {chapter.title}
        </option>
      ))}
    </select>
  </div>
)}

{/* Chapter Title and Content */}
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

{/* Add Additional Chapters */}
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
      const newChapter = {
        title: newChapterTitle,
        content: newChapterContent,
      };
      setAdditionalChapters([...additionalChapters, newChapter]);
      setNewChapterTitle('');
      setNewChapterContent('');
    }
  }}
>
  Add New Chapter
</button>

{/* Submit Button */}
<button type="submit" className="btn btn-dark">
  Submit Novel
</button>
    </form>
  </div>

  <div className="container my-5">
    <h2>Uploaded Novels</h2>
    <div className="row">
      {novelsList.map((novel, index) => (
        <div key={index} className="col-md-4">
          <div className="card">
            {/* Use the Base64 string as image source */}
            <img src={novel.image} className="card-img-top" alt={novel.title} />
            <div className="card-body">
              <h5 className="card-title">{novel.title}</h5>
              <p className="card-text">
                {novel.summary.length > 60 ? `${novel.summary.slice(0, 70)}...` : novel.summary}
              </p>
              <button onClick={() => handleEditNovel(novel)} className="btn btn-primary">Edit</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* Display chapters and allow editing */}
  {selectedNovel && (
    <div className="container my-5">
      <h3>Chapters</h3>
      <ul className="list-group">
        {Object.entries(selectedNovel.chapters).map(([index, chapter]) => (
          <li key={index} className="list-group-item">
            <strong>{chapter.title}</strong>
            <button
              onClick={() => handleEditChapter(index)}
              className="btn btn-secondary btn-sm float-end"
            >
              Edit Chapter
            </button>
          </li>
        ))}
      </ul>
    </div>
  )}
</div>

  );
}
