<div className={styles.artistDashboard}>
            <section className={styles.artistFormSection}>
              <h2 className={styles.artistSectionTitle}>
                <FaPaintBrush /> {selectedManga ? "Edit Canvas" : "New Canvas"}
              </h2>
              <form onSubmit={handleMangaSubmit} className={styles.artistForm}>
                <div className={styles.artistInputGroup}>
                  <label htmlFor="mangaTitle" className={styles.artistLabel}>Title</label>
                  <input
                    id="mangaTitle"
                    type="text"
                    ref={mangaTitleRef}
                    value={mangaTitle}
                    onChange={(e) => setMangaTitle(e.target.value)}
                    placeholder="Enter manga title"
                    className={styles.artistInput}
                    required
                  />
                </div>
                <div className={styles.artistInputGroup}>
                  <label htmlFor="mangaCover" className={styles.artistLabel}><FaImage /> Cover Image</label>
                  {mangaImageUrl && <img src={mangaImageUrl} alt="Preview" className={styles.artistImagePreview} />}
                  <input
                    id="mangaCover"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, "manga")}
                    className={styles.artistFileInput}
                    required={!selectedManga}
                  />
                </div>
                <div className={styles.artistInputGroup}>
                  <label htmlFor="mangaSummary" className={styles.artistLabel}>Summary</label>
                  <textarea
                    id="mangaSummary"
                    value={mangaSummary}
                    onChange={(e) => setMangaSummary(e.target.value)}
                    placeholder="Write a brief summary"
                    className={styles.artistTextarea}
                    rows="3"
                    required
                  />
                </div>
                <div className={styles.artistChapterSection}>
                  <h3 className={styles.artistChapterTitle}><FaPlus /> Chapters</h3>
                  <div className={styles.artistInputGroup}>
                    <label htmlFor="mangaChapterTitle" className={styles.artistLabel}>Chapter Title</label>
                    <input
                      id="mangaChapterTitle"
                      type="text"
                      value={newMangaChapterTitle}
                      onChange={(e) => setNewMangaChapterTitle(e.target.value)}
                      placeholder="Enter chapter title"
                      className={styles.artistInput}
                    />
                  </div>
                  <div className={styles.artistInputGroup}>
                    <label htmlFor="mangaPages" className={styles.artistLabel}>Pages (Multiple Images)</label>
                    <input
                      id="mangaPages"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleMangaPagesChange}
                      className={styles.artistFileInput}
                    />
                    {newMangaPages.length > 0 && (
                      <div className={styles.pagePreviews}>
                        {newMangaPages.map((page, index) => (
                          <img
                            key={index}
                            src={typeof page === "string" ? page : URL.createObjectURL(page)}
                            alt={`Page ${index + 1}`}
                            className={styles.pagePreview}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={styles.artistInputGroup}>
                    <label className={styles.artistLabel}>
                      <input
                        type="checkbox"
                        checked={newMangaChapterIsPremium}
                        onChange={(e) => setNewMangaChapterIsPremium(e.target.checked)}
                      />
                      Mark as Premium Chapter
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMangaChapter}
                    className={styles.artistAddButton}
                  >
                    <FaPlus /> {editMangaChapterIndex !== null ? "Update" : "Add"}
                  </button>
                </div>
                {mangaChapters.length > 0 && (
                  <ul className={styles.artistChapterList}>
                    {mangaChapters.map((chapter, index) => (
                      <li key={index} className={styles.artistChapterItem}>
                        <span className={styles.artistChapterText}>
                          <strong>{chapter.title}</strong>
                          <p>{chapter.pages.length} pages {chapter.is_premium && "(Premium)"}</p>
                        </span>
                        <div className={styles.artistChapterActions}>
                          <button
                            type="button"
                            onClick={() => handleEditMangaChapter(index)}
                            className={styles.artistEditButton}
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMangaChapter(index)}
                            className={styles.artistDeleteButton}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="submit" className={styles.artistSubmitButton}>
                  <FaRocket /> {selectedManga ? "Update" : "Launch"}
                </button>
              </form>

              {selectedManga && (
                <div className={styles.artistAnnouncementSection}>
                  <h3 className={styles.artistSectionTitle}><FaBullhorn /> Announce to Readers</h3>
                  <form onSubmit={handleAnnouncementSubmit} className={styles.artistAnnouncementForm}>
                    <div className={styles.artistInputGroup}>
                      <label htmlFor="announcementTitleManga" className={styles.artistLabel}>Announcement Title</label>
                      <input
                        id="announcementTitleManga"
                        type="text"
                        value={announcementTitle}
                        onChange={(e) => setAnnouncementTitle(e.target.value)}
                        placeholder="e.g., New Chapter Coming Soon!"
                        className={styles.artistInput}
                        required
                      />
                    </div>
                    <div className={styles.artistInputGroup}>
                      <label htmlFor="announcementMessageManga" className={styles.artistLabel}>Message</label>
                      <textarea
                        id="announcementMessageManga"
                        value={announcementMessage}
                        onChange={(e) => setAnnouncementMessage(e.target.value)}
                        placeholder="Write your announcement here"
                        className={styles.artistTextarea}
                        rows="3"
                        required
                      />
                    </div>
                    <div className={styles.artistInputGroup}>
                      <label htmlFor="announcementDateManga" className={styles.artistLabel}>Release Date (Optional)</label>
                      <DatePicker
                        id="announcementDateManga"
                        selected={announcementReleaseDate}
                        onChange={(date) => setAnnouncementReleaseDate(date)}
                        showTimeSelect
                        dateFormat="Pp"
                        minDate={new Date()}
                        placeholderText="Select release date"
                        className={styles.artistInput}
                      />
                    </div>
                    <button type="submit" className={styles.artistAnnouncementButton}>
                      <FaBullhorn /> Send Announcement
                    </button>
                  </form>
                </div>
              )}
            </section>

            <section className={styles.artistMangaSection}>
              <h2 className={styles.artistSectionTitle}><FaPaintBrush /> Your Canvases</h2>
              {mangaList.length === 0 ? (
                <p className={styles.artistNoManga}>No canvases yet. Start creating!</p>
              ) : (
                <div className={styles.artistMangaGrid}>
                  {mangaList.map((manga) => (
                    <div key={manga.id} className={styles.artistMangaCard}>
                      <img src={manga.cover_image} alt={manga.title} className={styles.artistMangaImage} />
                      <div className={styles.artistMangaInfo}>
                        <h3 className={styles.artistMangaTitle}>{manga.title}</h3>
                        <p className={styles.artistMangaSummary}>{manga.summary.slice(0, 50)}...</p>
                        <button onClick={() => handleEditManga(manga)} className={styles.artistEditMangaButton}>
                          <FaEdit /> Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>