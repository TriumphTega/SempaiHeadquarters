import { useState, useEffect, useRef, useCallback } from "react";
import {
  FaRunning, FaShieldAlt, FaHeart, FaBolt, FaFire, FaSnowflake,
  FaStar, FaCoins, FaSkull, FaFistRaised, FaArrowsAltH, FaHandPaper
} from "react-icons/fa";
import {
  GiCrossedSwords, GiPotion, GiMagicSwirl, GiBloodySword, GiSpikedHalo,
  GiSkullCrack, GiBoneGnawer, GiFlatStar, GiSwordWound, GiShieldBash, GiBootStomp
} from "react-icons/gi";
import styles from "../../../styles/Combat.module.css";

/* ══════════════════════════════════════════════════════════
   SPRITE CONFIGURATION
══════════════════════════════════════════════════════════ */
const SPRITE_CONFIG = {
  kaito: {
    idle:         { path: "/sprites/kaito/idle/idle_",               frames: 6, loop: true,  speed: 180 },
    basic_attack: { path: "/sprites/kaito/basic_attack/basic_attack_", frames: 9, loop: false, speed: 80  },
    skill_attack: { path: "/sprites/kaito/skill_attack/skill_attack_", frames: 7, loop: false, speed: 90  },
    healing:      { path: "/sprites/kaito/healing/healing_",           frames: 6, loop: false, speed: 120 },
    hit:          { path: "/sprites/kaito/hit/hit_",                   frames: 4, loop: false, speed: 100 },
    victory:      { path: "/sprites/kaito/victory/victory_",           frames: 5, loop: true,  speed: 150 },
    defeat:       { path: "/sprites/kaito/defeat/defeat_",             frames: 4, loop: false, speed: 150 },
    block:        { path: "/sprites/kaito/block/block_",               frames: 3, loop: false, speed: 100 },
    dodge:        { path: "/sprites/kaito/dodge/dodge_",               frames: 4, loop: false, speed: 80  },
    move_forward: { path: "/sprites/kaito/move/move_",                 frames: 8, loop: true,  speed: 60  },
  },
  bandit: {
    idle:         { path: "/sprites/enemies/shadow-ninja/idle_",   frames: 4, loop: true,  speed: 200 },
    attack:       { path: "/sprites/enemies/shadow-ninja/attack_", frames: 6, loop: false, speed: 90  },
    hit:          { path: "/sprites/enemies/shadow-ninja/hit_",    frames: 4, loop: false, speed: 100 },
    defeat:       { path: "/sprites/enemies/shadow-ninja/defeat_", frames: 4, loop: false, speed: 150 },
    move_forward: { path: "/sprites/enemies/shadow-ninja/move_",   frames: 8, loop: true,  speed: 50  },
  },
  golem: {
    idle:         { path: "/sprites/enemies/shadow-ninja/idle_",   frames: 4, loop: true,  speed: 250 },
    attack:       { path: "/sprites/enemies/shadow-ninja/attack_", frames: 6, loop: false, speed: 80  },
    hit:          { path: "/sprites/enemies/shadow-ninja/hit_",    frames: 4, loop: false, speed: 120 },
    defeat:       { path: "/sprites/enemies/shadow-ninja/defeat_", frames: 4, loop: false, speed: 150 },
    move_forward: { path: "/sprites/enemies/shadow-ninja/move_",   frames: 8, loop: true,  speed: 50  },
  },
  "shadow-ninja": {
    idle:         { path: "/sprites/enemies/shadow-ninja/idle_",   frames: 4, loop: true,  speed: 180 },
    attack:       { path: "/sprites/enemies/shadow-ninja/attack_", frames: 6, loop: false, speed: 85  },
    hit:          { path: "/sprites/enemies/shadow-ninja/hit_",    frames: 4, loop: false, speed: 100 },
    defeat:       { path: "/sprites/enemies/shadow-ninja/defeat_", frames: 4, loop: false, speed: 150 },
    move_forward: { path: "/sprites/enemies/shadow-ninja/move_",   frames: 8, loop: true,  speed: 50  },
  },
};

const EFFECT_CONFIG = {
  hit_spark:      { path: "/sprites/effects/hit_spark/hit_spark_",         frames: 3, speed: 80  },
  slash_trail:    { path: "/sprites/effects/slash_trail/slash_trail_",     frames: 4, speed: 70  },
  heal_aura:      { path: "/sprites/effects/heal_aura/heal_aura_",         frames: 6, speed: 100 },
  skill_glow:     { path: "/sprites/effects/skill_glow/skill_glow_",       frames: 8, speed: 80  },
  block_spark:    { path: "/sprites/effects/block_spark/block_spark_",     frames: 4, speed: 60  },
  dodge_trail:    { path: "/sprites/effects/dodge_trail/dodge_trail_",     frames: 5, speed: 50  },
  critical_flash: { path: "/sprites/effects/critical_flash/critical_flash_", frames: 3, speed: 100 },
};

const SUPABASE_URL = "https://xqeimsncmnqsiowftdmz.supabase.co/storage/v1/object/public/YOUR_REAL_BUCKET_ID";

/* ══════════════════════════════════════════════════════════
   COMBAT CONSTANTS — tweak these to feel better
══════════════════════════════════════════════════════════ */
const COOLDOWNS = {
  basicAttack: 1200,   // ms between basic attacks
  skillAttack: 2500,   // ms between skill attacks
  block:       800,
  dodge:       1000,
  heal:        3000,
  move:        600,
};

// Enemy attacks on its own independent timer
const ENEMY_ATTACK_INTERVAL_MS = 2800; // enemy swings every ~2.8s
const ENEMY_ATTACK_VARIANCE   = 800;   // ± random variance

/* ══════════════════════════════════════════════════════════
   ANNOUNCEMENTS
══════════════════════════════════════════════════════════ */
const ANNOUNCEMENTS = {
  FIGHT:        { text: "FIGHT!",          color: "#ffd700", duration: 1800, scale: 2.5 },
  FINISH_HIM:   { text: "FINISH HIM!",     color: "#ff0000", duration: 3000, scale: 2.0 },
  FATALITY:     { text: "FATALITY",        color: "#dc143c", duration: 4000, scale: 2.5 },
  VICTORY:      { text: "VICTORY",         color: "#ffd700", duration: 3000, scale: 2.5 },
  DEFEAT:       { text: "DEFEAT",          color: "#8b0000", duration: 3000, scale: 2.0 },
  FLAWLESS:     { text: "FLAWLESS VICTORY",color: "#ffd700", duration: 4000, scale: 2.0 },
  CRITICAL:     { text: "CRITICAL HIT!",   color: "#ff6347", duration: 1200, scale: 1.8 },
  BLOCK:        { text: "BLOCK!",          color: "#4169e1", duration: 900,  scale: 1.5 },
  DODGE:        { text: "DODGE!",          color: "#32cd32", duration: 900,  scale: 1.5 },
  CLOSE_COMBAT: { text: "CLOSE COMBAT!",   color: "#ff8c00", duration: 1000, scale: 1.6 },
  COMBO_2:      { text: "2 HITS",          color: "#ff8c00", duration: 1000, scale: 1.5 },
  COMBO_3:      { text: "3 HITS",          color: "#ff6347", duration: 1000, scale: 1.6 },
  COMBO_4:      { text: "4 HITS",          color: "#ff0000", duration: 1000, scale: 1.7 },
  COMBO_5:      { text: "5 HITS",          color: "#dc143c", duration: 1200, scale: 1.8 },
};

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
const getEnemyKey = (name) => {
  if (!name) return "bandit";
  const key = name.toLowerCase().replace(/\s+/g, "-");
  return SPRITE_CONFIG[key] ? key : "bandit";
};

const getAnimDuration = (charKey, animKey) => {
  const cfg = SPRITE_CONFIG[charKey]?.[animKey];
  if (!cfg) return 600;
  return cfg.frames * cfg.speed;
};

/* ══════════════════════════════════════════════════════════
   SPRITE ANIMATOR
══════════════════════════════════════════════════════════ */
const SpriteAnimator = ({ character, animation = "idle", size = 150, freeze = false }) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [imgSrc, setImgSrc]             = useState("");
  const [imgError, setImgError]         = useState(false);
  const animRef = useRef(null);

  const charKey = character === "kaito" ? "kaito" : getEnemyKey(character);
  const animKey = animation || "idle";
  const config  = SPRITE_CONFIG[charKey]?.[animKey] || SPRITE_CONFIG[charKey]?.idle;

  useEffect(() => {
    if (!config) return;
    setCurrentFrame(0);
    setImgError(false);
    if (animRef.current) clearInterval(animRef.current);
    if (freeze) return;

    if (config.loop) {
      animRef.current = setInterval(() => {
        setCurrentFrame(p => (p + 1) % config.frames);
      }, config.speed);
    } else {
      let frame = 0;
      animRef.current = setInterval(() => {
        frame++;
        if (frame >= config.frames) { clearInterval(animRef.current); return; }
        setCurrentFrame(frame);
      }, config.speed);
    }
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [animation, charKey, freeze]);

  useEffect(() => {
    if (!config || imgError) return;
    const frameNum = String(currentFrame + 1).padStart(3, "0");
    setImgSrc(`${config.path}${frameNum}.png`);
  }, [currentFrame, config, imgError]);

  const handleError = () => {
    if (imgError) return;
    setImgError(true);
    setImgSrc(
      character === "kaito"
        ? `${SUPABASE_URL}/kaito.jpg`
        : `${SUPABASE_URL}/enemies/${getEnemyKey(character)}.png`
    );
  };

  if (!imgSrc && config) {
    const frameNum = "001";
    return (
      <div className={styles.characterSprite}>
        <img src={`${config.path}${frameNum}.png`} alt={`${character} ${animKey}`}
          width={size} height={size} className={styles.characterImage} onError={handleError} />
      </div>
    );
  }

  return (
    <div className={styles.characterSprite}>
      <img src={imgSrc} alt={`${character} ${animKey}`}
        width={size} height={size} className={styles.characterImage} onError={handleError} />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   EFFECT SPRITE
══════════════════════════════════════════════════════════ */
const EffectSprite = ({ effect, x = "50%", y = "50%" }) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [visible, setVisible]           = useState(true);
  const config = EFFECT_CONFIG[effect];

  useEffect(() => {
    if (!config) return;
    let frame = 0;
    const interval = setInterval(() => {
      frame++;
      if (frame >= config.frames) { clearInterval(interval); setVisible(false); return; }
      setCurrentFrame(frame);
    }, config.speed);
    return () => clearInterval(interval);
  }, [effect, config]);

  if (!visible || !config) return null;
  const frameNum = String(currentFrame + 1).padStart(3, "0");

  return (
    <div className={`${styles.effectSprite} ${styles[effect]}`} style={{ left: x, top: y }}>
      <img src={`${config.path}${frameNum}.png`} alt={effect} width={100} height={100}
        onError={(e) => { e.target.style.display = "none"; }} />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   FLOATING DAMAGE NUMBER
══════════════════════════════════════════════════════════ */
const FloatingDamage = ({ damage, type = "damage", x, y, isCritical = false }) => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;

  const cls = isCritical ? styles.critNumber
    : type === "heal"   ? styles.healNumber
    : type === "block"  ? styles.blockNumber
    : type === "dodge"  ? styles.dodgeNumber
    : styles.damageNumber;

  const text = type === "heal"  ? `+${damage}`
    : type === "block"          ? `BLOCK`
    : type === "dodge"          ? "DODGE!"
    : isCritical                ? `💥${damage}`
    : `-${damage}`;

  return (
    <div className={`${styles.floatingNumber} ${cls} ${isCritical ? styles.criticalFloat : ""}`}
      style={{ left: x, top: y }}>
      {text}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   COOLDOWN INDICATOR
══════════════════════════════════════════════════════════ */
const CooldownRing = ({ cooldownMs, totalMs, ready }) => {
  const progress = ready ? 1 : Math.max(0, 1 - cooldownMs / totalMs);
  const r = 14, circ = 2 * Math.PI * r;
  const dash = circ * progress;

  return (
    <svg width={32} height={32} className={styles.cooldownRing}>
      <circle cx={16} cy={16} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={2.5} />
      <circle cx={16} cy={16} r={r} fill="none"
        stroke={ready ? "#ffd700" : "#ff6347"}
        strokeWidth={2.5}
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.1s linear" }}
      />
    </svg>
  );
};

/* ══════════════════════════════════════════════════════════
   DISTANCE METER
══════════════════════════════════════════════════════════ */
const DistanceMeter = ({ distance, maxDistance = 100 }) => {
  const pct = (distance / maxDistance) * 100;
  const color = distance <= 20 ? "#ffd700" : distance <= 50 ? "#ff6347" : "#90ee90";
  return (
    <div className={styles.distanceMeter}>
      <div className={styles.distanceLabel}>DISTANCE</div>
      <div className={styles.distanceBar}>
        <div className={styles.distanceFill} style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className={styles.distanceText} style={{ color }}>{Math.round(distance)}m</div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   ANNOUNCEMENT
══════════════════════════════════════════════════════════ */
const Announcement = ({ type, onComplete }) => {
  const [visible, setVisible] = useState(true);
  const config = ANNOUNCEMENTS[type];

  useEffect(() => {
    if (!config) return;
    const t = setTimeout(() => { setVisible(false); onComplete?.(); }, config.duration);
    return () => clearTimeout(t);
  }, [type]);

  if (!visible || !config) return null;
  return (
    <div className={styles.announcementOverlay}>
      <div className={styles.announcementText}
        style={{
          color: config.color,
          textShadow: `0 0 20px ${config.color}, 0 0 50px ${config.color}`,
          fontSize: `clamp(2rem, ${config.scale * 4}vw, ${config.scale * 3}rem)`,
        }}>
        {config.text}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   SCREEN FLASH
══════════════════════════════════════════════════════════ */
const ScreenFlash = ({ color = "#ffffff", duration = 200 }) => {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const t = setTimeout(() => setVisible(false), duration); return () => clearTimeout(t); }, []);
  if (!visible) return null;
  return <div className={styles.screenFlash} style={{ backgroundColor: color, opacity: 0.35 }} />;
};

/* ══════════════════════════════════════════════════════════
   MAIN COMBAT MODAL
══════════════════════════════════════════════════════════ */
const CombatModal = ({ combatState, combatResult, player, attackEnemy, craftPotionInCombat, toggleModal }) => {

  // ── Visuals ────────────────────────────────────────────
  const [damageNumbers, setDamageNumbers] = useState([]);
  const [effects, setEffects]             = useState([]);
  const [screenShake, setScreenShake]     = useState(false);
  const [announcement, setAnnouncement]   = useState(null);
  const [flashColor, setFlashColor]       = useState(null);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [victoryPose, setVictoryPose]     = useState(false);
  const [perfectWin, setPerfectWin]       = useState(false);
  const [roundStart, setRoundStart]       = useState(true);

  // ── Animations ────────────────────────────────────────
  const [playerAnimation, setPlayerAnimation] = useState("idle");
  const [enemyAnimation, setEnemyAnimation]   = useState("idle");
  const playerAnimTimer = useRef(null);
  const enemyAnimTimer  = useRef(null);

  // ── Real-time cooldown tracking ───────────────────────
  // Each action stores the timestamp when it was last used
  const lastUsed = useRef({
    basicAttack: 0,
    skillAttack: 0,
    block:       0,
    dodge:       0,
    heal:        0,
    move:        0,
  });
  // Re-render ticker so UI cooldown rings update smoothly
  const [tick, setTick]         = useState(0);
  const tickRef                 = useRef(null);

  // ── Block / Dodge state ───────────────────────────────
  const [isBlocking, setIsBlocking] = useState(false);
  const [isDodging, setIsDodging]   = useState(false);
  const blockTimer  = useRef(null);
  const dodgeTimer  = useRef(null);

  // ── Combat active flag ────────────────────────────────
  const combatActive = useRef(false);

  // ── Positioning ───────────────────────────────────────
  const [playerPosition, setPlayerPosition] = useState(20);
  const [enemyPosition, setEnemyPosition]   = useState(80);
  const [distance, setDistance]             = useState(60);

  // ── Combo ─────────────────────────────────────────────
  const comboCount    = useRef(0);
  const comboResetRef = useRef(null);

  // ── Enemy AI timer ────────────────────────────────────
  const enemyAITimer = useRef(null);

  /* ── Helpers ─────────────────────────────────────────── */
  const now = () => Date.now();

  const isCooledDown = useCallback((action) => {
    return now() - lastUsed.current[action] >= COOLDOWNS[action];
  }, []);

  const getCooldownRemaining = useCallback((action) => {
    return Math.max(0, COOLDOWNS[action] - (now() - lastUsed.current[action]));
  }, []);

  const stamp = useCallback((action) => {
    lastUsed.current[action] = now();
  }, []);

  const addDamageNumber = useCallback((damage, type, x, y, isCritical = false) => {
    const id = now() + Math.random();
    setDamageNumbers(p => [...p, { id, damage, type, x, y, isCritical }]);
    setTimeout(() => setDamageNumbers(p => p.filter(d => d.id !== id)), 1900);
  }, []);

  const addEffect = useCallback((effect, x, y) => {
    const id = now() + Math.random();
    setEffects(p => [...p, { id, effect, x, y }]);
    setTimeout(() => setEffects(p => p.filter(e => e.id !== id)), 1000);
  }, []);

  const shake = useCallback((intensity = "normal") => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false),
      intensity === "critical" ? 900 : intensity === "heavy" ? 600 : 300);
  }, []);

  const flash = useCallback((color, duration = 200) => {
    setFlashColor(color);
    setTimeout(() => setFlashColor(null), duration);
  }, []);

  // Play a one-shot animation then return to idle
  const playPlayerAnim = useCallback((anim, fallback = "idle") => {
    setPlayerAnimation(anim);
    if (playerAnimTimer.current) clearTimeout(playerAnimTimer.current);
    const dur = getAnimDuration("kaito", anim);
    playerAnimTimer.current = setTimeout(() => setPlayerAnimation(fallback), dur);
  }, []);

  const playEnemyAnim = useCallback((anim, enemyKey, fallback = "idle") => {
    setEnemyAnimation(anim);
    if (enemyAnimTimer.current) clearTimeout(enemyAnimTimer.current);
    const dur = getAnimDuration(enemyKey, anim);
    enemyAnimTimer.current = setTimeout(() => setEnemyAnimation(fallback), dur);
  }, []);

  // ── Distance tracking ─────────────────────────────────
  useEffect(() => {
    setDistance(Math.abs(enemyPosition - playerPosition));
  }, [playerPosition, enemyPosition]);

  /* ── Ticker for cooldown UI ──────────────────────────── */
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(tickRef.current);
  }, []);

  /* ── Round Start ─────────────────────────────────────── */
  useEffect(() => {
    if (combatState && !combatResult && roundStart) {
      setRoundStart(false);
      combatActive.current = true;
      setAnnouncement("FIGHT");
      setShowResultScreen(false);
      setVictoryPose(false);
      setPerfectWin(false);
      comboCount.current = 0;
      setPlayerPosition(20);
      setEnemyPosition(80);
      // Reset all cooldowns
      Object.keys(lastUsed.current).forEach(k => { lastUsed.current[k] = 0; });
    }
  }, [combatState, combatResult, roundStart]);

  /* ── Combat Result Handler ───────────────────────────── */
  useEffect(() => {
    if (!combatResult) return;
    combatActive.current = false;
    if (enemyAITimer.current) clearTimeout(enemyAITimer.current);

    if (combatResult.type === "win") {
      setEnemyAnimation("defeat");
      setPlayerAnimation("victory");
      setVictoryPose(true);
      const isFlawless = combatState?.playerHealth >= (player?.max_health || 100);
      if (isFlawless) { setPerfectWin(true); setAnnouncement("FLAWLESS"); }
      else setAnnouncement("VICTORY");
      flash("#ffd700", 300);
      shake("heavy");
      setTimeout(() => setShowResultScreen(true), 2500);
    }

    if (combatResult.type === "fail") {
      setPlayerAnimation("defeat");
      setEnemyAnimation("idle");
      setAnnouncement("DEFEAT");
      flash("#8b0000", 300);
      shake("critical");
      setTimeout(() => setShowResultScreen(true), 2000);
    }
  }, [combatResult]);

  /* ══════════════════════════════════════════════════════
     ENEMY AI — independent, real-time loop
  ══════════════════════════════════════════════════════ */
  const scheduleEnemyAttack = useCallback(() => {
    if (enemyAITimer.current) clearTimeout(enemyAITimer.current);
    if (!combatActive.current) return;

    const delay = ENEMY_ATTACK_INTERVAL_MS + (Math.random() * ENEMY_ATTACK_VARIANCE * 2 - ENEMY_ATTACK_VARIANCE);

    enemyAITimer.current = setTimeout(() => {
      if (!combatActive.current || combatResult) return;

      const cs = combatState;
      if (!cs) { scheduleEnemyAttack(); return; }

      const enemyKey = getEnemyKey(cs.enemy?.name);
      const rand = Math.random();

      if (distance > 55 && rand < 0.25) {
        // Enemy moves closer
        setEnemyAnimation("move_forward");
        setEnemyPosition(p => Math.max(p - 12, playerPosition + 10));
        setTimeout(() => setEnemyAnimation("idle"), getAnimDuration(enemyKey, "move_forward"));
      } else {
        // Enemy attacks
        playEnemyAnim("attack", enemyKey);
        const atkDur = getAnimDuration(enemyKey, "attack");

        setTimeout(() => {
          if (!combatActive.current) return;

          const isCrit   = Math.random() > 0.85;
          const baseDmg  = cs.enemy?.damage || 10;
          const finalDmg = isCrit ? Math.round(baseDmg * 1.8) : baseDmg;

          if (isBlocking) {
            const blocked = Math.round(finalDmg * 0.25);
            addDamageNumber(blocked, "block", "22%", "32%");
            setAnnouncement("BLOCK");
            addEffect("block_spark", "22%", "48%");
            shake("normal");
            attackEnemy("__enemy_blocked__");
          } else if (isDodging) {
            addDamageNumber(0, "dodge", "22%", "32%");
            setAnnouncement("DODGE");
            addEffect("dodge_trail", "22%", "48%");
          } else {
            addDamageNumber(finalDmg, "damage", "22%", "32%", isCrit);
            playPlayerAnim("hit");
            if (isCrit) { flash("#ff0000", 250); shake("critical"); setAnnouncement("CRITICAL"); }
            else shake("normal");
            attackEnemy("__enemy_attack__");
          }
        }, atkDur * 0.55);
      }

      // Schedule next enemy action regardless
      scheduleEnemyAttack();
    }, delay);
  }, [combatState, combatResult, distance, isBlocking, isDodging, playerPosition]);

  // Start enemy AI when combat begins, restart when state changes
  useEffect(() => {
    if (combatActive.current && combatState && !combatResult) {
      scheduleEnemyAttack();
    }
    return () => {
      if (enemyAITimer.current) clearTimeout(enemyAITimer.current);
    };
  }, [combatState, combatResult]);

  /* ══════════════════════════════════════════════════════
     PLAYER ACTIONS — cooldown gated, no turn locks
  ══════════════════════════════════════════════════════ */

  const handleAttack = useCallback((skillName = "Basic Attack") => {
    if (!combatState || combatResult || !combatActive.current) return;
    const isSkill = skillName !== "Basic Attack";
    const cdKey   = isSkill ? "skillAttack" : "basicAttack";
    if (!isCooledDown(cdKey)) return;

    stamp(cdKey);
    const animKey = isSkill ? "skill_attack" : "basic_attack";
    playPlayerAnim(animKey);

    const atkDur = getAnimDuration("kaito", animKey);

    setTimeout(() => {
      if (!combatActive.current) return;

      attackEnemy(skillName);

      const distBonus   = distance <= 30 ? 1.4 : 1.0;
      const isCrit      = Math.random() > (isSkill ? 0.65 : 0.78);
      const baseDmg     = isSkill ? 25 : 15;
      const finalDmg    = Math.round(baseDmg * distBonus * (isCrit ? 1.9 : 1));

      // Combo tracking
      if (comboResetRef.current) clearTimeout(comboResetRef.current);
      comboCount.current += 1;
      const cc = comboCount.current;
      if (cc >= 2 && cc <= 5) setAnnouncement(`COMBO_${cc}`);
      comboResetRef.current = setTimeout(() => { comboCount.current = 0; }, 3000);

      if (isCrit) { flash("#ffd700", 200); shake("heavy"); setAnnouncement("CRITICAL"); }
      else shake("normal");

      const enemyKey = getEnemyKey(combatState.enemy?.name);
      playEnemyAnim("hit", enemyKey);
      addEffect(isSkill ? "skill_glow" : "slash_trail", `${enemyPosition}%`, "45%");
      addDamageNumber(finalDmg, isCrit ? "crit" : "damage", `${enemyPosition - 5}%`, "28%", isCrit);

      if (distance <= 30 && cc === 1) setAnnouncement("CLOSE_COMBAT");
    }, atkDur * 0.55);
  }, [combatState, combatResult, distance, isCooledDown, stamp]);

  const handleBlock = useCallback(() => {
    if (!combatState || combatResult || !isCooledDown("block")) return;
    stamp("block");

    setIsBlocking(true);
    playPlayerAnim("block", "block"); // hold the block anim
    setPlayerAnimation("block");

    if (blockTimer.current) clearTimeout(blockTimer.current);
    blockTimer.current = setTimeout(() => {
      setIsBlocking(false);
      setPlayerAnimation("idle");
    }, 1200); // block lasts 1.2s
  }, [combatState, combatResult, isCooledDown, stamp]);

  const handleDodge = useCallback(() => {
    if (!combatState || combatResult || !isCooledDown("dodge")) return;
    stamp("dodge");

    setIsDodging(true);
    playPlayerAnim("dodge");

    // Dash backward
    setPlayerPosition(p => Math.max(5, p - 12));

    if (dodgeTimer.current) clearTimeout(dodgeTimer.current);
    dodgeTimer.current = setTimeout(() => {
      setIsDodging(false);
      setPlayerPosition(p => Math.min(p + 12, 45));
    }, COOLDOWNS.dodge);
  }, [combatState, combatResult, isCooledDown, stamp]);

  const handleMoveForward = useCallback(() => {
    if (!combatState || combatResult || !isCooledDown("move")) return;
    stamp("move");

    playPlayerAnim("move_forward");
    setPlayerPosition(p => Math.min(p + 14, enemyPosition - 12));

    setTimeout(() => {
      const newDist = Math.abs(enemyPosition - playerPosition - 14);
      if (newDist <= 30) setAnnouncement("CLOSE_COMBAT");
    }, 600);
  }, [combatState, combatResult, isCooledDown, stamp, enemyPosition, playerPosition]);

  const handleHeal = useCallback((potionName) => {
    if (!combatState || combatResult || !potionName || !isCooledDown("heal")) return;
    stamp("heal");

    playPlayerAnim("healing");
    const healDur = getAnimDuration("kaito", "healing");

    setTimeout(() => {
      if (!combatActive.current) return;
      craftPotionInCombat(potionName);
      addEffect("heal_aura", "22%", "48%");
      addDamageNumber(30, "heal", "22%", "28%");
    }, healDur * 0.5);
  }, [combatState, combatResult, isCooledDown, stamp, craftPotionInCombat]);

  /* ── Loading states ────────────────────────────────── */
  if ((!combatState && !combatResult) || (combatState && !combatState.enemy)) {
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

  /* ── Cooldown values for UI ───────────────────────── */
  const _ = tick; // force re-render
  const cdBasic = getCooldownRemaining("basicAttack");
  const cdSkill = getCooldownRemaining("skillAttack");
  const cdBlock = getCooldownRemaining("block");
  const cdDodge = getCooldownRemaining("dodge");
  const cdHeal  = getCooldownRemaining("heal");
  const cdMove  = getCooldownRemaining("move");

  const canBasic = isCooledDown("basicAttack") && !combatResult;
  const canSkill = isCooledDown("skillAttack") && !combatResult;
  const canBlock = isCooledDown("block") && !combatResult;
  const canDodge = isCooledDown("dodge") && !combatResult;
  const canHeal  = isCooledDown("heal")  && !combatResult;
  const canMove  = isCooledDown("move")  && !combatResult && distance > 20;

  const enemyKey = combatState ? getEnemyKey(combatState.enemy?.name) : "bandit";

  return (
    <div className={`${styles.combatCard} ${screenShake ? styles.screenShake : ""}`}>

      {/* ── Header ─────────────────────────────────────── */}
      <div className={styles.jpHeader}>
        <div className={styles.jpHeaderLeft}>
          <GiCrossedSwords className={styles.jpHeaderIcon} />
          <div>
            <div className={styles.jpHeaderKanji}>決闘</div>
            <div className={styles.jpHeaderSub}>KETTO</div>
          </div>
        </div>

        <div className={styles.jpHeaderCenter}>
          <div className={styles.realtimeIndicator}>
            <span className={styles.realtimeDot} />
            REAL-TIME
          </div>
        </div>

        <button type="button" className={styles.jpFleeBtn}
          onClick={() => toggleModal("combat")}
          disabled={isBlocking || isDodging}>
          <FaRunning /> 逃
        </button>
      </div>

      {/* ── Combat Body ────────────────────────────────── */}
      <div className={`${styles.combatBody} ${styles.fightingArena}`}>
        <div className={styles.fightingGame}>

          {/* Health Bars */}
          <div className={styles.jpHealthBars}>
            <div className={styles.jpHealthSide}>
              <div className={styles.jpHealthNameRow}>
                <span className={styles.jpNameTag}>KAITO</span>
                <span className={styles.jpHpText}>
                  {combatState?.playerHealth ?? player.health}
                  <span className={styles.jpHpSep}>/</span>
                  {player.max_health}
                </span>
              </div>
              <div className={`${styles.jpHpTrack} ${(combatState?.playerHealth ?? player.health) < player.max_health / 3 ? styles.jpHpDanger : ""}`}>
                <div className={styles.jpHpFill}
                  style={{ width: `${Math.max(0, ((combatState?.playerHealth ?? player.health) / player.max_health) * 100)}%` }} />
                <div className={styles.jpHpShine} />
              </div>
              {isBlocking && <div className={styles.statusBadge} style={{ color: "#4169e1" }}>🛡 BLOCKING</div>}
              {isDodging  && <div className={styles.statusBadge} style={{ color: "#32cd32" }}>💨 EVADING</div>}
            </div>

            <div className={styles.jpVsDivider}>対</div>

            <div className={styles.jpHealthSide}>
              <div className={styles.jpHealthNameRow}>
                <span className={styles.jpNameTag}>{combatState?.enemy?.name?.toUpperCase() || "ENEMY"}</span>
                <span className={styles.jpHpText}>
                  {combatState?.enemyHealth ?? 0}
                  <span className={styles.jpHpSep}>/</span>
                  {combatState?.enemyMaxHealth ?? 0}
                </span>
              </div>
              <div className={`${styles.jpHpTrack} ${(combatState?.enemyHealth ?? 0) < (combatState?.enemyMaxHealth ?? 1) / 3 ? styles.jpHpDanger : ""}`}>
                <div className={styles.jpHpFillEnemy}
                  style={{ width: `${Math.max(0, ((combatState?.enemyHealth ?? 0) / (combatState?.enemyMaxHealth ?? 1)) * 100)}%` }} />
                <div className={styles.jpHpShine} />
              </div>
              {(combatState?.enemyHealth ?? 0) < (combatState?.enemyMaxHealth ?? 1) / 3 && (
                <div className={styles.statusBadge} style={{ color: "#ff0000" }}>⚠ FINISH HIM</div>
              )}
            </div>
          </div>

          {/* Distance */}
          <div className={styles.distanceMeterContainer}>
            <DistanceMeter distance={distance} maxDistance={100} />
          </div>

          {/* Announcements / Flash */}
          {announcement && (
            <Announcement type={announcement} onComplete={() => {
              if (!["VICTORY","DEFEAT","FLAWLESS"].includes(announcement)) setAnnouncement(null);
            }} />
          )}
          {flashColor && <ScreenFlash color={flashColor} duration={250} />}

          {/* Fighting Stage */}
          <div className={`${styles.fightingStage} ${styles.jpDojoStage}`}>
            <div className={styles.stageBackground}>
              <div className={styles.stageFloor} />
              <div className={styles.stageWall} />
            </div>

            <div className={styles.jpStageOverlay}>
              <div className={styles.jpBannerLeft}>戦</div>
              <div className={styles.jpBannerRight}>闘</div>
              <div className={styles.jpSigil}>道場</div>
            </div>

            <div className={styles.fightersContainer}>
              {/* Player */}
              <div
                className={`${styles.fighter} ${styles.playerFighter}
                  ${victoryPose ? styles.victoryPose : ""}
                  ${isBlocking   ? styles.blocking    : ""}
                  ${isDodging    ? styles.dodging      : ""}`}
                style={{ left: `${playerPosition}%`, transition: "left 0.35s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
                <SpriteAnimator character="kaito" animation={playerAnimation} size={150} />
              </div>

              {/* Enemy */}
              <div
                className={`${styles.fighter} ${styles.enemyFighter}`}
                style={{ left: `${enemyPosition}%`, transition: "left 0.35s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
                <SpriteAnimator character={combatState?.enemy?.name || "bandit"} animation={enemyAnimation} size={150} />
              </div>
            </div>

            {/* Effects */}
            {effects.map(e => <EffectSprite key={e.id} effect={e.effect} x={e.x} y={e.y} />)}
            {/* Damage Numbers */}
            {damageNumbers.map(d => (
              <FloatingDamage key={d.id} damage={d.damage} type={d.type}
                x={d.x} y={d.y} isCritical={d.isCritical} />
            ))}

            {/* Combat Log */}
            {combatState?.log?.length > 0 && (
              <div className={styles.jpLogFloat}>
                <div className={styles.jpLogFloatHeader}>
                  <GiMagicSwirl className={styles.jpLogFloatIcon} />
                  <span>戦記</span>
                </div>
                <div className={styles.jpLogFloatScroll}>
                  {combatState?.log?.slice(-6).map((entry, idx) => (
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

        {/* ── Action Panel ────────────────────────────── */}
        <div className={styles.jpActionPanel}>
          <div className={styles.jpActionGrid}>

            {/* ATTACK */}
            <button type="button"
              className={`${styles.jpActionBtn} ${styles.jpAttackBtn} ${canBasic ? styles.actionReady : styles.actionCooling}`}
              onClick={() => handleAttack("Basic Attack")}
              disabled={!canBasic}>
              <div className={styles.actionBtnTop}>
                <GiCrossedSwords className={styles.jpActionIcon} />
                <CooldownRing cooldownMs={cdBasic} totalMs={COOLDOWNS.basicAttack} ready={canBasic} />
              </div>
              <span className={styles.jpActionLabel}>斬</span>
              <span className={styles.jpActionSub}>ATTACK</span>
            </button>

            {/* MOVE */}
            <button type="button"
              className={`${styles.jpActionBtn} ${styles.jpMoveBtn} ${canMove ? styles.actionReady : styles.actionCooling}`}
              onClick={handleMoveForward}
              disabled={!canMove}>
              <div className={styles.actionBtnTop}>
                <FaArrowsAltH className={styles.jpActionIcon} />
                <CooldownRing cooldownMs={cdMove} totalMs={COOLDOWNS.move} ready={canMove} />
              </div>
              <span className={styles.jpActionLabel}>進</span>
              <span className={styles.jpActionSub}>ADVANCE</span>
            </button>

            {/* BLOCK */}
            <button type="button"
              className={`${styles.jpActionBtn} ${styles.jpBlockBtn} ${canBlock ? styles.actionReady : styles.actionCooling} ${isBlocking ? styles.activeBtn : ""}`}
              onClick={handleBlock}
              disabled={!canBlock}>
              <div className={styles.actionBtnTop}>
                <FaShieldAlt className={styles.jpActionIcon} />
                <CooldownRing cooldownMs={cdBlock} totalMs={COOLDOWNS.block} ready={canBlock} />
              </div>
              <span className={styles.jpActionLabel}>守</span>
              <span className={styles.jpActionSub}>BLOCK</span>
            </button>

            {/* DODGE */}
            <button type="button"
              className={`${styles.jpActionBtn} ${styles.jpDodgeBtn} ${canDodge ? styles.actionReady : styles.actionCooling} ${isDodging ? styles.activeBtn : ""}`}
              onClick={handleDodge}
              disabled={!canDodge}>
              <div className={styles.actionBtnTop}>
                <GiBootStomp className={styles.jpActionIcon} />
                <CooldownRing cooldownMs={cdDodge} totalMs={COOLDOWNS.dodge} ready={canDodge} />
              </div>
              <span className={styles.jpActionLabel}>避</span>
              <span className={styles.jpActionSub}>DODGE</span>
            </button>

            {/* SKILLS */}
            <div className={`${styles.jpSelectWrap} ${canSkill ? styles.actionReady : styles.actionCooling}`}>
              <div className={styles.selectCooldownOverlay}>
                <CooldownRing cooldownMs={cdSkill} totalMs={COOLDOWNS.skillAttack} ready={canSkill} />
              </div>
              <select
                onChange={(e) => { if (e.target.value) { handleAttack(e.target.value); e.target.value = ""; }}}
                disabled={!canSkill}
                className={styles.jpSelect}
                defaultValue="">
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

            {/* POTIONS */}
            <div className={`${styles.jpSelectWrap} ${canHeal ? styles.actionReady : styles.actionCooling}`}>
              <div className={styles.selectCooldownOverlay}>
                <CooldownRing cooldownMs={cdHeal} totalMs={COOLDOWNS.heal} ready={canHeal} />
              </div>
              <select
                onChange={(e) => { if (e.target.value) { handleHeal(e.target.value); e.target.value = ""; }}}
                disabled={!canHeal}
                className={styles.jpSelect}
                defaultValue="">
                <option value="" disabled>薬 POTIONS</option>
                {player.recipes
                  ?.filter(r => r.type === "heal")
                  .map(recipe => (
                    <option key={recipe.name} value={recipe.name}>
                      {recipe.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Hint bar */}
          <div className={styles.hintBar}>
            <span>Attack freely — enemy acts on its own timer.</span>
            <span>Block = 75% damage reduction · Dodge = full evade</span>
          </div>
        </div>

        {/* ── Result Screen ───────────────────────────── */}
        {showResultScreen && combatResult && (
          <div className={`${styles.jpResultScreen} ${combatResult.type === "win" ? styles.jpResultWin : styles.jpResultLose}`}>
            <div className={styles.jpResultCard}>
              <div className={styles.jpResultKanji}>
                {combatResult.type === "win" ? "勝" : "敗"}
              </div>
              <h2 className={styles.jpResultTitle}>
                {combatResult.type === "win"
                  ? <><GiSpikedHalo /> VICTORY <GiSpikedHalo /></>
                  : <><FaSkull /> DEFEAT <FaSkull /></>}
              </h2>
              <p className={styles.jpResultMsg}>{combatResult.message}</p>

              {combatResult.type === "win" && combatState?.enemy && (
                <div className={styles.jpRewards}>
                  <div className={styles.jpRewardItem}><FaCoins /> +{combatState?.enemy?.gold ?? 0} Gold</div>
                  <div className={styles.jpRewardItem}><FaStar /> +{combatState?.enemy?.name === "Bandit" ? 20 : 25} XP</div>
                  {perfectWin && <div className={styles.jpRewardItem}><GiFlatStar /> PERFECT BONUS</div>}
                </div>
              )}

              <button type="button"
                className={`${styles.jpResultBtn} ${combatResult.type === "win" ? styles.jpResultBtnWin : styles.jpResultBtnLose}`}
                onClick={() => toggleModal("combat")}>
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