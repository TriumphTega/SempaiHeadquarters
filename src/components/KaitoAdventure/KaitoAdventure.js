 
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Head from "next/head";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useWallet } from "@solana/wallet-adapter-react";
import debounce from "lodash/debounce";
import { supabase } from "../../services/supabase/supabaseClient";
import styles from "../../styles/Combat.module.css";
import Navbar from "./Navbar";
import PlayerStats from "./PlayerStats";
import InventoryList from "./InventoryList";
import TownInfo from "./TownInfo";
import ActionBar from "./ActionBar";
import GameMessage from "./GameMessage";
import ModalWrapper from "./ModalWrapper";
import CraftModal from "./modals/CraftModal";
import HealingModal from "./modals/HealingModal";
import GatherModal from "./modals/GatherModal";
import CombatModal from "./modals/CombatModal";
import MarketModal from "./modals/MarketModal";
import NpcModal from "./modals/NpcModal";
import QuestsModal from "./modals/QuestsModal";
import DailyModal from "./modals/DailyModal";
import StatsModal from "./modals/StatsModal";
import CommunityModal from "./modals/CommunityModal";
import CustomizeModal from "./modals/CustomizeModal";
import GuildModal from "./modals/GuildModal";
import SkillsModal from "./modals/SkillsModal";
import EventsModal from "./modals/EventsModal";
import TravelModal from "./modals/TravelModal";
import GuideModal from "./modals/GuideModal";
import LeaderboardModal from "./modals/LeaderboardModal";
import { FaStar } from "react-icons/fa";
import { Card, ProgressBar } from "react-bootstrap";

// ---- Constants Section ----
const defaultPlayer = {
  name: "Kaito Brewmaster",
  gold: 5,
  health: 100,
  max_health: 100,
  xp: 0,
  level: 1,
  inventory: [
    { name: "Water", quantity: 2 },
    { name: "Herbs", quantity: 1 },
  ],
  inventory_slots: 10,
  rare_items: [],
  recipes: [
    { name: "Herbal Tea", ingredients: ["Water", "Herbs"], type: "sell", baseGold: 20 },
    { name: "Spicy Sake", ingredients: ["Water", "Pepper"], type: "sell", baseGold: 20 },
    { name: "Mist Potion", ingredients: ["Mist Essence", "Herbs"], type: "sell", baseGold: 20 },
    { name: "Golden Elixir", ingredients: ["Golden Herb", "Mist Essence"], type: "sell", baseGold: 50 },
    { name: "Weak Healing Potion", ingredients: ["Water", "Herbs"], type: "heal", healPercent: 0.2, sellValue: 15 },
    { name: "Medium Healing Potion", ingredients: ["Water", "Mist Essence"], type: "heal", healPercent: 0.4, sellValue: 25 },
    { name: "Strong Healing Potion", ingredients: ["Mist Essence", "Shadow Root"], type: "heal", healPercent: 0.6, sellValue: 40 },
    { name: "Lucky Gather Potion", ingredients: ["Herbs", "Golden Herb"], type: "gather", effect: { rareChanceBoost: 0.1, duration: 300000 } },
    { name: "Swift Gather Potion", ingredients: ["Pepper", "Mist Essence"], type: "gather", effect: { cooldownReduction: 0.2, duration: 300000 } },
    { name: "Combat Blade", ingredients: ["Iron Ore", "Wood"], type: "equip", bonus: { damage: 5 } },
    { name: "Steel Axe", ingredients: ["Iron Ore", "Iron Ore"], type: "equip", bonus: { damage: 8 } },
    { name: "Shadow Dagger", ingredients: ["Shadow Root", "Iron Ore"], type: "equip", bonus: { damage: 6 } },
    { name: "Leather Armor", ingredients: ["Herbs", "Wood"], type: "armor", bonus: { defense: 5 }, unlockLevel: 10 },
    { name: "Chainmail", ingredients: ["Iron Ore", "Shadow Root"], type: "armor", bonus: { defense: 10 }, unlockLevel: 10 },
    { name: "Plate Armor", ingredients: ["Iron Ore", "Mist Crystal"], type: "armor", bonus: { defense: 15 }, unlockLevel: 10 },
  ],
  equipment: { weapon: null, armor: null },
  quests: [],
  skills: [
    { name: "Basic Attack", uses: 0, level: 1, effect: { damage: 10 }, tree: "Warrior" },
  ],
  stats: { enemiesDefeated: 0, potionsCrafted: 0, itemsSold: 0, gathers: 0 },
  last_login: null,
  daily_tasks: [],
  weekly_tasks: [],
  guild: null,
  avatar: "default",
  trait: null,
};

const towns = [
  {
    name: "Sakura Village",
    ingredients: ["Water", "Herbs", "Wood"],
    rareIngredients: [{ name: "Golden Herb", chance: 0.1 }],
    gatherCooldown: 0.5,
    rewardMultiplier: 1,
    demand: { "Herbal Tea": 1.0, "Spicy Sake": 0.8, "Mist Potion": 0.5, "Golden Elixir": 1.5 },
    npcOffers: [{ ingredient: "Pepper", price: 5 }, { ingredient: "Mist Essence", price: 7 }],
    npcs: [
      { name: "Hana the Herbalist", dialogue: "Greetings! I need Herbs for my remedies. Can you gather 5 for me?", quest: { id: "herbQuest", description: "Gather 5 Herbs for Hana", progress: 0, target: 5, reward: { gold: 60, xp: 60 } } },
    ],
  },
  {
    name: "Iron Port",
    ingredients: ["Pepper", "Sugar", "Iron Ore"],
    rareIngredients: [{ name: "Iron Shard", chance: 0.1 }],
    gatherCooldown: 1,
    rewardMultiplier: 2,
    demand: { "Herbal Tea": 0.7, "Spicy Sake": 1.2, "Mist Potion": 0.9, "Golden Elixir": 1.2 },
    npcOffers: [{ ingredient: "Water", price: 5 }, { ingredient: "Shadow Root", price: 8 }],
    npcs: [
      { name: "Captain Toru", dialogue: "Ahoy! We need a sturdy Combat Blade for our next voyage. Craft one for us!", quest: { id: "bladeQuest", description: "Craft a Combat Blade for Toru", progress: 0, target: 1, reward: { gold: 80, xp: 80 } } },
    ],
  },
  {
    name: "Mist Hollow",
    ingredients: ["Mist Essence", "Shadow Root"],
    rareIngredients: [{ name: "Mist Crystal", chance: 0.2 }],
    gatherCooldown: 2,
    rewardMultiplier: 4,
    demand: { "Herbal Tea": 0.6, "Spicy Sake": 0.9, "Mist Potion": 1.5, "Golden Elixir": 1.8 },
    npcOffers: [{ ingredient: "Herbs", price: 6 }, { ingredient: "Sugar", price: 5 }],
    npcs: [
      { name: "Mystic Rei", dialogue: "The shadows grow restless. Defeat 3 Bandits to restore peace.", quest: { id: "banditQuest", description: "Defeat 3 Bandits for Rei", progress: 0, target: 3, reward: { gold: 100, xp: 100 } } },
    ],
  },
];

const allIngredients = ["Water", "Herbs", "Pepper", "Sugar", "Mist Essence", "Shadow Root", "Iron Ore", "Wood", "Golden Herb", "Iron Shard", "Mist Crystal"];
const rare_items = ["Golden Herb", "Iron Shard", "Mist Crystal"];

const weatherTypes = [
  { type: "sunny", gatherBonus: null, combatModifier: 1.0, demandBonus: { "Spicy Sake": 1.1 } },
  { type: "rainy", gatherBonus: { ingredient: "Water", chance: 0.5 }, combatModifier: 0.9, demandBonus: { "Herbal Tea": 1.2 } },
  { type: "foggy", gatherBonus: { ingredient: "Mist Essence", chance: 0.3 }, combatModifier: 0.8, demandBonus: { "Mist Potion": 1.3 } },
];

const enemies = [
  { name: "Bandit", health: 80, damage: 10, gold: 10, drop: "Shadow Root", dropChance: 0.2 },
  { name: "Shadow Ninja", health: 60, damage: 15, gold: 15, drop: "Mist Essence", dropChance: 0.3 },
  { name: "Golem", health: 120, damage: 8, gold: 20, drop: "Iron Ore", dropChance: 0.25 },
];

const skillTrees = {
  Warrior: [
    { name: "Double Strike", uses: 0, level: 0, effect: { damage: 10 }, cost: { gold: 50 } },
    { name: "Stun", uses: 0, level: 0, effect: { damage: 5, stunChance: 0.2 }, cost: { gold: 75 } },
  ],
  Herbalist: [
    { name: "Efficient Brewing", uses: 0, level: 0, effect: { costReduction: 0.2 }, cost: { gold: 50 } },
    { name: "Potent Mix", uses: 0, level: 0, effect: { healBonus: 10 }, cost: { gold: 75 } },
  ],
  Explorer: [
    { name: "Quick Gather", uses: 0, level: 0, effect: { cooldownReduction: 0.1 }, cost: { gold: 50 } },
    { name: "Lucky Find", uses: 0, level: 0, effect: { rareChance: 0.05 }, cost: { gold: 75 } },
  ],
};

// ---- KaitoAdventure Component ----
const KaitoAdventure = () => {
  const { publicKey, connected } = useWallet();
  const defaultPlayerMemo = useMemo(() => ({
    ...defaultPlayer,
    wallet_address: publicKey ? publicKey.toString() : null,
  }), [publicKey]);
  const [player, setPlayer] = useState(defaultPlayerMemo);
  const [currentTown, setCurrentTown] = useState("Sakura Village");
  const [gameMessage, setGameMessage] = useState("Welcome to Kaito's Adventure!");
  const [modals, setModals] = useState({
    craft: false,
    healing: false,
    market: false,
    gather: false,
    combat: false,
    leaderboard: false,
    quests: false,
    daily: false,
    stats: false,
    community: false,
    customize: false,
    npc: false,
    travel: false,
    skills: false,
    events: false,
    guild: false,
    guide: false,
  });
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [lastGatherTimes, setLastGatherTimes] = useState({});
  const [lastQueuedGatherTime, setLastQueuedGatherTime] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [queuedCountdown, setQueuedCountdown] = useState(null);
  const [combatState, setCombatState] = useState(null);
  const [combatResult, setCombatResult] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [townLevels, setTownLevels] = useState({ "Sakura Village": 1, "Iron Port": 1, "Mist Hollow": 1 });
  const [activeTab, setActiveTab] = useState("drinks");
  const [weather, setWeather] = useState(weatherTypes[0]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [eventTimer, setEventTimer] = useState(null);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [travelDestination, setTravelDestination] = useState(null);
  const [gatherBuff, setGatherBuff] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // ---- Persistence and Supabase Sync ----
  useEffect(() => {
    if (!connected || !publicKey) {
      setPlayer(defaultPlayerMemo);
      setModals(prev => ({ ...prev, guide: true }));
      return;
    }

    const loadPlayer = async () => {
      try {
        const walletAddress = publicKey.toString();
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('wallet_address', walletAddress)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error("Error loading from Supabase:", error);
          return;
        }

        let playerData = defaultPlayerMemo;
        if (data) {
          playerData = { ...defaultPlayerMemo, ...data, recipes: defaultPlayerMemo.recipes };
        } else {
          playerData = { ...defaultPlayerMemo, wallet_address: walletAddress };
          const { error: insertError } = await supabase
            .from('players')
            .insert([playerData]);
          if (insertError) {
            console.error("Error inserting new player:", insertError);
            return;
          }
          setModals(prev => ({ ...prev, guide: true }));
        }

        setPlayer({
          ...defaultPlayerMemo,
          ...playerData,
          skills: playerData.skills || defaultPlayerMemo.skills,
          weekly_tasks: playerData.weekly_tasks || [],
          inventory_slots: playerData.inventory_slots || 10,
          rare_items: playerData.rare_items || [],
        });

        setCurrentTown(localStorage.getItem("currentTown") || "Sakura Village");
        setLastGatherTimes(JSON.parse(localStorage.getItem("lastGatherTimes")) || {});
        setLastQueuedGatherTime(parseInt(localStorage.getItem("lastQueuedGatherTime"), 10) || null);
        setTownLevels(JSON.parse(localStorage.getItem("townLevels")) || { "Sakura Village": 1, "Iron Port": 1, "Mist Hollow": 1 });
      } catch (e) {
        console.error("Error loading player:", e);
      }
    };

    loadPlayer();
  }, [connected, publicKey, defaultPlayerMemo]);

  const saveToLocalStorage = useCallback(
    debounce(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("currentTown", currentTown);
        localStorage.setItem("lastGatherTimes", JSON.stringify(lastGatherTimes));
        localStorage.setItem("lastQueuedGatherTime", lastQueuedGatherTime ? lastQueuedGatherTime.toString() : null);
        localStorage.setItem("townLevels", JSON.stringify(townLevels));
      }
    }, 500),
    [currentTown, lastGatherTimes, lastQueuedGatherTime, townLevels]
  );

  const syncPlayerToSupabase = useCallback(
    debounce(async () => {
      if (!connected || !publicKey || !player.wallet_address || typeof window === "undefined") {
        console.warn("Cannot sync to Supabase: Wallet not connected or wallet_address is null");
        return;
      }

      try {
        const { error } = await supabase
          .from('players')
          .upsert({
            wallet_address: player.wallet_address,
            name: player.name,
            level: player.level,
            gold: player.gold,
            xp: player.xp,
            health: player.health,
            max_health: player.max_health,
            inventory: player.inventory,
            inventory_slots: player.inventory_slots,
            rare_items: player.rare_items,
            recipes: player.recipes,
            equipment: player.equipment,
            quests: player.quests,
            skills: player.skills,
            stats: player.stats,
            last_login: new Date().toISOString(),
            daily_tasks: player.daily_tasks,
            weekly_tasks: player.weekly_tasks,
            guild: player.guild,
            avatar: player.avatar,
            trait: player.trait,
            updated_at: new Date().toISOString(),
          }, { onConflict: ['wallet_address'] });

        if (error) throw error;
      } catch (error) {
        console.error("Error syncing to Supabase:", error);
      }
    }, 1000),
    [player, connected, publicKey]
  );

  useEffect(() => {
    if (connected && publicKey && player.wallet_address) {
      syncPlayerToSupabase();
      saveToLocalStorage();
    }
    return () => {
      syncPlayerToSupabase.cancel();
      saveToLocalStorage.cancel();
    };
  }, [syncPlayerToSupabase, saveToLocalStorage, player, connected, publicKey]);

  // ---- Weather System ----
  useEffect(() => {
    const changeWeather = () => {
      const newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
      setWeather(newWeather);
      setGameMessage(`The weather changes to ${newWeather.type}!`);
    };
    if (typeof window !== "undefined") {
      changeWeather();
      const interval = setInterval(changeWeather, 300000);
      return () => clearInterval(interval);
    }
  }, []);

  // ---- Dynamic Events ----
  useEffect(() => {
    const triggerEvent = () => {
      if (Math.random() < 0.3) {
        const events = [
          { type: "festival", description: "A festival boosts demand for 24 hours!", effect: () => setTownLevels(prev => ({ ...prev, [currentTown]: prev[currentTown] + 0.5 })), duration: 24 * 60 * 60 * 1000 },
          { type: "raid", description: "Bandits raid the town for 1 hour!", effect: () => setModals(prev => ({ ...prev, combat: true })), duration: 60 * 60 * 1000 },
          { type: "storm", description: "A storm reduces gathering for 12 hours!", effect: () => {}, duration: 12 * 60 * 60 * 1000 },
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        setCurrentEvent(event);
        setGameMessage(event.description);
        event.effect();
        setEventTimer(Date.now() + event.duration);
      }
    };
    if (typeof window !== "undefined") {
      triggerEvent();
      const interval = setInterval(triggerEvent, 300000);
      return () => clearInterval(interval);
    }
  }, [currentTown]);

  useEffect(() => {
    if (eventTimer && Date.now() >= eventTimer) {
      setCurrentEvent(null);
      setEventTimer(null);
      setGameMessage("The event has ended!");
    }
  }, [eventTimer]);

  // ---- XP and Leveling ----
  const updateXP = useCallback((xpGain) => {
    setPlayer(prev => {
      const newXP = prev.xp + xpGain;
      const newLevel = Math.floor(newXP / 150) + 1;
      let updatedPlayer = { ...prev, xp: newXP, level: newLevel };
      if (newLevel > prev.level) {
        updatedPlayer.max_health = 100 + (newLevel - 1) * 10;
        updatedPlayer.health = updatedPlayer.max_health;
        setGameMessage(`Level up! Reached Level ${newLevel}. Max Health increased to ${updatedPlayer.max_health}!`);
      }
      return updatedPlayer;
    });
  }, []);

  const xpProgress = useMemo(() => {
    const xpForNext = player.level * 150;
    const xpForCurrent = (player.level - 1) * 150;
    return Math.min(((player.xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100, 100);
  }, [player.xp, player.level]);

  // ---- Quests ----
  const addQuest = useCallback((quest) => {
    setPlayer(prev => ({
      ...prev,
      quests: prev.quests.length < 3 ? [...prev.quests, quest] : prev.quests,
    }));
  }, []);

  const completeQuest = useCallback((questId) => {
    setPlayer(prev => {
      const quest = prev.quests.find(q => q.id === questId);
      if (!quest || quest.progress < quest.target) return prev;
      setGameMessage(`Quest "${quest.description}" completed!`);
      return {
        ...prev,
        gold: prev.gold + quest.reward.gold,
        xp: prev.xp + quest.reward.xp,
        level: Math.floor((prev.xp + quest.reward.xp) / 150) + 1,
        quests: prev.quests.filter(q => q.id !== questId),
      };
    });
  }, []);

  // ---- Daily and Weekly Tasks ----
  const completeDailyTask = useCallback((taskId) => {
    setPlayer(prev => {
      const task = prev.daily_tasks.find(t => t.id === taskId);
      if (!task || task.progress < task.target) return prev;
      setGameMessage(`${task.description} completed!`);
      return {
        ...prev,
        gold: prev.gold + (task.reward.gold || 0),
        xp: prev.xp + (task.reward.xp || 0),
        level: Math.floor((prev.xp + (task.reward.xp || 0)) / 150) + 1,
        daily_tasks: prev.daily_tasks.map(t => t.id === taskId ? { ...t, completed: true } : t),
      };
    });
  }, []);

  const completeWeeklyTask = useCallback((taskId) => {
    setPlayer(prev => {
      const task = prev.weekly_tasks.find(t => t.id === taskId);
      if (!task || task.progress < task.target) return prev;
      setGameMessage(`${task.description} completed!`);
      return {
        ...prev,
        gold: prev.gold + (task.reward.gold || 0),
        xp: prev.xp + (task.reward.xp || 0),
        level: Math.floor((prev.xp + (task.reward.xp || 0)) / 150) + 1,
        weekly_tasks: prev.weekly_tasks.map(t => t.id === taskId ? { ...t, completed: true } : t),
      };
    });
  }, []);

  // ---- Skills Progression ----
  const updateSkillLevel = useCallback((skillName) => {
    setPlayer(prev => {
      const skills = prev.skills.map(skill => {
        if (skill.name === skillName) {
          const newUses = skill.uses + 1;
          const newLevel = Math.min(Math.floor(newUses / 5) + 1, 5);
          return {
            ...skill,
            uses: newUses,
            level: newLevel,
            effect: {
              ...skill.effect,
              damage: skill.effect.damage ? skill.effect.damage * (1 + (newLevel - 1) * 0.05) : undefined,
              healBonus: skill.effect.healBonus ? skill.effect.healBonus + (newLevel - 1) * 2 : undefined,
              costReduction: skill.effect.costReduction ? skill.effect.costReduction + (newLevel - 1) * 0.05 : undefined,
              cooldownReduction: skill.effect.cooldownReduction ? skill.effect.cooldownReduction + (newLevel - 1) * 0.02 : undefined,
              rareChance: skill.effect.rareChance ? skill.effect.rareChance + (newLevel - 1) * 0.01 : undefined,
              stunChance: skill.effect.stunChance ? skill.effect.stunChance + (newLevel - 1) * 0.05 : undefined,
            },
          };
        }
        return skill;
      });
      return { ...prev, skills };
    });
  }, []);

  const unlockSkill = useCallback((skillName, tree) => {
    setPlayer(prev => {
      const skill = skillTrees[tree].find(s => s.name === skillName);
      if (prev.gold < skill.cost.gold || prev.skills.some(s => s.name === skillName)) {
        setGameMessage("Not enough gold or skill already unlocked!");
        return prev;
      }
      return {
        ...prev,
        gold: prev.gold - skill.cost.gold,
        skills: [...prev.skills, { ...skill, level: 1 }],
      };
    });
    setGameMessage(`${skillName} unlocked!`);
  }, []);

  // ---- Crafting ----
  const toggleIngredient = useCallback((item) => {
    setSelectedIngredients(prev => {
      const countInSelection = prev.filter(i => i === item).length;
      const ownedItem = player.inventory.find(i => i.name === item);
      const maxAllowed = ownedItem ? ownedItem.quantity : 0;
      if (countInSelection < maxAllowed) {
        return [...prev, item];
      } else {
        return prev.filter((i, idx) => i !== item || prev.indexOf(i) !== idx);
      }
    });
  }, [player.inventory]);

  const getAvailableIngredients = useMemo(() => {
    return allIngredients.map(name => {
      const item = player.inventory.find(i => i.name === name);
      return {
        name,
        quantity: item?.quantity ?? 0,
        owned: !!item,
      };
    });
  }, [player.inventory]);

  const craftItem = useCallback((type, onSuccess) => {
    const recipe = player.recipes.find(r =>
      r.type === type &&
      r.ingredients.every(ing => selectedIngredients.includes(ing)) &&
      r.ingredients.length === selectedIngredients.length &&
      (!r.unlockLevel || player.level >= r.unlockLevel)
    );
    if (!recipe) {
      setGameMessage(`No matching ${type === "heal" ? "healing potion" : type === "gather" ? "gathering potion" : "item"} recipe for these ingredients${type !== "heal" && type !== "gather" && player.level < 10 ? " or level too low" : ""}!`);
      return;
    }

    const available = getAvailableIngredients;
    const hasEnough = recipe.ingredients.every(ing => {
      const item = available.find(i => i.name === ing);
      return item && item.owned && item.quantity > 0;
    });
    if (!hasEnough) {
      setGameMessage("You don’t have enough of the required ingredients!");
      return;
    }

    setPlayer(prev => {
      const costReduction = prev.skills.some(s => s.name === "Efficient Brewing") ? prev.skills.find(s => s.name === "Efficient Brewing").effect.costReduction : 0;
      const newInventory = prev.inventory.map(item =>
        recipe.ingredients.includes(item.name) ? { ...item, quantity: item.quantity - (Math.random() < costReduction ? 0 : 1) } : item
      ).filter(item => item.quantity > 0);

      const task = prev.daily_tasks.find(t => t.description === "Craft 3 potions");
      const updatedTasks = task
        ? prev.daily_tasks.map(t => t.description === "Craft 3 potions" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t)
        : prev.daily_tasks;
      if (task && task.progress + 1 >= task.target) completeDailyTask("craftPotions");

      const traitBonus = player.trait === "craftsman" ? 0.1 : 0;
      const successChance = 0.8 + traitBonus;
      const isSuccess = Math.random() < successChance;

      if (isSuccess) {
        const existingItem = prev.inventory.find(item => item.name === recipe.name);
        const updatedInventory = existingItem
          ? newInventory.map(item => item.name === recipe.name ? { ...item, quantity: Math.min(item.quantity + 1, prev.inventory_slots) } : item)
          : [...newInventory, { name: recipe.name, quantity: 1 }];
        const bladeQuest = prev.quests.find(q => q.id === "bladeQuest" && recipe.name === "Combat Blade");
        const updatedQuests = bladeQuest
          ? prev.quests.map(q => q.id === "bladeQuest" ? { ...q, progress: Math.min(q.progress + 1, q.target) } : q)
          : prev.quests;

        if (recipe.type === "gather") {
          setGatherBuff({
            type: recipe.effect.rareChanceBoost ? "rareChanceBoost" : "cooldownReduction",
            value: recipe.effect.rareChanceBoost || recipe.effect.cooldownReduction,
            expires: Date.now() + recipe.effect.duration,
          });
          setGameMessage(`You crafted ${recipe.name}! It’s in your inventory and boosts gathering for ${recipe.effect.duration / 60000} minutes!`);
        }

        return {
          ...prev,
          inventory: updatedInventory,
          stats: { ...prev.stats, potionsCrafted: prev.stats.potionsCrafted + 1 },
          daily_tasks: updatedTasks,
          quests: updatedQuests,
        };
      }
      return { ...prev, inventory: newInventory };
    });

    const isSuccess = Math.random() < (0.8 + (player.trait === "craftsman" ? 0.1 : 0));
    if (isSuccess) {
      updateXP(type === "heal" || type === "gather" ? 10 : 20);
      if (recipe.type !== "gather") {
        setGameMessage(`You crafted ${recipe.name}! It is now in your inventory. (+${type === "heal" || type === "gather" ? 10 : 20} XP)`);
      }
    } else {
      setGameMessage(`Crafting ${recipe.name} failed! Ingredients lost.`);
    }

    setSelectedIngredients([]);
    setModals(prev => ({ ...prev, [type === "heal" || type === "gather" ? "craft" : "craft"]: false }));
    if (onSuccess && type !== "heal" && type !== "gather") onSuccess(recipe);
  }, [player.recipes, player.trait, player.skills, player.inventory_slots, player.level, selectedIngredients, getAvailableIngredients, updateXP, completeDailyTask, completeQuest]);

  const useGatherPotion = useCallback((potionName) => {
    const potion = player.inventory.find(item => item.name === potionName);
    if (!potion || potion.quantity === 0) {
      setGameMessage("You don’t have this potion!");
      return;
    }
    const recipe = player.recipes.find(r => r.name === potionName && r.type === "gather");
    if (!recipe) {
      setGameMessage("This isn’t a gathering potion!");
      return;
    }
    setPlayer(prev => ({
      ...prev,
      inventory: prev.inventory.map(item => item.name === potionName ? { ...item, quantity: item.quantity - 1 } : item).filter(item => item.quantity > 0),
    }));
    setGatherBuff({
      type: recipe.effect.rareChanceBoost ? "rareChanceBoost" : "cooldownReduction",
      value: recipe.effect.rareChanceBoost || recipe.effect.cooldownReduction,
      expires: Date.now() + recipe.effect.duration,
    });
    setGameMessage(`Used ${potionName}! Gathering boosted for ${recipe.effect.duration / 60000} minutes.`);
  }, [player.inventory, player.recipes]);

  // ---- Combat ----
  const startCombat = useCallback(() => {
    if (player.health <= 0) {
      setGameMessage("You’re at 0 health! Craft a healing potion in combat to survive.");
    }
    const enemy = enemies[Math.floor(Math.random() * enemies.length)];
    const levelScaleHealth = 1 + (player.level - 1) * 0.15;
    const levelScaleDamage = 1 + (player.level - 1) * 0.05;
    const weatherMod = weather.combatModifier;
    setCombatState({
      playerHealth: player.health > player.max_health ? player.max_health : player.health,
      enemy: {
        ...enemy,
        health: Math.round(enemy.health * levelScaleHealth * weatherMod),
        damage: Math.round(enemy.damage * levelScaleDamage * weatherMod),
        gold: Math.round(enemy.gold * levelScaleHealth),
      },
      enemyHealth: Math.round(enemy.health * levelScaleHealth * weatherMod),
      isAttacking: false,
      log: player.health <= 0 ? ["You’re at 0 health! Craft a potion quickly!"] : [],
    });
    setCombatResult(null);
    setModals(prev => ({ ...prev, combat: true }));
    if (player.health > 0) {
      setGameMessage(`Combat started against ${enemy.name} (HP: ${Math.round(enemy.health * levelScaleHealth * weatherMod)}, Damage: ${Math.round(enemy.damage * levelScaleDamage * weatherMod)})`);
    }
  }, [player.health, player.level, player.max_health, weather]);

  const attackEnemy = useCallback((skillName = "Basic Attack") => {
    if (!combatState || combatState.isAttacking) return;
    setCombatState(prev => ({ ...prev, isAttacking: true }));
    setTimeout(() => {
      setCombatState(prev => {
        if (!prev) return null;
        const skill = player.skills.find(s => s.name === skillName) || { name: "Basic Attack", effect: { damage: 10 }, level: 1 };
        const weaponDamage = player.equipment.weapon ? player.recipes.find(r => r.name === player.equipment.weapon)?.bonus.damage || 0 : 0;
        const armorDefense = player.equipment.armor ? player.recipes.find(r => r.name === player.equipment.armor)?.bonus.defense || 0 : 0;
        const traitBonus = player.trait === "warrior" ? 5 : 0;
        const baseDamage = skill.effect.damage || 10;
        const doubledDamage = skill.name === "Double Strike" ? baseDamage * 2 : baseDamage;
        const scaledDamage = doubledDamage * (1 + (skill.level - 1) * 0.05);
        const cappedDamage = Math.min(scaledDamage, 50);
        const totalDamage = Math.round(cappedDamage + weaponDamage + traitBonus);
        const newEnemyHealth = Math.max(prev.enemyHealth - totalDamage, 0);
        const attackMessage = `Kaito uses ${skill.name} for ${totalDamage} damage (Base: ${baseDamage}, Doubled: ${doubledDamage}, Scaled: ${scaledDamage.toFixed(1)}, Capped: ${cappedDamage}, +Weapon: ${weaponDamage}, +Trait: ${traitBonus})`;
        let newLog = [...prev.log, attackMessage];

        if (skill.effect.stunChance && Math.random() < skill.effect.stunChance) {
          newLog.push(`${prev.enemy.name} is stunned!`);
        }

        if (newEnemyHealth <= 0) {
          const dropChance = Math.random() < prev.enemy.dropChance * (player.skills.some(s => s.name === "Lucky Find") ? 1 + player.skills.find(s => s.name === "Lucky Find").effect.rareChance : 1);
          const drop = dropChance ? prev.enemy.drop : null;
          const baseXP = prev.enemy.name === "Bandit" ? 20 : prev.enemy.name === "Shadow Ninja" ? 25 : 30;
          const xpGain = baseXP + (player.level - 1) * 2;
          setPlayer(p => {
            let newInventory = [...p.inventory];
            let newrare_items = [...p.rare_items];
            if (drop) {
              const existingItem = newInventory.find(item => item.name === drop);
              newInventory = existingItem
                ? newInventory.map(item => item.name === drop ? { ...item, quantity: Math.min(item.quantity + 1, p.inventory_slots) } : item)
                : [...newInventory, { name: drop, quantity: 1 }];
              if (rare_items.includes(drop)) newrare_items.push(drop);
            }
            const enemyTask = p.daily_tasks.find(t => t.id === "defeatEnemies");
            const updatedTasks = enemyTask && !enemyTask.completed
              ? p.daily_tasks.map(t => t.id === "defeatEnemies" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t)
              : p.daily_tasks;
            if (enemyTask && enemyTask.progress + 1 >= enemyTask.target) completeDailyTask("defeatEnemies");
            return {
              ...p,
              gold: p.gold + prev.enemy.gold,
              inventory: newInventory,
              rare_items: newrare_items,
              stats: { ...p.stats, enemiesDefeated: p.stats.enemiesDefeated + 1 },
              daily_tasks: updatedTasks,
            };
          });
          updateXP(xpGain);
          setGameMessage(`You defeated ${prev.enemy.name} and earned ${prev.enemy.gold} gold!${drop ? " Dropped: " + drop : ""} (+${xpGain} XP)`);
          setCombatResult({ type: "win", message: `Victory! You defeated ${prev.enemy.name}!` });
          setTimeout(() => setModals(m => ({ ...m, combat: false })), 1500);
          return null;
        }

        const rawDamage = skill.effect.stunChance && Math.random() < skill.effect.stunChance ? 0 : prev.enemy.damage;
        const reducedDamage = Math.max(rawDamage - armorDefense, 0);
        const newPlayerHealth = Math.max(prev.playerHealth - reducedDamage, 0);
        newLog.push(`${prev.enemy.name} deals ${reducedDamage} damage to Kaito!`);

        if (newPlayerHealth <= 0) {
          setPlayer(p => ({ ...p, health: newPlayerHealth }));
          setGameMessage("You were defeated!");
          setCombatResult({ type: "fail", message: `Defeat! ${prev.enemy.name} overpowered you!` });
          setTimeout(() => setModals(m => ({ ...m, combat: false })), 1500);
          return null;
        }

        setPlayer(p => ({ ...p, health: newPlayerHealth }));
        updateXP(15);
        updateSkillLevel(skillName);
        return { ...prev, playerHealth: newPlayerHealth, enemyHealth: newEnemyHealth, log: newLog, isAttacking: false };
      });
    }, 1000);
  }, [combatState, player.equipment, player.recipes, player.trait, player.skills, player.inventory, player.max_health, updateXP, updateSkillLevel, completeDailyTask]);

  const craftPotionInCombat = useCallback((potionName) => {
    if (!combatState || combatState.isAttacking) return;
    setCombatState(prev => ({ ...prev, isAttacking: true }));
    setTimeout(() => {
      setPlayer(prev => {
        const recipe = prev.recipes.find(r => r.name === potionName && r.type === "heal");
        if (!recipe) {
          setGameMessage("No such healing potion recipe!");
          setCombatState(prevState => ({ ...prevState, isAttacking: false }));
          return prev;
        }
        const available = getAvailableIngredients;
        const hasEnough = recipe.ingredients.every(ing => {
          const item = available.find(i => i.name === ing);
          return item && item.owned && item.quantity > 0;
        });
        if (!hasEnough) {
          setGameMessage("Not enough ingredients to craft this potion!");
          setCombatState(prevState => ({ ...prevState, isAttacking: false }));
          return prev;
        }
        const costReduction = prev.skills.some(s => s.name === "Efficient Brewing") ? prev.skills.find(s => s.name === "Efficient Brewing").effect.costReduction : 0;
        const healBonus = prev.skills.some(s => s.name === "Potent Mix") ? prev.skills.find(s => s.name === "Potent Mix").effect.healBonus : 0;
        const newInventory = prev.inventory.map(item =>
          recipe.ingredients.includes(item.name) ? { ...item, quantity: item.quantity - (Math.random() < costReduction ? 0 : 1) } : item
        ).filter(item => item.quantity > 0);
        const healAmount = Math.round(prev.max_health * recipe.healPercent) + healBonus;
        const newHealth = Math.min(prev.health + healAmount, prev.max_health);
        setGameMessage(`Crafted and used ${potionName} to heal ${healAmount} HP!`);
        setCombatState(prevState => ({
          ...prevState,
          playerHealth: newHealth,
          log: [...prevState.log, `Kaito crafts and uses ${potionName} to heal ${healAmount} HP`],
          isAttacking: false,
        }));
        return { ...prev, health: newHealth, inventory: newInventory };
      });
    }, 1000);
  }, [combatState, player.recipes, player.skills, player.inventory, player.max_health, getAvailableIngredients]);

  useEffect(() => {
    const checkBuffExpiration = () => {
      if (gatherBuff && Date.now() >= gatherBuff.expires) {
        setGatherBuff(null);
        setGameMessage("Your gathering potion effect has worn off!");
      }
    };
    const interval = setInterval(checkBuffExpiration, 1000);
    return () => clearInterval(interval);
  }, [gatherBuff]);

  // ---- Leaderboard ----
  const fetchLeaderboardData = useCallback(async () => {
    if (!connected || !publicKey || typeof window === "undefined") return;
    try {
      const { data, error } = await supabase
        .from('players')
        .select('wallet_address, name, level, gold')
        .order('level', { ascending: false })
        .order('gold', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLeaderboardData(data || []);
      if (data && data.length > 0 && data[0].wallet_address === player.wallet_address) {
        setGameMessage("You’re #1 on the leaderboard! Claim 100 gold next login!");
      }
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
      setLeaderboardData([]);
      setGameMessage("Failed to load leaderboard.");
    }
  }, [connected, publicKey, player.wallet_address]);

  useEffect(() => {
    if (connected && publicKey && modals.leaderboard) {
      fetchLeaderboardData();
    }
    const interval = setInterval(fetchLeaderboardData, 10000);
    return () => clearInterval(interval);
  }, [fetchLeaderboardData, modals.leaderboard, connected, publicKey]);

  // ---- Equipment ----
  const equipItem = useCallback((itemName) => {
    setPlayer(prev => {
      const item = prev.recipes.find(r => r.name === itemName && (r.type === "equip" || r.type === "armor"));
      if (!item) return prev;
      return {
        ...prev,
        equipment: {
          ...prev.equipment,
          [item.type === "equip" ? "weapon" : "armor"]: itemName
        }
      };
    });
  }, []);

  // ---- Town Upgrades ----
  const upgradeTown = useCallback((townName, salesCount) => {
    if (salesCount >= 10) {
      setTownLevels(prev => ({
        ...prev,
        [townName]: Math.min(prev[townName] + 1, 3),
      }));
    }
  }, []);

  // ---- Market ----
  const buyIngredient = useCallback((ingredient, price) => {
    const cost = Math.floor(price / townLevels[currentTown]);
    setPlayer(prev => {
      if (prev.gold < cost) {
        setGameMessage("Not enough gold!");
        return prev;
      }
      const newInventory = [...prev.inventory];
      const existingItem = newInventory.find(item => item.name === ingredient);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        newInventory.push({ name: ingredient, quantity: 1 });
      }
      return {
        ...prev,
        gold: prev.gold - cost,
        inventory: newInventory,
      };
    });
    setGameMessage(`Bought ${ingredient} for ${cost} gold!`);
  }, [currentTown, townLevels]);

  const sellDrink = useCallback((itemName) => {
    const recipe = player.recipes.find(r => r.name === itemName);
    const itemInInventory = player.inventory.find(item => item.name === itemName);

    if (!itemInInventory || itemInInventory.quantity === 0) {
      setGameMessage("You don’t have any of this item to sell!");
      return;
    }
    if (!recipe || (!recipe.sellValue && !recipe.baseGold)) {
      setGameMessage("This item cannot be sold!");
      return;
    }

    const currentTownData = towns.find(t => t.name === currentTown);
    const demandMultiplier = (currentTownData.demand[itemName] || 1.0) * 
      (currentEvent?.type === "festival" ? 1.5 : 1) * 
      (weather.demandBonus[itemName] || 1);
    const reward = Math.floor((recipe.sellValue || recipe.baseGold) * 
      currentTownData.rewardMultiplier * demandMultiplier);

    setPlayer(prev => {
      const sellTask = prev.weekly_tasks.find(t => t.description === "Sell 10 Spicy Sakes" && itemName === "Spicy Sake");
      const updatedWeeklyTasks = sellTask
        ? prev.weekly_tasks.map(t => t.description === "Sell 10 Spicy Sakes" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t)
        : prev.weekly_tasks;
      if (sellTask && sellTask.progress + 1 >= sellTask.target) completeWeeklyTask("sellDrinks");

      return {
        ...prev,
        inventory: prev.inventory
          .map(item => item.name === itemName ? { ...item, quantity: item.quantity - 1 } : item)
          .filter(item => item.quantity > 0),
        gold: prev.gold + reward,
        stats: { ...prev.stats, itemsSold: prev.stats.itemsSold + 1 },
        weekly_tasks: updatedWeeklyTasks,
      };
    });
    updateXP(reward * 2);
    upgradeTown(currentTown, player.stats.itemsSold + 1);
    setGameMessage(`You sold ${itemName} for ${reward} gold! (+${reward * 2} XP)`);
  }, [player.inventory, player.recipes, currentTown, currentEvent, weather, updateXP, upgradeTown, player.stats.itemsSold, completeWeeklyTask]);

  // ---- Inventory Upgrades ----
  const upgradeInventory = useCallback(() => {
    setPlayer(prev => {
      if (prev.gold < 50) {
        setGameMessage("Not enough gold to upgrade inventory!");
        return prev;
      }
      return { ...prev, gold: prev.gold - 50, inventory_slots: prev.inventory_slots + 5 };
    });
    setGameMessage("Inventory upgraded! +5 slots.");
  }, [player.gold]);

  // ---- Guild ----
  const joinGuild = useCallback((guildName) => {
    setPlayer(prev => {
      if (prev.guild) {
        setGameMessage("You’re already in a guild!");
        return prev;
      }
      return { ...prev, guild: { name: guildName, progress: 0, target: 100 } };
    });
    setGameMessage(`Joined ${guildName}! Contribute gold to guild goals.`);
  }, []);

  const contributeToGuild = useCallback(() => {
    setPlayer(prev => {
      if (!prev.guild || prev.gold < 10) {
        setGameMessage("Not enough gold or no guild!");
        return prev;
      }
      const newProgress = prev.guild.progress + 10;
      if (newProgress >= prev.guild.target) {
        setGameMessage(`${prev.guild.name} goal completed! Earned 50 gold!`);
        return { ...prev, guild: { ...prev.guild, progress: 0 }, gold: prev.gold + 40 };
      }
      return { ...prev, guild: { ...prev.guild, progress: newProgress }, gold: prev.gold - 10 };
    });
  }, []);

  // ---- Gathering ----
  const gatherSingle = useCallback(() => {
    const town = towns.find(t => t.name === currentTown);
    const now = Date.now();
    const cooldownReduction = (player.skills.some(s => s.name === "Quick Gather") ? player.skills.find(s => s.name === "Quick Gather").effect.cooldownReduction : 0) +
      (gatherBuff && gatherBuff.type === "cooldownReduction" && now < gatherBuff.expires ? gatherBuff.value : 0);
    if (lastGatherTimes[currentTown] && (now - lastGatherTimes[currentTown]) < town.gatherCooldown * 60 * 1000 * (1 - cooldownReduction)) {
      setGameMessage("Gather cooldown active!");
      return;
    }
    const ingredient = currentEvent?.type === "storm" ? null : town.ingredients[Math.floor(Math.random() * town.ingredients.length)];
    if (!ingredient) {
      setGameMessage("Gathering halted by the storm!");
      return;
    }
    setPlayer(prev => {
      let newInventory = prev.inventory.find(i => i.name === ingredient)
        ? prev.inventory.map(i => i.name === ingredient ? { ...i, quantity: Math.min(i.quantity + 1, prev.inventory_slots) } : i)
        : [...prev.inventory, { name: ingredient, quantity: 1 }];
      let newrare_items = [...prev.rare_items];
      const rareChanceBoost = gatherBuff && gatherBuff.type === "rareChanceBoost" && now < gatherBuff.expires ? gatherBuff.value : 0;
      const rareDrop = town.rareIngredients.find(r => Math.random() < r.chance * (prev.skills.some(s => s.name === "Lucky Find") ? 1 + prev.skills.find(s => s.name === "Lucky Find").effect.rareChance : 1) + rareChanceBoost);
      if (rareDrop) {
        newInventory = newInventory.find(i => i.name === rareDrop.name)
          ? newInventory.map(i => i.name === rareDrop.name ? { ...i, quantity: Math.min(i.quantity + 1, prev.inventory_slots) } : i)
          : [...newInventory, { name: rareDrop.name, quantity: 1 }];
        newrare_items.push(rareDrop.name);
        setGameMessage(`Rare find! You gathered a ${rareDrop.name}!`);
      }
      if (weather.gatherBonus && Math.random() < weather.gatherBonus.chance) {
        const bonusItem = newInventory.find(i => i.name === weather.gatherBonus.ingredient);
        newInventory = bonusItem
          ? newInventory.map(i => i.name === weather.gatherBonus.ingredient ? { ...i, quantity: Math.min(i.quantity + 1, prev.inventory_slots) } : i)
          : [...newInventory, { name: weather.gatherBonus.ingredient, quantity: 1 }];
        setGameMessage(`Weather bonus! You gathered an extra ${weather.gatherBonus.ingredient}!`);
      }
      const herbQuest = prev.quests.find(q => q.id === "herbQuest" && ingredient === "Herbs");
      const updatedQuests = herbQuest
        ? prev.quests.map(q => q.id === herbQuest.id ? { ...q, progress: Math.min(q.progress + 1, q.target) } : q)
        : prev.quests;
      if (herbQuest && herbQuest.progress + 1 >= herbQuest.target) completeQuest("herbQuest");
      return {
        ...prev,
        inventory: newInventory,
        rare_items: newrare_items,
        quests: updatedQuests,
        stats: { ...prev.stats, gathers: prev.stats.gathers + 1 },
      };
    });
    setLastGatherTimes(prev => ({ ...prev, [currentTown]: now }));
    if (!gameMessage.includes("Rare find") && !gameMessage.includes("Weather bonus")) setGameMessage(`You gathered ${ingredient}!`);
  }, [currentTown, lastGatherTimes, weather, completeQuest, player.skills, player.inventory_slots, currentEvent, gatherBuff]);

  const queueGathers = useCallback((count) => {
    const town = towns.find(t => t.name === currentTown);
    const now = Date.now();
    if (player.gold < count) {
      setGameMessage("Not enough gold!");
      return;
    }
    if (lastQueuedGatherTime && (now - lastQueuedGatherTime) < 3 * 60 * 1000) {
      setGameMessage("Queued gather cooldown active!");
      return;
    }
    setPlayer(prev => {
      let newInventory = [...prev.inventory];
      let newrare_items = [...prev.rare_items];
      const rareChanceBoost = gatherBuff && gatherBuff.type === "rareChanceBoost" && now < gatherBuff.expires ? gatherBuff.value : 0;
      for (let i = 0; i < count; i++) {
        const ingredient = currentEvent?.type === "storm" ? null : town.ingredients[Math.floor(Math.random() * town.ingredients.length)];
        if (!ingredient) continue;
        const existingItem = newInventory.find(item => item.name === ingredient);
        newInventory = existingItem
          ? newInventory.map(item => item.name === ingredient ? { ...item, quantity: Math.min(item.quantity + 1, prev.inventory_slots) } : item)
          : [...newInventory, { name: ingredient, quantity: 1 }];
        if (weather.gatherBonus && Math.random() < weather.gatherBonus.chance) {
          const bonusItem = newInventory.find(i => i.name === weather.gatherBonus.ingredient);
          newInventory = bonusItem
            ? newInventory.map(i => i.name === weather.gatherBonus.ingredient ? { ...i, quantity: Math.min(i.quantity + 1, prev.inventory_slots) } : i)
            : [...newInventory, { name: weather.gatherBonus.ingredient, quantity: 1 }];
        }
        const rareDrop = town.rareIngredients.find(r => Math.random() < r.chance * (prev.skills.some(s => s.name === "Lucky Find") ? 1 + prev.skills.find(s => s.name === "Lucky Find").effect.rareChance : 1) + rareChanceBoost);
        if (rareDrop) {
          newInventory = newInventory.find(i => i.name === rareDrop.name)
            ? newInventory.map(i => i.name === rareDrop.name ? { ...i, quantity: Math.min(i.quantity + 1, prev.inventory_slots) } : i)
            : [...newInventory, { name: rareDrop.name, quantity: 1 }];
          newrare_items.push(rareDrop.name);
        }
      }
      const herbQuest = prev.quests.find(q => q.id === "herbQuest");
      const updatedQuests = herbQuest
        ? prev.quests.map(q => q.id === herbQuest.id ? { ...q, progress: Math.min(q.progress + count, q.target) } : q)
        : prev.quests;
      if (herbQuest && herbQuest.progress + count >= herbQuest.target) completeQuest("herbQuest");
      return {
        ...prev,
        inventory: newInventory,
        rare_items: newrare_items,
        gold: prev.gold - count,
        quests: updatedQuests,
        stats: { ...prev.stats, gathers: prev.stats.gathers + count },
      };
    });
    setLastQueuedGatherTime(now);
    setGameMessage(`You queued ${count} gathers!`);
  }, [player.gold, player.inventory_slots, lastQueuedGatherTime, currentTown, weather, completeQuest, currentEvent, gatherBuff]);

  // ---- Countdowns ----
  const formatCountdown = useCallback(seconds => {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${secs}s`;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateCountdowns = () => {
      const now = Date.now();
      const lastNormalTime = lastGatherTimes[currentTown];
      if (lastNormalTime) {
        const townData = towns.find(t => t.name === currentTown);
        const cooldownReduction = player.skills.some(s => s.name === "Quick Gather") ? player.skills.find(s => s.name === "Quick Gather").effect.cooldownReduction : 0;
        const cooldownSeconds = townData.gatherCooldown * 60 * (1 - cooldownReduction);
        const remainingSeconds = Math.max(cooldownSeconds - Math.floor((now - lastNormalTime) / 1000), 0);
        setCountdown(remainingSeconds);
        if (remainingSeconds === 0 && lastNormalTime) setGameMessage(`You can gather in ${currentTown} again!`);
      } else {
        setCountdown(null);
      }

      if (lastQueuedGatherTime) {
        const remainingSeconds = Math.max(3 * 60 - Math.floor((now - lastQueuedGatherTime) / 1000), 0);
        setQueuedCountdown(remainingSeconds);
        if (remainingSeconds === 0 && lastQueuedGatherTime) setGameMessage("You can queue gathers for gold again!");
      } else {
        setQueuedCountdown(null);
      }
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [lastGatherTimes, lastQueuedGatherTime, currentTown, player.skills]);

  // ---- Inventory ----
  const sortInventory = useCallback(() => {
    setPlayer(prev => ({
      ...prev,
      inventory: [...prev.inventory].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, []);

  // ---- Community Event ----
  const mockCommunityEvent = useCallback(() => ({
    description: "Community Goal: Contribute 500 gold total! Current: " + (Math.min(500, Math.floor(Math.random() * 600))) + "/500",
    action: () => {
      setPlayer(prev => {
        if (prev.gold < 50) {
          setGameMessage("Need 50 gold to contribute!");
          return prev;
        }
        const contribution = 50;
        setGameMessage("You contributed 50 gold to the community goal!");
        if (Math.random() < 0.2) {
          setGameMessage("Community goal completed! Earned 100 gold!");
          return { ...prev, gold: prev.gold - contribution + 100 };
        }
        return { ...prev, gold: prev.gold - contribution };
      });
      setModals(prev => ({ ...prev, community: false }));
    },
  }), []);

  // ---- Travel ----
  const travel = useCallback((town) => {
    setTravelDestination(town);
    setModals(prev => ({ ...prev, travel: true }));
    setTimeout(() => {
      setCurrentTown(town);
      updateXP(2);
      setGameMessage(`You arrived at ${town}! (+2 XP)`);
      setModals(prev => ({ ...prev, travel: false }));
      setTravelDestination(null);
    }, 5000);
  }, [updateXP]);

  // ---- Character Customization ----
  const customizeCharacter = useCallback((newName, newAvatar, newTrait) => {
    setPlayer(prev => ({
      ...prev,
      name: newName || prev.name,
      avatar: newAvatar || prev.avatar,
      trait: newTrait || prev.trait,
    }));
    setModals(prev => ({ ...prev, customize: false }));
    setGameMessage(`Character customized! Welcome, ${newName || player.name}!`);
  }, [player.name]);

  // ---- Modal Toggle ----
  const toggleModal = useCallback((modal) => {
    setModals(prev => ({ ...prev, [modal]: !prev[modal] }));
  }, []);

  // ---- Render ----
  return (
    <div style={{ minHeight: "100vh", maxHeight: "100vh", overflowY: "auto", background: "url('/background.jpg') center/cover fixed", animation: "backgroundFade 5s infinite" }}>
      <Head><title>Kaito's Adventure</title></Head>
      <Navbar menuOpen={menuOpen} toggleMenu={toggleMenu} />
      <Container fluid className="py-3 py-md-5" style={{ paddingTop: "50px" }}>
        <Button variant="info" style={{ position: "absolute", top: "10px", left: "10px", zIndex: 1000 }} onClick={() => toggleModal("leaderboard")} className={styles.glowButton}>
          <FaStar className={styles.iconPulse} /> Leaderboard
        </Button>
        <Row className="justify-content-center">
          <Col md={10}>


          <Card className={`${styles.gildedCard} ${styles.cardPulse}`} style={{ background: "rgba(255, 255, 255, 0.9)" }}>


            <PlayerStats player={player} xpProgress={xpProgress} />
            <TownInfo currentTown={currentTown} townLevels={townLevels} weather={weather} currentEvent={currentEvent} eventTimer={eventTimer} formatCountdown={formatCountdown} />
            <GameMessage message={gameMessage} />
            <InventoryList 
              player={player} 
              setPlayer={setPlayer} 
              equipItem={equipItem} 
              useGatherPotion={useGatherPotion} 
              sortInventory={sortInventory} 
              upgradeInventory={upgradeInventory} 
              rareItems={rare_items} 
            />
            <ActionBar 
              toggleModal={toggleModal} 
              startCombat={startCombat} 
              travel={travel} 
              currentTown={currentTown} 
              towns={towns} 
              player={player} 
              countdown={countdown} 
              queuedCountdown={queuedCountdown} 
              formatCountdown={formatCountdown} 
            />
  </Card>


          </Col>
        </Row>
      </Container>

      {/* Modals */}
      <ModalWrapper show={modals.craft} onHide={() => toggleModal("craft")} title="Craft Items">
        <CraftModal 
          player={player} 
          selectedIngredients={selectedIngredients} 
          setSelectedIngredients={setSelectedIngredients} 
          toggleIngredient={toggleIngredient} 
          getAvailableIngredients={getAvailableIngredients} 
          craftItem={craftItem} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
      <ModalWrapper show={modals.healing} onHide={() => toggleModal("healing")} title="Healing Potions">
        <HealingModal toggleModal={toggleModal} />
      </ModalWrapper>
      <ModalWrapper show={modals.gather} onHide={() => toggleModal("gather")} title={`Gather Options in ${currentTown}`}>
        <GatherModal 
          currentTown={currentTown} 
          towns={towns} 
          player={player} 
          gatherSingle={gatherSingle} 
          queueGathers={queueGathers} 
          weather={weather} 
          countdown={countdown} 
          queuedCountdown={queuedCountdown} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
      <ModalWrapper show={modals.combat} onHide={() => toggleModal("combat")} title="Combat Arena" centered>
        <CombatModal 
          combatState={combatState} 
          combatResult={combatResult} 
          player={player} 
          attackEnemy={attackEnemy} 
          craftPotionInCombat={craftPotionInCombat} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
      <ModalWrapper show={modals.market} onHide={() => toggleModal("market")} title={`${currentTown} Market`}>
        <MarketModal 
          currentTown={currentTown} 
          towns={towns} 
          player={player} 
          sellDrink={sellDrink} 
          buyIngredient={buyIngredient} 
          townLevels={townLevels} 
          currentEvent={currentEvent} 
          weather={weather} 
          setSelectedNPC={setSelectedNPC} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
      <ModalWrapper show={modals.npc} onHide={() => toggleModal("npc")} title={`Talk to ${selectedNPC?.name}`}>
        <NpcModal 
          selectedNPC={selectedNPC} 
          player={player} 
          addQuest={addQuest} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
      <ModalWrapper show={modals.quests} onHide={() => toggleModal("quests")} title="Quests">
        <QuestsModal 
          player={player} 
          currentTown={currentTown} 
          towns={towns} 
          addQuest={addQuest} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
      <ModalWrapper show={modals.daily} onHide={() => toggleModal("daily")} title="Daily & Weekly Tasks">
        <DailyModal 
          player={player} 
          formatCountdown={formatCountdown} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
      <ModalWrapper show={modals.stats} onHide={() => toggleModal("stats")} title="Lifetime Stats">
        <StatsModal player={player} toggleModal={toggleModal} />
      </ModalWrapper>
      <ModalWrapper show={modals.community} onHide={() => toggleModal("community")} title="Community Events">
        <CommunityModal mockCommunityEvent={mockCommunityEvent} toggleModal={toggleModal} />
      </ModalWrapper>
      <ModalWrapper show={modals.customize} onHide={() => toggleModal("customize")} title="Customize Character">
        <CustomizeModal 
          player={player} 
          customizeCharacter={customizeCharacter} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
      <ModalWrapper show={modals.guild} onHide={() => toggleModal("guild")} title="Guild">
        <GuildModal 
          player={player} 
          joinGuild={joinGuild} 
          contributeToGuild={contributeToGuild} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
      <ModalWrapper show={modals.skills} onHide={() => toggleModal("skills")} title="Skills">
        <SkillsModal 
          player={player} 
          skillTrees={skillTrees} 
          unlockSkill={unlockSkill} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
      <ModalWrapper show={modals.events} onHide={() => toggleModal("events")} title="Current Events">
        <EventsModal 
          currentEvent={currentEvent} 
          eventTimer={eventTimer} 
          formatCountdown={formatCountdown} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
      <TravelModal 
        show={modals.travel} 
        travelDestination={travelDestination} 
      />
      <ModalWrapper show={modals.guide} onHide={() => toggleModal("guide")} title="Welcome to Kaito's Adventure!">
        <GuideModal toggleModal={toggleModal} />
      </ModalWrapper>
      <ModalWrapper show={modals.leaderboard} onHide={() => toggleModal("leaderboard")} title="Leaderboard">
        <LeaderboardModal 
          connected={connected} 
          leaderboardData={leaderboardData} 
          toggleModal={toggleModal} 
        />
      </ModalWrapper>
    </div>
  );
};

export default KaitoAdventure;