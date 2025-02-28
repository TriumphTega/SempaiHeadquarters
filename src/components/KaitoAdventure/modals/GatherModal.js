 
import { Card, Button } from "react-bootstrap";
import { FaMap } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";

const GatherModal = ({ currentTown, towns, player, gatherSingle, queueGathers, weather, countdown, queuedCountdown, toggleModal }) => {
  const town = towns.find(t => t.name === currentTown);

  return (
    <>
      <Card className="mb-3">
        <Card.Body>
          <Card.Title>Normal Gather</Card.Title>
          <Card.Text>Gather one ingredient for free (cooldown varies by town). {weather.gatherBonus ? `Bonus: ${weather.gatherBonus.chance * 100}% chance for ${weather.gatherBonus.ingredient}` : ""}</Card.Text>
          <Button variant="warning" onClick={gatherSingle} disabled={countdown > 0} className={styles.glowButton}><FaMap /> Gather Now</Button>
        </Card.Body>
      </Card>
      <Card>
        <Card.Body>
          <Card.Title>Queue Gathers for Gold</Card.Title>
          <Card.Text>Pay 1 gold per gather, up to 5 (3-minute global cooldown).</Card.Text>
          <div>
            {[1, 2, 3, 4, 5].map(count => (
              <Button
                key={count}
                variant="outline-warning"
                className={`${styles.glowButton} m-1`}
                onClick={() => queueGathers(count)}
                disabled={player.gold < count || queuedCountdown > 0}
              >
                {count} ({count} gold)
              </Button>
            ))}
          </div>
        </Card.Body>
      </Card>
      <div className="mt-3">
        <Button variant="secondary" onClick={() => toggleModal("gather")} className={styles.glowButton}>Close</Button>
      </div>
    </>
  );
};

export default GatherModal;