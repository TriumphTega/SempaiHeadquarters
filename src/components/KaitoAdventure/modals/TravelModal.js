 
import { Modal } from "react-bootstrap";
import Image from "next/image";
import styles from "../../../styles/Combat.module.css";

const TravelModal = ({ show, travelDestination }) => (
  <Modal show={show} backdrop="static" keyboard={false} className={styles.travelModal} backdropClassName={styles.lightBackdrop}>
    <Modal.Body className={styles.travelBody} style={{ maxHeight: "70vh", overflowY: "auto" }}>
      <div className={styles.travelContent}>
        <Image src="/travel-chibi.jpg" alt="Traveling Chibi" width={100} height={100} className={styles.travelChibi} />
        <p>Traveling to {travelDestination}...</p>
      </div>
    </Modal.Body>
  </Modal>
);

export default TravelModal;