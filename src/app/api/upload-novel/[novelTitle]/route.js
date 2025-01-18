import { novels } from '../../novelsData'; // Adjust the path to where your novels data is stored

export async function handler(req, res) {
  const { novelTitle } = req.query; // Extract novelTitle from the request URL

  // Find the novel based on the title or ID
  const novel = novels.find((novel) => novel.title === novelTitle);

  if (!novel) {
    // If no novel is found, return an error response
    return res.status(404).json({ error: 'Novel not found' });
  }

  if (req.method === 'POST') {
    // Handle the POST request to upload/update the novel
    const { title, image, chapters } = req.body;

    // Update the novel's information (you can also add validation here)
    novel.title = title;
    novel.image = image;
    novel.chapters = chapters;

    return res.status(200).json({ success: true, novel });
  }

  // Handle other HTTP methods (e.g., GET)
  return res.status(405).json({ error: 'Method Not Allowed' });
}
