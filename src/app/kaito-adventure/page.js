"use client";

import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Image from "next/image";
import styles from "../../styles/Combat.module.css";
import {
  FaUser, FaHeart, FaCoins, FaTrophy, FaShieldAlt, FaBook, FaStore, FaMap, FaTasks,
  FaChartBar, FaUsers, FaCog, FaHourglassHalf, FaPlay, FaPlus, FaGem, FaLock, FaDragon, FaFlask,
  FaShoppingCart, FaRoad, FaExclamationTriangle, FaStar
} from "react-icons/fa";
import { GiCrossedSwords } from "react-icons/gi";


// Initial Player State
const initialPlayer = {
  name: "Kaito",
  level: 1,
  health: 100,
  maxHealth: 100,
  gold: 5,
  xp: 0,
  inventory: [{ name: "Water", quantity: 2 }, { name: "Herbs", quantity: 1 }],
  inventorySlots: 5,
  rareItems: [],
  equipment: { weapon: null, armor: null },
  quests: [],
  recipes: [
    { name: "Herbal Tea", type: "sell", ingredients: ["Water", "Herbs"], baseGold: 10 },
    { name: "Weak Healing Potion", type: "heal", ingredients: ["Water", "Herbs"], healPercent: 0.25, sellValue: 5 },
  ],
  stats: { enemiesDefeated: 0, potionsCrafted: 0, itemsSold: 0, gathers: 0 },
  guild: null,
  skills: [],
  dailyTasks: [],
  weeklyTasks: [],
  avatar: "default",
  trait: null,
};

// Game Constants
const towns = [
  { name: "Sakura Nexus", ingredients: ["Water", "Herbs"], rewardMultiplier: 1.0, demand: { "Herbal Tea": 1.1 }, npcs: [{ name: "Elder", dialogue: "Gather herbs, young one.", quest: { id: 1, description: "Gather 5 Herbs", target: 5, progress: 0, reward: { gold: 10, xp: 20 } } }], level: 1, gatherCooldown: 30000 },
  { name: "Iron Grid", ingredients: ["Iron", "Coal"], rewardMultiplier: 1.1, demand: { "Iron Sword": 1.2 }, npcs: [{ name: "Blacksmith", dialogue: "Forge me a blade!", quest: { id: 2, description: "Craft 1 Iron Sword", target: 1, progress: 0, reward: { gold: 20, xp: 30 } } }], level: 2, gatherCooldown: 45000 },
  { name: "Mist Circuit", ingredients: ["Mist Essence"], rewardMultiplier: 1.2, demand: { "Strong Healing Potion": 1.2 }, npcs: [{ name: "Mystic", dialogue: "The mist awaits...", quest: { id: 3, description: "Gather 3 Mist Essence", target: 3, progress: 0, reward: { gold: 30, xp: 40 } } }], level: 3, gatherCooldown: 60000 },
];

const skillTrees = {
  CyberWarrior: [
    { name: "Neon Slash", level: 0, uses: 0, effect: { damage: 10 }, cost: { gold: 20 }, tree: "CyberWarrior" },
    { name: "Swift Harvest", level: 0, uses: 0, effect: { cooldownReduction: 0.2 }, cost: { gold: 30 }, tree: "CyberWarrior" },
  ],
  TechCraftsman: [
    { name: "Nano Brew", level: 0, uses: 0, effect: { costReduction: 0.1 }, cost: { gold: 25 }, tree: "TechCraftsman" },
  ],
};

const enemies = [
  { name: "Cyber Bandit", health: 50, damage: 5, goldReward: 10, xpReward: 20, dropChance: 0.3, rareDrop: "Plasma Dagger" },
  { name: "Stealth Drone", health: 70, damage: 7, goldReward: 15, xpReward: 30, dropChance: 0.2, rareDrop: "Stealth Module" },
  { name: "Titan Mech", health: 100, damage: 10, goldReward: 20, xpReward: 40, dropChance: 0.1, rareDrop: "Core Circuit" },
];

const recipes = [
  { name: "Herbal Tea", type: "sell", ingredients: ["Water", "Herbs"], baseGold: 10 },
  { name: "Weak Healing Potion", type: "heal", ingredients: ["Water", "Herbs"], healPercent: 0.25, sellValue: 5 },
  { name: "Iron Blade", type: "equip", ingredients: ["Iron", "Coal"], bonus: { damage: 10 }, unlockLevel: 5 },
  { name: "Nano Armor", type: "armor", ingredients: ["Herbs", "Herbs"], bonus: { defense: 5 }, unlockLevel: 10 },
  { name: "Strong Healing Potion", type: "heal", ingredients: ["Mist Essence", "Water"], healPercent: 0.5, sellValue: 15, unlockLevel: 5 },
  { name: "Mist Amplifier", type: "gather", ingredients: ["Mist Essence"], effect: { rareChanceBoost: 0.2, duration: 300000 }, unlockLevel: 3 },
];

const weatherTypes = [
  { type: "Neon Clear", gatherBonus: null, demandBonus: {} },
  { type: "Digital Rain", gatherBonus: { ingredient: "Water", chance: 0.3 }, demandBonus: { "Herbal Tea": 1.1 } },
  { type: "Quantum Fog", gatherBonus: { ingredient: "Mist Essence", chance: 0.2 }, demandBonus: { "Strong Healing Potion": 1.2 } },
];

const events = [
  { type: "Neon Fest", description: "A digital festival boosts demand!", multiplier: 1.5, duration: 300000 },
  { type: "Cyber Raid", description: "A raid looms! Prepare your defenses!", multiplier: 0 },
  { type: "Data Storm", description: "A storm disrupts gathering!", multiplier: 0.5, duration: 180000 },
];

export default function KaitoAdventure() {
  const [player, setPlayer] = useState(() => {
    const saved = localStorage.getItem("kaitoAdventurePlayer");
    return saved ? JSON.parse(saved) : initialPlayer;
  });
  const [currentTown, setCurrentTown] = useState("Sakura Nexus");
  const [weather, setWeather] = useState(weatherTypes[0]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [eventTimer, setEventTimer] = useState(null);
  const [gameMessage, setGameMessage] = useState("Initializing Cyber Adventure...");
  const [modals, setModals] = useState({
    leaderboard: false, quests: false, craft: false, healing: false, gather: false, combat: false,
    market: false, npc: false, daily: false, stats: false, community: false, customize: false,
    events: false, guild: false, skills: false, travel: false, guide: true,
  });
  const [combatState, setCombatState] = useState(null);
  const [combatResult, setCombatResult] = useState(null);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [activeTab, setActiveTab] = useState("drinks");
  const [countdown, setCountdown] = useState(null);
  const [queuedCountdown, setQueuedCountdown] = useState(null);
  const [travelDestination, setTravelDestination] = useState(null);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);

  // Utility Functions
  const xpProgress = (player.xp / (150 * player.level)) * 100;
  const townLevels = towns.reduce((acc, town) => ({ ...acc, [town.name]: town.level }), {});
  const getAvailableIngredients = [
    ...player.inventory,
    ...towns.find(t => t.name === currentTown).ingredients.map(name => ({ name, owned: false, quantity: 0 })),
  ].filter((item, idx, self) => self.findIndex(i => i.name === item.name) === idx);

  const toggleModal = useCallback((modal) => {
    setModals(prev => ({ ...prev, [modal]: !prev[modal] }));
  }, []);

  const formatCountdown = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  // State Persistence
  useEffect(() => {
    localStorage.setItem("kaitoAdventurePlayer", JSON.stringify(player));
  }, [player]);

  // Game Logic Functions
  const sortInventory = () => {
    setPlayer(prev => ({
      ...prev,
      inventory: [...prev.inventory].sort((a, b) => a.name.localeCompare(b.name)),
    }));
    setGameMessage("Inventory reorganized!");
  };

  const upgradeInventory = () => {
    if (player.gold < 50) {
      setGameMessage("Insufficient credits for slot upgrade!");
      return;
    }
    setPlayer(prev => ({
      ...prev,
      gold: prev.gold - 50,
      inventorySlots: prev.inventorySlots + 5,
    }));
    setGameMessage("Storage capacity enhanced by 5 slots!");
  };

  const equipItem = (itemName) => {
    const recipe = player.recipes.find(r => r.name === itemName);
    if (!recipe || player.inventory.find(i => i.name === itemName)?.quantity < 1) {
      setGameMessage("Item unavailable for equipping!");
      return;
    }
    setPlayer(prev => {
      const newInventory = prev.inventory.map(i => i.name === itemName ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0);
      return {
        ...prev,
        inventory: newInventory,
        equipment: { ...prev.equipment, [recipe.type === "equip" ? "weapon" : "armor"]: itemName },
      };
    });
    setGameMessage(`${itemName} activated in your gear!`);
  };

  const useGatherPotion = (itemName) => {
    const recipe = player.recipes.find(r => r.name === itemName);
    if (!recipe || player.inventory.find(i => i.name === itemName)?.quantity < 1) {
      setGameMessage("No amplifiers available!");
      return;
    }
    setPlayer(prev => {
      const newInventory = prev.inventory.map(i => i.name === itemName ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0);
      return { ...prev, inventory: newInventory };
    });
    setCountdown(recipe.effect.duration / 1000);
    setGameMessage(`${itemName} deployed! Rarity boosted for ${recipe.effect.duration / 60000} minutes.`);
  };

  const startCombat = () => {
    const enemy = enemies[Math.floor(Math.random() * enemies.length)];
    setCombatState({
      playerHealth: player.health,
      enemy: { ...enemy, health: enemy.health },
      enemyHealth: enemy.health,
      log: [`Engaging ${enemy.name} in cyber combat!`],
      isAttacking: false,
    });
    toggleModal("combat");
  };

  const attackEnemy = (type) => {
    if (!combatState || combatState.isAttacking || combatResult) return;
    setCombatState(prev => ({ ...prev, isAttacking: true }));
    const skill = type !== "Basic Attack" ? player.skills.find(s => s.name === type) : null;
    const damage = skill ? skill.effect.damage || 5 : 5;
    const playerDamage = damage + (player.equipment.weapon ? recipes.find(r => r.name === player.equipment.weapon)?.bonus.damage || 0 : 0);

    setTimeout(() => {
      setCombatState(prev => {
        const enemyHealth = Math.max(0, prev.enemyHealth - playerDamage);
        const log = [...prev.log, `You inflicted ${playerDamage} damage on ${prev.enemy.name}!`];
        if (enemyHealth <= 0) {
          const gold = prev.enemy.goldReward;
          const xp = prev.enemy.xpReward;
          const drop = Math.random() < prev.enemy.dropChance ? prev.enemy.rareDrop : null;
          setPlayer(p => ({
            ...p,
            gold: p.gold + gold,
            xp: p.xp + xp,
            rareItems: drop ? [...p.rareItems, drop] : p.rareItems,
            stats: { ...p.stats, enemiesDefeated: p.stats.enemiesDefeated + 1 },
          }));
          setCombatResult({ type: "win", message: `Victory! Acquired ${gold} credits, ${xp} XP${drop ? `, and ${drop}` : ""}.` });
          return { ...prev, enemyHealth, log, isAttacking: false };
        }

        const enemyDamage = prev.enemy.damage - (player.equipment.armor ? recipes.find(r => r.name === player.equipment.armor)?.bonus.defense || 0 : 0);
        const newPlayerHealth = Math.max(0, prev.playerHealth - enemyDamage);
        const newLog = [...log, `${prev.enemy.name} countered with ${enemyDamage} damage!`];
        if (newPlayerHealth <= 0) {
          setCombatResult({ type: "loss", message: "System overload! Deploy a potion to recover." });
        }
        setPlayer(p => ({ ...p, health: newPlayerHealth }));
        return { ...prev, enemyHealth, playerHealth: newPlayerHealth, log: newLog, isAttacking: false };
      });
    }, 1000);
  };

  const craftPotionInCombat = (recipeName) => {
    if (!combatState || combatState.isAttacking || combatResult) return;
    const recipe = player.recipes.find(r => r.name === recipeName);
    if (!recipe || !recipe.ingredients.every(ing => player.inventory.find(i => i.name === ing)?.quantity > 0)) {
      setCombatState(prev => ({ ...prev, log: [...prev.log, "Insufficient components for nano-repair!"] }));
      return;
    }
    setCombatState(prev => ({ ...prev, isAttacking: true }));
    setTimeout(() => {
      setPlayer(prev => {
        const newInventory = prev.inventory.map(item => 
          recipe.ingredients.includes(item.name) ? { ...item, quantity: item.quantity - 1 } : item
        ).filter(i => i.quantity > 0);
        const newHealth = Math.min(prev.maxHealth, prev.health + (prev.maxHealth * recipe.healPercent));
        return { ...prev, inventory: newInventory, health: newHealth, stats: { ...prev.stats, potionsCrafted: prev.stats.potionsCrafted + 1 } };
      });
      setCombatState(prev => ({
        ...prev,
        playerHealth: Math.min(player.maxHealth, prev.playerHealth + (player.maxHealth * recipe.healPercent)),
        log: [...prev.log, `Nano-repair ${recipeName} deployed! Restored ${recipe.healPercent * 100}% vitality.`],
        isAttacking: false,
      }));
    }, 1000);
  };

  const craftItem = () => {
    const selectedRecipe = player.recipes.find(r => 
      r.ingredients.every(ing => selectedIngredients.filter(i => i === ing).length >= r.ingredients.filter(i => i === ing).length) && 
      r.ingredients.length === selectedIngredients.length
    );
    if (!selectedRecipe) {
      setGameMessage("Invalid blueprint detected!");
      return;
    }
    if (!selectedRecipe.ingredients.every(ing => player.inventory.find(i => i.name === ing)?.quantity > 0)) {
      setGameMessage("Component shortage!");
      return;
    }
    const success = Math.random() < (player.trait === "craftsman" ? 0.9 : 0.8);
    if (!success) {
      setPlayer(prev => ({
        ...prev,
        inventory: prev.inventory.map(i => selectedRecipe.ingredients.includes(i.name) ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0),
      }));
      setGameMessage("Fabrication error! Components lost.");
      setSelectedIngredients([]);
      return;
    }
    setPlayer(prev => {
      const newInventory = prev.inventory.map(i => 
        selectedRecipe.ingredients.includes(i.name) ? { ...i, quantity: i.quantity - 1 } : i
      ).filter(i => i.quantity > 0);
      const existingItem = newInventory.find(i => i.name === selectedRecipe.name);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        newInventory.push({ name: selectedRecipe.name, quantity: 1 });
      }
      return {
        ...prev,
        inventory: newInventory,
        stats: { ...prev.stats, potionsCrafted: prev.stats.potionsCrafted + (selectedRecipe.type === "heal" || selectedRecipe.type === "gather" ? 1 : 0) },
      };
    });
    setGameMessage(`${selectedRecipe.name} successfully fabricated!`);
    setSelectedIngredients([]);
    toggleModal("craft");
  };

  const toggleIngredient = (ingredient) => {
    setSelectedIngredients(prev => 
      prev.includes(ingredient) ? prev.filter(i => i !== ingredient) : [...prev, ingredient]
    );
  };

  const gatherSingle = () => {
    if (countdown > 0) {
      setGameMessage("Harvesting on cooldown!");
      return;
    }
    const townIngredients = towns.find(t => t.name === currentTown).ingredients;
    const gatheredItem = townIngredients[Math.floor(Math.random() * townIngredients.length)];
    const rareChance = weather.gatherBonus && weather.gatherBonus.ingredient === gatheredItem ? weather.gatherBonus.chance : 0;
    const isRare = Math.random() < rareChance;
    setPlayer(prev => {
      const newInventory = [...prev.inventory];
      const item = newInventory.find(i => i.name === (isRare ? weather.gatherBonus.ingredient : gatheredItem));
      if (item) {
        item.quantity += 1;
      } else {
        newInventory.push({ name: isRare ? weather.gatherBonus.ingredient : gatheredItem, quantity: 1 });
      }
      return { ...prev, inventory: newInventory, stats: { ...prev.stats, gathers: prev.stats.gathers + 1 } };
    });
    const cooldown = towns.find(t => t.name === currentTown).gatherCooldown / (player.skills.find(s => s.name === "Swift Harvest")?.effect.cooldownReduction || 1);
    setCountdown(cooldown / 1000);
    setGameMessage(`Harvested ${isRare ? weather.gatherBonus.ingredient : gatheredItem}${isRare ? " (Rare)!" : "!"}`);
    updateQuests(gatheredItem);
  };

  const queueGathers = (count) => {
    if (player.gold < count || queuedCountdown > 0) {
      setGameMessage(player.gold < count ? "Insufficient credits!" : "Queue processing!");
      return;
    }
    setPlayer(prev => ({ ...prev, gold: prev.gold - count }));
    const townIngredients = towns.find(t => t.name === currentTown).ingredients;
    let gathered = [];
    for (let i = 0; i < count; i++) {
      const item = townIngredients[Math.floor(Math.random() * townIngredients.length)];
      const rareChance = weather.gatherBonus && weather.gatherBonus.ingredient === item ? weather.gatherBonus.chance : 0;
      const isRare = Math.random() < rareChance;
      gathered.push(isRare ? weather.gatherBonus.ingredient : item);
    }
    setPlayer(prev => {
      const newInventory = [...prev.inventory];
      gathered.forEach(item => {
        const existing = newInventory.find(i => i.name === item);
        if (existing) existing.quantity += 1;
        else newInventory.push({ name: item, quantity: 1 });
      });
      return { ...prev, inventory: newInventory, stats: { ...prev.stats, gathers: prev.stats.gathers + count } };
    });
    setQueuedCountdown(180);
    setGameMessage(`Queued ${count} harvests: ${gathered.join(", ")}!`);
    gathered.forEach(updateQuests);
  };

  const sellDrink = (itemName) => {
    const recipe = player.recipes.find(r => r.name === itemName);
    if (!recipe || player.inventory.find(i => i.name === itemName)?.quantity < 1) return;
    const townData = towns.find(t => t.name === currentTown);
    const demandMultiplier = (townData.demand[itemName] || 1.0) * (currentEvent?.type === "Neon Fest" ? 1.5 : 1) * (weather.demandBonus[itemName] || 1);
    const price = Math.floor((recipe.baseGold || recipe.sellValue) * townData.rewardMultiplier * demandMultiplier);
    setPlayer(prev => {
      const newInventory = prev.inventory.map(i => i.name === itemName ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0);
      return {
        ...prev,
        inventory: newInventory,
        gold: prev.gold + price,
        stats: { ...prev.stats, itemsSold: prev.stats.itemsSold + 1 },
      };
    });
    setGameMessage(`Transferred ${itemName} for ${price} credits!`);
  };

  const buyIngredient = (ingredient, price) => {
    const cost = Math.floor(price / townLevels[currentTown]);
    if (player.gold < cost) {
      setGameMessage("Insufficient credits for acquisition!");
      return;
    }
    setPlayer(prev => {
      const newInventory = [...prev.inventory];
      const item = newInventory.find(i => i.name === ingredient);
      if (item) item.quantity += 1;
      else newInventory.push({ name: ingredient, quantity: 1 });
      return { ...prev, inventory: newInventory, gold: prev.gold - cost };
    });
    setGameMessage(`Acquired ${ingredient} for ${cost} credits!`);
  };

  const addQuest = (quest) => {
    if (player.quests.length >= 3) {
      setGameMessage("Mission log at capacity!");
      return;
    }
    setPlayer(prev => ({ ...prev, quests: [...prev.quests, { ...quest, progress: 0 }] }));
    setGameMessage(`Mission accepted: ${quest.description}`);
    toggleModal("npc");
  };

  const travel = (town) => {
    if (currentTown === town || modals.travel) return;
    setTravelDestination(town);
    toggleModal("travel");
    setTimeout(() => {
      setCurrentTown(town);
      setPlayer(prev => ({ ...prev, xp: prev.xp + 2 }));
      setGameMessage(`Teleported to ${town}! +2 XP`);
      toggleModal("travel");
      checkLevelUp();
    }, 2000);
  };

  const contributeToGuild = () => {
    if (player.gold < 10) {
      setGameMessage("Insufficient credits to contribute!");
      return;
    }
    setPlayer(prev => ({
      ...prev,
      gold: prev.gold - 10,
      guild: { ...prev.guild, progress: prev.guild.progress + 10 },
    }));
    setGameMessage("Contributed 10 credits to the guild!");
    if (player.guild.progress + 10 >= player.guild.target) {
      setPlayer(prev => ({
        ...prev,
        gold: prev.gold + 50,
        guild: { ...prev.guild, progress: 0 },
      }));
      setGameMessage("Guild objective achieved! +50 credits reward!");
    }
  };

  const joinGuild = (name) => {
    setPlayer(prev => ({ ...prev, guild: { name, progress: 0, target: 100 } }));
    setGameMessage(`Linked with ${name} network!`);
    toggleModal("guild");
  };

  const customizeCharacter = (name, avatar, trait) => {
    setPlayer(prev => ({ ...prev, name, avatar, trait: trait === "null" ? null : trait }));
    setGameMessage("Avatar recalibrated!");
    toggleModal("customize");
  };

  const unlockSkill = (skillName, tree) => {
    const skill = skillTrees[tree].find(s => s.name === skillName);
    if (player.gold < skill.cost.gold) {
      setGameMessage("Insufficient credits to unlock module!");
      return;
    }
    setPlayer(prev => ({
      ...prev,
      gold: prev.gold - skill.cost.gold,
      skills: [...prev.skills, { ...skill, level: 1, uses: 0, effect: { ...skill.effect } }],
    }));
    setGameMessage(`${skillName} module integrated!`);
  };

  const mockCommunityEvent = () => ({
    description: "Neon Fest in Sakura Nexus! Amplify rewards with contribution.",
    action: () => {
      if (player.gold < 5) {
        setGameMessage("Insufficient credits to contribute!");
        return;
      }
      setPlayer(prev => ({ ...prev, gold: prev.gold - 5 }));
      setGameMessage("Amplified Neon Fest! Rewards enhanced.");
    },
  });

  const checkLevelUp = () => {
    if (player.xp >= 150 * player.level) {
      setPlayer(prev => ({
        ...prev,
        level: prev.level + 1,
        xp: prev.xp - (150 * prev.level),
        maxHealth: prev.maxHealth + 10,
        health: prev.health + 10,
      }));
      setGameMessage(`System upgrade! Now Level ${player.level + 1}. +10 Max Vitality!`);
    }
  };

  const updateQuests = (item) => {
    setPlayer(prev => {
      const updatedQuests = prev.quests.map(q => {
        if (q.description.includes(item) && q.progress < q.target) {
          const newProgress = q.progress + 1;
          if (newProgress >= q.target) {
            setGameMessage(`Mission completed: ${q.description}! Reward: ${q.reward.gold || 0} credits, ${q.reward.xp || 0} XP`);
            setPlayer(p => ({
              ...p,
              gold: p.gold + (q.reward.gold || 0),
              xp: p.xp + (q.reward.xp || 0),
            }));
            return null;
          }
          return { ...q, progress: newProgress };
        }
        return q;
      }).filter(q => q !== null);
      return { ...prev, quests: updatedQuests };
    });
    checkLevelUp();
  };

  // Game Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (countdown > 0) setCountdown(prev => prev - 1);
      if (queuedCountdown > 0) setQueuedCountdown(prev => prev - 1);
      if (eventTimer && Date.now() > eventTimer) {
        setCurrentEvent(null);
        setEventTimer(null);
        setGameMessage("Event terminated!");
      }
    }, 1000);

    if (Math.random() < 0.05) {
      const newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
      setWeather(newWeather);
      setGameMessage(`Atmospheric shift to ${newWeather.type}!`);
    }
    if (!currentEvent && Math.random() < 0.02) {
      const newEvent = events[Math.floor(Math.random() * events.length)];
      setCurrentEvent(newEvent);
      setEventTimer(Date.now() + (newEvent.duration || 300000));
      setGameMessage(newEvent.description);
    }

    return () => clearInterval(interval);
  }, [countdown, queuedCountdown, eventTimer, currentEvent]);

  // Render
  return (
    <div className={styles.page}>
      <Head><title>Kaito's Cyber Adventure</title></Head>
      <div className={styles.hud}>
        <button className={styles.leaderboardBtn} onClick={() => toggleModal("leaderboard")}>
          <FaTrophy /> Nexus Leaderboard
        </button>
        <div className={styles.mainCard}>
          <h1 className={styles.playerTitle}>
            <Image src={`/avatars/${player.avatar}.jpg`} alt="Avatar" width={32} height={32} className={styles.avatar} />
            <FaUser className={styles.icon} /> {player.name} (Level {player.level})
          </h1>
          <div className={styles.stats}>
            <span><FaHeart className={styles.icon} /> Vitality: {player.health}/{player.maxHealth}</span>
            <span><FaCoins className={styles.icon} /> Credits: {player.gold}</span>
            <span>XP: {player.xp}</span>
          </div>
          <div className={styles.xpBar}>
            <div className={styles.xpFill} style={{ width: `${xpProgress}%` }} />
            <span className={styles.xpLabel}>{Math.round(xpProgress)}%</span>
          </div>
          <p className={styles.townInfo}><FaMap className={styles.icon} /> Sector: {currentTown} (Level {townLevels[currentTown]}) | Grid Status: {weather.type}</p>
          {currentEvent && (
            <p className={styles.eventText}>
              <FaGem className={styles.icon} /> {currentEvent.description} {eventTimer ? `(${formatCountdown(Math.max(0, Math.floor((eventTimer - Date.now()) / 1000)))})` : ""}
            </p>
          )}
          <p className={styles.gameMessage}>{gameMessage}</p>

          <h2 className={styles.sectionTitle}><FaBook className={styles.icon} /> Quantum Inventory (Max: {player.inventorySlots})</h2>
          <div className={styles.inventoryControls}>
            <button className={styles.controlBtn} onClick={sortInventory}><FaCog /> Reorganize</button>
            <button className={styles.controlBtn} onClick={upgradeInventory}><FaPlus /> Expand (50c)</button>
          </div>
          <ul className={styles.inventoryList}>
            {player.inventory.map(item => (
              <li key={item.name} className={styles.inventoryItem}>
                {item.name}: {item.quantity}
                {(player.recipes.find(r => r.name === item.name && (r.type === "equip" || r.type === "armor"))) && (
                  <button className={styles.actionBtn} onClick={() => equipItem(item.name)}><GiCrossedSwords /> Equip</button>
                )}
                {(player.recipes.find(r => r.name === item.name && r.type === "gather")) && (
                  <button className={styles.actionBtn} onClick={() => useGatherPotion(item.name)}><FaPlay /> Deploy</button>
                )}
              </li>
            ))}
          </ul>
          <p><FaGem className={styles.icon} /> Rare Modules: {player.rareItems.join(", ") || "None"}</p>
          <p>
            <GiCrossedSwords className={styles.icon} /> Weapon: {player.equipment.weapon || "None"} | 
            <FaShieldAlt className={styles.icon} /> Armor: {player.equipment.armor || "None"}
          </p>

          <h2 className={styles.sectionTitle}><FaStore className={styles.icon} /> Sector Resources in {currentTown}</h2>
          <ul className={styles.ingredientsList}>
            {getAvailableIngredients.map(item => (
              <li key={item.name} className={styles.ingredientItem}>
                {item.name}: {item.owned ? item.quantity : towns.find(t => t.name === currentTown).ingredients.includes(item.name) ? "∞ (Sector)" : "0"}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <footer className={styles.actionsFooter}>
        <div className={styles.actions}>
          <div className={styles.actionDropdown}>
            <button className={styles.dropdownBtn}><FaBook /> Fabricate</button>
            <div className={styles.dropdownContent}>
              <button onClick={() => toggleModal("craft")}>Nano Items</button>
              <button onClick={() => toggleModal("healing")}>Repair Potion</button>
            </div>
          </div>
          <button className={styles.actionBtn} onClick={startCombat}><GiCrossedSwords /> Engage</button>
          <div className={styles.actionDropdown}>
            <button className={styles.dropdownBtn}><FaMap /> Sector</button>
            <div className={styles.dropdownContent}>
              <button onClick={() => toggleModal("market")}>Trade Hub</button>
              <button onClick={() => toggleModal("gather")}>Harvest</button>
              <div className={styles.dropdownHeader}>Teleport</div>
              {towns.map(town => (
                <button key={town.name} onClick={() => travel(town.name)} disabled={currentTown === town.name || modals.travel}>
                  {town.name}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.actionDropdown}>
            <button className={styles.dropdownBtn}><FaTasks /> Missions ({player.quests.length})</button>
            <div className={styles.dropdownContent}>
              <button onClick={() => toggleModal("quests")}>Missions</button>
              <button onClick={() => toggleModal("daily")}>Tasks</button>
            </div>
          </div>
          <div className={styles.actionDropdown}>
            <button className={styles.dropdownBtn}><FaChartBar /> Diagnostics</button>
            <div className={styles.dropdownContent}>
              <button onClick={() => toggleModal("stats")}>Stats</button>
              <button onClick={() => toggleModal("skills")}>Modules</button>
              <button onClick={() => toggleModal("leaderboard")}>Leaderboard</button>
            </div>
          </div>
          <div className={styles.actionDropdown}>
            <button className={styles.dropdownBtn}><FaCog /> System</button>
            <div className={styles.dropdownContent}>
              <button onClick={() => toggleModal("community")}>Network Events</button>
              <button onClick={() => toggleModal("customize")}>Recalibrate</button>
              <button onClick={() => toggleModal("events")}>Grid Status</button>
              <button onClick={() => toggleModal("guild")}>Guild {player.guild ? `(${player.guild.name})` : ""}</button>
            </div>
          </div>
        </div>
        {countdown !== null && countdown > 0 && (
          <p className={styles.countdown}><FaHourglassHalf /> Harvest: {formatCountdown(countdown)}</p>
        )}
        {queuedCountdown !== null && queuedCountdown > 0 && (
          <p className={styles.countdown}><FaHourglassHalf /> Queue: {formatCountdown(queuedCountdown)}</p>
        )}
      </footer>

      {/* Modals */}
      {Object.entries(modals).map(([key, isOpen]) => isOpen && (
        <div key={key} className={styles.modalOverlay}>
          <div className={styles.modal}>
            {key === "quests" && (
              <>
                <div className={styles.modalHeader}><FaTasks /> Mission Log<button className={styles.closeBtn} onClick={() => toggleModal("quests")}>X</button></div>
                <div className={styles.modalBody}>
                  <ul className={styles.list}>
                    {player.quests.map(quest => (
                      <li key={quest.id}>
                        {quest.description} - {quest.progress}/{quest.target}<br />
                        Reward: {quest.reward.gold ? `${quest.reward.gold} Credits` : ""} {quest.reward.xp ? `${quest.reward.xp} XP` : ""}
                      </li>
                    ))}
                  </ul>
                  <button className={styles.actionBtn} onClick={() => addQuest(towns.find(t => t.name === currentTown).npcs[0].quest)} disabled={player.quests.length >= 3}>Accept Mission</button>
                </div>
              </>
            )}
            {key === "leaderboard" && (
              <>
                <div className={styles.modalHeader}><FaTrophy /> Nexus Leaderboard<button className={styles.closeBtn} onClick={() => toggleModal("leaderboard")}>X</button></div>
                <div className={styles.modalBody}>
                  <ul className={styles.list}>
                    {leaderboardData.map((entry, index) => (
                      <li key={entry.wallet_address}>
                        {index + 1}. {entry.name} - Level {entry.level} - {entry.gold} Credits
                        <br />
                        <small>{entry.wallet_address?.slice(0, 6)}...{entry.wallet_address?.slice(-4)}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            {key === "craft" && (
              <>
                <div className={styles.modalHeader}><FaFlask /> Fabrication Matrix<button className={styles.closeBtn} onClick={() => toggleModal("craft")}>X</button></div>
                <div className={styles.modalBody}>
                  <h5>Select Components:</h5>
                  {getAvailableIngredients.map(item => (
                    <label key={item.name} className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={selectedIngredients.includes(item.name)}
                        onChange={() => toggleIngredient(item.name)}
                        disabled={!item.owned || item.quantity === 0}
                      />
                      {item.name} ({item.owned ? item.quantity : "∞"}) (Selected: {selectedIngredients.filter(i => i === item.name).length})
                    </label>
                  ))}
                  <div className={styles.tabs}>
                    <button className={activeTab === "drinks" ? styles.activeTab : ""} onClick={() => setActiveTab("drinks")}>Drinks</button>
                    <button className={activeTab === "weapons" ? styles.activeTab : ""} onClick={() => setActiveTab("weapons")}>Weapons</button>
                    <button className={activeTab === "armor" ? styles.activeTab : ""} onClick={() => setActiveTab("armor")}>Armor</button>
                    <button className={activeTab === "potions" ? styles.activeTab : ""} onClick={() => setActiveTab("potions")}>Potions</button>
                  </div>
                  <div className={styles.tabContent}>
                    {activeTab === "drinks" && (
                      <ul>{player.recipes.filter(r => r.type === "sell").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")}</li>)}</ul>
                    )}
                    {activeTab === "weapons" && (
                      <ul>{player.recipes.filter(r => r.type === "equip").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")} (Bonus: +{r.bonus.damage} Damage)</li>)}</ul>
                    )}
                    {activeTab === "armor" && (
                      <ul>{player.recipes.filter(r => r.type === "armor").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")} (Defense: {r.bonus.defense}) {r.unlockLevel > player.level ? "(Locked)" : ""}</li>)}</ul>
                    )}
                    {activeTab === "potions" && (
                      <ul>
                        {player.recipes.filter(r => r.type === "heal" || r.type === "gather").map(r => (
                          <li key={r.name}>
                            {r.name}: {r.ingredients.join(", ")}
                            {r.type === "heal" && ` (Heal: ${r.healPercent * 100}% HP, Sell: ${r.sellValue} credits)`}
                            {r.type === "gather" && ` (Effect: ${r.effect.rareChanceBoost ? `+${r.effect.rareChanceBoost * 100}% Rare Chance` : `-${r.effect.cooldownReduction * 100}% Cooldown`}, ${r.effect.duration / 60000} min)`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button className={styles.actionBtn} onClick={craftItem}>Fabricate</button>
                </div>
              </>
            )}
            {key === "healing" && (
              <>
                <div className={styles.modalHeader}><FaFlask /> Repair Protocols<button className={styles.closeBtn} onClick={() => toggleModal("healing")}>X</button></div>
                <div className={styles.modalBody}>
                  <p>Activate repair potions via Fabrication Matrix for trade, or deploy in combat for emergency restoration.</p>
                </div>
              </>
            )}
            {key === "gather" && (
              <>
                <div className={styles.modalHeader}><FaMap /> Harvest Interface<button className={styles.closeBtn} onClick={() => toggleModal("gather")}>X</button></div>
                <div className={styles.modalBody}>
                  <div className={styles.gatherCard}>
                    <h5>Single Harvest</h5>
                    <p>Extract one resource (cooldown varies). {weather.gatherBonus ? `Bonus: ${weather.gatherBonus.chance * 100}% chance for ${weather.gatherBonus.ingredient}` : ""}</p>
                    <button className={styles.actionBtn} onClick={gatherSingle} disabled={countdown > 0}>Harvest Now</button>
                  </div>
                  <div className={styles.gatherCard}>
                    <h5>Queue Harvests</h5>
                    <p>1 credit per harvest, max 5 (3-min cooldown).</p>
                    <div className={styles.gatherOptions}>
                      {[1, 2, 3, 4, 5].map(count => (
                        <button
                          key={count}
                          className={styles.actionBtn}
                          onClick={() => queueGathers(count)}
                          disabled={player.gold < count || queuedCountdown > 0}
                        >
                          {count} ({count}c)
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            {key === "combat" && (
              <>
                <div className={styles.combatModal}>
                  <div className={styles.combatHeader}>Combat Grid<button className={styles.closeBtn} onClick={() => toggleModal("combat")}>X</button></div>
                  <div className={styles.combatBody}>
                    {combatState && (
                      <div className={styles.combatGrid}>
                        <div className={styles.combatSide}>
                          <h4>Kaito</h4>
                          <div className={styles.healthBar}>
                            <div className={styles.healthFill} style={{ width: `${(combatState.playerHealth / player.maxHealth) * 100}%` }} />
                          </div>
                          <p>Vitality: {combatState.playerHealth}/{player.maxHealth}</p>
                          <div className={combatState.isAttacking ? styles.attacking : ""}>[Kaito Node]</div>
                        </div>
                        <div className={styles.vs}>VS</div>
                        <div className={styles.combatSide}>
                          <h4>{combatState.enemy.name}</h4>
                          <div className={styles.healthBar}>
                            <div className={styles.healthFill} style={{ width: `${(combatState.enemyHealth / combatState.enemy.health) * 100}%` }} />
                          </div>
                          <p>Vitality: {combatState.enemyHealth}/{combatState.enemy.health}</p>
                          <div className={combatState.isAttacking ? styles.enemyHit : ""}>[Enemy Node]</div>
                        </div>
                      </div>
                    )}
                    <div className={styles.combatControls}>
                      <button className={styles.actionBtn} onClick={() => attackEnemy("Basic Attack")} disabled={!combatState || combatState?.isAttacking || combatResult}>Pulse Strike</button>
                      <div className={styles.inlineForm}>
                        <select
                          onChange={(e) => attackEnemy(e.target.value)}
                          disabled={!combatState || combatState?.isAttacking || combatResult}
                          className={styles.select}
                        >
                          <option value="">Select Module</option>
                          {player.skills
                            .filter(s => s.level > 0 && (s.tree === "CyberWarrior" || s.effect.damage))
                            .map(skill => (
                              <option key={skill.name} value={skill.name}>
                                {skill.name} (Lv {skill.level})
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className={styles.inlineForm}>
                        <select
                          onChange={(e) => craftPotionInCombat(e.target.value)}
                          disabled={!combatState || combatState?.isAttacking || combatResult}
                          className={styles.select}
                        >
                          <option value="">Deploy Potion</option>
                          {player.recipes
                            .filter(r => r.type === "heal")
                            .map(recipe => (
                              <option key={recipe.name} value={recipe.name}>
                                {recipe.name} ({recipe.ingredients.join(", ")})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    {combatState && (
                      <ul className={styles.combatLog}>
                        {combatState.log.map((entry, idx) => <li key={idx}>{entry}</li>)}
                      </ul>
                    )}
                    {combatResult && (
                      <div className={combatResult.type === "win" ? styles.combatWin : styles.combatLoss}>
                        {combatResult.message}
                      </div>
                    )}
                  </div>
                  <div className={styles.combatFooter}>
                    <button className={styles.actionBtn} onClick={() => toggleModal("combat")} disabled={combatResult}>Disengage</button>
                  </div>
                </div>
              </>
            )}
            {key === "market" && (
              <>
                <div className={styles.modalHeader}><FaShoppingCart /> {currentTown} Trade Hub<button className={styles.closeBtn} onClick={() => toggleModal("market")}>X</button></div>
                <div className={styles.modalBody}>
                  <h5>Offload Assets:</h5>
                  <ul className={styles.list}>
                    {player.inventory.filter(item => player.recipes.some(r => r.name === item.name && (r.type === "sell" || r.type === "heal"))).map(item => {
                      const recipe = player.recipes.find(r => r.name === item.name);
                      const townData = towns.find(t => t.name === currentTown);
                      const demandMultiplier = (townData.demand[item.name] || 1.0) * (currentEvent?.type === "Neon Fest" ? 1.5 : 1) * (weather.demandBonus[item.name] || 1);
                      const price = Math.floor((recipe.baseGold || recipe.sellValue) * townData.rewardMultiplier * demandMultiplier);
                      return (
                        <li key={item.name} className={styles.tradeItem}>
                          <span>{item.name}: {item.quantity} (Trades for {price} credits each)</span>
                          <button className={styles.actionBtn} onClick={() => sellDrink(item.name)} disabled={item.quantity === 0}>Offload</button>
                        </li>
                      );
                    })}
                  </ul>
                  <h5>Acquisition Nodes:</h5>
                  <ul className={styles.list}>
                    {towns.find(t => t.name === currentTown).npcs.map(npc => ({
                      ingredient: towns.find(t => t.name === currentTown).ingredients[0],
                      price: 10,
                    })).map((offer, idx) => (
                      <li key={idx} className={styles.tradeItem}>
                        <span>{offer.ingredient} (Acquire for {Math.floor(offer.price / townLevels[currentTown])} credits)</span>
                        <button className={styles.actionBtn} onClick={() => buyIngredient(offer.ingredient, offer.price)} disabled={player.gold < Math.floor(offer.price / townLevels[currentTown])}>Acquire</button>
                      </li>
                    ))}
                  </ul>
                  <button className={styles.actionBtn} onClick={() => { setSelectedNPC(towns.find(t => t.name === currentTown).npcs[0]); toggleModal("npc"); }}>Interface NPC</button>
                </div>
              </>
            )}
            {key === "npc" && (
              <>
                <div className={styles.modalHeader}>Comm with {selectedNPC?.name}<button className={styles.closeBtn} onClick={() => toggleModal("npc")}>X</button></div>
                <div className={styles.modalBody}>
                  <p>{selectedNPC?.dialogue}</p>
                  {selectedNPC?.quest && !player.quests.some(q => q.id === selectedNPC.quest.id) && (
                    <button className={styles.actionBtn} onClick={() => addQuest(selectedNPC.quest)}>Accept Mission</button>
                  )}
                </div>
              </>
            )}
            {key === "daily" && (
              <>
                <div className={styles.modalHeader}><FaTasks /> Task Matrix<button className={styles.closeBtn} onClick={() => toggleModal("daily")}>X</button></div>
                <div className={styles.modalBody}>
                  <p>Daily Boot Bonus: 20 Credits (Claimed)</p>
                  <h5>Daily Directives:</h5>
                  <ul className={styles.list}>
                    {player.dailyTasks.map(task => (
                      <li key={task.id}>
                        {task.description} - {task.progress}/{task.target}<br />
                        Reward: {task.reward.gold ? `${task.reward.gold} Credits` : ""} {task.reward.xp ? `${task.reward.xp} XP` : ""}<br />
                        Time Left: {formatCountdown(Math.max(0, Math.floor((task.expires - Date.now()) / 1000)))}
                        {task.completed && " (Completed)"}
                      </li>
                    ))}
                  </ul>
                  <h5>Weekly Protocols:</h5>
                  <ul className={styles.list}>
                    {player.weeklyTasks.map(task => (
                      <li key={task.id}>
                        {task.description} - {task.progress}/{task.target}<br />
                        Reward: {task.reward.gold ? `${task.reward.gold} Credits` : ""} {task.reward.xp ? `${task.reward.xp} XP` : ""}<br />
                        Time Left: {formatCountdown(Math.max(0, Math.floor((task.expires - Date.now()) / 1000)))}
                        {task.completed && " (Completed)"}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            {key === "stats" && (
              <>
                <div className={styles.modalHeader}><FaChartBar /> System Diagnostics<button className={styles.closeBtn} onClick={() => toggleModal("stats")}>X</button></div>
                <div className={styles.modalBody}>
                  <ul className={styles.list}>
                    <li>Enemies Neutralized: {player.stats.enemiesDefeated}</li>
                    <li>Potions Fabricated: {player.stats.potionsCrafted}</li>
                    <li>Assets Offloaded: {player.stats.itemsSold}</li>
                    <li>Harvests Executed: {player.stats.gathers}</li>
                  </ul>
                </div>
              </>
            )}
            {key === "community" && (
              <>
                <div className={styles.modalHeader}><FaUsers /> Network Events<button className={styles.closeBtn} onClick={() => toggleModal("community")}>X</button></div>
                <div className={styles.modalBody}>
                  <p>{mockCommunityEvent().description}</p>
                  <button className={styles.actionBtn} onClick={mockCommunityEvent().action}>Contribute</button>
                </div>
              </>
            )}
            {key === "customize" && (
              <>
                <div className={styles.modalHeader}><FaUser /> Avatar Calibration<button className={styles.closeBtn} onClick={() => toggleModal("customize")}>X</button></div>
                <div className={styles.modalBody}>
                  <div className={styles.form}>
                    <label>Name</label>
                    <input type="text" defaultValue={player.name} id="customName" className={styles.input} />
                    <label>Avatar</label>
                    <select defaultValue={player.avatar} id="customAvatar" className={styles.select}>
                      <option value="default">Default</option>
                      <option value="warrior">CyberWarrior</option>
                      <option value="craftsman">TechCraftsman</option>
                    </select>
                    <label>Trait</label>
                    <select defaultValue={player.trait} id="customTrait" className={styles.select}>
                      <option value={null}>None</option>
                      <option value="warrior">CyberWarrior (+5 Damage)</option>
                      <option value="craftsman">TechCraftsman (+10% Craft Success)</option>
                    </select>
                    <button className={styles.actionBtn} onClick={() => customizeCharacter(
                      document.getElementById("customName").value,
                      document.getElementById("customAvatar").value,
                      document.getElementById("customTrait").value
                    )}>Save</button>
                  </div>
                </div>
              </>
            )}
            {key === "guild" && (
              <>
                <div className={styles.modalHeader}><FaDragon /> Guild Network<button className={styles.closeBtn} onClick={() => toggleModal("guild")}>X</button></div>
                <div className={styles.modalBody}>
                  {player.guild ? (
                    <>
                      <p>Node: {player.guild.name}</p>
                      <p>Progress: {player.guild.progress}/{player.guild.target} Credits</p>
                      <button className={styles.actionBtn} onClick={contributeToGuild}>Contribute 10 Credits</button>
                    </>
                  ) : (
                    <>
                      <p>Link to a guild to amplify collective goals!</p>
                      <button className={styles.actionBtn} onClick={() => joinGuild("Dragon Clan")}>Join Dragon Clan</button>
                      <button className={styles.actionBtn} onClick={() => joinGuild("Mist Guardians")}>Join Mist Guardians</button>
                    </>
                  )}
                </div>
              </>
            )}
            {key === "skills" && (
              <>
                <div className={styles.modalHeader}><FaStar /> Module Matrix<button className={styles.closeBtn} onClick={() => toggleModal("skills")}>X</button></div>
                <div className={styles.modalBody}>
                  <div className={styles.tabs}>
                    {Object.keys(skillTrees).map(tree => (
                      <button key={tree} className={activeTab === tree ? styles.activeTab : ""} onClick={() => setActiveTab(tree)}>{tree}</button>
                    ))}
                  </div>
                  <ul className={styles.list}>
                    {skillTrees[activeTab].map(skill => {
                      const playerSkill = player.skills.find(s => s.name === skill.name);
                      return (
                        <li key={skill.name}>
                          {skill.name} - Level {playerSkill ? playerSkill.level : 0} (Uses: {playerSkill ? playerSkill.uses : 0})
                          <br />
                          {skill.effect.damage && `Damage: ${playerSkill ? playerSkill.effect.damage : skill.effect.damage}`}
                          {skill.effect.costReduction && ` Cost Reduction: ${(playerSkill ? playerSkill.effect.costReduction : skill.effect.costReduction) * 100}%`}
                          {skill.effect.cooldownReduction && ` Cooldown Reduction: ${(playerSkill ? playerSkill.effect.cooldownReduction : skill.effect.cooldownReduction) * 100}%`}
                          {!playerSkill && (
                            <button className={styles.actionBtn} onClick={() => unlockSkill(skill.name, activeTab)}>
                              Integrate ({skill.cost.gold} Credits)
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}
            {key === "events" && (
              <>
                <div className={styles.modalHeader}><FaExclamationTriangle /> Grid Events<button className={styles.closeBtn} onClick={() => toggleModal("events")}>X</button></div>
                <div className={styles.modalBody}>
                  {currentEvent ? (
                    <p>{currentEvent.description} (Time Left: {formatCountdown(Math.max(0, Math.floor((eventTimer - Date.now()) / 1000)))})</p>
                  ) : (
                    <p>No active grid disturbances.</p>
                  )}
                </div>
              </>
            )}
            {key === "travel" && (
              <div className={styles.travelBody}>
                <Image src="/travel-chibi.jpg" alt="Traveling Chibi" width={100} height={100} className={styles.travelChibi} />
                <p>Quantum jump to {travelDestination}...</p>
              </div>
            )}
            {key === "guide" && (
              <>
                <div className={styles.modalHeader}>Kaito's Cyber Codex<button className={styles.closeBtn} onClick={() => toggleModal("guide")}>X</button></div>
                <div className={styles.modalBody}>
                  <h5>System Overview</h5>
                  <p>Engage in <em>Kaito's Cyber Adventure</em>, a grid-based RPG. Initialize with 5 credits, 100 vitality, and a nano-inventory (Water x2, Herbs x1) in Sakura Nexus. Explore, fabricate, combat, and ascend the Nexus Leaderboard!</p>
                  <h5>Core Protocols</h5>
                  <ol>
                    <li><strong>Sectors & Travel</strong>: Navigate Sakura Nexus, Iron Grid, Mist Circuit. Teleport via Sector menu (+2 XP).</li>
                    <li><strong>Harvesting</strong>: Single (free, cooldown) or Queue (1 credit each, 3-min cooldown). Grid boosts: Digital Rain (Water), Quantum Fog (Mist Essence).</li>
                    <li><strong>Fabrication</strong>: Create tradeables (e.g., Herbal Tea), weapons, armor (level 10+), potions. 80% success (+10% TechCraftsman).</li>
                    <li><strong>Combat</strong>: Engage Cyber Bandits, Stealth Drones, Titan Mechs. Deploy potions in combat to restore vitality (even at 0!). Earn credits, XP, modules.</li>
                    <li><strong>Trade Hub</strong>: Offload assets, acquire components. Prices shift with sector demand.</li>
                    <li><strong>Missions & Tasks</strong>: NPC missions (max 3), daily (e.g., 2 enemies), weekly (e.g., 10 Teas).</li>
                    <li><strong>Progression</strong>: 150 XP/level (+10 HP), unlock modules, expand inventory (+5 slots, 50 credits).</li>
                    <li><strong>Guild Networks</strong>: Link, contribute 10 credits to 100-credit goals (+50 credits).</li>
                    <li><strong>Grid Events</strong>: Neon Fests (boost demand), Cyber Raids (combat), Data Storms (reduce harvesting).</li>
                  </ol>
                  <h5>Objectives</h5>
                  <p><strong>Short-Term</strong>: Harvest, fabricate, trade, complete missions. <strong>Long-Term</strong>: Upgrade, unlock modules/armor, dominate the leaderboard.</p>
                  <h5>Strategic Inputs</h5>
                  <ul>
                    <li>Start in Sakura: Fabricate Herbal Tea, trade for credits.</li>
                    <li>0 Vitality? Engage combat, deploy a potion (stock Water/Herbs).</li>
                    <li>Unlock "Nano Brew" (cheaper crafts), "Swift Harvest" (faster harvests).</li>
                    <li>Expand inventory early (50 credits).</li>
                    <li>Trade Strong Healing Potions in Mist Circuit (1.2x demand).</li>
                  </ul>
                  <button className={styles.actionBtn} onClick={() => toggleModal("guide")}>Engage</button>
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}