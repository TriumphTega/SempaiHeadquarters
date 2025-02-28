 
import { Modal } from "react-bootstrap";
import styles from "../../styles/Combat.module.css";

const ModalWrapper = ({ show, onHide, title, children, centered }) => (
  <Modal
    show={show}
    onHide={onHide}
    className={styles.gildedModal}
    backdropClassName={styles.lightBackdrop}
    centered={centered}
  >
    <Modal.Header closeButton>
      <Modal.Title>{title}</Modal.Title>
    </Modal.Header>
    <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>{children}</Modal.Body>
  </Modal>
);

export default ModalWrapper;