 
import { useState, useEffect, useRef, useCallback } from "react";
import { FaRunning, FaShieldAlt, FaHeart, FaBolt, FaFire, FaSnowflake, FaStar, FaCoins, FaSkull, FaFistRaised, FaArrowsAltH, FaHandPaper } from "react-icons/fa";
import { GiCrossedSwords, GiPotion, GiMagicSwirl, GiBloodySword, GiSpikedHalo, GiSkullCrack, GiBoneGnawer, GiFlatStar, GiSwordWound, GiShieldBash, GiBootStomp } from "react-icons/gi";
import styles from "../../../styles/Combat.module.css";

// Enhanced Sprite Configuration with new animations
const SPRITE_CONFIG = {
  kaito: {
    idle: { path: "/sprites/kaito/idle/idle_", frames: 6, loop: true, speed: 180 },
    basic_attack: { path: "/sprites/kaito/basic_attack/basic_attack_", frames: 9, loop: false, speed: 80 },
    skill_attack: { path: "/sprites/kaito/skill_attack/skill_attack_", frames: 7, loop: false, speed: 90 },
    healing: { path: "/sprites/kaito/healing/healing_", frames: 6, loop: false, speed: 120 },
    hit: { path: "/sprites/kaito/hit/hit_", frames: 4, loop: false, speed: 100 },
    victory: { path: "/sprites/kaito/victory/victory_", frames: 5, loop: true, speed: 150 },
    defeat: { path: "/sprites/kaito/defeat/defeat_", frames: 4, loop: false, speed: 150 },
    block: { path: "/sprites/kaito/block/block_", frames: 3, loop: false, speed: 100 },
    dodge: { path: "/sprites/kaito/dodge/dodge_", frames: 4, loop: false, speed: 80 },
    move_forward: { path: "/sprites/kaito/move/move_", frames: 8, loop: true, speed: 60 },
  },
  bandit: {
    idle: { path: "/sprites/enemies/shadow-ninja/idle_", frames: 4, loop: true, speed: 200 },
    attack: { path: "/sprites/enemies/shadow-ninja/attack_", frames: 6, loop: false, speed: 90 },
    hit: { path: "/sprites/enemies/shadow-ninja/hit_", frames: 4, loop: false, speed: 100 },
    defeat: { path: "/sprites/enemies/shadow-ninja/defeat_", frames: 4, loop: false, speed: 150 },
    move_forward: { path: "/sprites/enemies/shadow-ninja/move_", frames: 8, loop: true, speed: 50 },
  },
  golem: {
    idle: { path: "/sprites/enemies/shadow-ninja/idle_", frames: 4, loop: true, speed: 250 },
    attack: { path: "/sprites/enemies/shadow-ninja/attack_", frames: 6, loop: false, speed: 80 },
    hit: { path: "/sprites/enemies/shadow-ninja/hit_", frames: 4, loop: false, speed: 120 },
    defeat: { path: "/sprites/enemies/shadow-ninja/defeat_", frames: 4, loop: false, speed: 150 },
    move_forward: { path: "/sprites/enemies/shadow-ninja/move_", frames: 8, loop: true, speed: 50 },
  },
  "shadow-ninja": {
    idle: { path: "/sprites/enemies/shadow-ninja/idle_", frames: 4, loop: true, speed: 180 },
    attack: { path: "/sprites/enemies/shadow-ninja/attack_", frames: 6, loop: false, speed: 85 },
    hit: { path: "/sprites/enemies/shadow-ninja/hit_", frames: 4, loop: false, speed: 100 },
    defeat: { path: "/sprites/enemies/shadow-ninja/defeat_", frames: 4, loop: false, speed: 150 },
    move_forward: { path: "/sprites/enemies/shadow-ninja/move_", frames: 8, loop: true, speed: 50 },
  },
};

// Enhanced Effect Configuration
const EFFECT_CONFIG = {
  hit_spark: { path: "/sprites/effects/hit_spark/hit_spark_", frames: 3, speed: 80 },
  slash_trail: { path: "/sprites/effects/slash_trail/slash_trail_", frames: 4, speed: 70 },
  heal_aura: { path: "/sprites/effects/heal_aura/heal_aura_", frames: 6, speed: 100 },
  skill_glow: { path: "/sprites/effects/skill_glow/skill_glow_", frames: 8, speed: 80 },
  block_spark: { path: "/sprites/effects/block_spark/block_spark_", frames: 4, speed: 60 },
  dodge_trail: { path: "/sprites/effects/dodge_trail/dodge_trail_", frames: 5, speed: 50 },
  critical_flash: { path: "/sprites/effects/critical_flash/critical_flash_", frames: 3, speed: 100 },
};

// Supabase fallback URL
const SUPABASE_URL = "https://xqeimsncmnqsiowftdmz.supabase.co/storage/v1/object/public/YOUR_REAL_BUCKET_ID";

// Get enemy key from name
const getEnemyKey = (name) => {
  if (!name) return "bandit";
  const key = name.toLowerCase().replace(" ", "-");
  return SPRITE_CONFIG[key] ? key : "bandit";
};

// Enhanced Sprite Animator Component
const SpriteAnimator = ({ character, animation = "idle", size = 150, freeze = false }) => {
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

    if (freeze) {
      if (animRef.current) clearInterval(animRef.current);
      return;
    }

    if (config.loop) {
      // Looping animation (idle, move_forward)
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
  }, [animation, charKey, freeze]);

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

// Enhanced Effect Sprite Component
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
  const effectClass = `${styles.effectSprite} ${styles[effect]}`;

  return (
    <div
      className={effectClass}
      style={{ left: x, top: y }}
    >
      <img
        src={`${config.path}${frameNum}.png`}
        alt={effect}
        width={100}
        height={100}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    </div>
  );
};

// Enhanced Floating Damage Number Component
const FloatingDamage = ({ damage, type = "damage", x, y, isCritical = false }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const getDamageClass = () => {
    if (isCritical) return styles.critNumber;
    switch (type) {
      case "damage": return styles.damageNumber;
      case "heal": return styles.healNumber;
      case "block": return styles.blockNumber;
      case "dodge": return styles.dodgeNumber;
      default: return styles.damageNumber;
    }
  };

  const getDisplayText = () => {
    if (type === "heal") return `+${damage}`;
    if (type === "block") return `BLOCK ${damage}`;
    if (type === "dodge") return "DODGE!";
    return `-${damage}`;
  };

  return (
    <div 
      className={`${styles.floatingNumber} ${getDamageClass()} ${isCritical ? styles.criticalFloat : ""}`}
      style={{ left: x, top: y }}
    >
      {getDisplayText()}
    </div>
  );
};

// Distance Meter Component
const DistanceMeter = ({ distance, maxDistance = 100 }) => {
  const getDistanceColor = () => {
    if (distance <= 20) return "#ffd700"; // Close - gold
    if (distance <= 50) return "#ff6347"; // Medium - orange-red
    return "#90ee90"; // Far - green
  };

  return (
    <div className={styles.distanceMeter}>
      <div className={styles.distanceLabel}>DISTANCE</div>
      <div className={styles.distanceBar}>
        <div 
          className={styles.distanceFill}
          style={{ 
            width: `${(distance / maxDistance) * 100}%`,
            backgroundColor: getDistanceColor()
          }}
        />
      </div>
      <div className={styles.distanceText} style={{ color: getDistanceColor() }}>
        {Math.round(distance)}m
      </div>
    </div>
  );
};

// Status Effect Component
const StatusEffect = ({ type, duration }) => {
  const getEffectIcon = () => {
    switch (type) {
      case "stun": return <FaSnowflake />;
      case "poison": return <FaFire />;
      case "buff": return <FaBolt />;
      case "debuff": return <FaSkull />;
      default: return null;
    }
  };

  return (
    <div className={`${styles.statusEffect} ${styles[type]}`}>
      {getEffectIcon()}
      <span className={styles.statusDuration}>{duration}</span>
    </div>
  );
};

// Animation duration helper
const getAnimDuration = (charKey, animKey) => {
  const config = SPRITE_CONFIG[charKey]?.[animKey];
  if (!config) return 800;
  return config.frames * config.speed;
};

/* ═══════════════════════════════════════════════
   MORTAL KOMBAT ANNOUNCEMENT SYSTEM
   ═══════════════════════════════════════════════ */
// Enhanced Combat Announcements
const ANNOUNCEMENTS = {
  FIGHT: { text: "FIGHT!", color: "#ffd700", duration: 2000, scale: 2.5 },
  FINISH_HIM: { text: "FINISH HIM!", color: "#ff0000", duration: 3000, scale: 2.0 },
  FATALITY: { text: "FATALITY", color: "#dc143c", duration: 4000, scale: 2.5 },
  BRUTALITY: { text: "BRUTALITY", color: "#8b0000", duration: 3500, scale: 2.0 },
  VICTORY: { text: "VICTORY", color: "#ffd700", duration: 3000, scale: 2.5 },
  DEFEAT: { text: "DEFEAT", color: "#8b0000", duration: 3000, scale: 2.0 },
  FLAWLESS: { text: "FLAWLESS VICTORY", color: "#ffd700", duration: 4000, scale: 2.0 },
  PERFECT: { text: "PERFECT", color: "#ffd700", duration: 2000, scale: 1.8 },
  CRITICAL: { text: "CRITICAL HIT!", color: "#ff6347", duration: 1500, scale: 1.8 },
  BLOCK: { text: "BLOCK!", color: "#4169e1", duration: 1000, scale: 1.5 },
  DODGE: { text: "DODGE!", color: "#32cd32", duration: 1000, scale: 1.5 },
  CLOSE_COMBAT: { text: "CLOSE COMBAT!", color: "#ff8c00", duration: 1200, scale: 1.6 },
  COMBO_2: { text: "2 HITS", color: "#ff8c00", duration: 1200, scale: 1.5 },
  COMBO_3: { text: "3 HITS", color: "#ff6347", duration: 1200, scale: 1.6 },
  COMBO_4: { text: "4 HITS", color: "#ff0000", duration: 1200, scale: 1.7 },
  COMBO_5: { text: "5 HITS", color: "#dc143c", duration: 1500, scale: 1.8 },
  COMBO_X: { text: "COMBO BREAKER", color: "#00bfff", duration: 1500, scale: 1.8 },
};

const Announcement = ({ type, onComplete }) => {
  const [visible, setVisible] = useState(true);
  const config = ANNOUNCEMENTS[type];

  useEffect(() => {
    if (!config) return;
    const t = setTimeout(() => { setVisible(false); onComplete?.(); }, config.duration);
    return () => clearTimeout(t);
  }, [type, config, onComplete]);

  if (!visible || !config) return null;
  return (
    <div className={styles.announcementOverlay}>
      <div
        className={styles.announcementText}
        style={{
          color: config.color,
          textShadow: `0 0 20px ${config.color}, 0 0 40px ${config.color}, 0 0 80px ${config.color}`,
          fontSize: `clamp(2rem, ${config.scale * 4}vw, ${config.scale * 3}rem)`,
        }}
      >
        {config.text}
      </div>
      <div className={styles.announcementShadow}>{config.text}</div>
    </div>
  );
};

// Screen Flash Effect
const ScreenFlash = ({ color = "#ffffff", duration = 200 }) => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [duration]);
  if (!visible) return null;
  return <div className={styles.screenFlash} style={{ backgroundColor: color }} />;
};

const CombatModal = ({ combatState, combatResult, player, attackEnemy, craftPotionInCombat, toggleModal }) => {
  // Core Combat State
  const [currentTurn, setCurrentTurn] = useState("player");
  const [damageNumbers, setDamageNumbers] = useState([]);
  const [effects, setEffects] = useState([]);
  const [screenShake, setScreenShake] = useState(false);
  const [playerAnimation, setPlayerAnimation] = useState("idle");
  const [enemyAnimation, setEnemyAnimation] = useState("idle");
  const [isPlayerActing, setIsPlayerActing] = useState(false);
  const [isEnemyActing, setIsEnemyActing] = useState(false);
  const enemyTurnTimer = useRef(null);

  // Movement and Positioning System
  const [playerPosition, setPlayerPosition] = useState(20); // Percentage from left
  const [enemyPosition, setEnemyPosition] = useState(80); // Percentage from left
  const [distance, setDistance] = useState(60); // Distance between characters
  const [isMoving, setIsMoving] = useState(false);

  // Enhanced Combat Mechanics
  const [isBlocking, setIsBlocking] = useState(false);
  const [isDodging, setIsDodging] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [announcement, setAnnouncement] = useState(null);
  const [screenFlash, setScreenFlash] = useState(null);
  const [victoryPose, setVictoryPose] = useState(false);
  const [perfectWin, setPerfectWin] = useState(false);
  const [roundStart, setRoundStart] = useState(true);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [playerStatusEffects, setPlayerStatusEffects] = useState([]);
  const [enemyStatusEffects, setEnemyStatusEffects] = useState([]);

  // Calculate distance between characters
  useEffect(() => {
    setDistance(Math.abs(enemyPosition - playerPosition));
  }, [playerPosition, enemyPosition]);

  // Round Start: FIGHT! + Reset states
  useEffect(() => {
    if (combatState && !combatResult && roundStart) {
      setRoundStart(false);
      setAnnouncement("FIGHT");
      setShowResultScreen(false);
      setVictoryPose(false);
      setPerfectWin(false);
      setComboCount(0);
      setPlayerPosition(20);
      setEnemyPosition(80);
      setPlayerStatusEffects([]);
      setEnemyStatusEffects([]);
    }
  }, [combatState, combatResult, roundStart]);

  // Combat Result Handler
  useEffect(() => {
    if (!combatResult) return;

    if (combatResult.type === "win") {
      setEnemyAnimation("defeat");
      setPlayerAnimation("victory");
      setVictoryPose(true);

      const isFlawless = combatState?.playerHealth >= (player?.max_health || 100);
      if (isFlawless) {
        setPerfectWin(true);
        setAnnouncement("FLAWLESS");
      } else {
        setAnnouncement("VICTORY");
      }

      setScreenFlash("#ffd700");
      shakeScreen("heavy");

      setTimeout(() => {
        setScreenFlash(null);
        setShowResultScreen(true);
      }, 2000);
    }

    if (combatResult.type === "fail") {
      setPlayerAnimation("defeat");
      setEnemyAnimation("idle");
      setAnnouncement("DEFEAT");
      setScreenFlash("#8b0000");
      shakeScreen("critical");

      setTimeout(() => {
        setScreenFlash(null);
        setShowResultScreen(true);
      }, 1500);
    }
  }, [combatResult]);

  // Add damage number with auto-remove
  const addDamageNumber = useCallback((damage, type, x, y, isCritical = false) => {
    const id = Date.now() + Math.random();
    setDamageNumbers(prev => [...prev, { id, damage, type, x, y, isCritical }]);
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(d => d.id !== id));
    }, 2000);
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
  const shakeScreen = useCallback((intensity = "normal") => {
    setScreenShake(true);
    const dur = intensity === "heavy" ? 600 : intensity === "critical" ? 900 : 300;
    setTimeout(() => setScreenShake(false), dur);
  }, []);

  // Movement System
  const handleMoveForward = useCallback(() => {
    if (isMoving || isPlayerActing || isEnemyActing || combatResult) return;
    
    setIsMoving(true);
    setIsPlayerActing(true);
    setPlayerAnimation("move_forward");

    // Move player closer to enemy
    const newPosition = Math.min(playerPosition + 15, enemyPosition - 10);
    setPlayerPosition(newPosition);

    setTimeout(() => {
      setPlayerAnimation("idle");
      setIsMoving(false);
      setIsPlayerActing(false);
      
      // Calculate new distance after movement
      const newDistance = Math.abs(enemyPosition - newPosition);
      // Check if close enough for bonus damage
      if (newDistance <= 30) {
        setAnnouncement("CLOSE_COMBAT");
      }
    }, 800);
  }, [playerPosition, enemyPosition, distance, isMoving, isPlayerActing, isEnemyActing, combatResult]);

  // Block System
  const handleBlock = useCallback(() => {
    if (isPlayerActing || isEnemyActing || combatResult) return;
    
    setIsPlayerActing(true);
    setIsBlocking(true);
    setPlayerAnimation("block");

    setTimeout(() => {
      setPlayerAnimation("idle");
      setIsBlocking(false);
      setIsPlayerActing(false);
      setCurrentTurn("enemy");
    }, 1000);
  }, [isPlayerActing, isEnemyActing, combatResult]);

  // Dodge System
  const handleDodge = useCallback(() => {
    if (isPlayerActing || isEnemyActing || combatResult) return;
    
    setIsPlayerActing(true);
    setIsDodging(true);
    setPlayerAnimation("dodge");

    // Quick movement back and forth
    setPlayerPosition(prev => Math.max(5, prev - 10));
    
    setTimeout(() => {
      setPlayerPosition(prev => Math.min(prev + 10, 90));
      setPlayerAnimation("idle");
      setIsDodging(false);
      setIsPlayerActing(false);
      setCurrentTurn("enemy");
    }, 800);
  }, [isPlayerActing, isEnemyActing, combatResult]);

  // Enhanced Attack System
  const handleAttack = useCallback((skillName = "Basic Attack") => {
    if (!combatState || isPlayerActing || isEnemyActing || combatResult) return;

    setIsPlayerActing(true);
    const isBasic = skillName === "Basic Attack";
    const isSkill = !isBasic;
    const animKey = isBasic ? "basic_attack" : "skill_attack";
    setPlayerAnimation(animKey);

    const attackDuration = getAnimDuration("kaito", animKey);

    // Damage happens mid-animation
    setTimeout(() => {
      attackEnemy(skillName);

      // Calculate damage with distance bonus
      let baseDamage = isBasic ? 15 : 25;
      const distanceBonus = distance <= 30 ? 1.5 : 1.0;
      const totalDamage = Math.round(baseDamage * distanceBonus);
      
      const isCritical = Math.random() > 0.8;
      const finalDamage = isCritical ? totalDamage * 2 : totalDamage;

      // Combo system
      setComboCount(prev => {
        const newCombo = prev + 1;
        if (newCombo >= 2) {
          const comboKey = `COMBO_${Math.min(newCombo, 5)}`;
          if (ANNOUNCEMENTS[comboKey]) setAnnouncement(comboKey);
        }
        return newCombo;
      });

      // Screen effects
      if (isCritical) {
        setAnnouncement("CRITICAL");
        setScreenFlash("#ffd700");
        shakeScreen("heavy");
      } else {
        shakeScreen();
      }

      // Effect at enemy position
      addEffect(isBasic ? "slash_trail" : "skill_glow", `${enemyPosition}%`, "45%");

      // Damage number
      addDamageNumber(finalDamage, isCritical ? "crit" : "damage", `${enemyPosition}%`, "35%", isCritical);

      setEnemyAnimation("hit");

      const hitDuration = getAnimDuration(getEnemyKey(combatState.enemy?.name), "hit");

      setTimeout(() => {
        if (!combatResult) {
          setEnemyAnimation("idle");
          setPlayerAnimation("idle");
          setIsPlayerActing(false);
          setCurrentTurn("enemy");
        }
      }, hitDuration);
    }, attackDuration * 0.6);
  }, [combatState, isPlayerActing, isEnemyActing, combatResult, distance, addDamageNumber, addEffect]);

  // Enhanced Enemy AI
  useEffect(() => {
    if (currentTurn !== "enemy" || !combatState || combatResult || isEnemyActing) return;

    const delay = 1000 + Math.random() * 1000;

    enemyTurnTimer.current = setTimeout(() => {
      setIsEnemyActing(true);
      
      // Enemy decision making based on distance
      const enemyAction = Math.random();
      
      if (distance > 50 && enemyAction < 0.3) {
        // Move closer
        setEnemyAnimation("move_forward");
        const newPosition = Math.max(enemyPosition - 15, playerPosition + 10);
        setEnemyPosition(newPosition);
        
        setTimeout(() => {
          setEnemyAnimation("idle");
          setIsEnemyActing(false);
          setCurrentTurn("player");
        }, 800);
      } else {
        // Attack
        setEnemyAnimation("attack");

        const enemyKey = getEnemyKey(combatState.enemy?.name);
        const attackDuration = getAnimDuration(enemyKey, "attack");

        setTimeout(() => {
          attackEnemy("Basic Attack");

          const enemyIsCrit = Math.random() > 0.85;
          const damage = combatState.enemy?.damage || 10;
          const finalDamage = enemyIsCrit ? damage * 2 : damage;

          // Check if player is blocking
          if (isBlocking) {
            const blockedDamage = Math.round(finalDamage * 0.3);
            addDamageNumber(blockedDamage, "block", "20%", "35%");
            setAnnouncement("BLOCK");
            addEffect("block_spark", "20%", "45%");
          } else if (isDodging) {
            addDamageNumber(0, "dodge", "20%", "35%");
            setAnnouncement("DODGE");
            addEffect("dodge_trail", "20%", "45%");
          } else {
            addDamageNumber(finalDamage, enemyIsCrit ? "crit" : "damage", "20%", "35%", enemyIsCrit);
            setPlayerAnimation("hit");
            
            if (enemyIsCrit) {
              setAnnouncement("CRITICAL");
              setScreenFlash("#ff0000");
              shakeScreen("critical");
            } else {
              shakeScreen();
            }
          }

          const hitDuration = getAnimDuration("kaito", "hit");

          setTimeout(() => {
            setPlayerAnimation("idle");
            setEnemyAnimation("idle");
            setIsEnemyActing(false);
            setCurrentTurn("player");
            setIsBlocking(false);
            setIsDodging(false);
          }, hitDuration);
        }, attackDuration);
      }
    }, delay);

    return () => {
      if (enemyTurnTimer.current) clearTimeout(enemyTurnTimer.current);
    };
  }, [currentTurn, combatState, combatResult, isEnemyActing, distance, isBlocking, isDodging]);

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
      }, 600);
    }, healDuration * 0.5);
  }, [combatState, isPlayerActing, isEnemyActing, combatResult]);

  // Loading states
  if (!combatState && !combatResult) {
    return (
      <div className={styles.combatCard}>
        <div className={styles.jpHeader}>
          <div className={styles.jpHeaderKanji}>決闘</div>
          <div className={styles.jpHeaderSub}>DOJO ARENA</div>
        </div>
        <div className={styles.combatBody}>
          <div className={styles.jpLoading}>
            <div className={styles.jpLoadingKanji}>待</div>
            <div className={styles.jpLoadingText}>Preparing for battle...</div>
            <div className={styles.jpLoadingSpinner} />
          </div>
        </div>
      </div>
    );
  }

  if (combatState && !combatState.enemy) {
    return (
      <div className={styles.combatCard}>
        <div className={styles.jpHeader}>
          <div className={styles.jpHeaderKanji}>決闘</div>
          <div className={styles.jpHeaderSub}>DOJO ARENA</div>
        </div>
        <div className={styles.combatBody}>
          <div className={styles.jpLoading}>
            <div className={styles.jpLoadingKanji}>待</div>
            <div className={styles.jpLoadingText}>Preparing for battle...</div>
            <div className={styles.jpLoadingSpinner} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.combatCard} ${screenShake ? styles.screenShake : ""}`}>
      {/* Japanese Dojo Header */}
      <div className={styles.jpHeader}>
        <div className={styles.jpHeaderLeft}>
          <GiCrossedSwords className={styles.jpHeaderIcon} />
          <div>
            <div className={styles.jpHeaderKanji}>決闘</div>
            <div className={styles.jpHeaderSub}>KETTO</div>
          </div>
        </div>

        <div className={styles.jpHeaderCenter}>
          {currentTurn === "player" && !isPlayerActing && !isEnemyActing ? (
            <div className={styles.jpTurnPlayer}><FaFistRaised /> YOUR TURN</div>
          ) : (
            <div className={styles.jpTurnEnemy}><FaSkull /> ENEMY TURN</div>
          )}
        </div>

        <button
          type="button"
          className={styles.jpFleeBtn}
          onClick={() => toggleModal("combat")}
          disabled={combatResult || isPlayerActing || isEnemyActing}
        >
          <FaRunning /> 逃
        </button>
      </div>

      {/* Main Combat Body */}
      <div className={`${styles.combatBody} ${styles.fightingArena}`}>
        {combatState && (
          <div className={styles.fightingGame}>
            {/* Premium Health Bars */}
            <div className={styles.jpHealthBars}>
              {/* Player HP */}
              <div className={styles.jpHealthSide}>
                <div className={styles.jpHealthNameRow}>
                  <span className={styles.jpNameTag}>KAITO</span>
                  <span className={styles.jpHpText}>{combatState?.playerHealth ?? player.health}<span className={styles.jpHpSep}>/</span>{player.max_health}</span>
                </div>
                <div className={`${styles.jpHpTrack} ${(combatState?.playerHealth ?? player.health) < player.max_health / 3 ? styles.jpHpDanger : ""}`}>
                  <div
                    className={styles.jpHpFill}
                    style={{ width: `${Math.max(0, ((combatState?.playerHealth ?? player.health) / player.max_health) * 100)}%` }}
                  />
                  <div className={styles.jpHpShine} />
                </div>
                {/* Status Effects */}
                <div className={styles.statusEffectsContainer}>
                  {playerStatusEffects.map((effect, idx) => (
                    <StatusEffect key={idx} type={effect.type} duration={effect.duration} />
                  ))}
                </div>
              </div>

              {/* VS kanji divider */}
              <div className={styles.jpVsDivider}>対</div>

              {/* Enemy HP */}
              <div className={styles.jpHealthSide}>
                <div className={styles.jpHealthNameRow}>
                  <span className={styles.jpNameTag}>{combatState.enemy.name.toUpperCase()}</span>
                  <span className={styles.jpHpText}>{combatState.enemyHealth}<span className={styles.jpHpSep}>/</span>{combatState.enemyMaxHealth}</span>
                </div>
                <div className={`${styles.jpHpTrack} ${combatState.enemyHealth < combatState.enemyMaxHealth / 3 ? styles.jpHpDanger : ""}`}>
                  <div
                    className={styles.jpHpFillEnemy}
                    style={{ width: `${Math.max(0, (combatState.enemyHealth / combatState.enemyMaxHealth) * 100)}%` }}
                  />
                  <div className={styles.jpHpShine} />
                </div>
                {/* Status Effects */}
                <div className={styles.statusEffectsContainer}>
                  {enemyStatusEffects.map((effect, idx) => (
                    <StatusEffect key={idx} type={effect.type} duration={effect.duration} />
                  ))}
                </div>
              </div>
            </div>

            {/* Distance Meter */}
            <div className={styles.distanceMeterContainer}>
              <DistanceMeter distance={distance} maxDistance={100} />
            </div>

            {/* Announcement Overlay */}
            {announcement && (
              <Announcement
                type={announcement}
                onComplete={() => {
                  if (!["FINISH_HIM", "FATALITY", "VICTORY", "DEFEAT", "FLAWLESS", "CRITICAL", "BLOCK", "DODGE"].includes(announcement)) {
                    setAnnouncement(null);
                  }
                }}
              />
            )}

            {/* Screen Flash */}
            {screenFlash && <ScreenFlash color={screenFlash} duration={200} />}

            {/* Dojo Fighting Stage */}
            <div className={`${styles.fightingStage} ${styles.jpDojoStage}`}>
              <div className={styles.stageBackground}>
                <div className={styles.stageFloor}></div>
                <div className={styles.stageWall}></div>
              </div>

              <div className={styles.jpStageOverlay}>
                <div className={styles.jpBannerLeft}>戦</div>
                <div className={styles.jpBannerRight}>闘</div>
                <div className={styles.jpSigil}>道場</div>
              </div>

              <div className={styles.fightersContainer}>
                {/* Kaito - Dynamic Positioning */}
                <div 
                  className={`${styles.fighter} ${styles.playerFighter} ${victoryPose ? styles.victoryPose : ""} ${isBlocking ? styles.blocking : ""} ${isDodging ? styles.dodging : ""}`}
                  style={{ left: `${playerPosition}%` }}
                >
                  <SpriteAnimator
                    character="kaito"
                    animation={playerAnimation}
                    size={150}
                  />
                </div>

                {/* Enemy - Dynamic Positioning */}
                <div 
                  className={`${styles.fighter} ${styles.enemyFighter}`}
                  style={{ left: `${enemyPosition}%` }}
                >
                  <SpriteAnimator
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
                <FloatingDamage
                  key={d.id}
                  damage={d.damage}
                  type={d.type}
                  x={d.x}
                  y={d.y}
                  isCritical={d.isCritical}
                />
              ))}

              {/* Combat Log */}
              {combatState.log?.length > 0 && (
                <div className={styles.jpLogFloat}>
                  <div className={styles.jpLogFloatHeader}>
                    <GiMagicSwirl className={styles.jpLogFloatIcon} />
                    <span>戦記</span>
                  </div>
                  <div className={styles.jpLogFloatScroll}>
                    {combatState.log.slice(-6).map((entry, idx) => (
                      <div key={idx} className={styles.jpLogFloatEntry}>{entry}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Equipment Strip */}
            <div className={styles.jpEquipStrip}>
              {player.equipment?.weapon && (
                <div className={styles.jpEquipSlot}>
                  <GiCrossedSwords className={styles.jpEquipIcon} />
                  <span>{player.equipment.weapon}</span>
                </div>
              )}
              {player.equipment?.armor && (
                <div className={styles.jpEquipSlot}>
                  <FaShieldAlt className={styles.jpEquipIcon} />
                  <span>{player.equipment.armor}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Action Panel */}
        <div className={styles.jpActionPanel}>
          <div className={styles.jpActionGrid}>
            {/* Basic Attack */}
            <button
              type="button"
              className={`${styles.jpActionBtn} ${styles.jpAttackBtn}`}
              onClick={() => handleAttack("Basic Attack")}
              disabled={!combatState || isPlayerActing || isEnemyActing || combatResult || currentTurn !== "player"}
            >
              <GiCrossedSwords className={styles.jpActionIcon} />
              <span className={styles.jpActionLabel}>斬</span>
              <span className={styles.jpActionSub}>ATTACK</span>
            </button>

            {/* Move Forward */}
            <button
              type="button"
              className={`${styles.jpActionBtn} ${styles.jpMoveBtn}`}
              onClick={handleMoveForward}
              disabled={!combatState || isPlayerActing || isEnemyActing || combatResult || currentTurn !== "player" || distance <= 20}
            >
              <FaArrowsAltH className={styles.jpActionIcon} />
              <span className={styles.jpActionLabel}>進</span>
              <span className={styles.jpActionSub}>MOVE</span>
            </button>

            {/* Block */}
            <button
              type="button"
              className={`${styles.jpActionBtn} ${styles.jpBlockBtn}`}
              onClick={handleBlock}
              disabled={!combatState || isPlayerActing || isEnemyActing || combatResult || currentTurn !== "player"}
            >
              <FaShieldAlt className={styles.jpActionIcon} />
              <span className={styles.jpActionLabel}>守</span>
              <span className={styles.jpActionSub}>BLOCK</span>
            </button>

            {/* Dodge */}
            <button
              type="button"
              className={`${styles.jpActionBtn} ${styles.jpDodgeBtn}`}
              onClick={handleDodge}
              disabled={!combatState || isPlayerActing || isEnemyActing || combatResult || currentTurn !== "player"}
            >
              <GiBootStomp className={styles.jpActionIcon} />
              <span className={styles.jpActionLabel}>避</span>
              <span className={styles.jpActionSub}>DODGE</span>
            </button>

            {/* Skills */}
            <div className={styles.jpSelectWrap}>
              <select
                onChange={(e) => { if (e.target.value) handleAttack(e.target.value); }}
                disabled={!combatState || isPlayerActing || isEnemyActing || combatResult || currentTurn !== "player"}
                className={styles.jpSelect}
                defaultValue=""
              >
                <option value="" disabled>技 SKILLS</option>
                {player.skills
                  ?.filter(s => s.level > 0 && (s.tree === "Warrior" || s.effect?.damage || s.effect?.stunChance))
                  .map(skill => (
                    <option key={skill.name} value={skill.name}>
                      {skill.name} (Lv {skill.level})
                    </option>
                  ))}
              </select>
            </div>

            {/* Potions */}
            <div className={styles.jpSelectWrap}>
              <select
                onChange={(e) => { if (e.target.value) handleCraftPotion(e.target.value); }}
                disabled={!combatState || isPlayerActing || isEnemyActing || combatResult || currentTurn !== "player"}
                className={styles.jpSelect}
                defaultValue=""
              >
                <option value="" disabled>薬 POTIONS</option>
                {player.recipes
                  ?.filter(r => r.type === "heal")
                  .map(recipe => (
                    <option key={recipe.name} value={recipe.name}>
                      {recipe.name} ({recipe.ingredients?.join(", ")})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cinematic Result Screen */}
        {showResultScreen && combatResult && (
          <div className={`${styles.jpResultScreen} ${combatResult.type === "win" ? styles.jpResultWin : styles.jpResultLose}`}>
            <div className={styles.jpResultCard}>
              <div className={styles.jpResultKanji}>
                {combatResult.type === "win" ? "勝" : "敗"}
              </div>
              <h2 className={styles.jpResultTitle}>
                {combatResult.type === "win" ? (
                  <><GiSpikedHalo /> VICTORY <GiSpikedHalo /></>
                ) : (
                  <><FaSkull /> DEFEAT <FaSkull /></>
                )}
              </h2>
              <p className={styles.jpResultMsg}>{combatResult.message}</p>

              {combatResult.type === "win" && combatState?.enemy && (
                <div className={styles.jpRewards}>
                  <div className={styles.jpRewardItem}>
                    <FaCoins /> +{combatState.enemy.gold} Gold
                  </div>
                  <div className={styles.jpRewardItem}>
                    <FaStar /> +{combatState.enemy.name === "Bandit" ? 20 : combatState.enemy.name === "Shadow Ninja" ? 25 : 30} XP
                  </div>
                  {perfectWin && (
                    <div className={styles.jpRewardItem}>
                      <GiFlatStar /> PERFECT BONUS
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                className={`${styles.jpResultBtn} ${combatResult.type === "win" ? styles.jpResultBtnWin : styles.jpResultBtnLose}`}
                onClick={() => toggleModal("combat")}
              >
                {combatResult.type === "win" ? "続 CONTINUE" : "再 RETRY"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CombatModal;