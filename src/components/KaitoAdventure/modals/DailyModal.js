 
import { ListGroup, Button } from "react-bootstrap";
import { FaBook } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";

const DailyModal = ({ player, formatCountdown, toggleModal }) => (
  <>
    <p>Daily Login Bonus: 20 Gold (Claimed today)</p>
    <h5>Daily Challenges:</h5>
    <ListGroup variant="flush">
      {player.daily_tasks.map(task => (
        <ListGroup.Item key={task.id}>
          {task.description} - {task.progress}/{task.target}<br />
          Reward: {task.reward.gold ? `${task.reward.gold} Gold` : ""} {task.reward.xp ? `${task.reward.xp} XP` : ""}<br />
          Time Left: {formatCountdown(Math.max(0, Math.floor((task.expires - Date.now()) / 1000)))}
          {task.completed && " (Completed)"}
        </ListGroup.Item>
      ))}
    </ListGroup>
    <h5 className="mt-3">Weekly Challenges:</h5>
    <ListGroup variant="flush">
      {player.weekly_tasks.map(task => (
        <ListGroup.Item key={task.id}>
          {task.description} - {task.progress}/{task.target}<br />
          Reward: {task.reward.gold ? `${task.reward.gold} Gold` : ""} {task.reward.xp ? `${task.reward.xp} XP` : ""}<br />
          Time Left: {formatCountdown(Math.max(0, Math.floor((task.expires - Date.now()) / 1000)))}
          {task.completed && " (Completed)"}
        </ListGroup.Item>
      ))}
    </ListGroup>
    <div className="mt-3">
      <Button variant="secondary" onClick={() => toggleModal("daily")} className={styles.glowButton}>Close</Button>
    </div>
  </>
);

export default DailyModal;