 
import { Card, ProgressBar } from "react-bootstrap";
import Image from "next/image";
import { FaShieldAlt, FaCoins, FaStar } from "react-icons/fa";
import styles from "../../styles/Combat.module.css";

const PlayerStats = ({ player, xpProgress }) => (
  <>
    <Card.Body className="p-3">
      <Card.Title as="h1" className="mb-3 text-danger" style={{ fontSize: "clamp(1.5rem, 4vw, 2.5rem)", textShadow: "0 0 5px #ff6200" }}>
        <Image src={`/avatars/${player.avatar}.jpg`} alt="Avatar" width={32} height={32} className={styles.avatarBounce} />
        {player.name} (Level {player.level})
      </Card.Title>
      <Card.Text className={styles.statGlow}>
        <FaShieldAlt /> Health: {player.health}/{player.max_health} | <FaCoins /> Gold: {player.gold} | <FaStar /> XP: {player.xp}
      </Card.Text>
      <ProgressBar now={xpProgress} label={`${Math.round(xpProgress)}%`} variant="success" className={`${styles.xpBar} my-2`} style={{ width: "50%", margin: "0 auto" }} />
    </Card.Body>
  </>
);

export default PlayerStats;