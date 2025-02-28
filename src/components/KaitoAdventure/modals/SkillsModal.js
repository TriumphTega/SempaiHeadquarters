 
import { Tabs, Tab, ListGroup, Button } from "react-bootstrap";
import { FaStar } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";

const SkillsModal = ({ player, skillTrees, unlockSkill, toggleModal }) => (
  <>
    <Tabs defaultActiveKey="Warrior" id="skill-tabs" className="mb-3">
      {Object.keys(skillTrees).map(tree => (
        <Tab eventKey={tree} title={tree} key={tree}>
          <ListGroup variant="flush">
            {skillTrees[tree].map(skill => {
              const playerSkill = player.skills.find(s => s.name === skill.name);
              return (
                <ListGroup.Item key={skill.name}>
                  {skill.name} - Level {playerSkill ? playerSkill.level : 0} (Uses: {playerSkill ? playerSkill.uses : 0})
                  <br />
                  {skill.effect.damage && `Damage: ${playerSkill ? playerSkill.effect.damage : skill.effect.damage}`}
                  {skill.effect.healBonus && ` Heal Bonus: ${playerSkill ? playerSkill.effect.healBonus : skill.effect.healBonus}`}
                  {skill.effect.costReduction && ` Cost Reduction: ${(playerSkill ? playerSkill.effect.costReduction : skill.effect.costReduction) * 100}%`}
                  {skill.effect.cooldownReduction && ` Cooldown Reduction: ${(playerSkill ? playerSkill.effect.cooldownReduction : skill.effect.cooldownReduction) * 100}%`}
                  {skill.effect.rareChance && ` Rare Chance: ${(playerSkill ? playerSkill.effect.rareChance : skill.effect.rareChance) * 100}%`}
                  {skill.effect.stunChance && ` Stun Chance: ${(playerSkill ? playerSkill.effect.stunChance : skill.effect.stunChance) * 100}%`}
                  {!playerSkill && (
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className={`${styles.glowButton} ml-2`} 
                      onClick={() => unlockSkill(skill.name, tree)}
                    >
                      Unlock ({skill.cost.gold} Gold)
                    </Button>
                  )}
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        </Tab>
      ))}
    </Tabs>
    <div className="mt-3">
      <Button variant="secondary" onClick={() => toggleModal("skills")} className={styles.glowButton}>Close</Button>
    </div>
  </>
);

export default SkillsModal;