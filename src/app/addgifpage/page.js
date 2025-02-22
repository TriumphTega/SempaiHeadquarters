"use client";

import { useState } from "react";
import { supabase } from "@/services/supabase/supabaseClient";
import styles from "./AddGif.module.css"; // New CSS file

export default function AddGifPage() {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState(""); // Comma-separated input
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  // Handle file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Upload GIF and add to table
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !file) {
      setMessage("Please provide a title and select a GIF file.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      // Upload GIF to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("gifs") // Assuming 'gifs' bucket exists
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("gifs")
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error("Failed to get public URL");
      }

      const gifUrl = urlData.publicUrl;

      // Parse tags into an array
      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Insert into gifs table
      const { error: insertError } = await supabase
        .from("gifs")
        .insert([{ title, url: gifUrl, tags: tagsArray.length ? tagsArray : null }]);

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`);
      }

      setMessage("GIF added successfully!");
      setTitle("");
      setTags("");
      setFile(null);
      document.getElementById("fileInput").value = ""; // Reset file input
    } catch (error) {
      console.error("Error adding GIF:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Add a New GIF</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.label}>
            GIF Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
            placeholder="Enter GIF title"
            disabled={uploading}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="tags" className={styles.label}>
            Tags (optional, comma-separated)
          </label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={styles.input}
            placeholder="e.g., funny, cat, reaction"
            disabled={uploading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="fileInput" className={styles.label}>
            GIF File
          </label>
          <input
            type="file"
            id="fileInput"
            accept="image/gif"
            onChange={handleFileChange}
            className={styles.fileInput}
            disabled={uploading}
            required
          />
        </div>

        <button
          type="submit"
          className={styles.submitButton}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Add GIF"}
        </button>

        {message && <p className={styles.message}>{message}</p>}
      </form>
    </div>
  );
}