import { Button } from "react-bootstrap";
import styles from "../../../styles/Combat.module.css";

const GuideModal = ({ toggleModal }) => (
  <>
    <h5>Overview</h5>
    <p>Welcome to <em>Kaito's Adventure</em>, a browser-based RPG where you play as Kaito Brewmaster. Start with 5 gold, 100 health, and a small inventory (Water x2, Herbs x1) in Sakura Village. Explore, craft, fight, and rise to the top!</p>
    
    <h5>Core Mechanics</h5>
    <ol>
      <li><strong>Towns & Travel</strong>: Explore Sakura Village, Iron Port, Mist Hollow. Travel via "Town" dropdown (+2 XP).</li>
      <li><strong>Gathering</strong>: Single (free, cooldown) or Queue (1 gold each, 3-min cooldown). Weather boosts: Rainy (Water), Foggy (Mist Essence).</li>
      <li><strong>Crafting</strong>: Make sellable items (e.g., Herbal Tea), weapons, armor (level 10+), healing potions. 80% success (+10% Craftsman trait).</li>
      <li><strong>Combat</strong>: Fight Bandits, Ninjas, Golems. Craft potions in-combat to heal (even at 0 health!). Earn gold, XP, drops.</li>
      <li><strong>Market</strong>: Sell items/potions, buy ingredients. Prices vary by town demand.</li>
      <li><strong>Quests & Tasks</strong>: NPC quests (max 3), daily (e.g., 2 enemies), weekly (e.g., 10 Sakes).</li>
      <li><strong>Progression</strong>: 150 XP/level (+10 HP), unlock skills, upgrade inventory (+5 slots, 50 gold).</li>
      <li><strong>Guilds</strong>: Join, contribute 10 gold to 100-gold goals (+50 gold).</li>
      <li><strong>Events</strong>: Festivals (boost demand), raids (combat), storms (reduce gathering).</li>
    </ol>
    
    <h5>Objectives</h5>
    <p><strong>Short-Term</strong>: Gather, craft, sell, complete quests. <strong>Long-Term</strong>: Level up, unlock skills/armor, top the leaderboard.</p>
    
    <h5>Tips</h5>
    <ul>
      <li>Start in Sakura: Craft Herbal Tea, sell for gold.</li>
      <li>0 Health? Enter combat, craft a potion fast (keep Water/Herbs).</li>
      <li>Get "Efficient Brewing" (cheaper crafts), "Quick Gather" (faster gathers).</li>
      <li>Upgrade inventory early (50 gold).</li>
      <li>Sell Strong Healing Potions in Mist Hollow (1.2x demand).</li>
    </ul>
    <div className="mt-3">
      <Button variant="primary" onClick={() => toggleModal("guide")} className={styles.glowButton}>Got it!</Button>
    </div>
  </>
);

export default GuideModal;