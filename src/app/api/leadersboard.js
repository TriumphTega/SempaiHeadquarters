import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    const query = `
      SELECT wallet_address, name, level, gold
      FROM players
      ORDER BY level DESC, gold DESC
      LIMIT 10;
    `;
    const result = await client.query(query);
    client.release();
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
}