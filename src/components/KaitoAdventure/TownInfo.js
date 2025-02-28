 
import { Card } from "react-bootstrap";
import styles from "../../styles/Combat.module.css";

const TownInfo = ({ currentTown, townLevels, weather, currentEvent, eventTimer, formatCountdown }) => (
  <>
    <Card.Text>Current Town: {currentTown} (Level {townLevels[currentTown]}) | Weather: {weather.type}</Card.Text>
    {currentEvent && (
      <Card.Text className="text-warning">
        {currentEvent.description} {eventTimer ? `(${formatCountdown(Math.max(0, Math.floor((eventTimer - Date.now()) / 1000)))})` : ""}
      </Card.Text>
    )}
  </>
);

export default TownInfo;