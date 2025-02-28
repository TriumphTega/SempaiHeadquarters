 
import { ListGroup, Button } from "react-bootstrap";
import { FaStar } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";

const LeaderboardModal = ({ connected, leaderboardData, toggleModal }) => (
  <>
    {!connected ? (
      <p>Please connect your wallet to view the leaderboard.</p>
    ) : leaderboardData.length === 0 ? (
      <p>Loading leaderboard...</p>
    ) : (
      <ListGroup variant="flush">
        {leaderboardData.map((entry, index) => (
          <ListGroup.Item key={entry.wallet_address}>
            {index + 1}. {entry.name} - Level {entry.level} - {entry.gold} Gold
            <br />
            <small>{entry.wallet_address.slice(0, 6)}...{entry.wallet_address.slice(-4)}</small>
          </ListGroup.Item>
        ))}
      </ListGroup>
    )}
    <div className="mt-3">
      <Button variant="secondary" onClick={() => toggleModal("leaderboard")} className={styles.glowButton}>Close</Button>
    </div>
  </>
);

export default LeaderboardModal;