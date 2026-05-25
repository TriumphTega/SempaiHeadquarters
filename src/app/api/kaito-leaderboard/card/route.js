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
            backgroundColor: '#1a1a2e',
            backgroundImage: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            fontFamily: 'Arial, sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Military campaign background elements */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              right: '-100px',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-150px',
              left: '-150px',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(139, 69, 19, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />

          {/* Military border decoration */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              bottom: '20px',
              border: '3px solid rgba(255, 215, 0, 0.3)',
              borderRadius: '10px',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '30px',
              left: '30px',
              right: '30px',
              bottom: '30px',
              border: '1px solid rgba(139, 69, 19, 0.4)',
              borderRadius: '8px',
              pointerEvents: 'none',
            }}
          />

          {/* Content */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '30px',
              padding: '40px',
            }}
          >
            {/* League Title */}
            <div
              style={{
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#ffd700',
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  marginBottom: '10px',
                }}
              >
                ⚔️ Kaito Brewmaster League ⚔️
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: '#cd853f',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}
              >
                Military Campaign
              </div>
            </div>

            {/* Rank */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '20px',
              }}
            >
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ffd700, #ffed4e, #ffa500)',
                  border: '6px solid rgba(139, 69, 19, 0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 40px rgba(255, 215, 0, 0.5)',
                }}
              >
                <span
                  style={{
                    fontSize: '48px',
                    fontWeight: 900,
                    color: '#1a1a2e',
                  }}
                >
                  #{rank}
                </span>
              </div>
            </div>

            {/* User Info */}
            <div
              style={{
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '42px',
                  fontWeight: 800,
                  color: '#ffffff',
                  marginBottom: '10px',
                }}
              >
                {username}
              </div>
              <div
                style={{
                  fontSize: '28px',
                  color: '#cd853f',
                  fontWeight: 600,
                }}
              >
                {parseInt(points).toLocaleString()} Points
              </div>
            </div>

            {/* Time Frame */}
            <div
              style={{
                padding: '12px 24px',
                background: 'rgba(139, 69, 19, 0.2)',
                border: '2px solid rgba(205, 133, 63, 0.4)',
                borderRadius: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '20px',
                  color: '#cd853f',
                  fontWeight: 600,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}
              >
                {timeFrame}
              </span>
            </div>

            {/* Footer */}
            <div
              style={{
                marginTop: '20px',
                fontSize: '18px',
                color: '#ffd700',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              sempaihq.com/kaito-leaderboard
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
    console.error('Error generating Kaito leaderboard card:', error);
    return new Response('Failed to generate card', { status: 500 });
  }
}
