 
import { useState, useEffect, useRef, useCallback } from "react";
import { FaRunning, FaShieldAlt, FaHeart, FaBolt, FaFire, FaSnowflake, FaStar, FaCoins, FaSkull, FaFistRaised } from "react-icons/fa";
import { GiCrossedSwords, GiPotion, GiMagicSwirl, GiBloodySword, GiSpikedHalo, GiSkullCrack, GiBoneGnawer, GiFlatStar } from "react-icons/gi";
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
const AnimationSprite = ({ character, animation = "idle", size = 150, freeze = false }) => {
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
  const isSlash = effect === "slash_trail";

  return (
    <div
      className={`${styles.effectSprite} ${isSlash ? styles.slashEffect : ""}`}
      style={{ left: x, top: y }}
    >
      <img
        src={`${config.path}${frameNum}.png`}
        alt={effect}
        width={isSlash ? 140 : 100}
        height={isSlash ? 140 : 100}
        className={isSlash ? styles.slashImage : ""}
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

/* ═══════════════════════════════════════════════
   MORTAL KOMBAT ANNOUNCEMENT SYSTEM
   ═══════════════════════════════════════════════ */
const ANNOUNCEMENTS = {
  FIGHT:      { text: "FIGHT!",        color: "#ffd700",  duration: 2000, scale: 2.5 },
  FINISH_HIM: { text: "FINISH HIM!",   color: "#ff0000",  duration: 3000, scale: 2.0 },
  FATALITY:   { text: "FATALITY",      color: "#dc143c",  duration: 4000, scale: 2.5 },
  BRUTALITY:  { text: "BRUTALITY",     color: "#8b0000",  duration: 3500, scale: 2.0 },
  VICTORY:    { text: "VICTORY",       color: "#ffd700",  duration: 3000, scale: 2.5 },
  DEFEAT:     { text: "DEFEAT",        color: "#8b0000",  duration: 3000, scale: 2.0 },
  FLAWLESS:   { text: "FLAWLESS VICTORY", color: "#ffd700", duration: 4000, scale: 2.0 },
  COMBO_2:    { text: "2 HITS",        color: "#ff8c00",  duration: 1200, scale: 1.5 },
  COMBO_3:    { text: "3 HITS",        color: "#ff6347",  duration: 1200, scale: 1.6 },
  COMBO_4:    { text: "4 HITS",        color: "#ff0000",  duration: 1200, scale: 1.7 },
  COMBO_5:    { text: "5 HITS",        color: "#dc143c",  duration: 1500, scale: 1.8 },
  COMBO_X:    { text: "COMBO BREAKER", color: "#00bfff",  duration: 1500, scale: 1.8 },
  PERFECT:    { text: "PERFECT",       color: "#ffd700",  duration: 2000, scale: 1.8 },
  KNOCKOUT:   { text: "KNOCKOUT",      color: "#ff4500",  duration: 2500, scale: 2.2 },
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

/* ═══════════════════════════════════════════════
   BLOOD SPLATTER PARTICLE SYSTEM
   ═══════════════════════════════════════════════ */
const BLOOD_COLORS = ["#8b0000", "#dc143c", "#ff0000", "#660000", "#b22222"];
const BloodParticle = ({ x, y, size, color, delay }) => (
  <div
    className={styles.bloodParticle}
    style={{
      left: x,
      top: y,
      width: size,
      height: size,
      backgroundColor: color,
      animationDelay: `${delay}ms`,
    }}
  />
);

const BloodSplatter = ({ x, y, intensity = "medium" }) => {
  const count = intensity === "heavy" ? 24 : intensity === "medium" ? 14 : 8;
  return (
    <div className={styles.bloodContainer}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
        const dist = 30 + Math.random() * (intensity === "heavy" ? 120 : 80);
        const px = `calc(${x} + ${Math.cos(angle) * dist}px)`;
        const py = `calc(${y} + ${Math.sin(angle) * dist}px)`;
        const sz = 4 + Math.random() * (intensity === "heavy" ? 14 : 8);
        const col = BLOOD_COLORS[Math.floor(Math.random() * BLOOD_COLORS.length)];
        return <BloodParticle key={i} x={px} y={py} size={sz} color={col} delay={i * 30} />;
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   COMBO COUNTER DISPLAY
   ═══════════════════════════════════════════════ */
const ComboCounter = ({ combo }) => {
  if (combo < 2) return null;
  const colors = ["#ff8c00", "#ff6347", "#ff0000", "#dc143c", "#8b0000"];
  const glow = colors[Math.min(combo - 2, colors.length - 1)];
  return (
    <div className={styles.comboCounter} style={{ textShadow: `0 0 20px ${glow}, 0 0 40px ${glow}` }}>
      <div className={styles.comboHits}>{combo} HITS</div>
      <div className={styles.comboLabel}>COMBO</div>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   SPECIAL MOVE METER
   ═══════════════════════════════════════════════ */
const SpecialMeter = ({ meter, max = 100 }) => (
  <div className={styles.specialMeterContainer}>
    <div className={styles.specialMeterLabel}>
      <FaBolt /> SPECIAL
    </div>
    <div className={styles.specialMeterTrack}>
      <div
        className={styles.specialMeterFill}
        style={{ width: `${(meter / max) * 100}%` }}
      />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════
   SCREEN FLASH EFFECT
   ═══════════════════════════════════════════════ */
const ScreenFlash = ({ color = "#ffffff", duration = 200 }) => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [duration]);
  if (!visible) return null;
  return <div className={styles.screenFlash} style={{ backgroundColor: color }} />;
};

/* ═══════════════════════════════════════════════
   FATALITY PROMPT
   ═══════════════════════════════════════════════ */
const FatalityPrompt = ({ onExecute, onSkip }) => (
  <div className={styles.fatalityPrompt}>
    <div className={styles.fatalityPromptText}>
      <GiSkullCrack className={styles.fatalityIcon} />
      FINISH HIM!
    </div>
    <div className={styles.fatalityButtons}>
      <button onClick={onExecute} className={`${styles.fatalityButton} ${styles.fatalityExecute}`}>
        <GiBloodySword /> FATALITY
      </button>
      <button onClick={onSkip} className={`${styles.fatalityButton} ${styles.fatalitySkip}`}>
        <FaSkull /> MERCY
      </button>
    </div>
  </div>
);

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

  const [hitStop, setHitStop] = useState(false);
  const [playerLunge, setPlayerLunge] = useState(false);
  const [enemyLunge, setEnemyLunge] = useState(false);
  const [playerRecoil, setPlayerRecoil] = useState(false);
  const [enemyRecoil, setEnemyRecoil] = useState(false);

  /* MK System States */
  const [announcement, setAnnouncement] = useState(null);
  const [bloodSplatters, setBloodSplatters] = useState([]);
  const [comboCount, setComboCount] = useState(0);
  const [comboTimer, setComboTimer] = useState(null);
  const [specialMeter, setSpecialMeter] = useState(0);
  const [showFatalityPrompt, setShowFatalityPrompt] = useState(false);
  const [fatalityActive, setFatalityActive] = useState(false);
  const [screenFlash, setScreenFlash] = useState(null);
  const [heavyHit, setHeavyHit] = useState(false);
  const [victoryPose, setVictoryPose] = useState(false);
  const [perfectWin, setPerfectWin] = useState(false);
  const [roundStart, setRoundStart] = useState(true);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [motionSlash, setMotionSlash] = useState(false);

  /* Round Start: FIGHT! + Reset MK states for new combat */
  useEffect(() => {
    if (combatState && !combatResult && roundStart) {
      setRoundStart(false);
      setAnnouncement("FIGHT");
      setShowResultScreen(false);
      setVictoryPose(false);
      setPerfectWin(false);
      setComboCount(0);
      setSpecialMeter(0);
      setShowFatalityPrompt(false);
      setFatalityActive(false);
      setMotionSlash(false);
      setHitStop(false);
      setPlayerLunge(false);
      setEnemyLunge(false);
      setPlayerRecoil(false);
      setEnemyRecoil(false);
    }
  }, [combatState, combatResult, roundStart]);

  const triggerHitStop = useCallback((ms = 80) => {
    setHitStop(true);
    setTimeout(() => setHitStop(false), ms);
  }, []);

  /* ═══════════════════════════════════════════════
     COMBAT RESULT — CINEMATIC VICTORY / DEFEAT
     ═══════════════════════════════════════════════ */
  useEffect(() => {
    if (!combatResult) return;

    if (combatResult.type === "win") {
      // Show enemy defeat pose
      setEnemyAnimation("defeat");
      setPlayerAnimation("idle");
      setVictoryPose(true);

      // Check flawless victory (full health)
      const isFlawless = combatState?.playerHealth >= (player?.max_health || 100);
      if (isFlawless) {
        setPerfectWin(true);
        setAnnouncement("FLAWLESS");
      } else if (combatState?.enemyHealth <= 0) {
        setAnnouncement("KNOCKOUT");
      } else {
        setAnnouncement("VICTORY");
      }

      // Victory screen flash + blood splatter on enemy
      setScreenFlash("#ffd700");
      shakeScreen("heavy");
      addBloodSplatter("75%", "45%", "heavy");
      addBloodSplatter("70%", "50%", "medium");

      // Clear flash after effect
      setTimeout(() => {
        setScreenFlash(null);
      }, 800);

      // Delay result screen so defeat pose + announcement play first
      setTimeout(() => {
        setShowResultScreen(true);
      }, 2500);
    }

    if (combatResult.type === "fail") {
      // Show player defeat pose
      setPlayerAnimation("defeat");
      setEnemyAnimation("idle");
      setVictoryPose(false);

      setAnnouncement("DEFEAT");

      // Defeat screen flash + heavy blood on player
      setScreenFlash("#8b0000");
      shakeScreen("critical");
      addBloodSplatter("20%", "45%", "heavy");
      addBloodSplatter("25%", "50%", "medium");

      setTimeout(() => {
        setScreenFlash(null);
      }, 1000);

      // Delay result screen so defeat pose + announcement play first
      setTimeout(() => {
        setShowResultScreen(true);
      }, 1500);
    }
  }, [combatResult]);

  /* Combo Reset Timer */
  useEffect(() => {
    if (comboCount > 0) {
      if (comboTimer) clearTimeout(comboTimer);
      const t = setTimeout(() => {
        if (comboCount >= 3) setAnnouncement("COMBO_X");
        setComboCount(0);
      }, 2500);
      setComboTimer(t);
      return () => clearTimeout(t);
    }
  }, [comboCount]);

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

  /* ═══════════════════════════════════════════════
     BLOOD SPLATTER HELPER
     ═══════════════════════════════════════════════ */
  const addBloodSplatter = useCallback((x, y, intensity) => {
    const id = Date.now() + Math.random();
    setBloodSplatters(prev => [...prev, { id, x, y, intensity }]);
    setTimeout(() => {
      setBloodSplatters(prev => prev.filter(b => b.id !== id));
    }, 1500);
  }, []);

  // Trigger screen shake
  const shakeScreen = useCallback((intensity = "normal") => {
    setScreenShake(true);
    const dur = intensity === "heavy" ? 600 : intensity === "critical" ? 900 : 300;
    setTimeout(() => setScreenShake(false), dur);
  }, []);

  /* ═══════════════════════════════════════════════
     MORTAL KOMBAT ENEMY AI
     ═══════════════════════════════════════════════ */
  useEffect(() => {
    if (currentTurn !== "enemy" || !combatState || combatResult || isEnemyActing || showFatalityPrompt) return;

    // Random delay 800-1500ms for natural feel
    const delay = 800 + Math.random() * 700;

    enemyTurnTimer.current = setTimeout(() => {
      setIsEnemyActing(true);
      setEnemyAnimation("attack");
      setEnemyLunge(true);
      setTimeout(() => setEnemyLunge(false), 260);

      const enemyKey = getEnemyKey(combatState.enemy?.name);
      const attackDuration = getAnimDuration(enemyKey, "attack");

      // Enemy attacks after attack animation plays
      setTimeout(() => {
        // Trigger the actual game attack
        attackEnemy("Basic Attack");

        // MK: Combo break on enemy hit
        setComboCount(0);
        if (comboCount >= 2) {
          setAnnouncement("COMBO_X");
        }

        // MK: Enemy heavy hit detection
        const enemyIsCrit = Math.random() > 0.85;
        const enemyIsHeavy = Math.random() > 0.7;

        if (enemyIsHeavy) {
          triggerHitStop(enemyIsCrit ? 110 : 80);
          setScreenFlash(enemyIsCrit ? "#ff0000" : "#ff6347");
          shakeScreen(enemyIsCrit ? "critical" : "heavy");
          addBloodSplatter("20%", "45%", enemyIsCrit ? "heavy" : "medium");
        } else {
          shakeScreen();
        }

        addEffect("hit_spark", "20%", "45%");
        addDamageNumber(
          combatState.enemy?.damage || 10,
          enemyIsCrit ? "crit" : "damage",
          "20%", "35%"
        );
        setPlayerAnimation("hit");
        setPlayerRecoil(true);
        setTimeout(() => setPlayerRecoil(false), 280);

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
  }, [currentTurn, combatState, combatResult, isEnemyActing, showFatalityPrompt, comboCount]);

  /* ═══════════════════════════════════════════════
     MORTAL KOMBAT PLAYER ATTACK
     ═══════════════════════════════════════════════ */
  const handleAttack = useCallback((skillName = "Basic Attack") => {
    if (!combatState || isPlayerActing || isEnemyActing || combatResult) return;

    setIsPlayerActing(true);
    const isBasic = skillName === "Basic Attack";
    const isSkill = !isBasic;
    const animKey = isBasic ? "basic_attack" : "skill_attack";
    setPlayerAnimation(animKey);

    setPlayerLunge(true);
    setTimeout(() => setPlayerLunge(false), 260);

    // MK: Motion slash line for basic attacks
    if (isBasic) setMotionSlash(true);

    const attackDuration = getAnimDuration("kaito", animKey);

    // Damage happens mid-animation
    setTimeout(() => {
      attackEnemy(skillName);

      // MK: Heavy hit detection
      const isCrit = Math.random() > 0.8;
      const isHeavy = isSkill || isCrit;
      const damage = isBasic ? 15 : 25;

      // MK: Combo system
      setComboCount(prev => {
        const newCombo = prev + 1;
        if (newCombo >= 2) {
          const comboKey = `COMBO_${Math.min(newCombo, 5)}`;
          if (ANNOUNCEMENTS[comboKey]) setAnnouncement(comboKey);
        }
        return newCombo;
      });

      // MK: Screen effects
      if (isHeavy) {
        triggerHitStop(isCrit ? 110 : 80);
        setHeavyHit(true);
        setScreenFlash(isCrit ? "#ffd700" : "#ff6347");
        shakeScreen();
        setTimeout(() => { setHeavyHit(false); setScreenFlash(null); }, 300);
        // Heavy blood splatter
        addBloodSplatter("75%", "45%", "heavy");
      } else {
        addBloodSplatter("75%", "45%", "medium");
      }

      // MK: Special meter gain
      setSpecialMeter(prev => Math.min(prev + (isHeavy ? 15 : 8), 100));

      // Effect at enemy position
      addEffect(isBasic ? "slash_trail" : "skill_glow", "75%", "45%");

      // Damage number
      addDamageNumber(damage, isCrit ? "crit" : "damage", "75%", "35%");

      setEnemyAnimation("hit");
      setEnemyRecoil(true);
      setTimeout(() => setEnemyRecoil(false), 280);

      const hitDuration = getAnimDuration(getEnemyKey(combatState.enemy?.name), "hit");

      setTimeout(() => {
        // Clear motion slash
        setMotionSlash(false);

        // Only reset animations if combat is still ongoing
        if (!combatResult) {
          setEnemyAnimation("idle");
          setPlayerAnimation("idle");
          setIsPlayerActing(false);

          // MK: Check for fatality opportunity
          const enemyHpPercent = combatState.enemyHealth / combatState.enemy.max_health;
          if (enemyHpPercent <= 0.15 && enemyHpPercent > 0) {
            setShowFatalityPrompt(true);
            setAnnouncement("FINISH_HIM");
          }

          // Switch to enemy turn if combat not over
          if (!showFatalityPrompt) {
            setCurrentTurn("enemy");
          }
        }
      }, hitDuration);
    }, attackDuration * 0.6);
  }, [combatState, isPlayerActing, isEnemyActing, combatResult, showFatalityPrompt]);

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

  /* ═══════════════════════════════════════════════
     MORTAL KOMBAT SPECIAL MOVE
     ═══════════════════════════════════════════════ */
  const handleSpecialMove = useCallback(() => {
    if (!combatState || isPlayerActing || isEnemyActing || combatResult || specialMeter < 100) return;

    setIsPlayerActing(true);
    setSpecialMeter(0);
    setPlayerAnimation("skill_attack");

    setPlayerLunge(true);
    setTimeout(() => setPlayerLunge(false), 380);

    const attackDuration = getAnimDuration("kaito", "skill_attack");

    setTimeout(() => {
      attackEnemy("Special Move");
      setComboCount(0);

      // MK: Massive screen effects for special
      triggerHitStop(120);
      setScreenFlash("#ffd700");
      shakeScreen("critical");
      setHeavyHit(true);
      addBloodSplatter("75%", "45%", "heavy");
      addBloodSplatter("70%", "40%", "heavy");

      addEffect("skill_glow", "75%", "45%");
      addEffect("slash_trail", "70%", "40%");
      addDamageNumber(50, "crit", "75%", "30%");
      addDamageNumber("SPECIAL!", "crit", "75%", "20%");

      setEnemyAnimation("hit");
      setEnemyRecoil(true);
      setTimeout(() => setEnemyRecoil(false), 360);

      const hitDuration = getAnimDuration(getEnemyKey(combatState.enemy?.name), "hit");

      setTimeout(() => {
        setHeavyHit(false);
        setScreenFlash(null);
        setEnemyAnimation("idle");
        setPlayerAnimation("idle");
        setIsPlayerActing(false);

        // Check fatality after special
        const enemyHpPercent = combatState.enemyHealth / combatState.enemy.max_health;
        if (enemyHpPercent <= 0.15 && enemyHpPercent > 0) {
          setShowFatalityPrompt(true);
          setAnnouncement("FINISH_HIM");
        } else if (!combatResult) {
          setCurrentTurn("enemy");
        }
      }, hitDuration * 1.5);
    }, attackDuration * 0.5);
  }, [combatState, isPlayerActing, isEnemyActing, combatResult, specialMeter]);

  /* ═══════════════════════════════════════════════
     MORTAL KOMBAT FATALITY
     ═══════════════════════════════════════════════ */
  const handleFatality = useCallback(() => {
    setShowFatalityPrompt(false);
    setFatalityActive(true);
    setAnnouncement("FATALITY");
    setPlayerAnimation("skill_attack");
    setEnemyAnimation("defeat");

    // MK: Epic fatality sequence
    setScreenFlash("#ff0000");
    shakeScreen("critical");

    setTimeout(() => {
      setScreenFlash("#8b0000");
      addBloodSplatter("75%", "45%", "heavy");
      addBloodSplatter("70%", "50%", "heavy");
      addBloodSplatter("80%", "40%", "heavy");
    }, 400);

    setTimeout(() => {
      setScreenFlash("#000000");
      shakeScreen("critical");
    }, 800);

    setTimeout(() => {
      setScreenFlash("#ff0000");
      addBloodSplatter("75%", "45%", "heavy");
    }, 1200);

    // Kill the enemy after fatality
    setTimeout(() => {
      attackEnemy("Fatality");
      setFatalityActive(false);
      setScreenFlash(null);
    }, 2500);
  }, []);

  /* ═══════════════════════════════════════════════
     MORTAL KOMBAT MERCY (skip fatality)
     ═══════════════════════════════════════════════ */
  const handleMercy = useCallback(() => {
    setShowFatalityPrompt(false);
    setAnnouncement(null);
    setCurrentTurn("enemy");
  }, []);

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
      {/* ═══ JAPANESE DOJO HEADER ═══ */}
      <div className={styles.jpHeader}>
        <div className={styles.jpHeaderLeft}>
          <GiCrossedSwords className={styles.jpHeaderIcon} />
          <div>
            <div className={styles.jpHeaderKanji}>決闘</div>
            <div className={styles.jpHeaderSub}>KETTO</div>
          </div>
        </div>

        <div className={styles.jpHeaderCenter}>
          {currentTurn === "player" && !isPlayerActing && !isEnemyActing && !showFatalityPrompt ? (
            <div className={styles.jpTurnPlayer}><FaFistRaised /> YOUR TURN</div>
          ) : showFatalityPrompt ? (
            <div className={styles.jpTurnEnemy}><GiSkullCrack /> FINISH HIM!</div>
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

      {/* ═══ MAIN COMBAT BODY ═══ */}
      <div className={`${styles.combatBody} ${styles.fightingArena}`}>
        {combatState && (
          <div className={styles.fightingGame}>
            {/* ═══ PREMIUM HEALTH BARS ═══ */}
            <div className={styles.jpHealthBars}>
              {/* Player HP */}
              <div className={styles.jpHealthSide}>
                <div className={styles.jpHealthNameRow}>
                  <span className={styles.jpNameTag}>KAITO</span>
                  <span className={styles.jpHpText}>{combatState.playerHealth}<span className={styles.jpHpSep}>/</span>{player.max_health}</span>
                </div>
                <div className={`${styles.jpHpTrack} ${combatState.playerHealth < player.max_health / 3 ? styles.jpHpDanger : ""}`}>
                  <div
                    className={styles.jpHpFill}
                    style={{ width: `${Math.max(0, (combatState.playerHealth / player.max_health) * 100)}%` }}
                  />
                  <div className={styles.jpHpShine} />
                </div>
              </div>

              {/* VS kanji divider */}
              <div className={styles.jpVsDivider}>対</div>

              {/* Enemy HP */}
              <div className={styles.jpHealthSide}>
                <div className={styles.jpHealthNameRow}>
                  <span className={styles.jpNameTag}>{combatState.enemy.name.toUpperCase()}</span>
                  <span className={styles.jpHpText}>{combatState.enemyHealth}<span className={styles.jpHpSep}>/</span>{combatState.enemy.max_health}</span>
                </div>
                <div className={`${styles.jpHpTrack} ${combatState.enemyHealth < combatState.enemy.max_health / 3 ? styles.jpHpDanger : ""}`}>
                  <div
                    className={styles.jpHpFillEnemy}
                    style={{ width: `${Math.max(0, (combatState.enemyHealth / combatState.enemy.max_health) * 100)}%` }}
                  />
                  <div className={styles.jpHpShine} />
                </div>
              </div>
            </div>

            {/* MK Announcement Overlay */}
            {announcement && (
              <Announcement
                type={announcement}
                onComplete={() => {
                  if (!["FINISH_HIM", "FATALITY", "VICTORY", "DEFEAT", "FLAWLESS"].includes(announcement)) {
                    setAnnouncement(null);
                  }
                }}
              />
            )}

            {/* MK Screen Flash */}
            {screenFlash && <ScreenFlash color={screenFlash} duration={200} />}

            {/* ═══ DOJO FIGHTING STAGE ═══ */}
            <div className={`${styles.fightingStage} ${styles.jpDojoStage} ${heavyHit ? styles.heavyHitStage : ""} ${hitStop ? styles.hitStop : ""}`}>
              <div className={styles.stageBackground}>
                <div className={styles.stageFloor}></div>
                <div className={styles.stageWall}></div>
              </div>

              <div className={styles.jpStageOverlay}>
                <div className={styles.jpBannerLeft}>戦</div>
                <div className={styles.jpBannerRight}>闘</div>
                <div className={styles.jpSigil}>道場</div>
              </div>

              {/* MK Combo Counter */}
              <ComboCounter combo={comboCount} />

              {/* MK Special Meter */}
              <SpecialMeter meter={specialMeter} />

              <div className={styles.fightersContainer}>
                {/* Kaito - Left */}
                <div className={`${styles.fighter} ${styles.playerFighter} ${victoryPose ? styles.victoryPose : ""} ${playerLunge ? styles.playerLunge : ""} ${playerRecoil ? styles.playerRecoil : ""}`}>
                  <AnimationSprite
                    character="kaito"
                    animation={playerAnimation}
                    size={150}
                    freeze={hitStop}
                  />
                </div>

                {/* Enemy - Right */}
                <div className={`${styles.fighter} ${styles.enemyFighter} ${fatalityActive ? styles.fatalityTarget : ""} ${enemyLunge ? styles.enemyLunge : ""} ${enemyRecoil ? styles.enemyRecoil : ""}`}>
                  <AnimationSprite
                    character={combatState.enemy.name}
                    animation={enemyAnimation}
                    size={150}
                    freeze={hitStop}
                  />
                </div>
              </div>

              {/* MK Motion Slash */}
              {motionSlash && <div className={styles.motionSlash} />}

              {/* MK Blood Splatters */}
              {bloodSplatters.map(b => (
                <BloodSplatter key={b.id} x={b.x} y={b.y} intensity={b.intensity} />
              ))}

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

              {/* MK Fatality Prompt */}
              {showFatalityPrompt && (
                <FatalityPrompt
                  onExecute={handleFatality}
                  onSkip={handleMercy}
                />
              )}

              {/* ═══ FLOATING COMBAT LOG (side overlay) ═══ */}
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

            {/* ═══ EQUIPMENT STRIP ═══ */}
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

        {/* ═══ JAPANESE ACTION PANEL ═══ */}
        <div className={styles.jpActionPanel}>
          <div className={styles.jpActionGrid}>
            <button
              type="button"
              className={`${styles.jpActionBtn} ${styles.jpAttackBtn}`}
              onClick={() => handleAttack("Basic Attack")}
              disabled={!combatState || isPlayerActing || isEnemyActing || combatResult || showFatalityPrompt}
            >
              <GiCrossedSwords className={styles.jpActionIcon} />
              <span className={styles.jpActionLabel}>斬</span>
              <span className={styles.jpActionSub}>ATTACK</span>
            </button>

            <button
              type="button"
              className={`${styles.jpActionBtn} ${styles.jpSpecialBtn} ${specialMeter >= 100 ? styles.jpSpecialReady : ""}`}
              onClick={handleSpecialMove}
              disabled={!combatState || isPlayerActing || isEnemyActing || combatResult || specialMeter < 100 || showFatalityPrompt}
            >
              <FaBolt className={styles.jpActionIcon} />
              <span className={styles.jpActionLabel}>奥</span>
              <span className={styles.jpActionSub}>SPECIAL {specialMeter}%</span>
            </button>

            <div className={styles.jpSelectWrap}>
              <select
                onChange={(e) => { if (e.target.value) handleAttack(e.target.value); }}
                disabled={!combatState || isPlayerActing || isEnemyActing || combatResult}
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

            <div className={styles.jpSelectWrap}>
              <select
                onChange={(e) => { if (e.target.value) handleCraftPotion(e.target.value); }}
                disabled={!combatState || isPlayerActing || isEnemyActing || combatResult}
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

        {/* ═══ CINEMATIC RESULT SCREEN ═══ */}
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