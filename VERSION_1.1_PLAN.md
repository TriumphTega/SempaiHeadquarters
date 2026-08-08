# SempaiHQ Version 1.1 Release Plan

## Overview
**Target Release**: Week of August 4-10, 2026
**Version**: 1.1.0
**Focus**: Badge System, Social Sharing, UI Improvements, Content Management

---

## Phase 1: Critical Badge Features (High Priority)
**Timeline**: Days 1-2

### 1.1 Add Buy Badges Button in Novel Content Page
**Location**: Web (`src/app/novel/[id]/chapter/[chapter]/page.js`), Mobile (`screens/ChapterScreen.js`)
**Implementation**:
- Add "Buy Badges" button in chapter payment UI
- Link to benefactor badge purchase flow
- Show badge tiers (Bronze, Silver, Gold, Platinum)
- Display current badge status if user has one
- Integrate with existing benefactor payment system

### 1.2 Enable Badges Payment for Advance Chapters
**Location**: `src/app/novel/[id]/chapter/[chapter]/page.js`, `screens/ChapterScreen.js`
**Implementation**:
- Add badge payment option alongside SMP/SOL/USDC
- Check user's benefactor status before allowing badge payment
- Implement badge-based chapter unlock logic
- Track badge payments in database
- Show badge payment success/failure feedback

### 1.3 Implement Autopay Functionality
**Location**: New component `src/components/AutopaySettings.jsx`, Mobile `components/AutopaySettings.js`
**Implementation**:
- Create autopay settings UI
- Allow users to enable/disable autopay for chapters
- Store autopay preference in user profile
- Auto-deduct SMP/balance when unlocking chapters
- Add confirmation dialog for autopay
- Implement autopay for benefactor early access

---

## Phase 2: Social & Sharing (High Priority)
**Timeline**: Days 2-3

### 2.1 Fix Social Card for Chapter-Level Sharing
**Location**: `src/app/novel/[id]/chapter/[chapter]/page.js`, `src/app/manga/[id]/chapter/[chapter]/page.js`
**Implementation**:
- Add dynamic metadata for individual chapters
- Include chapter title, description, and cover image
- Set proper OpenGraph and Twitter Card tags
- Test with Twitter Card Validator and Facebook Debugger
- Ensure mobile app also generates proper share previews

### 2.2 Add Share Button to Each Chapter (Web)
**Location**: `src/app/novel/[id]/chapter/[chapter]/page.js`, `src/app/manga/[id]/chapter/[chapter]/page.js`
**Implementation**:
- Add share button in chapter header/footer
- Implement Web Share API for native sharing
- Fallback to clipboard copy for unsupported browsers
- Include chapter URL and title in share text
- Add share analytics tracking

### 2.3 Add Share Button to Each Chapter (Mobile)
**Location**: `screens/ChapterScreen.js`, `screens/MangaChapterScreen.js`
**Implementation**:
- Add share button using React Native Share API
- Include chapter URL, title, and description
- Support WhatsApp, Twitter, Facebook, and system share sheet
- Add share success/failure feedback
- Track share analytics

---

## Phase 3: UI/UX Improvements (Medium Priority)
**Timeline**: Days 3-4

### 3.1 Redesign Unlocked Chapter Page with Carousel-Style Preview
**Location**: `src/app/novel/[id]/chapter/[chapter]/page.js`, `screens/ChapterScreen.js`
**Implementation**:
- Create carousel component for content preview
- Show adjacent chapters in preview carousel
- Implement smooth transitions between chapters
- Add chapter navigation arrows
- Style to match app theme (dark mode, orange accents)
- Add reading progress indicator
- Optimize for mobile and desktop

### 3.2 Update Get Tokens Button to Redirect to Ramp
**Location**: Multiple locations with Get Tokens button
**Implementation**:
- Find all Get Tokens button instances
- Update to redirect to Ramp integration
- Maintain existing Ramp widget configuration
- Test redirect flow
- Update button text if needed

---

## Phase 4: Content Management (Medium Priority)
**Timeline**: Days 4-5

### 4.1 Create Badges Page in Content Tab
**Location**: New page `src/app/badges/page.js`, Mobile `screens/BadgesScreen.js`
**Implementation**:
- Create badges management page
- Show user's owned badges with levels
- Display badge benefits and perks
- Add badge upgrade options
- Show badge purchase history
- Integrate with existing benefactor system
- Add badge statistics and achievements

### 4.2 Merge Manga and Novel Dashboard into Unified Creator Dashboard
**Location**: `src/app/novel-creators-dashboard/page.js`, `src/app/manga-creators-dashboard/page.js`
**Implementation**:
- Create unified Creator Dashboard
- Merge novel and manga management
- Add tabs for Novels and Manga
- Maintain all existing functionality
- Update navigation links
- Test all creator workflows

### 4.3 Rename Novels to Hoard and Manga to Manga Hoard
**Location**: Multiple files, database, navigation
**Implementation**:
- Update all UI text references
- Update database queries and labels
- Update navigation menus
- Update API endpoints if needed
- Update mobile app strings
- Test all renamed sections

---

## Phase 5: Carousel System (Medium Priority)
**Timeline**: Days 5-6

### 5.1 Remove Netty from Carousel Code
**Location**: `src/app/page.js`, `screens/HomeScreen.js`
**Implementation**:
- Identify Netty references in carousel
- Remove Netty-specific code
- Clean up unused dependencies
- Test carousel without Netty

### 5.2 Redo Carousel to Show Specific Novels/Manga
**Location**: `src/app/page.js`, `screens/HomeScreen.js`
**Implementation**:
- Create configurable carousel data source
- Add admin panel for carousel management
- Implement featured content selection
- Add carousel analytics
- Optimize carousel performance
- Support manual and automatic carousel updates

---

## Phase 6: Notifications (Lower Priority)
**Timeline**: Days 6-7

### 6.1 Implement Notification Center for Novel Updates
**Location**: New component `src/components/NotificationCenter.jsx`, Mobile `components/NotificationCenter.js`
**Implementation**:
- Create notification center UI
- Implement real-time notification fetching
- Add notification categories (novels, manga, badges)
- Show unread notification count
- Add notification preferences
- Implement push notifications (if feasible)
- Add notification history

### 6.2 Prepare Notification System for Future Content
**Location**: Database schema, API routes
**Implementation**:
- Design extensible notification schema
- Add support for webtoons, anime, manga
- Create notification templates
- Implement notification scheduling
- Add notification analytics

---

## Version Management

### Update to v1.1.0
**Files to Update**:
- `package.json` (Web)
- `app.json` (Mobile)
- `CHANGELOG.md` (Both)

**Changelog Entry**:
```
## [1.1.0] - 2026-08-XX

### 🚀 New Features
- Badge purchase button in novel content pages
- Badge payment option for advance chapters
- Autopay functionality for chapter unlocks
- Share buttons for individual chapters (Web & Mobile)
- Badges management page in Content tab
- Unified Creator Dashboard
- Notification center for novel updates

### 🎨 UI/UX Improvements
- Redesigned unlocked chapter page with carousel preview
- Renamed Novels to Hoard, Manga to Manga Hoard
- Updated Get Tokens button to redirect to Ramp
- Improved carousel system with content selection

### 🔧 Bug Fixes
- Fixed social card metadata for chapter-level sharing
- Removed Netty from carousel code
- Performance improvements

### 📱 Mobile
- Chapter share functionality
- Badge management on mobile
- Notification center on mobile
```

---

## Implementation Order

### Day 1 (August 5)
- 1.1 Add Buy Badges button
- 1.2 Enable badges payment for chapters
- Version update preparation

### Day 2 (August 6)
- 1.3 Implement autopay
- 2.1 Fix chapter social cards
- 2.2 Add share button (Web)

### Day 3 (August 7)
- 2.3 Add share button (Mobile)
- 3.1 Redesign unlocked chapter page
- 3.2 Update Get Tokens button

### Day 4 (August 8)
- 4.1 Create Badges page
- 4.2 Merge dashboards
- 4.3 Rename Novels/Manga

### Day 5 (August 9)
- 5.1 Remove Netty from carousel
- 5.2 Redo carousel system
- Testing and bug fixes

### Day 6 (August 10)
- 6.1 Implement notification center
- 6.2 Prepare notification system
- Final testing and deployment

---

## Testing Checklist

### Badge Features
- [ ] Buy Badges button appears in chapter page
- [ ] Badge payment works for advance chapters
- [ ] Autopay successfully unlocks chapters
- [ ] Badge status displays correctly
- [ ] Badge history shows purchases

### Social Sharing
- [ ] Chapter social cards display correctly
- [ ] Share button works on Web
- [ ] Share button works on Mobile
- [ ] Share includes correct metadata
- [ ] Share analytics track correctly

### UI/UX
- [ ] Unlocked chapter page has carousel preview
- [ ] Get Tokens redirects to Ramp
- [ ] Badges page displays owned badges
- [ ] Creator Dashboard is unified
- [ ] Novels renamed to Hoard
- [ ] Manga renamed to Manga Hoard

### Carousel
- [ ] Netty removed from code
- [ ] Carousel shows specific content
- [ ] Carousel is configurable
- [ ] Carousel performs well

### Notifications
- [ ] Notification center displays
- [ ] Novel update notifications work
- [ ] Notification preferences save
- [ ] Push notifications work (if implemented)

---

## Deployment Plan

### Pre-Deployment
- Update version numbers
- Update changelog
- Run full test suite
- Backup database
- Prepare rollback plan

### Deployment
- Deploy Web to Vercel
- Deploy Mobile to dapp-store
- Monitor for errors
- Test production environment

### Post-Deployment
- Monitor analytics
- Check social card validation
- Gather user feedback
- Fix any critical bugs
- Plan v1.1.1 if needed

---

## Risk Assessment

### High Risk
- Badge payment integration (complex logic)
- Social card metadata (platform caching)
- Dashboard merge (user workflow impact)

### Medium Risk
- Autopay implementation (user experience)
- Carousel redesign (performance)
- Notification system (real-time complexity)

### Low Risk
- UI text changes
- Button redirects
- Page renames

---

## Success Metrics

- Badge purchase conversion rate > 15%
- Share button usage > 100 shares/day
- Autopay adoption rate > 20%
- Notification open rate > 30%
- Carousel engagement increase > 25%
- User satisfaction score > 4.0/5.0

---

## Notes
- Prioritize badge features as they drive revenue
- Social sharing is critical for growth
- UI improvements enhance user retention
- Notification system prepares for future content expansion
- Carousel system needs to be performant
