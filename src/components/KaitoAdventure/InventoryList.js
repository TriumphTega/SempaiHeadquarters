 
import Image from "next/image";
import { FaFlask, FaShieldAlt, FaStar, FaCoins } from "react-icons/fa";
import { GiCrossedSwords } from "react-icons/gi";
import styles from "../../styles/KaitoAdventure.module.css";

const InventoryList = ({ player, setPlayer, equipItem, useGatherPotion, sortInventory, upgradeInventory, rareItems }) => (
  <div className={styles.kaPanel} style={{ marginTop: 16 }}>
    <div className={styles.kaInventoryHeader}>
      <div className={styles.kaInventoryTitle}>
        <FaFlask /> Inventory
        <span className={styles.kaTownLevel} style={{ marginLeft: 6 }}>Slots {player.inventory.length}/{player.inventory_slots}</span>
      </div>

      <div className={styles.kaInventoryActions}>
        <button type="button" className={styles.kaInventoryActionBtn} onClick={sortInventory}>Sort</button>
        <button type="button" className={styles.kaInventoryActionBtn} onClick={upgradeInventory}>
          Upgrade <FaCoins /> 50
        </button>
      </div>
    </div>

    <div className={styles.kaInventoryGrid}>
      {player.inventory.map((item) => {
        const isRare = rareItems?.includes(item.name);
        const isEquippable = Boolean(player.recipes.find((r) => r.name === item.name && (r.type === "equip" || r.type === "armor")));
        const isGatherPotion = Boolean(player.recipes.find((r) => r.name === item.name && r.type === "gather"));
        const itemSlug = item.name.toLowerCase().replaceAll(" ", "-");

        return (
          <div
            key={item.name}
            className={`${styles.kaInventoryItem} ${isRare ? styles.kaInventoryItemRare : ""}`}
            title={item.name}
          >
            <Image
              src={`/items/${itemSlug}.png`}
              alt={item.name}
              width={32}
              height={32}
              className={styles.kaItemIcon}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div className={styles.kaItemName}>{item.name}</div>
            <div className={styles.kaItemQty}>x{item.quantity}</div>

            {isEquippable ? (
              <button type="button" className={styles.kaItemEquipBtn} onClick={() => equipItem(item.name)}>
                <GiCrossedSwords /> Equip
              </button>
            ) : null}

            {isGatherPotion ? (
              <button type="button" className={styles.kaItemEquipBtn} onClick={() => useGatherPotion(item.name)}>
                <FaFlask /> Use
              </button>
            ) : null}
          </div>
        );
      })}
    </div>

    <div className={styles.kaSectionDivider}>EQUIPMENT</div>

    <div className={styles.kaEquipmentBar}>
      <div className={styles.kaEquipSlot}>
        <GiCrossedSwords style={{ color: "#e67e22" }} />
        <span>Weapon</span>
        <span className={player.equipment.weapon ? styles.kaEquipSlotValue : styles.kaEquipSlotEmpty}>
          {player.equipment.weapon || "None"}
        </span>
      </div>
      <div className={styles.kaEquipSlot}>
        <FaShieldAlt style={{ color: "#e67e22" }} />
        <span>Armor</span>
        <span className={player.equipment.armor ? styles.kaEquipSlotValue : styles.kaEquipSlotEmpty}>
          {player.equipment.armor || "None"}
        </span>
      </div>

      <div style={{ marginLeft: "auto" }} className={styles.kaRareBadge}>
        <FaStar /> Rare: {player.rare_items?.length || 0}
      </div>
    </div>
  </div>
);

export default InventoryList;