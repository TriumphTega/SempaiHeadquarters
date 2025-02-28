 
import { ListGroup, Button } from "react-bootstrap";
import { FaStar } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";

const StatsModal = ({ player, toggleModal }) => (
  <>
    <ListGroup variant="flush">
      <ListGroup.Item>Enemies Defeated: {player.stats.enemiesDefeated}</ListGroup.Item>
      <ListGroup.Item>Potions Crafted: {player.stats.potionsCrafted}</ListGroup.Item>
      <ListGroup.Item>Items Sold: {player.stats.itemsSold}</ListGroup.Item>
      <ListGroup.Item>Gathers Performed: {player.stats.gathers}</ListGroup.Item>
    </ListGroup>
    <div className="mt-3">
      <Button variant="secondary" onClick={() => toggleModal("stats")} className={styles.glowButton}>Close</Button>
    </div>
  </>
);

export default StatsModal;