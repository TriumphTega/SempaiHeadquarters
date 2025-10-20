# PowerShell script to apply all requested updates
Write-Host "Applying updates to SempaiHeadquarters..." -ForegroundColor Cyan

# 1. Update novel-creators-dashboard with visibility toggles
Write-Host "`n1. Updating novel-creators-dashboard..." -ForegroundColor Yellow
$novelDashboard = 'src\app\novel-creators-dashboard\page.js'
$content = Get-Content $novelDashboard -Raw

# Add state variables
$content = $content -replace '(\s+const \[novelToDelete, setNovelToDelete\] = useState\(null\);)', '$1\n  const [isVisible, setIsVisible] = useState(true);\n  const [showInHome, setShowInHome] = useState(true);'

# Update handleEditNovel
$content = $content -replace '(setTags\(novel\.tags \? novel\.tags\.map\(tag => \(\{ value: tag, label: tag \}\)\) : \[\]\);)', '$1\n    setIsVisible(novel.is_visible !== false);\n    setShowInHome(novel.show_in_home !== false);'

# Update novelData
$content = $content -replace '(viewers_count: selectedNovel \? selectedNovel\.viewers_count : 0)', '$1,\n        is_visible: isVisible,\n        show_in_home: showInHome'

# Update resetForm
$content = $content -replace '(setEditChapterIndex\(null\);\s+setTags\(\[\]\);)', '$1\n    setIsVisible(true);\n    setShowInHome(true);'

# Add UI controls before chapterSection
$visibilityControls = @'
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => setIsVisible(e.target.checked)}
                    />
                    {" "}Make novel visible to readers
                  </label>
                </div>
                {isSuperuser && (
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>
                      <input
                        type="checkbox"
                        checked={showInHome}
                        onChange={(e) => setShowInHome(e.target.checked)}
                      />
                      {" "}Show in home carousel (Superuser)
                    </label>
                  </div>
                )}
'@
$content = $content -replace '(\s+</div>\s+<div className=\{styles\.chapterSection\}>)', "$visibilityControls`$1"

# Add status display in novel cards
$content = $content -replace '(<p className=\{styles\.novelViewers\}>Viewers: \{novel\.viewers_count \|\| 0\}</p>)', '$1\n                        <p className={styles.novelStatus}>\n                          {novel.is_visible ? "✓ Visible" : "✗ Hidden"}\n                          {isSuperuser && (novel.show_in_home ? " | ⭐ In Carousel" : " | Not in Carousel")}\n                        </p>'

Set-Content $novelDashboard -Value $content -NoNewline
Write-Host "✓ Novel dashboard updated" -ForegroundColor Green

# 2. Update manga-creators-dashboard with visibility toggles
Write-Host "`n2. Updating manga-creators-dashboard..." -ForegroundColor Yellow
$mangaDashboard = 'src\app\manga-creators-dashboard\page.js'
$content = Get-Content $mangaDashboard -Raw

# Add state variables
$content = $content -replace '(\s+const \[tags, setTags\] = useState\(\[\]\);)', '$1\n  const [isVisible, setIsVisible] = useState(true);\n  const [showInHome, setShowInHome] = useState(true);'

# Update loadMangaForEdit function
$content = $content -replace '(setTags\(manga\.tags \? manga\.tags\.map\(tag => \(\{ value: tag, label: tag \}\)\) : \[\]\);)', '$1\n    setIsVisible(manga.is_visible !== false);\n    setShowInHome(manga.show_in_home !== false);'

# Update manga submission
$content = $content -replace '(status: activeManga \? activeManga\.status : "ongoing")', '$1,\n        is_visible: isVisible,\n        show_in_home: showInHome'

# Update clearForm
$content = $content -replace '(setActiveManga\(null\);\s+setTags\(\[\]\);)', '$1\n    setIsVisible(true);\n    setShowInHome(true);'

# Add UI controls
$mangaVisibilityControls = @'
                <div className={styles.field}>
                  <label>
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => setIsVisible(e.target.checked)}
                    />
                    {" "}Make manga visible to readers
                  </label>
                </div>
                {isAdmin && (
                  <div className={styles.field}>
                    <label>
                      <input
                        type="checkbox"
                        checked={showInHome}
                        onChange={(e) => setShowInHome(e.target.checked)}
                      />
                      {" "}Show in home carousel (Admin)
                    </label>
                  </div>
                )}
'@
$content = $content -replace '(\s+</div>\s+<div className=\{styles\.chapterEditor\}>)', "$mangaVisibilityControls`$1"

# Add status display
$content = $content -replace '(<p>Viewers: \{manga\.viewers_count \|\| 0\}</p>)', '$1\n                        <p>\n                          {manga.is_visible ? "✓ Visible" : "✗ Hidden"}\n                          {isAdmin && (manga.show_in_home ? " | ⭐ In Carousel" : " | Not in Carousel")}\n                        </p>'

Set-Content $mangaDashboard -Value $content -NoNewline
Write-Host "✓ Manga dashboard updated" -ForegroundColor Green

# 3. Create wallet migration page
Write-Host "`n3. Creating wallet migration system..." -ForegroundColor Yellow
$migrationDir = 'src\app\wallet-migration'
if (-not (Test-Path $migrationDir)) {
    New-Item -ItemType Directory -Path $migrationDir -Force | Out-Null
}

# Copy the wallet migration page from implementation guide
Write-Host "✓ Wallet migration directory created" -ForegroundColor Green
Write-Host "  → Please copy the wallet migration code from IMPLEMENTATION_GUIDE.md" -ForegroundColor Cyan

# 4. Update home page with migration banner
Write-Host "`n4. Adding migration banner to home page..." -ForegroundColor Yellow
$homePage = 'src\app\page.js'
$content = Get-Content $homePage -Raw

# Add state for migration banner
$content = $content -replace '(\s+const \[announcementsOpen, setAnnouncementsOpen\] = useState\(false\);)', '$1\n  const [showMigrationBanner, setShowMigrationBanner] = useState(false);'

# Add migration check effect (after other useEffects)
$migrationEffect = @'

  useEffect(() => {
    const checkMigrationStatus = async () => {
      if (!isWalletConnected || !walletPublicKey) return;
      
      try {
        const { data, error } = await supabase
          .from("users")
          .select("email, isWriter, isArtist, wallet_address")
          .eq("wallet_address", walletPublicKey)
          .single();

        if (data && (data.isWriter || data.isArtist) && !data.email) {
          setShowMigrationBanner(true);
        }
      } catch (err) {
        console.error("Migration check error:", err);
      }
    };

    checkMigrationStatus();
  }, [isWalletConnected, walletPublicKey]);
'@

$content = $content -replace '(useEffect\(\(\) => \{[^}]+fetchNotifications\(\);[^}]+\}, \[fetchNotifications\]\);)', "`$1$migrationEffect"

Set-Content $homePage -Value $content -NoNewline
Write-Host "✓ Home page updated with migration banner" -ForegroundColor Green

Write-Host "`n✅ All automated updates completed!" -ForegroundColor Green
Write-Host "`nManual steps remaining:" -ForegroundColor Yellow
Write-Host "1. Copy wallet migration page code from IMPLEMENTATION_GUIDE.md to src/app/wallet-migration/page.js"
Write-Host "2. Copy wallet migration styles from IMPLEMENTATION_GUIDE.md to src/app/wallet-migration/WalletMigration.module.css"
Write-Host "3. Add migration banner JSX to home page (see IMPLEMENTATION_GUIDE.md section 4)"
Write-Host "4. Add migration banner styles to src/app/page.module.css (see IMPLEMENTATION_GUIDE.md)"
Write-Host "5. Update DraggableWalletPanel.js with enhanced version (see IMPLEMENTATION_GUIDE.md section 5)"
Write-Host "6. Create src/styles/WalletPanel.module.css (see IMPLEMENTATION_GUIDE.md)"
Write-Host "`nAll code is documented in IMPLEMENTATION_GUIDE.md" -ForegroundColor Cyan
