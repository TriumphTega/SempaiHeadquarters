import { NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';

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
            backgroundImage: 'linear-gradient(135deg, #0f0f1e 0%, #1a1a2e 50%, #16213e 100%)',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Decorative glow orbs */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              right: '-100px',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(163, 89, 255, 0.3) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(60px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-150px',
              left: '-150px',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(243, 99, 22, 0.25) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(80px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(50px)',
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
              justifyContent: 'center',
              padding: '48px 64px',
              width: '100%',
              height: '100%',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #a359ff, #f36316)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#fff',
                  }}
                >
                  S
                </div>
                <span
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#ffffff',
                    letterSpacing: '2px',
                  }}
                >
                  Sempai HQ
                </span>
              </div>
              <div
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, rgba(243, 99, 22, 0.2), rgba(255, 98, 0, 0.3))',
                  border: '2px solid rgba(243, 99, 22, 0.6)',
                  borderRadius: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#f36316',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                  }}
                >
                  LEADERBOARD
                </span>
              </div>
            </div>

            {/* User info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '32px',
                marginBottom: '48px',
              }}
            >
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #ffd700, #ffed4e, #ffa500)',
                  borderRadius: '50%',
                  border: '4px solid rgba(255, 215, 0, 0.8)',
                  boxShadow: '0 8px 32px rgba(255, 215, 0, 0.4)',
                }}
              >
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 800,
                    color: '#000',
                  }}
                >
                  #{rank}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                }}
              >
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a359ff, #f36316)',
                    border: '4px solid rgba(163, 89, 255, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#fff',
                  }}
                >
                  {username.charAt(0).toUpperCase()}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '48px',
                      fontWeight: 800,
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #ffffff, #ffd700)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {username}
                  </span>
                  <span
                    style={{
                      fontSize: '20px',
                      color: '#a359ff',
                      fontWeight: 600,
                    }}
                  >
                    {timeFrame}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '48px',
                padding: '32px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '16px',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '16px',
                    color: '#9ca3af',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                  }}
                >
                  Points
                </span>
                <span
                  style={{
                    fontSize: '42px',
                    fontWeight: 800,
                    color: '#f36316',
                    background: 'linear-gradient(135deg, #f36316, #ff6200)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {parseInt(points).toLocaleString()}
                </span>
              </div>
              <div
                style={{
                  width: '2px',
                  height: '60px',
                  background: 'linear-gradient(180deg, transparent, rgba(163, 89, 255, 0.5), transparent)',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '16px',
                    color: '#9ca3af',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                  }}
                >
                  Rank
                </span>
                <span
                  style={{
                    fontSize: '42px',
                    fontWeight: 800,
                    color: '#f36316',
                    background: 'linear-gradient(135deg, #f36316, #ff6200)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  #{rank}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  color: '#ffffff',
                  fontWeight: 600,
                }}
              >
                View the full Top 50 Leaderboard
              </span>
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 24px',
                  background: 'rgba(163, 89, 255, 0.15)',
                  border: '2px solid rgba(163, 89, 255, 0.4)',
                  borderRadius: '8px',
                  display: 'inline-block',
                }}
              >
                <span
                  style={{
                    fontSize: '16px',
                    color: '#a359ff',
                    fontWeight: 600,
                    fontFamily: 'Courier New, monospace',
                  }}
                >
                  sempaihq.com/leaderboard
                </span>
              </div>
            </div>
          </div>

          {/* Border effects */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(163, 89, 255, 0.6) 20%, rgba(243, 99, 22, 0.6) 50%, rgba(255, 215, 0, 0.6) 80%, transparent 100%)',
              zIndex: 20,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(163, 89, 255, 0.6) 20%, rgba(243, 99, 22, 0.6) 50%, rgba(255, 215, 0, 0.6) 80%, transparent 100%)',
              zIndex: 20,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '3px',
              background: 'linear-gradient(180deg, transparent 0%, rgba(163, 89, 255, 0.6) 20%, rgba(243, 99, 22, 0.6) 50%, rgba(255, 215, 0, 0.6) 80%, transparent 100%)',
              zIndex: 20,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '3px',
              background: 'linear-gradient(180deg, transparent 0%, rgba(163, 89, 255, 0.6) 20%, rgba(243, 99, 22, 0.6) 50%, rgba(255, 215, 0, 0.6) 80%, transparent 100%)',
              zIndex: 20,
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating leaderboard card:', error);
    return NextResponse.json({ error: 'Failed to generate card' }, { status: 500 });
  }
}
