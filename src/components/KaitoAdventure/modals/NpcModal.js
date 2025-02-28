 
import { Button } from "react-bootstrap";
import styles from "../../../styles/Combat.module.css";

const NpcModal = ({ selectedNPC, player, addQuest, toggleModal }) => (
  <>
    <p>{selectedNPC?.dialogue}</p>
    {selectedNPC?.quest && !player.quests.some(q => q.id === selectedNPC.quest.id) && (
      <Button variant="primary" onClick={() => addQuest(selectedNPC.quest)} className={styles.glowButton}>Accept Quest</Button>
    )}
    <div className="mt-3">
      <Button variant="secondary" onClick={() => toggleModal("npc")} className={styles.glowButton}>Close</Button>
    </div>
  </>
);

export default NpcModal;