-- Add author's notes to manga chapters
ALTER TABLE manga_chapters 
ADD COLUMN author_note TEXT;

-- Add author's notes to novel chapters  
ALTER TABLE novel_chapters 
ADD COLUMN author_note TEXT;

-- Add author's notes to manga pages (for individual published pages)
ALTER TABLE manga_pages 
ADD COLUMN author_note TEXT;

-- Add author's notes to novel pages
ALTER TABLE novel_pages 
ADD COLUMN author_note TEXT;
