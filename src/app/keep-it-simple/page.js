'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import LoadingPage from '../../components/LoadingPage';

export default function Haven() {
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This ensures the code is only run on the client side
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Render nothing on the server-side
    useEffect(() => {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1000); // 1 second delay
  
      return () => clearTimeout(timer); // Cleanup the timer when the component unmounts
    }, []);

  }
 
  return (
    <div>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
        {/* Brand Logo */}
        <Link href="/" className="navbar-brand">
          <img
            src="/images/logo.jpg" // The path is correct if the image is in the public folder
            alt="Sempai HQ"
            className="navbar-logo"
            style={{ width: '40px', height: '40px', borderRadius: '50%' }}
          />
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
          <ul className="navbar-nav ms-auto">
            {/* Add Wallet connect or other buttons here */}
          </ul>
        </div>
      </nav>

      <Head>
        <title>Haven For the Otaku</title>
        <meta name="description" content="A home for anime, manga, and web novel lovers, powered by blockchain technology." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <h1>Haven For the Otaku</h1>

        <p>We've all heard of anime by now. I mean, it’s 2025! Manga too, if you lean far into that. But that's not exactly what this is about.</p>

        <p>
          It's a thriving culture, with millions upon millions of humans living and existing in the world of books, anime, and manga series. People subscribe to{" "}
          <span className="highlight">apps</span>  to watch anime and read web novels, paying for quality content that has changed lives over the years. 
        </p>

        <p>It's a beautiful thing, really, and we cannot overemphasize the importance of anime & books, this kind of media entertainment, and its accompanying subculture to humanity at large.</p>

        <h2>The Problem</h2>
        <p>
          Yet, for all its glory, this sector of entertainment lacks fulfillment in one glaring way—<span className="highlight">giving back to the consumers</span>.
        </p>

        <p>
          Otakus, Weebs, and bibliophiles spend copious amounts of dollars on subscriptions to exclusive manga series, streaming anime, and web novel apps where we can't find quality content for free. And what do we get in return? Just personal pleasure.
        </p>

        <p><span className="highlight">It shouldn't be so.</span></p>

        <h2>The Sempai Project</h2>
        <p>
          The <span className="highlight">Sempai project</span> is more than just a collection of beautiful, amazing NFT girlfriends and books. We believe this
          could be the beginning of a revolution in web novels, manga, and book reading.
        </p>

        <p>By leveraging blockchain technology, we aim to create a <span className="highlight">user-prioritized Read-to-Earn (R2E) model</span> that combines NFTs, beautiful artwork, and immersive storylines with the power of the Solana blockchain.</p>

        <h2>Structural Model</h2>
        <p>
          To build this grand ecosystem, we will offer a total of <span className="highlight">4 initial Goddess Waifu NFTs</span>, never to be minted again.
          These early holders will enjoy governance rights and exclusive benefits in the ecosystem.
        </p>

        <h2>Waifu Lore</h2>
        <p>
          The <span className="highlight">Goddess Waifus</span> were the first of their kind, created by <span className="highlight">Amaterasu</span> as she
          smiled down upon the Otakus of this world—those who have stayed true to their love for anime and otaku culture.
        </p>

        <p>
          Each owner of a Waifu NFT will have special access to unreleased manga panels, web novel previews, exclusive designs, and governance rights in the
          ecosystem.
        </p>

        <h2>What Sets Us Apart?</h2>
        <p>We are tapping into an already <span className="highlight">established ecosystem</span>, one with unrivaled potential for growth.</p>

        <h2>From Us to You</h2>
        <p>We can't do this without you. If you see potential in this vision—a home for yourself or someone close to you—then join us.</p>

        <p><span className="highlight">It takes just one match to start a forest fire. You know that, right?</span></p>
      </div>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');

        body {
          background-color: #000;
          color: #fff;
          font-family: 'Poppins', sans-serif;
          margin: 0;
          padding: 0;
        }

        .container {
          background-color: #000;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 30px;
        }

        h1 {
          font-size: 3rem;
          text-align: center;
          color: rgb(243, 99, 22);
          font-weight: 600;
        }

        h2 {
          text-align: center;
          color: rgb(243, 99, 22);
          font-size: 2rem;
          margin-top: 40px;
        }

        p {
          line-height: 1.7;
          margin-bottom: 20px;
          font-size: 1.1rem;
          text-align: justify;
        }

        .highlight {
          color: rgb(243, 99, 22);
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
