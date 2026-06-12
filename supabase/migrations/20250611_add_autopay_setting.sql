-- Add autopay setting to users table
ALTER TABLE users 
ADD COLUMN autopay_enabled BOOLEAN DEFAULT FALSE;
