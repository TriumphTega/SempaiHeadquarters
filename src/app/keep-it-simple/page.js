"use client";

import { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "../../styles/Haven.module.css";

export default function Haven() {
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleButtonRef = useRef(null);
  const navLinksRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
    const timer = setTimeout(() => setLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isClient && !loading && toggleButtonRef.current && navLinksRef.current) {
      const toggleMenu = () => {
        setMenuOpen((prev) => !prev);
      };
      const toggleButton = toggleButtonRef.current;
      toggleButton.addEventListener("click", toggleMenu);
      return () => toggleButton.removeEventListener("click", toggleMenu);
    }
  }, [isClient, loading]);

  if (!isClient || loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Head>
        <title>Haven For the Otaku - Sempai HQ</title>
        <meta
          name="description"
          content="A revolutionary platform for anime, manga, and web novel enthusiasts, powered by blockchain technology."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Navigation */}
      <header className={styles.header}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          
        </nav>
      </header>

      {/* Main Content */}
      <main className={styles.main}>
        {/* How to Use Section */}
        <section className={styles.howTo}>
          <h1 className={styles.howToTitle}>How to Use Sempaihq.xyz</h1>
          <ol className={styles.howToList}>
            <li>Visit the Dapp in the browser. (Jupiter or Phantom)</li>
            <li>Create your account/login by connecting seamlessly.</li>
            <li>Create and edit your profile in Profile tab.</li>
            <li>Read stories, comment and reply for points against a weekly rewards distribution.</li>
            <li>Hold 💎 $Amethyst to get a points multiplier each week, as well as vote and mint NFTs.</li>
          </ol>
        </section>

        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Haven For the Otaku</h1>
          <p className={styles.heroSubtitle}>
            A professional ecosystem for anime, manga, and web novel enthusiasts.
          </p>
        </section>

        {/* Content */}
        <section className={styles.content}>
          <p>
            We've all heard of anime by now. I mean, it’s 2025! Manga too, if you lean far into that. But that's not exactly what this is about.
          </p>
          <p>
            It's a thriving culture, with millions upon millions of humans living and existing in the world of books, anime, and manga series. People subscribe to{" "}
            <span className={styles.highlight}>apps</span> to watch anime and read web novels, paying for quality content that has changed lives over the years.
          </p>
          <p>
            It's a beautiful thing, really, and we cannot overemphasize the importance of anime & books, this kind of media entertainment, and its accompanying subculture to humanity at large.
          </p>

          <h2>The Problem</h2>
          <p>
            Yet, for all its glory, this sector of entertainment lacks fulfillment in one glaring way—<span className={styles.highlight}>giving back to the consumers</span>.
          </p>
          <p>
            Otakus, Weebs, and bibliophiles spend copious amounts of dollars on subscriptions to exclusive manga series, streaming anime, and web novel apps where we can't find quality content for free. And what do we get in return? Just personal pleasure.
          </p>
          <p>
            <span className={styles.highlight}>It shouldn't be so.</span>
          </p>

          <h2>The Sempai Project</h2>
          <p>
            The <span className={styles.highlight}>Sempai project</span> is more than just a collection of beautiful, amazing NFT girlfriends and books. We believe this could be the beginning of a revolution in web novels, manga, and book reading.
          </p>
          <p>
            By leveraging blockchain technology, we aim to create a <span className={styles.highlight}>user-prioritized Read-to-Earn (R2E) model</span> that combines NFTs, beautiful artwork, and immersive storylines with the power of the Solana blockchain.
          </p>

          <h2>Structural Model</h2>
          <p>
            To build this grand ecosystem, we will offer a total of <span className={styles.highlight}>4 initial Goddess Waifu NFTs</span>, never to be minted again. These early holders will enjoy governance rights and exclusive benefits in the ecosystem.
          </p>

          <h2>Waifu Lore</h2>
          <p>
            The <span className={styles.highlight}>Goddess Waifus</span> were the first of their kind, created by <span className={styles.highlight}>Amaterasu</span> as she smiled down upon the Otakus of this world—those who have stayed true to their love for anime and otaku culture.
          </p>
          <p>
            Each owner of a Waifu NFT will have special access to unreleased manga panels, web novel previews, exclusive designs, and governance rights in the ecosystem.
          </p>

          <h2>What Sets Us Apart?</h2>
          <p>
            We are tapping into an already <span className={styles.highlight}>established ecosystem</span>, one with unrivaled potential for growth.
          </p>

          <h2>From Us to You</h2>
          <p>
            We can't do this without you. If you see potential in this vision—a home for yourself or someone close to you—then join us.
          </p>
          <p>
            <span className={styles.highlight}>It takes just one match to start a forest fire. You know that, right?</span>
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2025 Sempai HQ. All rights reserved.</p>
      </footer>
    </div>
  );
}