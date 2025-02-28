 
import { Button } from "react-bootstrap";
import { FaUsers } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";

const CommunityModal = ({ mockCommunityEvent, toggleModal }) => {
  const event = mockCommunityEvent();

  return (
    <>
      <p>{event.description}</p>
      <Button variant="primary" onClick={event.action} className={styles.glowButton}><FaUsers /> Perform Action</Button>
      <div className="mt-3">
        <Button variant="secondary" onClick={() => toggleModal("community")} className={styles.glowButton}>Close</Button>
      </div>
    </>
  );
};

export default CommunityModal;