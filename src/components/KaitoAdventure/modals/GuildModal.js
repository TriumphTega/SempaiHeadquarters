 
import { Button } from "react-bootstrap";
import { FaUsers } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";

const GuildModal = ({ player, joinGuild, contributeToGuild, toggleModal }) => (
  <>
    {player.guild ? (
      <>
        <p>Member of: {player.guild.name}</p>
        <p>Goal Progress: {player.guild.progress}/{player.guild.target} Gold</p>
        <Button variant="primary" onClick={contributeToGuild} className={styles.glowButton}>Contribute 10 Gold</Button>
      </>
    ) : (
      <>
        <p>Join a guild to contribute to collective goals!</p>
        <Button variant="outline-primary" onClick={() => joinGuild("Dragon Clan")} className={styles.glowButton}>Join Dragon Clan</Button>
        <Button variant="outline-primary" onClick={() => joinGuild("Mist Guardians")} className={`${styles.glowButton} ml-2`}>Join Mist Guardians</Button>
      </>
    )}
    <div className="mt-3">
      <Button variant="secondary" onClick={() => toggleModal("guild")} className={styles.glowButton}>Close</Button>
    </div>
  </>
);

export default GuildModal;