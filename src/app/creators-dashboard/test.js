'use client';

import { useState, useEffect } from 'react';
import { getFirestore } from 'firebase/firestore';
import Link from 'next/link';
import BootstrapProvider from "../../components/BootstrapProvider";
import { auth } from '../../services/firebase/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { getNovels, addNovel, updateNovel } from '../../services/firebase/firestore';
import LoadingPage from '../../components/LoadingPage';

export default function CreatorsDashboard() {
  const [novelTitle, setNovelTitle] = useState('');
  const [novelImage, setNovelImage] = useState('');
  const [novelSummary, setNovelSummary] = useState('');
  const [chapters, setChapters] = useState([]);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterContent, setNewChapterContent] = useState('');
  const [novelsList, setNovelsList] = useState([]);
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [imageText, setImageText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);

  const db = getFirestore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        setCurrentUserId(user.uid);
        fetchNovels(user.uid);
      } else {
        setIsLoggedIn(false);
        setCurrentUserId(null);
        setNovelsList([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchNovels = async (userId) => {
    const novels = await getNovels();
    const filteredNovels = novels.filter((novel) => novel.user_id === userId);
    setNovelsList(filteredNovels);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageText(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddChapter = () => {
    if (newChapterTitle && newChapterContent) {
      setChapters((prevChapters) => [
        ...prevChapters,
        { title: newChapterTitle, content: newChapterContent },
      ]);
      setNewChapterTitle('');
      setNewChapterContent('');
    } else {
      alert('Please fill in both chapter title and content.');
    }
  };

  const handleRemoveChapter = (index) => {
    setChapters((prevChapters) => prevChapters.filter((_, i) => i !== index));
  };

  const handleNovelSubmit = async (e) => {
    e.preventDefault();
    const novelData = {
      user_id: currentUserId,
      title: novelTitle,
      image: imageText,
      summary: novelSummary,
      chapters,
    };

    if (selectedNovel) {
      await updateNovel(selectedNovel.id, novelData);
      alert('Novel updated successfully!');
    } else {
      await addNovel(novelData);
      alert('Novel added successfully!');
    }

    resetForm();
    fetchNovels(currentUserId);
  };

  const resetForm = () => {
    setNovelTitle('');
    setNovelImage('');
    setNovelSummary('');
    setChapters([]);
    setNewChapterTitle('');
    setNewChapterContent('');
    setSelectedNovel(null);
  };

  const handleEditNovel = (novel) => {
    setSelectedNovel(novel);
    setNovelTitle(novel.title);
    setNovelImage(novel.image);
    setNovelSummary(novel.summary);
    setChapters(novel.chapters || []);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alert('Logged out successfully.');
      window.location.href = '/';
    } catch (error) {
      alert('Logout failed. Please try again.');
    }
  };

  return (
    <div>
      <BootstrapProvider />
      <LoadingPage />
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
        <div className="container">
          <Link href="/" className="navbar-brand">
            <img src="images/ursa.jpg" alt="Sempai HQ" className="navbar-logo" />
          </Link>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-center">
              <li className="nav-item">
                {isLoggedIn && (
                  <button onClick={handleLogout} className="btn btn-danger">
                    Logout
                  </button>
                )}
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <div className="container my-5">
        <h2>{selectedNovel ? 'Edit Novel' : 'Upload Novel'}</h2>
        <form onSubmit={handleNovelSubmit}>
          <div className="mb-3">
            <label htmlFor="novelTitle" className="form-label">Title</label>
            <input type="text" className="form-control" id="novelTitle" value={novelTitle} onChange={(e) => setNovelTitle(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label htmlFor="novelImage" className="form-label">Image</label>
            <input type="file" className="form-control" id="novelImage" onChange={handleImageChange} />
          </div>
          <div className="mb-3">
            <label htmlFor="novelSummary" className="form-label">Summary</label>
            <textarea className="form-control" id="novelSummary" rows="3" value={novelSummary} onChange={(e) => setNovelSummary(e.target.value)} required></textarea>
          </div>
          <h4>Add Chapters</h4>
          <div className="mb-3">
            <label htmlFor="chapterTitle" className="form-label">Chapter Title</label>
            <input type="text" className="form-control" id="chapterTitle" value={newChapterTitle} onChange={(e) => setNewChapterTitle(e.target.value)} />
          </div>
          <div className="mb-3">
            <label htmlFor="chapterContent" className="form-label">Chapter Content</label>
            <textarea className="form-control" id="chapterContent" rows="3" value={newChapterContent} onChange={(e) => setNewChapterContent(e.target.value)}></textarea>
          </div>
          <button type="button" className="btn btn-secondary" onClick={handleAddChapter}>
            Add Chapter
          </button>
          <ul className="list-group my-3">
            {chapters.map((chapter, index) => (
              <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                {chapter.title}
                <button className="btn btn-danger btn-sm" onClick={() => handleRemoveChapter(index)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button type="submit" className="btn btn-primary">Submit</button>
        </form>
      </div>
      <div className="container my-5">
        <h2>Uploaded Novels</h2>
        <div className="row">
          {novelsList.map((novel, index) => (
            <div key={index} className="col-md-4">
              <div className="card">
                <img src={novel.image} className="card-img-top" alt={novel.title} />
                <div className="card-body">
                  <h5 className="card-title">{novel.title}</h5>
                  <p className="card-text">
                    {novel.summary.length > 60 ? `${novel.summary.slice(0, 70)}...` : novel.summary}
                  </p>
                  <button onClick={() => handleEditNovel(novel)} className="btn btn-primary">
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
