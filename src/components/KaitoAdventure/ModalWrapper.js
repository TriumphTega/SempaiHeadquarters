 
import { Modal } from "react-bootstrap";
import styles from "../../styles/KaitoAdventure.module.css";

const ModalWrapper = ({ show, onHide, title, children, centered, fullscreen }) => (
  <Modal
    show={show}
    onHide={onHide}
    className={fullscreen ? styles.kaModalFullscreen : styles.kaModal}
    centered={centered}
  >
    <Modal.Header closeButton>
      <Modal.Title>{title}</Modal.Title>
    </Modal.Header>
    <Modal.Body>{children}</Modal.Body>
  </Modal>
);

export default ModalWrapper;