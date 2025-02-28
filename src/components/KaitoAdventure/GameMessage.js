 
import { Card } from "react-bootstrap";
import styles from "../../styles/Combat.module.css";

const GameMessage = ({ message }) => (
  <Card.Text className="mb-4 text-muted">{message}</Card.Text>
);

export default GameMessage;