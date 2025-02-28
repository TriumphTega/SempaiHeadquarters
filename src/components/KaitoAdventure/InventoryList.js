 
import { ListGroup, Button, Card } from "react-bootstrap";
import Image from "next/image";
import { FaFlask, FaShieldAlt, FaStar, FaCoins } from "react-icons/fa";
import styles from "../../styles/Combat.module.css";
import { GiCrossedSwords } from "react-icons/gi"; // Another option

const InventoryList = ({ player, setPlayer, equipItem, useGatherPotion, sortInventory, upgradeInventory, rareItems }) => (
  <>
    <h2 className={styles.sectionTitle}><FaFlask /> Inventory (Max: {player.inventory_slots})</h2>
    <Button variant="outline-secondary" size="sm" onClick={sortInventory} className={`${styles.glowButton} mb-2`}>Sort</Button>
    <Button variant="outline-primary" size="sm" onClick={upgradeInventory} className={`${styles.glowButton} mb-2 ml-2`}>Upgrade (+5) <FaCoins /> 50</Button>
    <ListGroup variant="flush" className="mb-4 mx-auto" style={{ maxWidth: "min(400px, 90vw)", maxHeight: "30vh", overflowY: "auto" }}>
      {player.inventory.map(item => (
        <ListGroup.Item key={item.name} className={styles.inventoryItem}>
          <span className={rareItems.includes(item.name) ? styles.rareItem : ""}>
            <Image src={`/items/${item.name.toLowerCase().replace(" ", "-")}.png`} alt={item.name} width={20} height={20} onError={(e) => e.target.style.display = "none"} />
            {item.name}: {item.quantity}
          </span>
          {(player.recipes.find(r => r.name === item.name && (r.type === "equip" || r.type === "armor"))) && (
            <Button variant="outline-primary" size="sm" className={`${styles.glowButton} ml-2`} onClick={() => equipItem(item.name)}><GiCrossedSwords /> Equip</Button>
          )}
          {(player.recipes.find(r => r.name === item.name && r.type === "gather")) && (
            <Button variant="outline-success" size="sm" className={`${styles.glowButton} ml-2`} onClick={() => useGatherPotion(item.name)}><FaFlask /> Use</Button>
          )}
        </ListGroup.Item>
      ))}
    </ListGroup>
    <Card.Text><FaStar /> Rare Items: {player.rare_items.join(", ") || "None"}</Card.Text>
    <Card.Text><FaShieldAlt /> Equipped: Weapon: {player.equipment.weapon || "None"} | Armor: {player.equipment.armor || "None"}</Card.Text>
  </>
);

export default InventoryList;