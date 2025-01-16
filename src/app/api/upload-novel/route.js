import { novels } from '../../../novelsData';

export async function POST(req, { params }) {
  try {
    const novelTitle = params.novelTitle;
    const updatedNovel = await req.json();

    // If the novel exists, update it
    if (novels[novelTitle]) {
      novels[novelTitle] = updatedNovel;
      return new Response(JSON.stringify({ success: true, message: 'Novel updated successfully' }), { status: 200 });
    }

    // Otherwise, add a new novel
    novels[updatedNovel.title] = updatedNovel;

    return new Response(JSON.stringify({ success: true, message: 'Novel added successfully' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: 'Failed to update or add novel' }), { status: 500 });
  }
}
