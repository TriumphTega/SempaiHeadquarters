 
import { Button } from "react-bootstrap";
import styles from "../../../styles/Combat.module.css";

const EventsModal = ({ currentEvent, eventTimer, formatCountdown, toggleModal }) => (
  <>
    {currentEvent ? (
      <p>{currentEvent.description} (Time Left: {formatCountdown(Math.max(0, Math.floor((eventTimer - Date.now()) / 1000)))})</p>
    ) : (
      <p>No active events right now.</p>
    )}
    <div className="mt-3">
      <Button variant="secondary" onClick={() => toggleModal("events")} className={styles.glowButton}>Close</Button>
    </div>
  </>
);

export default EventsModal;