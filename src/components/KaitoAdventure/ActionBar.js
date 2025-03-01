 
import { Container, Row, Col, Dropdown, Button } from "react-bootstrap";
import { FaFlask, FaSkull, FaMap, FaBook, FaStar, FaUsers } from "react-icons/fa";
import styles from "../../styles/Combat.module.css";
import { GiCrossedSwords } from "react-icons/gi"; // Another option

const ActionBar = ({ toggleModal, startCombat, travel, currentTown, towns, player, countdown, queuedCountdown, formatCountdown }) => (
  <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255, 255, 255, 0.9)", padding: "0.5rem 0", borderTop: "1px solid #ccc" }}>
    <Container>
      <Row className="flex-wrap justify-content-center">
        <Col xs="auto" className="mb-2">
          <Dropdown>
            <Dropdown.Toggle variant="primary" size="sm" className={styles.glowButton}><FaFlask /> Craft</Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => toggleModal("craft")}>Craft Items</Dropdown.Item>
              <Dropdown.Item onClick={() => toggleModal("healing")}>Craft Healing Potion</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
        <Col xs="auto" className="mb-2">
          <Button variant="danger" size="sm" onClick={startCombat} className={styles.glowButton}><GiCrossedSwords /> Combat</Button>
        </Col>
        <Col xs="auto" className="mb-2">
          <Dropdown>
            <Dropdown.Toggle variant="success" size="sm" className={styles.glowButton}><FaMap /> Town</Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => toggleModal("market")}>Visit Market</Dropdown.Item>
              <Dropdown.Item onClick={() => toggleModal("gather")}>Gather Ingredient</Dropdown.Item>
              <Dropdown.Header>Travel</Dropdown.Header>
              {towns.map(town => (
                <Dropdown.Item
                  key={town.name}
                  onClick={() => travel(town.name)}
                  disabled={currentTown === town.name}
                >
                  {town.name}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Col>
        <Col xs="auto" className="mb-2">
          <Dropdown>
            <Dropdown.Toggle variant="outline-info" size="sm" className={styles.glowButton}><FaBook /> Quests ({player.quests.length})</Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => toggleModal("quests")}>Quests</Dropdown.Item>
              <Dropdown.Item onClick={() => toggleModal("daily")}>Tasks</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
        <Col xs="auto" className="mb-2">
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" size="sm" className={styles.glowButton}><FaStar /> Stats</Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => toggleModal("stats")}>Stats</Dropdown.Item>
              <Dropdown.Item onClick={() => toggleModal("skills")}>Skills</Dropdown.Item>
              <Dropdown.Item onClick={() => toggleModal("leaderboard")}>Leaderboard</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
        <Col xs="auto" className="mb-2">
          <Dropdown>
            <Dropdown.Toggle variant="outline-dark" size="sm" className={styles.glowButton}><FaUsers /> More</Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => toggleModal("community")}>Community</Dropdown.Item>
              <Dropdown.Item onClick={() => toggleModal("customize")}>Customize</Dropdown.Item>
              <Dropdown.Item onClick={() => toggleModal("events")}>Events</Dropdown.Item>
              <Dropdown.Item onClick={() => toggleModal("guild")}>Guild {player.guild ? `(${player.guild.name})` : ""}</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>
      {countdown !== null && countdown > 0 && <p className="mt-1 text-center" style={{ fontSize: "0.875rem" }}>Gather: {formatCountdown(countdown)}</p>}
      {queuedCountdown !== null && queuedCountdown > 0 && <p className="mt-1 text-center" style={{ fontSize: "0.875rem" }}>Queued: {formatCountdown(queuedCountdown)}</p>}
    </Container>
  </div>
);

export default ActionBar;