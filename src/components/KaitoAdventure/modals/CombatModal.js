 
import { Card, Row, Col, Button, ListGroup, Alert, Form } from "react-bootstrap";
import { useState, useEffect, useRef, useCallback } from "react";
import { FaRunning, FaShieldAlt, FaHeart, FaBolt, FaFire, FaSnowflake, FaStar, FaCoins } from "react-icons/fa";
import { GiCrossedSwords, GiPotion, GiMagicSwirl } from "react-icons/gi";
import styles from "../../../styles/Combat.module.css";

// Sprite configuration - maps characters and animations to paths and frame counts
const SPRITE_CONFIG = {
  kaito: {
    idle: { path: "/sprites/kaito/idle/idle_left_", frames: 6, loop: true, speed: 180 },
    basic_attack: { path: "/sprites/kaito/basic_attack/basic_attack_left_", frames: 9, loop: false, speed: 80 },
    skill_attack: { path: "/sprites/kaito/skill_attack/skill_attack_right_", frames: 7, loop: false, speed: 90 },
    healing: { path: "/sprites/kaito/healing/healing_right_", frames: 6, loop: false, speed: 120 },
    hit: { path: "/sprites/kaito/hit/hit_right_", frames: 4, loop: false, speed: 100 },
    defeat: { path: "/sprites/kaito/defeat/defeat_right_", frames: 4, loop: false, speed: 150 },
  },
  bandit: {
    idle: { path: "/sprites/enemies/bandit/idle_left_", frames: 4, loop: true, speed: 200 },
    attack: { path: "/sprites/enemies/bandit/attack_left_", frames: 6, loop: false, speed: 90 },
    hit: { path: "/sprites/enemies/bandit/hit_left_", frames: 3, loop: false, speed: 100 },
    defeat: { path: "/sprites/enemies/bandit/defeat_left_", frames: 4, loop: false, speed: 150 },
  },
  golem: {
    idle: { path: "/sprites/enemies/golem/idle_left_", frames: 3, loop: true, speed: 250 },
    attack: { path: "/sprites/enemies/golem/attack_left_", frames: 8, loop: false, speed: 80 },
    hit: { path: "/sprites/enemies/golem/hit_left_", frames: 2, loop: false, speed: 120 },
    defeat: { path: "/sprites/enemies/golem/defeat_left_", frames: 4, loop: false, speed: 150 },
  },
  "shadow-ninja": {
    idle: { path: "/sprites/enemies/shadow-ninja/idle_left_", frames: 4, loop: true, speed: 180 },
    attack: { path: "/sprites/enemies/shadow-ninja/attack_left_", frames: 6, loop: false, speed: 85 },
    hit: { path: "/sprites/enemies/shadow-ninja/hit_left_", frames: 3, loop: false, speed: 100 },
    defeat: { path: "/sprites/enemies/shadow-ninja/defeat_left_", frames: 3, loop: false, speed: 150 },
  },
};

// Effect sprite configuration
const EFFECT_CONFIG = {
  hit_spark: { path: "/sprites/effects/hit_spark/hit_spark_", frames: 3, speed: 80 },
  slash_trail: { path: "/sprites/effects/slash_trail/slash_trail_", frames: 4, speed: 70 },
  heal_aura: { path: "/sprites/effects/heal_aura/heal_aura_", frames: 6, speed: 100 },
  skill_glow: { path: "/sprites/effects/skill_glow/skill_glow_", frames: 8, speed: 80 },
};

// Supabase fallback URL
const SUPABASE_URL = "https://xqeimsncmnqsiowftdmz.supabase.co/storage/v1/object/public/YOUR_REAL_BUCKET_ID";

// Get enemy key from name
const getEnemyKey = (name) => {
  if (!name) return "bandit";
  const key = name.toLowerCase().replace(" ", "-");
  return SPRITE_CONFIG[key] ? key : "bandit";
};

// Animation Sprite Component
const AnimationSprite = ({ character, animation = "idle", size = 150 }) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [imgSrc, setImgSrc] = useState("");
  const [imgError, setImgError] = useState(false);
  const animRef = useRef(null);
  const charKey = character === "kaito" ? "kaito" : getEnemyKey(character);
  const animKey = animation || "idle";

  // Get config for this character+animation
  const config = SPRITE_CONFIG[charKey]?.[animKey] || SPRITE_CONFIG[charKey]?.idle;

  useEffect(() => {
    if (!config) return;
    setCurrentFrame(0);
    setImgError(false);

    if (config.loop) {
      // Looping animation (idle)
      animRef.current = setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % config.frames);
      }, config.speed);
    } else {
      // One-shot animation (attack, hit, etc.)
      let frame = 0;
      animRef.current = setInterval(() => {
        frame++;
        if (frame >= config.frames) {
          clearInterval(animRef.current);
          return;
        }
        setCurrentFrame(frame);
      }, config.speed);
    }

    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [animation, charKey]);

  // Build sprite path
  useEffect(() => {
    if (!config || imgError) return;
    const frameNum = String(currentFrame + 1).padStart(3, '0');
    setImgSrc(`${config.path}${frameNum}.png`);
  }, [currentFrame, config, imgError]);

  // Fallback handler
  const handleError = () => {
    if (imgError) return;
    setImgError(true);
    if (character === "kaito") {
      setImgSrc(`${SUPABASE_URL}/kaito.jpg`);
    } else {
      const enemyKey = getEnemyKey(character);
      setImgSrc(`${SUPABASE_URL}/enemies/${enemyKey}.png`);
    }
  };

  if (!imgSrc && !imgError) {
    const frameNum = "001";
    setImgSrc(`${config?.path || ""}${frameNum}.png`);
  }

  return (
    <div className={styles.characterSprite}>
      <img 
        src={imgSrc} 
        alt={`${character} ${animKey}`}
        width={size}
        height={size}
        className={styles.characterImage}
        onError={handleError}
      />
    </div>
  );
};

// Effect Sprite Component (hit sparks, slash trails, etc.)
const EffectSprite = ({ effect, x = "50%", y = "50%" }) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [visible, setVisible] = useState(true);
  const config = EFFECT_CONFIG[effect];

  useEffect(() => {
    if (!config) return;
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      if (frame >= config.frames) {
        clearInterval(interval);
        setVisible(false);
        return;
      }
      setCurrentFrame(frame);
    }, config.speed);

    return () => clearInterval(interval);
  }, [effect, config]);

  if (!visible || !config) return null;

  const frameNum = String(currentFrame + 1).padStart(3, '0');

  return (
    <div className={styles.effectSprite} style={{ left: x, top: y }}>
      <img 
        src={`${config.path}${frameNum}.png`} 
        alt={effect}
        width={80}
        height={80}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    </div>
  );
};

// Floating Damage Number Component
const DamageNumber = ({ damage, type = "damage", x, y }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const getDamageClass = () => {
    switch (type) {
      case "damage": return styles.damageNumber;
      case "heal": return styles.healNumber;
      case "crit": return styles.critNumber;
      default: return styles.damageNumber;
    }
  };

  return (
    <div 
      className={`${styles.floatingNumber} ${getDamageClass()}`}
      style={{ left: x, top: y }}
    >
      {type === "heal" ? "+" : "-"}{damage}
    </div>
  );
};

// Animation duration helper
const getAnimDuration = (charKey, animKey) => {
  const config = SPRITE_CONFIG[charKey]?.[animKey];
  if (!config) return 800;
  return config.frames * config.speed;
};

const CombatModal = ({ combatState, combatResult, player, attackEnemy, craftPotionInCombat, toggleModal }) => {
  const [currentTurn, setCurrentTurn] = useState("player");
  const [damageNumbers, setDamageNumbers] = useState([]);
  const [effects, setEffects] = useState([]);
  const [screenShake, setScreenShake] = useState(false);
  const [playerAnimation, setPlayerAnimation] = useState("idle");
  const [enemyAnimation, setEnemyAnimation] = useState("idle");
  const [isPlayerActing, setIsPlayerActing] = useState(false);
  const [isEnemyActing, setIsEnemyActing] = useState(false);
  const enemyTurnTimer = useRef(null);

  // Add damage number with auto-remove
  const addDamageNumber = useCallback((damage, type, x, y) => {
    const id = Date.now() + Math.random();
    setDamageNumbers(prev => [...prev, { id, damage, type, x, y }]);
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== id));
    }, 1500);
  }, []);

  // Add effect sprite
  const addEffect = useCallback((effect, x, y) => {
    const id = Date.now() + Math.random();
    setEffects(prev => [...prev, { id, effect, x, y }]);
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== id));
    }, 1000);
  }, []);

  // Trigger screen shake
  const shakeScreen = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 300);
  }, []);

  // Enemy AI - attacks after player turn with professional timing
  useEffect(() => {
    if (currentTurn !== "enemy" || !combatState || combatResult || isEnemyActing) return;

    // Random delay 800-1500ms for natural feel
    const delay = 800 + Math.random() * 700;

    enemyTurnTimer.current = setTimeout(() => {
      setIsEnemyActing(true);
      setEnemyAnimation("attack");

      const enemyKey = getEnemyKey(combatState.enemy?.name);
      const attackDuration = getAnimDuration(enemyKey, "attack");

      // Enemy attacks after attack animation plays
      setTimeout(() => {
        // Trigger the actual game attack
        attackEnemy("Basic Attack");

        // Visual feedback on player
        shakeScreen();
        addEffect("hit_spark", "20%", "45%");
        addDamageNumber(
          combatState.enemy?.damage || 10,
          Math.random() > 0.85 ? "crit" : "damage",
          "20%", "35%"
        );
        setPlayerAnimation("hit");

        const hitDuration = getAnimDuration("kaito", "hit");

        setTimeout(() => {
          setPlayerAnimation("idle");
          setEnemyAnimation("idle");
          setIsEnemyActing(false);
          setCurrentTurn("player");
        }, hitDuration);
      }, attackDuration);
    }, delay);

    return () => {
      if (enemyTurnTimer.current) clearTimeout(enemyTurnTimer.current);
    };
  }, [currentTurn, combatState, combatResult, isEnemyActing]);

  // Player attack handler
  const handleAttack = useCallback((skillName = "Basic Attack") => {
    if (!combatState || isPlayerActing || isEnemyActing || combatResult) return;

    setIsPlayerActing(true);
    const isBasic = skillName === "Basic Attack";
    const animKey = isBasic ? "basic_attack" : "skill_attack";
    setPlayerAnimation(animKey);

    const attackDuration = getAnimDuration("kaito", animKey);

    // Damage happens mid-animation
    setTimeout(() => {
      attackEnemy(skillName);
      shakeScreen();

      // Effect at enemy position
      addEffect(isBasic ? "slash_trail" : "skill_glow", "75%", "45%");

      // Damage number
      const damage = isBasic ? 15 : 25;
      addDamageNumber(damage, Math.random() > 0.8 ? "crit" : "damage", "75%", "35%");

      setEnemyAnimation("hit");

      const hitDuration = getAnimDuration(getEnemyKey(combatState.enemy?.name), "hit");

      setTimeout(() => {
        setEnemyAnimation("idle");
        setPlayerAnimation("idle");
        setIsPlayerActing(false);

        // Switch to enemy turn if combat not over
        if (!combatResult) {
          setCurrentTurn("enemy");
        }
      }, hitDuration);
    }, attackDuration * 0.6); // Damage at 60% through attack animation
  }, [combatState, isPlayerActing, isEnemyActing, combatResult]);

  // Healing handler
  const handleCraftPotion = useCallback((potionName) => {
    if (!combatState || isPlayerActing || isEnemyActing || combatResult || !potionName) return;

    setIsPlayerActing(true);
    setPlayerAnimation("healing");

    const healDuration = getAnimDuration("kaito", "healing");

    setTimeout(() => {
      craftPotionInCombat(potionName);
      addEffect("heal_aura", "20%", "45%");
      addDamageNumber(30, "heal", "20%", "35%");

      setTimeout(() => {
        setPlayerAnimation("idle");
        setIsPlayerActing(false);
        if (!combatResult) {
          setCurrentTurn("enemy");
        }
      }, 600);
    }, healDuration * 0.5);
  }, [combatState, isPlayerActing, isEnemyActing, combatResult]);

  // Loading states
  if (!combatState && !combatResult) {
    return (
      <Card className={`${styles.combatCard} border-0`}>
        <Card.Header className={`${styles.arenaHeader} text-center`}>
          <h3 className={styles.arenaTitle}>⚔️ Combat Arena ⚔️</h3>
        </Card.Header>
        <Card.Body className={styles.combatBody}>
          <div className={styles.arenaLoading}>
            <h4>Preparing for battle...</h4>
            <div className={styles.loadingSpinner}></div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (combatState && !combatState.enemy) {
    return (
      <Card className={`${styles.combatCard} border-0`}>
        <Card.Header className={`${styles.arenaHeader} text-center`}>
          <h3 className={styles.arenaTitle}>⚔️ Combat Arena ⚔️</h3>
        </Card.Header>
        <Card.Body className={styles.combatBody}>
          <div className={styles.arenaLoading}>
            <h4>Preparing for battle...</h4>
            <div className={styles.loadingSpinner}></div>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className={`${styles.combatCard} border-0 ${screenShake ? styles.screenShake : ""}`}>
      <Card.Header className={`${styles.arenaHeader} text-center`}>
        <div className={styles.turnIndicator}>
          <h3 className={styles.arenaTitle}>⚔️ COMBAT ⚔️</h3>
          <div className={styles.currentTurn}>
            {currentTurn === "player" && !isPlayerActing && !isEnemyActing ? (
              <span className={styles.playerTurn}>🗡️ YOUR TURN</span>
            ) : (
              <span className={styles.enemyTurn}>💀 ENEMY TURN</span>
            )}
          </div>
          <Button 
            variant="danger" 
            onClick={() => toggleModal("combat")} 
            disabled={combatResult || isPlayerActing || isEnemyActing} 
            className={styles.headerFleeButton}
          >
            <FaRunning className={styles.buttonIcon} /> Flee
          </Button>
        </div>
      </Card.Header>
      
      <Card.Body className={`${styles.combatBody} ${styles.fightingArena}`}>
        {combatState && (
          <div className={styles.fightingGame}>
            {/* Health Bars */}
            <div className={styles.healthBarsContainer}>
              <div className={styles.fighterHealthBar}>
                <div className={styles.fighterName}>
                  <span className={styles.nameTag}>KAITO</span>
                  <span className={styles.healthText}>
                    {combatState.playerHealth}/{player.max_health}
                  </span>
                </div>
                <div className={`${styles.healthBar} ${styles.animatedHealth} ${combatState.playerHealth < player.max_health / 3 ? styles.healthDanger : ""}`}>
                  <div 
                    className={styles.healthFill} 
                    style={{ width: `${Math.max(0, (combatState.playerHealth / player.max_health) * 100)}%` }}
                  />
                </div>
              </div>

              <div className={styles.fighterHealthBar}>
                <div className={styles.fighterName}>
                  <span className={styles.nameTag}>{combatState.enemy.name.toUpperCase()}</span>
                  <span className={styles.healthText}>
                    {combatState.enemyHealth}/{combatState.enemy.max_health}
                  </span>
                </div>
                <div className={`${styles.healthBar} ${styles.animatedHealth} ${combatState.enemyHealth < combatState.enemy.max_health / 3 ? styles.healthDanger : ""}`}>
                  <div 
                    className={styles.healthFill} 
                    style={{ width: `${Math.max(0, (combatState.enemyHealth / combatState.enemy.max_health) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Fighting Stage */}
            <div className={styles.fightingStage}>
              <div className={styles.stageBackground}>
                <div className={styles.stageFloor}></div>
                <div className={styles.stageWall}></div>
              </div>

              <div className={styles.fightersContainer}>
                {/* Kaito - Left */}
                <div className={`${styles.fighter} ${styles.playerFighter}`}>
                  <AnimationSprite 
                    character="kaito" 
                    animation={playerAnimation}
                    size={150}
                  />
                </div>

                {/* Enemy - Right */}
                <div className={`${styles.fighter} ${styles.enemyFighter}`}>
                  <AnimationSprite 
                    character={combatState.enemy.name}
                    animation={enemyAnimation}
                    size={150}
                  />
                </div>
              </div>

              {/* Effects */}
              {effects.map(e => (
                <EffectSprite key={e.id} effect={e.effect} x={e.x} y={e.y} />
              ))}

              {/* Damage Numbers */}
              {damageNumbers.map(d => (
                <DamageNumber 
                  key={d.id} 
                  damage={d.damage} 
                  type={d.type} 
                  x={d.x} 
                  y={d.y} 
                />
              ))}
            </div>

            {/* Equipment */}
            <div className={styles.equipmentBar}>
              <div className={styles.equipmentDisplay}>
                {player.equipment?.weapon && (
                  <span className={styles.equipmentItem}>
                    ⚔️ {player.equipment.weapon}
                  </span>
                )}
                {player.equipment?.armor && (
                  <span className={styles.equipmentItem}>
                    🛡️ {player.equipment.armor}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Panel */}
        <div className={`${styles.actionPanel} ${styles.cinematicPanel}`}>
          <Row className="g-2">
            <Col xs="auto">
              <Button 
                variant="danger" 
                onClick={() => handleAttack("Basic Attack")} 
                disabled={!combatState || isPlayerActing || isEnemyActing || combatResult} 
                className={`${styles.actionButton} ${styles.attackButton} ${styles.glowButton}`}
              >
                <GiCrossedSwords className={styles.buttonIcon} />
                <span className={styles.buttonText}>Attack</span>
                <span className={styles.buttonCost}>Free</span>
              </Button>
            </Col>

            <Col xs="auto">
              <Form className={styles.skillSelector}>
                <Form.Select
                  onChange={(e) => { if (e.target.value) handleAttack(e.target.value); }}
                  disabled={!combatState || isPlayerActing || isEnemyActing || combatResult}
                  className={`${styles.skillDropdown} ${styles.glowButton}`}
                >
                  <option value="">⚔️ Skills</option>
                  {player.skills
                    ?.filter(s => s.level > 0 && (s.tree === "Warrior" || s.effect?.damage || s.effect?.stunChance))
                    .map(skill => (
                      <option key={skill.name} value={skill.name}>
                        {skill.name} (Lv {skill.level})
                      </option>
                    ))}
                </Form.Select>
              </Form>
            </Col>

            <Col xs="auto">
              <Form className={styles.potionSelector}>
                <Form.Select
                  onChange={(e) => { if (e.target.value) handleCraftPotion(e.target.value); }}
                  disabled={!combatState || isPlayerActing || isEnemyActing || combatResult}
                  className={`${styles.potionDropdown} ${styles.glowButton}`}
                >
                  <option value="">🧪 Potions</option>
                  {player.recipes
                    ?.filter(r => r.type === "heal")
                    .map(recipe => (
                      <option key={recipe.name} value={recipe.name}>
                        {recipe.name} ({recipe.ingredients?.join(", ")})
                      </option>
                    ))}
                </Form.Select>
              </Form>
            </Col>
          </Row>
        </div>

        {/* Combat Log */}
        {combatState && (
          <div className={styles.combatLogContainer}>
            <h5 className={styles.logTitle}>
              <GiMagicSwirl className={styles.logIcon} /> Battle Log
            </h5>
            <ListGroup className={`${styles.combatLog} ${styles.cinematicLog}`}>
              {combatState.log?.map((entry, idx) => (
                <ListGroup.Item 
                  key={idx} 
                  className={`${styles.logEntry} ${styles.animatedEntry}`}
                >
                  {entry}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}

        {/* Victory/Defeat Screen */}
        {combatResult && (
          <div className={`${styles.resultScreen} ${styles[`${combatResult.type}Result`]}`}>
            <div className={styles.resultContent}>
              <h2 className={styles.resultTitle}>
                {combatResult.type === "win" ? "🏆 VICTORY! 🏆" : "💀 DEFEAT 💀"}
              </h2>
              <p className={styles.resultMessage}>{combatResult.message}</p>
              {combatResult.type === "win" && combatState?.enemy && (
                <div className={styles.rewardsDisplay}>
                  <div className={styles.rewardItem}>
                    <FaCoins className={styles.rewardIcon} />
                    <span>+{combatState.enemy.gold} Gold</span>
                  </div>
                  <div className={styles.rewardItem}>
                    <FaStar className={styles.rewardIcon} />
                    <span>+{combatState.enemy.name === "Bandit" ? 20 : combatState.enemy.name === "Shadow Ninja" ? 25 : 30} XP</span>
                  </div>
                </div>
              )}
              <Button 
                variant={combatResult.type === "win" ? "success" : "danger"}
                onClick={() => toggleModal("combat")}
                className={`${styles.resultButton} ${styles.glowButton}`}
              >
                {combatResult.type === "win" ? "Continue" : "Retry"}
              </Button>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default CombatModal;