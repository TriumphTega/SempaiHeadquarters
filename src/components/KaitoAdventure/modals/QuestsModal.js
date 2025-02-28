 
import { ListGroup, Button } from "react-bootstrap";
import { FaBook } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";

const QuestsModal = ({ player, currentTown, towns, addQuest, toggleModal }) => {
  const townNPC = towns.find(t => t.name === currentTown).npcs[0];

  return (
    <>
      <ListGroup variant="flush">
        {player.quests.map(quest => (
          <ListGroup.Item key={quest.id}>
            {quest.description} - {quest.progress}/{quest.target}<br />
            Reward: {quest.reward.gold ? `${quest.reward.gold} Gold` : ""} {quest.reward.xp ? `${quest.reward.xp} XP` : ""}
          </ListGroup.Item>
        ))}
      </ListGroup>
      <Button 
        variant="primary" 
        onClick={() => addQuest(townNPC.quest)} 
        className={`${styles.glowButton} mt-3`} 
        disabled={player.quests.length >= 3}
      >
        Accept New Quest
      </Button>
      <div className="mt-3">
        <Button variant="secondary" onClick={() => toggleModal("quests")} className={styles.glowButton}>Close</Button>
      </div>
    </>
  );
};

export default QuestsModal;