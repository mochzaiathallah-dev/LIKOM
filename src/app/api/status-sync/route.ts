import { NextResponse } from 'next/server';

// In-memory status store for post IDs
// Key: postId (e.g. "DbvXESRceS"), Value: { isLiked: boolean, isCommented: boolean, updatedAt: number }
const statusStore: Record<string, { isLiked: boolean; isCommented: boolean; updatedAt: number }> = {};

function setCors(res: Response) {
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}

export async function OPTIONS() {
  return setCors(new Response(null, { status: 204 }));
}

// GET: Retrieve all statuses for the dashboard
export async function GET() {
  return setCors(NextResponse.json({ statuses: statusStore }));
}

// POST: Update status from Chrome Extension
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { postId, isLiked, isCommented } = body;

    if (!postId) {
      return setCors(NextResponse.json({ error: 'postId is required' }, { status: 400 }));
    }

    const current = statusStore[postId] || { isLiked: false, isCommented: false, updatedAt: Date.now() };

    statusStore[postId] = {
      isLiked: typeof isLiked === 'boolean' ? isLiked : current.isLiked,
      isCommented: typeof isCommented === 'boolean' ? isCommented : current.isCommented,
      updatedAt: Date.now(),
    };

    console.log(`[STATUS SYNC] Updated ${postId} -> Liked: ${statusStore[postId].isLiked}, Commented: ${statusStore[postId].isCommented}`);

    return setCors(NextResponse.json({ success: true, status: statusStore[postId] }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return setCors(NextResponse.json({ error: msg }, { status: 500 }));
  }
}
