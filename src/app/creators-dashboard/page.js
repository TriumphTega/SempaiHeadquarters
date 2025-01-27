'use client';

import { useState, useEffect, useRef } from 'react';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import Link from 'next/link';
import BootstrapProvider from "../../components/BootstrapProvider";
import { auth, db } from '../../services/firebase/firebase';
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
  const [editChapterIndex, setEditChapterIndex] = useState(null);
  const [writers, setWriters] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const chapterTitleRef = useRef(null); // Reference for the chapter title input



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
        router.push('/creator-login'); // Redirect to login if not authenticated
      }
    });

    return () => unsubscribe();
  }, [router]);

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
    const filteredNovels = novels.map((novel) => ({
      ...novel,
      chapters: Array.isArray(novel.chapters) ? novel.chapters : [],
    }));
    setNovelsList(filteredNovels.filter((novel) => novel.user_id === userId));
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
      if (editChapterIndex !== null) {
        setChapters((prevChapters) => {
          const updatedChapters = [...prevChapters];
          updatedChapters[editChapterIndex] = {
            title: newChapterTitle,
            content: newChapterContent,
          };
          return updatedChapters;
        });
        setEditChapterIndex(null);
      } else {
        setChapters((prevChapters) => [
          ...prevChapters,
          { title: newChapterTitle, content: newChapterContent },
        ]);
      }
      setNewChapterTitle('');
      setNewChapterContent('');
    } else {
      alert('Please fill in both chapter title and content.');
    }
  };

  const handleEditChapter = (index) => {
    const chapterToEdit = chapters[index];
    setNewChapterTitle(chapterToEdit.title);
    setNewChapterContent(chapterToEdit.content);
    setEditChapterIndex(index);
  
    // Scroll to the chapter title input field
    if (chapterTitleRef.current) {
      chapterTitleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      chapterTitleRef.current.focus(); // Optional: Focus the input for better UX
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
    setImageText(novel.image);
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
if (loading) {
    return <LoadingPage />;
  }
  return (
    <div>
    <BootstrapProvider />
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
      <div className="container">
        <Link href="/" className="navbar-brand">
          <img src="images/ursa.jpg" alt="Sempai HQ" className="navbar-logo" />
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
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

    {writers.length > 0 ? (
  writers.map((writer) => (
    
    <div key={writer.uid} className="container my-5 text-white">
      {/* <li key={writer.id} className="list-group-item">
              <h5>{writer.name}</h5>
              <p>Email: {writer.email}</p>
              <p>UID: {writer.uid}</p>
            </li> */}
      <h2 className="text-center section-title">
        {selectedNovel ? 'Edit Novel' : 'Upload Novel'}
      </h2>
      <form onSubmit={handleNovelSubmit} className="novel-form">
        <div className="form-group">
          <label htmlFor="novelTitle">Title</label>
          <input
            type="text"
            id="novelTitle"
            value={novelTitle}
            onChange={(e) => setNovelTitle(e.target.value)}
            required
          />
        </div>
          <div className="form-group">
          <label htmlFor="novelImage">Image</label>
          {imageText && (
            <div className="mb-2">
              <img src={imageText} alt="Current Novel" className="img-thumbnail" style={{ maxWidth: '200px' }} />
              <p>Current Image</p>
            </div>
          )}
          <input
            type="file"
            id="novelImage"
            onChange={handleImageChange}
            required={!selectedNovel} // Make it required only for new novels
          />
        </div>
        <div className="form-group">
          <label htmlFor="novelSummary">Summary</label>
          <textarea
            id="novelSummary"
            rows="3"
            value={novelSummary}
            onChange={(e) => setNovelSummary(e.target.value)}
            required
          ></textarea>
        </div>

        <h4 className="chapter-heading">Add Chapters</h4>
        <div className="form-group">
          <label htmlFor="chapterTitle">Chapter Title</label>
          <input
            type="text"
            id="chapterTitle"
            ref={chapterTitleRef} // Attach the ref here
            value={newChapterTitle}
            onChange={(e) => setNewChapterTitle(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="chapterContent">Chapter Content</label>
          <textarea
            id="chapterContent"
            rows="3"
            value={newChapterContent}
            onChange={(e) => setNewChapterContent(e.target.value)}
          ></textarea>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleAddChapter}
        >
          {editChapterIndex !== null ? 'Update Chapter' : 'Add Chapter'}
        </button>


        <ul className="list-group my-3 text-white">
          {chapters.map((chapter, index) => (
            <li key={index} className="list-group-item chapter-item">
              <div className="text-white">
                <strong>{chapter.title}</strong>
                <p>
                  {chapter.content.length > 50
                    ? `${chapter.content.slice(0, 50)}...`
                    : chapter.content}
                </p>
              </div>
              <div>
              <button
                type="button"
                className="btn btn-primary btn-sm me-2"
                onClick={() => handleEditChapter(index)}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => handleRemoveChapter(index)}
              >
                Remove
              </button>

              </div>
            </li>
          ))}
        </ul>

        <button type="submit" className="btn btn-primary">Submit</button>
      </form>

      <div className="container my-5">
        <h2 className="text-center section-title text-white">Uploaded Novels</h2>
        <div className="row">
          {novelsList.map((novel, index) => (
            <div key={index} className="col-md-4">
              <div className="card novel-card">
                <img src={novel.image} className="card-img-top" alt={novel.title} />
                <div className="card-body">
                  <h5 className="card-title">{novel.title}</h5>
                  <p className="card-text">
                    {novel.summary.length > 60
                      ? `${novel.summary.slice(0, 70)}...`
                      : novel.summary}
                  </p>
                  <button
                    onClick={() => handleEditNovel(novel)}
                    className="btn btn-primary"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ))
) : (
  <p className="text-center text-white">No writers found.</p>
)}

  </div>
  
  );
}