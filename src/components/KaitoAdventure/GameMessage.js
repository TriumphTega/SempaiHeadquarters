 
import styles from "../../styles/KaitoAdventure.module.css";

const GameMessage = ({ message }) => (
  <div className={`${styles.kaMessage} ${styles.kaScrollText}`}>{message}</div>
);

export default GameMessage;