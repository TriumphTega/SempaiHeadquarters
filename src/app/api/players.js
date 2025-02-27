import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Set in .env.local
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    wallet_address, name, level, gold, xp, health, max_health, inventory,
    inventory_slots, rare_items, recipes, equipment, quests, skills, stats,
    last_login, daily_tasks, weekly_tasks, guild, avatar, trait
  } = req.body;

  try {
    const client = await pool.connect();
    const query = `
      INSERT INTO players (
        wallet_address, name, level, gold, xp, health, max_health, inventory,
        inventory_slots, rare_items, recipes, equipment, quests, skills, stats,
        last_login, daily_tasks, weekly_tasks, guild, avatar, trait
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (wallet_address)
      DO UPDATE SET
        name = EXCLUDED.name,
        level = EXCLUDED.level,
        gold = EXCLUDED.gold,
        xp = EXCLUDED.xp,
        health = EXCLUDED.health,
        max_health = EXCLUDED.max_health,
        inventory = EXCLUDED.inventory,
        inventory_slots = EXCLUDED.inventory_slots,
        rare_items = EXCLUDED.rare_items,
        recipes = EXCLUDED.recipes,
        equipment = EXCLUDED.equipment,
        quests = EXCLUDED.quests,
        skills = EXCLUDED.skills,
        stats = EXCLUDED.stats,
        last_login = EXCLUDED.last_login,
        daily_tasks = EXCLUDED.daily_tasks,
        weekly_tasks = EXCLUDED.weekly_tasks,
        guild = EXCLUDED.guild,
        avatar = EXCLUDED.avatar,
        trait = EXCLUDED.trait,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const values = [
      wallet_address, name, level, gold, xp, health, max_health, inventory,
      inventory_slots, rare_items, recipes, equipment, quests, skills, stats,
      last_login, daily_tasks, weekly_tasks, guild, avatar, trait
    ];
    const result = await client.query(query, values);
    client.release();
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Failed to sync player data" });
  }
}