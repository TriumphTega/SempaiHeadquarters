 
import { Form, Button } from "react-bootstrap";
import styles from "../../../styles/Combat.module.css";

const CustomizeModal = ({ player, customizeCharacter, toggleModal }) => (
  <>
    <Form>
      <Form.Group>
        <Form.Label>Name</Form.Label>
        <Form.Control type="text" defaultValue={player.name} id="customName" />
      </Form.Group>
      <Form.Group>
        <Form.Label>Avatar</Form.Label>
        <Form.Control as="select" defaultValue={player.avatar} id="customAvatar">
          <option value="default">Default</option>
          <option value="warrior">Warrior</option>
          <option value="craftsman">Craftsman</option>
        </Form.Control>
      </Form.Group>
      <Form.Group>
        <Form.Label>Trait</Form.Label>
        <Form.Control as="select" defaultValue={player.trait} id="customTrait">
          <option value={null}>None</option>
          <option value="warrior">Warrior (+5 Combat Damage)</option>
          <option value="craftsman">Craftsman (+10% Craft Success)</option>
        </Form.Control>
      </Form.Group>
      <Button 
        variant="primary" 
        onClick={() => customizeCharacter(
          document.getElementById("customName").value,
          document.getElementById("customAvatar").value,
          document.getElementById("customTrait").value
        )} 
        className={styles.glowButton}
      >
        Save
      </Button>
    </Form>
    <div className="mt-3">
      <Button variant="secondary" onClick={() => toggleModal("customize")} className={styles.glowButton}>Close</Button>
    </div>
  </>
);

export default CustomizeModal;