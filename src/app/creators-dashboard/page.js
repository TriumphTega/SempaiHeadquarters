'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import BootstrapProvider from "../../components/BootstrapProvider";
import { supabase } from '../../services/supabase/supabaseClient';
import LoadingPage from '../../components/LoadingPage';
import { useWallet } from '@solana/wallet-adapter-react'; // Assuming you're using Solana wallet adapter
import Link from 'next/link';
import ConnectButton from '../../components/ConnectButton';
import {NovelConnectButton} from '../../components/NovelConnectButton';


export default function CreatorsDashboard() {
  const [novelTitle, setNovelTitle] = useState('');
  const [novelImage, setNovelImage] = useState('');
  const [novelSummary, setNovelSummary] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterContent, setNewChapterContent] = useState('');
  const [novelsList, setNovelsList] = useState([]);
  const [selectedNovel, setSelectedNovel] = useState(null);
  const [imageText, setImageText] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isWriter, setIsWriter] = useState(false); // Store the isWriter state here
  const [loading, setLoading] = useState(true);
  const [writers, setWriters] = useState([]); // Define the writers state
  const [editChapterIndex, setEditChapterIndex] = useState(null); // Define editChapterIndex state
  const [chaptertitles, setChapterTitles] = useState([]);
  const [chaptercontents, setChapterContents] = useState([]);
  const [isSuperuser, setIsSuperuser] = useState(false);

  const router = useRouter();
  const chapterTitleRef = useRef(null);
  const { connected, publicKey } = useWallet(); // Wallet connection details
  
  
  
  const handleCreatorAccess = async () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first.');
      return;
    }
  
    try {
      const walletAddress = publicKey.toString();
  
      // Fetch the user's details from the `users` table
      const { data, error } = await supabase
        .from('users')
        .select('id, isWriter, isSuperuser')  // Ensure you're fetching the 'id', 'isWriter', and 'isSuperuser' fields
        .eq('wallet_address', walletAddress)
        .single();
  
      if (error) {
        console.error('Error fetching user:', error.message);
        alert('Unable to verify user. Please try again later.');
        return;
      }
  
      if (data?.isSuperuser || data?.isWriter) {  // Check for both isSuperuser and isWriter
        setCurrentUserId(data.id);  // Set currentUserId to the fetched user's ID
        setIsWriter(data.isWriter);  // Set the isWriter state
        setIsSuperuser(data.isSuperuser); // Set the isSuperuser state
        setLoading(false);  // Allow access to the dashboard
      } else {
        alert('Access denied. You must be a creator or superuser to access this page.');
        router.push('/error');  // Redirect non-creators and non-superusers to the error page
      }
    } catch (err) {
      console.error('Error handling creator access:', err.message);
      alert('An error occurred. Please try again later.');
    }
  };
  
  
  
  
  
  useEffect(() => {
    const fetchWriters = async () => {
      setLoading(true);

      // Fetch the writers (users with isWriter: true)
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, isWriter')
        .eq('isWriter', true);

      if (error) {
        console.error('Error fetching writers:', error.message);
      } else {
        setWriters(data);
      }

      setLoading(false);
    };

    fetchWriters();
  }, []);

  useEffect(() => {
    // Run the creator access check when the wallet state changes
    if (connected && publicKey) {
      handleCreatorAccess();
    }
  }, [connected, publicKey]); // Re-run when wallet state changes

  useEffect(() => {
    if (currentUserId && isWriter) {
      console.log(currentUserId)
      fetchNovels(currentUserId);
    }
    
  }, [currentUserId, isWriter]);
  
  const fetchNovels = async () => {
    if (!currentUserId) {
      console.error('No user ID available');
      return;
    }
  
    setLoading(true); // Set loading to true while fetching data
  
    let query = supabase
      .from('novels')
      .select('*');
  
    // If the user is not a superuser, filter by their user_id
    if (!isSuperuser) {
      query = query.eq('user_id', currentUserId);
    }
  
    try {
      const { data, error } = await query;
  
      if (error) {
        console.error('Error fetching novels:', error.message);
        setLoading(false); // Set loading to false even if there's an error
      } else {
        setNovelsList(data); // Set the fetched novels in state
        setLoading(false); // Set loading to false after data is fetched
      }
    } catch (err) {
      console.error('Error in fetching novels:', err.message);
      setLoading(false); // Set loading to false in case of error
    }
  };
  
  
  
  

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) { // Check if it's an image file
      const reader = new FileReader();
      reader.onloadend = () => setImageText(reader.result);
      reader.readAsDataURL(file);
    } else {
      alert('Please upload a valid image file.');
    }
  };

  const handleAddChapter = () => {
    if (newChapterTitle && newChapterContent) {
        if (editChapterIndex !== null) {
            setChapterTitles((prevTitles) => {
                const updatedTitles = [...prevTitles];
                updatedTitles[editChapterIndex] = newChapterTitle;
                return updatedTitles;
            });

            setChapterContents((prevContents) => {
                const updatedContents = [...prevContents];
                updatedContents[editChapterIndex] = newChapterContent;
                return updatedContents;
            });

            setEditChapterIndex(null);
        } else {
            setChapterTitles((prevTitles) => [...prevTitles, newChapterTitle]);
            setChapterContents((prevContents) => [...prevContents, newChapterContent]);
        }
        setNewChapterTitle('');
        setNewChapterContent('');
    } else {
        alert('Please fill in both chapter title and content.');
    }
};


  const handleEditChapter = (index) => {
    const titleToEdit = chaptertitles[index];
    const contentToEdit = chaptercontents[index];

    setNewChapterTitle(titleToEdit);
    setNewChapterContent(contentToEdit);
    setEditChapterIndex(index);

    // Scroll to the chapter title input field
    if (chapterTitleRef.current) {
        chapterTitleRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        chapterTitleRef.current.focus(); // Optional: Focus the input for better UX
    }
};

const handleEditNovel = (novel) => {
  setSelectedNovel(novel);
  setNovelTitle(novel.title);
  setImageText(novel.image);
  setNovelSummary(novel.summary);
  setChapterTitles(novel.chaptertitles || []); // Use chaptertitles instead of chapters
  setChapterContents(novel.chaptercontents || []); // Use chaptercontents instead of chapters
};

const handleRemoveChapter = (index) => {
  setChapterTitles((prevTitles) => prevTitles.filter((_, i) => i !== index));
  setChapterContents((prevContents) => prevContents.filter((_, i) => i !== index));
};


const handleNovelSubmit = async (e) => {
  e.preventDefault();

  const novelData = {
      user_id: currentUserId,
      title: novelTitle,
      image: imageText,
      summary: novelSummary,
      chaptertitles: chaptertitles,
      chaptercontents: chaptercontents,
  };

  try {
      let novelId;
      let message;

      if (selectedNovel) {
          // Updating existing novel
          const { error } = await supabase
              .from('novels')
              .update(novelData)
              .eq('id', selectedNovel.id);

          if (error) throw new Error(error.message);

          novelId = selectedNovel.id;
          message = `A new chapter has been added to ${novelTitle}!`;
      } else {
          // Inserting a new novel
          const { data, error } = await supabase
              .from('novels')
              .insert([novelData])
              .select("id") // Get the inserted novel's ID
              .single();

          if (error) throw new Error(error.message);

          novelId = data.id;
          message = `A new novel "${novelTitle}" has been published!`;
      }

      // Insert a notification for all users
      const { error: notifError } = await supabase.from("notifications").insert([
          {
              user_id: null, // Null means it's for all users
              novel_id: novelId,
              type: selectedNovel ? "new_chapter" : "new_novel",
              message,
          }
      ]);

      if (notifError) throw new Error(notifError.message);

      alert("Novel submitted successfully!");
      resetForm();
  } catch (err) {
      console.error("Error submitting novel:", err.message);
      alert("An error occurred. Please try again later.");
  }
};


  const resetForm = () => {
    console.log("Resetting form...");
  
    setNovelTitle('');
    setNovelImage('');
    setNovelSummary('');
    setNewChapterTitle('');
    setNewChapterContent('');
    setChapterTitles([]); // Clear chapter titles
    setChapterContents([]); // Clear chapter contents
    setSelectedNovel(null);
  
    setTimeout(() => {
      console.log("Form reset:", {
        novelTitle,
        novelImage,
        novelSummary,
        newChapterTitle,
        newChapterContent,
        chaptertitles, // Check if empty
        chaptercontents, // Check if empty
        selectedNovel,
      });
    }, 100); // Delay to allow state updates
  };
  

  const renderWritersContent = () => {
    if (writers.length > 0) {
      return (
        
        <div className="container my-5 text-white">

          {/* Render Writers List */}
          {/* <ul className="list-group">
            {writers.map((writer, index) => (
              <li key={writer.uid || index} className="list-group-item">
                <h5>{writer.name}</h5>
                <p>Email: {writer.email}</p>
                <p>UID: {writer.id}</p>
              </li>
            ))}
          </ul> */}
  
          {/* Render the Form (only once) */}
          <h2 className="text-center section-title">
            {selectedNovel ? "Edit Novel" : "Upload Novel"}
          </h2>
          {!connected && (
          <div className="overlay d-flex align-items-center justify-content-center">
            <NovelConnectButton />
          </div>
        )}
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
                  <img
                    src={imageText}
                    alt="Current Novel"
                    className="img-thumbnail"
                    style={{ maxWidth: "200px" }}
                  />
                  <p>Current Image</p>
                </div>
              )}
              <input
                type="file"
                id="novelImage"
                onChange={handleImageChange}
                required={!selectedNovel}
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
                ref={chapterTitleRef}
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
              {editChapterIndex !== null ? "Update Chapter" : "Add Chapter"}
            </button>
  
            <ul className="list-group my-3 text-white">
              {chaptertitles.map((title, index) => (
                <li key={title || index} className="list-group-item chapter-item">
                  <div className="text-white">
                    <strong>{title}</strong>
                    <p>
                      {chaptercontents[index].length > 50
                        ? `${chaptercontents[index].slice(0, 50)}...`
                        : chaptercontents[index]}
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
  
            <button type="submit" className="btn btn-primary">
              Submit
            </button>
          </form>
  
          {/* Uploaded Novels Section */}
          <div className="container my-5">
            <h2 className="text-center section-title text-white">Uploaded Novels</h2>
            <div className="row">
              {novelsList.map((novel, index) => (
                <div key={novel.id || index} className="col-md-4">
                  <div className="card novel-card">
                    <img
                      src={novel.image}
                      className="card-img-top"
                      alt={novel.title}
                    />
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
      );
    } else {
      return <p className="text-center text-white">No writers found.</p>;
    }
  };
  

  if (loading) {
    return <LoadingPage />;
  }

  return     <div className="bg-black">
<BootstrapProvider />
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
      <div className="container">
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

          <div className="collapse navbar-collapse" id="navbarNav">

        <ul className="navbar-nav me-auto text-center">
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
      </div>

        {/* Navbar Links */}
        <div className="collapse navbar-collapse" id="navbarNav">
            

            {/* Wallet and Creator Dashboard */}
            <ul className="navbar-nav ms-auto text-center">
              <li className="nav-item me-lg-3 mb-3 mb-lg-0">
                <ConnectButton className="btn btn-light btn-sm rounded-pill px-3 py-2 text-dark" />
              </li>
            </ul>


            </div>
            </div>
            </nav>
    {renderWritersContent()}</div>;
}
