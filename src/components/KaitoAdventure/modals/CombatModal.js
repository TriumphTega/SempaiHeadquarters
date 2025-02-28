 
import { Card, Row, Col, Button, ListGroup, Alert, Form } from "react-bootstrap";
import Image from "next/image";
import { FaRunning } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";
import { GiCrossedSwords } from "react-icons/gi"; // Another option

const CombatModal = ({ combatState, combatResult, player, attackEnemy, craftPotionInCombat, toggleModal }) => (
  <Card className="border-0">
    <Card.Header className="bg-danger text-center text-white"><h3>Combat Arena</h3></Card.Header>
    <Card.Body className={styles.combatBody}>
      {combatState && (
        <Row>
          <Col md={5} className="text-center">
            <h4>Kaito</h4>
            <div className={`${styles.healthBar} mb-3 ${combatState.playerHealth < player.max_health / 3 ? styles.healthDanger : ""}`}>
              <div className={styles.healthFill} style={{ width: `${(combatState.playerHealth / player.max_health) * 100}%` }} />
            </div>
            <p>Health: {combatState.playerHealth}/{player.max_health}</p>
            <div className={`${combatState.isAttacking ? styles.attacking : ''} ${styles.character}`}>
              <Image src="/kaito.png" alt="Kaito" width={100} height={100} className={styles.characterImage} onError={(e) => e.target.src = "/avatars/default.jpg"} />
            </div>
          </Col>
          <Col md={2} className="align-items-center d-flex justify-content-center"><h2 className={styles.vsGlow}>VS</h2></Col>
          <Col md={5} className="text-center">
            <h4>{combatState.enemy.name}</h4>
            <div className={`${styles.healthBar} mb-3 ${combatState.enemyHealth < combatState.enemy.health / 3 ? styles.healthDanger : ""}`}>
              <div className={styles.healthFill} style={{ width: `${(combatState.enemyHealth / combatState.enemy.health) * 100}%` }} />
            </div>
            <p>Health: {combatState.enemyHealth}/{combatState.enemy.health}</p>
            <div className={`${combatState.isAttacking ? styles.enemyHit : ""} ${styles.character}`}>
              <Image src={`/enemies/${combatState.enemy.name.toLowerCase().replace(" ", "-")}.png`} alt={combatState.enemy.name} width={100} height={100} className={styles.characterImage} onError={(e) => e.target.src = "/enemies/default.png"} />
            </div>
          </Col>
        </Row>
      )}
      <div className="mt-3 text-center">
        <Button variant="danger" onClick={() => attackEnemy("Basic Attack")} disabled={!combatState || combatState?.isAttacking || combatResult} className={`${styles.glowButton} m-1`}>
          <GiCrossedSwords className={styles.iconPulse} /> Attack
        </Button>
        <Form inline className="d-inline-block m-1">
          <Form.Select
            onChange={(e) => attackEnemy(e.target.value)}
            disabled={!combatState || combatState?.isAttacking || combatResult}
            style={{ width: "auto", display: "inline-block" }}
          >
            <option value="">Select Skill</option>
            {player.skills
              .filter(s => s.level > 0 && (s.tree === "Warrior" || s.effect.damage || s.effect.stunChance))
              .map(skill => (
                <option key={skill.name} value={skill.name}>
                  {skill.name} (Lv {skill.level})
                </option>
              ))}
          </Form.Select>
        </Form>
        <Form inline className="d-inline-block m-1">
          <Form.Select
            onChange={(e) => craftPotionInCombat(e.target.value)}
            disabled={!combatState || combatState?.isAttacking || combatResult}
            style={{ width: "auto", display: "inline-block" }}
          >
            <option value="">Craft Potion</option>
            {player.recipes
              .filter(r => r.type === "heal")
              .map(recipe => (
                <option key={recipe.name} value={recipe.name}>
                  {recipe.name} ({recipe.ingredients.join(", ")})
                </option>
              ))}
          </Form.Select>
        </Form>
      </div>
      {combatState && (
        <ListGroup className="mt-3" style={{ maxHeight: "20vh", overflowY: "auto", background: "rgba(0, 0, 0, 0.1)" }}>
          {combatState.log.map((entry, idx) => <ListGroup.Item key={idx} className={styles.logEntry}>{entry}</ListGroup.Item>)}
        </ListGroup>
      )}
      {combatResult && (
        <Alert variant={combatResult.type === "win" ? "success" : "danger"} className={`${styles.combatResult} ${styles.resultPop}`}>
          {combatResult.message}
        </Alert>
      )}
      <div className={styles.particleContainer}></div>
    </Card.Body>
    <Card.Footer className="text-center">
      <Button variant="secondary" onClick={() => toggleModal("combat")} disabled={combatResult} className={styles.glowButton}><FaRunning /> Flee</Button>
    </Card.Footer>
  </Card>
);

export default CombatModal;