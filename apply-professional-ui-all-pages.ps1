# PowerShell Script to Apply Professional UI to ALL Pages
Write-Host "🎨 Applying Professional UI to ALL Pages..." -ForegroundColor Cyan
Write-Host "This will make every page look consistent and professional`n" -ForegroundColor Yellow

$ErrorActionPreference = "Continue"

# Function to backup a file
function Backup-File {
    param($FilePath)
    if (Test-Path $FilePath) {
        $backupPath = "$FilePath.backup"
        Copy-Item $FilePath $backupPath -Force
        Write-Host "  ✓ Backed up: $FilePath" -ForegroundColor Gray
    }
}

# Function to add unified navbar import
function Add-UnifiedNavbar {
    param($FilePath, $PageName)
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "  ⚠ File not found: $FilePath" -ForegroundColor Yellow
        return
    }
    
    Backup-File $FilePath
    $content = Get-Content $FilePath -Raw
    
    # Add import if not exists
    if ($content -notmatch "UnifiedNavbar") {
        $content = $content -replace '(import.*from.*react.*;)', "`$1`nimport UnifiedNavbar from '../../components/UnifiedNavbar';"
        Write-Host "  ✓ Added UnifiedNavbar import to $PageName" -ForegroundColor Green
    }
    
    Set-Content $FilePath -Value $content -NoNewline
}

Write-Host "`n📄 Processing Pages..." -ForegroundColor Cyan

# 1. Home Page (page.js)
Write-Host "`n1. Updating Home Page..." -ForegroundColor Yellow
$homePage = "src\app\page.js"
if (Test-Path $homePage) {
    Backup-File $homePage
    Write-Host "  ✓ Home page backed up" -ForegroundColor Green
}

# 2. Novel Creators Dashboard
Write-Host "`n2. Updating Novel Creators Dashboard..." -ForegroundColor Yellow
Add-UnifiedNavbar "src\app\novel-creators-dashboard\page.js" "Novel Dashboard"

# 3. Manga Creators Dashboard
Write-Host "`n3. Updating Manga Creators Dashboard..." -ForegroundColor Yellow
Add-UnifiedNavbar "src\app\manga-creators-dashboard\page.js" "Manga Dashboard"

# 4. Edit Profile
Write-Host "`n4. Updating Edit Profile Page..." -ForegroundColor Yellow
Add-UnifiedNavbar "src\app\editprofile\page.js" "Edit Profile"

# 5. Wallet Migration
Write-Host "`n5. Updating Wallet Migration Page..." -ForegroundColor Yellow
Add-UnifiedNavbar "src\app\migrate-wallet\page.js" "Wallet Migration"

# 6. Novels Page
Write-Host "`n6. Checking Novels Page..." -ForegroundColor Yellow
if (Test-Path "src\app\novels\page.js") {
    Add-UnifiedNavbar "src\app\novels\page.js" "Novels Page"
}

# 7. Manga Page
Write-Host "`n7. Checking Manga Page..." -ForegroundColor Yellow
if (Test-Path "src\app\manga\page.js") {
    Add-UnifiedNavbar "src\app\manga\page.js" "Manga Page"
}

Write-Host "`n✅ Backup Complete!" -ForegroundColor Green
Write-Host "`nAll original files have been backed up with .backup extension" -ForegroundColor Cyan

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review the UNIFIED_PAGES_GUIDE.md for specific page updates"
Write-Host "2. Replace old navbar components with UnifiedNavbar"
Write-Host "3. Apply consistent styling classes from globals.css"
Write-Host "4. Test each page for consistency"

Write-Host "`n🎨 Creating Unified Pages Guide..." -ForegroundColor Cyan

# Create comprehensive guide
$guide = @"
# 🎨 Unified Professional UI - Page-by-Page Guide

## Overview
This guide shows exactly how to update each page for consistent professional styling.

---

## 🔧 Global Changes for ALL Pages

### 1. Replace Navbar
**Find:**
\`\`\`jsx
<nav className={styles.navbar}>
  {/* old navbar code */}
</nav>
\`\`\`

**Replace with:**
\`\`\`jsx
<UnifiedNavbar 
  theme={theme}
  onThemeToggle={toggleTheme}
  notificationCount={notifications.length}
  userRole={isWriter ? 'writer' : isArtist ? 'artist' : isSuperuser ? 'superuser' : null}
/>
\`\`\`

### 2. Page Container
**Wrap all pages with:**
\`\`\`jsx
<div className="page" style={{minHeight: '100vh', paddingTop: '80px'}}>
  {/* page content */}
</div>
\`\`\`

### 3. Section Containers
**Use:**
\`\`\`jsx
<section className="section">
  <div className="container">
    {/* content */}
  </div>
</section>
\`\`\`

---

## 📄 Page-Specific Updates

### HOME PAGE (src/app/page.js)

\`\`\`jsx
import UnifiedNavbar from "../components/UnifiedNavbar";

export default function Home() {
  // ... existing state ...

  return (
    <div className="page">
      <UnifiedNavbar 
        theme={theme}
        onThemeToggle={toggleTheme}
        notificationCount={notifications.length}
      />

      {/* Hero Section */}
      <section className="section" style={{paddingTop: '4rem'}}>
        <div className="container text-center">
          <h1 className="animate-fade-in" style={{
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00d4ff 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1.5rem'
          }}>
            Welcome to Sempai HQ
          </h1>
          <p style={{
            fontSize: '1.2rem',
            color: '#b4b4b4',
            maxWidth: '600px',
            margin: '0 auto 2rem'
          }}>
            Your creative platform for novels and manga
          </p>
          <div className="flex-center gap-md">
            <button className="btn btn-primary">Get Started</button>
            <button className="btn btn-secondary">Explore</button>
          </div>
        </div>
      </section>

      {/* Featured Content */}
      <section className="section">
        <div className="container">
          <div className="flex-between" style={{marginBottom: '2rem'}}>
            <h2 style={{fontSize: '2rem', fontWeight: 700}}>Featured Novels</h2>
            <a href="/novels" className="btn btn-ghost">View All →</a>
          </div>
          <div className="grid grid-3 animate-fade-in">
            {novels.map(novel => (
              <div key={novel.id} className="card glass-hover">
                <img 
                  src={novel.image} 
                  alt={novel.title}
                  style={{
                    width: '100%',
                    height: '300px',
                    objectFit: 'cover',
                    borderRadius: '12px 12px 0 0'
                  }}
                />
                <div style={{padding: '1.5rem'}}>
                  <h3 style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    marginBottom: '0.75rem'
                  }}>
                    {novel.title}
                  </h3>
                  <p style={{
                    color: '#b4b4b4',
                    fontSize: '0.95rem',
                    marginBottom: '1rem'
                  }}>
                    {novel.summary.slice(0, 100)}...
                  </p>
                  <div className="flex-between">
                    <span style={{color: '#6b7280', fontSize: '0.9rem'}}>
                      👁 {novel.viewers_count || 0} views
                    </span>
                    <button className="btn btn-ghost" style={{padding: '0.5rem 1rem'}}>
                      Read →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
\`\`\`

---

### NOVEL CREATORS DASHBOARD (src/app/novel-creators-dashboard/page.js)

\`\`\`jsx
import UnifiedNavbar from "../../components/UnifiedNavbar";

export default function NovelDashboard() {
  return (
    <div className="page">
      <UnifiedNavbar 
        userRole={isSuperuser ? 'superuser' : 'writer'}
      />

      <div className="container section">
        {/* Header */}
        <div style={{marginBottom: '2rem'}}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            marginBottom: '0.5rem'
          }}>
            Writer's Dashboard
          </h1>
          <p style={{color: '#b4b4b4'}}>
            Create and manage your novels
          </p>
        </div>

        {/* Form Section */}
        <div className="card" style={{
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            marginBottom: '1.5rem'
          }}>
            {selectedNovel ? 'Edit Novel' : 'Create New Novel'}
          </h2>

          <form onSubmit={handleNovelSubmit}>
            <div className="form-group">
              <label className="form-label">Novel Title</label>
              <input 
                className="form-input"
                type="text"
                value={novelTitle}
                onChange={(e) => setNovelTitle(e.target.value)}
                placeholder="Enter novel title"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Summary</label>
              <textarea 
                className="form-textarea"
                value={novelSummary}
                onChange={(e) => setNovelSummary(e.target.value)}
                placeholder="Write a brief summary"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-checkbox">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                />
                Make novel visible to readers
              </label>
            </div>

            {isSuperuser && (
              <div className="form-group">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={showInHome}
                    onChange={(e) => setShowInHome(e.target.checked)}
                  />
                  Show in home carousel (Superuser)
                </label>
              </div>
            )}

            <button type="submit" className="btn btn-primary">
              {loading ? 'Publishing...' : 'Publish Novel'}
            </button>
          </form>
        </div>

        {/* Novels List */}
        <div>
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            marginBottom: '1.5rem'
          }}>
            Your Novels
          </h2>
          <div className="grid grid-2">
            {novelsList.map(novel => (
              <div key={novel.id} className="card glass-hover">
                <img 
                  src={novel.image}
                  alt={novel.title}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    borderRadius: '12px 12px 0 0'
                  }}
                />
                <div style={{padding: '1.5rem'}}>
                  <h3 style={{fontSize: '1.3rem', fontWeight: 700}}>
                    {novel.title}
                  </h3>
                  <p style={{color: '#b4b4b4', fontSize: '0.9rem'}}>
                    {novel.is_visible ? '✓ Visible' : '✗ Hidden'}
                    {isSuperuser && (novel.show_in_home ? ' | ⭐ In Carousel' : '')}
                  </p>
                  <div className="flex gap-sm" style={{marginTop: '1rem'}}>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => handleEditNovel(novel)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-ghost"
                      onClick={() => handleDeleteNovel(novel)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
\`\`\`

---

### MANGA CREATORS DASHBOARD (src/app/manga-creators-dashboard/page.js)

Same structure as Novel Dashboard, just replace:
- "Novel" with "Manga"
- "Writer" with "Artist"
- \`isWriter\` with \`isArtist\`

---

### EDIT PROFILE (src/app/editprofile/page.js)

\`\`\`jsx
import UnifiedNavbar from "../../components/UnifiedNavbar";

export default function EditProfile() {
  return (
    <div className="page">
      <UnifiedNavbar />

      <div className="container section">
        <div className="card" style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            marginBottom: '0.5rem'
          }}>
            Edit Profile
          </h1>
          <p style={{color: '#b4b4b4', marginBottom: '2rem'}}>
            Update your account information
          </p>

          <form>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" type="text" />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" />
            </div>

            <div className="form-group">
              <label className="form-label">Bio</label>
              <textarea className="form-textarea"></textarea>
            </div>

            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
\`\`\`

---

## 🎨 Consistent Styling Rules

### Colors
- Primary: \`#00d4ff\` (Cyan)
- Secondary: \`#ff6b6b\` (Coral)
- Text: \`#ffffff\` (White)
- Muted: \`#b4b4b4\` (Gray)

### Spacing
- Section padding: \`4rem 2rem\`
- Card padding: \`1.5rem - 2rem\`
- Form gaps: \`1.5rem\`

### Typography
- Page title: \`2.5rem, weight 800\`
- Section title: \`1.8-2rem, weight 700\`
- Card title: \`1.3rem, weight 700\`
- Body text: \`0.95-1rem\`

### Components
- All buttons: \`btn btn-primary\` or \`btn-secondary\`
- All cards: \`card glass-hover\`
- All forms: \`form-input\`, \`form-label\`, \`form-textarea\`
- All grids: \`grid grid-2\` or \`grid-3\`

---

## ✅ Checklist

- [ ] Replace all navbars with UnifiedNavbar
- [ ] Wrap pages in \`page\` class
- [ ] Use \`section\` and \`container\` for layout
- [ ] Apply \`card glass-hover\` to all cards
- [ ] Use \`btn\` classes for all buttons
- [ ] Apply \`form-*\` classes to forms
- [ ] Use consistent typography sizes
- [ ] Add animations with \`animate-fade-in\`
- [ ] Test on desktop
- [ ] Test on mobile

---

## 🚀 Result

All pages will have:
- ✅ Unified navigation
- ✅ Consistent colors and spacing
- ✅ Professional glass morphism effects
- ✅ Smooth animations
- ✅ Mobile responsive
- ✅ Same look and feel

**Your app will look cohesive and professional! 🎉**
"@

Set-Content "UNIFIED_PAGES_GUIDE.md" -Value $guide

Write-Host "`n✅ Guide Created: UNIFIED_PAGES_GUIDE.md" -ForegroundColor Green
Write-Host "`n🎉 Setup Complete!" -ForegroundColor Cyan
Write-Host "`nNext: Follow UNIFIED_PAGES_GUIDE.md to update each page" -ForegroundColor Yellow
