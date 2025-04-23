"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../services/supabase/supabaseClient";
import {
  FaHome,
  FaBars,
  FaTimes,
  FaEnvelope,
  FaUser,
  FaComment,
  FaPaperPlane,
  FaSpinner,
} from "react-icons/fa";
import styles from "./Support.module.css";

export default function Support() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError("All fields are required.");
      setIsSubmitting(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { error: supabaseError } = await supabase.from("support_requests").insert({
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        created_at: new Date().toISOString(),
      });

      if (supabaseError) throw new Error("Error submitting request: " + supabaseError.message);

      setSuccess("Your support request has been submitted successfully!");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err) {
      setError(err.message);
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${styles.page} ${menuOpen ? styles.menuActive : ""}`}>
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logoLink}>
            <img src="/images/logo.jpeg" alt="Sempai HQ" className={styles.logo} />
            <span className={styles.logoText}>Sempai HQ</span>
          </Link>
          <button className={styles.menuToggle} onClick={toggleMenu}>
            {menuOpen ? <FaTimes /> : <FaBars />}
          </button>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ""}`}>
            <Link href="/" className={styles.navLink}>
              <FaHome /> Home
            </Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <section className={styles.supportSection}>
          <h1 className={styles.title}>
            <FaComment /> Contact Support
          </h1>
          <p className={styles.description}>
            Have an issue or question? Fill out the form below, and our team will get back to you soon.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="name" className={styles.inputLabel}>
                <FaUser className={styles.inputIcon} /> Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className={styles.input}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.inputLabel}>
                <FaEnvelope className={styles.inputIcon} /> Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={styles.input}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="subject" className={styles.inputLabel}>
                <FaComment className={styles.inputIcon} /> Subject
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter the subject"
                className={styles.input}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="message" className={styles.inputLabel}>
                <FaComment className={styles.inputIcon} /> Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or question"
                className={styles.textarea}
                required
                disabled={isSubmitting}
              />
            </div>

            {error && <div className={styles.alertError}>{error}</div>}
            {success && <div className={styles.alertSuccess}>{success}</div>}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? <FaSpinner className={styles.spinner} /> : <FaPaperPlane />} Submit
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}