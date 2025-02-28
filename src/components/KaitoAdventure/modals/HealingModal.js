 
import { Button } from "react-bootstrap";
import { FaFlask } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";

const HealingModal = ({ toggleModal }) => (
  <>
    <p>You can craft healing potions for sale in the market in Craft Items, but battle healing potions can only be crafted in combat.</p>
    <div className="mt-3">
      <Button variant="secondary" onClick={() => toggleModal("healing")} className={styles.glowButton}>Close</Button>
    </div>
  </>
);

export default HealingModal;