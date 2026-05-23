import LeaderboardClient from "./LeaderboardClient";

// Generate metadata for Twitter card
export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const username = params.username || 'Anonymous';
  const rank = params.rank || '1';
  const points = params.points || '0';
  const timeFrame = params.timeFrame || 'All Time';
  
  const cardUrl = `https://www.sempaihq.com/api/leaderboard/card?username=${encodeURIComponent(username)}&rank=${rank}&points=${points}&timeFrame=${encodeURIComponent(timeFrame)}`;
  
  console.log('[Leaderboard Metadata] Generating metadata:', { username, rank, points, timeFrame, cardUrl });
  
  const metadata = {
    title: `${username} - Rank #${rank} on Sempai HQ Leaderboard`,
    description: `See ${username}'s achievement on the Sempai HQ Leaderboard. Ranked #${rank} with ${parseInt(points).toLocaleString()} points in ${timeFrame}.`,
    openGraph: {
      title: `${username} - Rank #${rank} on Sempai HQ Leaderboard`,
      description: `See ${username}'s achievement on the Sempai HQ Leaderboard. Ranked #${rank} with ${parseInt(points).toLocaleString()} points in ${timeFrame}.`,
      images: [
        {
          url: cardUrl,
          width: 1200,
          height: 630,
          alt: `${username} leaderboard card`,
        }
      ],
      url: `https://www.sempaihq.com/leaderboard?username=${encodeURIComponent(username)}&rank=${rank}&points=${points}&timeFrame=${encodeURIComponent(timeFrame)}`,
      type: 'website',
      siteName: 'Sempai HQ',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${username} - Rank #${rank} on Sempai HQ Leaderboard`,
      description: `See ${username}'s achievement on the Sempai HQ Leaderboard. Ranked #${rank} with ${parseInt(points).toLocaleString()} points in ${timeFrame}.`,
      images: [
        {
          url: cardUrl,
          width: 1200,
          height: 630,
          alt: `${username} leaderboard card`,
        }
      ],
      site: '@HomeforSempai',
    },
    other: {
      'twitter:site': '@HomeforSempai',
    },
  };
  
  console.log('[Leaderboard Metadata] Generated metadata:', metadata);
  return metadata;
}

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
