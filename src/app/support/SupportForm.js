"use client";

import { useState } from "react";
import { supabase } from "../../services/supabase/supabaseClient";

export default function SupportForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <form onSubmit={handleSubmit} className="sx-form">
      <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required disabled={isSubmitting} /></label>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={isSubmitting} /></label>
      <label className="sx-form-wide">Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is it about?" required disabled={isSubmitting} /></label>
      <label className="sx-form-wide">Message<textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what happened — the more detail, the faster we can help." rows={6} required disabled={isSubmitting} /></label>
      {error ? <div className="sx-form-msg sx-form-err sx-form-wide">{error}</div> : null}
      {success ? <div className="sx-form-msg sx-form-ok sx-form-wide">{success}</div> : null}
      <button type="submit" className="sx-btn sx-btn-primary sx-form-wide" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}