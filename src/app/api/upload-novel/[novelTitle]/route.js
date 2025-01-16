import { novels } from '../../../../novelsData'; // Assuming novelsData.js is a static file

// Handle POST request for adding a new chapter to an existing novel
export async function POST(req, { params }) {
  const { id } = params; // Get novel ID from URL
  const { chapterTitle, chapterContent } = await req.json();

  // Find the novel by ID
  const novel = novels[id - 1]; // Adjust based on index (id is 1-based)
  
  if (!nov
