import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username') || 'Anonymous';
    const rank = searchParams.get('rank') || '1';
    const points = searchParams.get('points') || '0';
    const timeFrame = searchParams.get('timeFrame') || 'All Time';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f0f1e',
            backgroundImage: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 100%)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <div
              style={{
                fontSize: '80px',
                fontWeight: 'bold',
                color: '#ffd700',
              }}
            >
              #{rank}
            </div>
            <div
              style={{
                fontSize: '40px',
                fontWeight: 'bold',
                color: '#ffffff',
              }}
            >
              {username}
            </div>
            <div
              style={{
                fontSize: '32px',
                color: '#f36316',
              }}
            >
              {parseInt(points).toLocaleString()} points
            </div>
            <div
              style={{
                fontSize: '24px',
                color: '#a359ff',
              }}
            >
              {timeFrame}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating leaderboard card:', error);
    return new Response('Failed to generate card', { status: 500 });
  }
}
