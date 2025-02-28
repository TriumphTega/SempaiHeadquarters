 
import { Form, Tabs, Tab, Button } from "react-bootstrap";
import { FaFlask } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";

const CraftModal = ({ player, selectedIngredients, setSelectedIngredients, toggleIngredient, getAvailableIngredients, craftItem, activeTab, setActiveTab, toggleModal }) => (
  <>
    <Form>
      <h5>Select Ingredients:</h5>
      {getAvailableIngredients.map(item => (
        <Form.Check
          key={item.name}
          type="checkbox"
          label={`${item.name} (${item.owned ? item.quantity : "∞"}) (Selected: ${selectedIngredients.filter(i => i === item.name).length})`}
          checked={selectedIngredients.includes(item.name)}
          onChange={() => toggleIngredient(item.name)}
          disabled={!item.owned || item.quantity === 0}
        />
      ))}
    </Form>
    <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)} id="craft-tabs" className="mt-3">
      <Tab eventKey="drinks" title="Drinks">
        <p className="mt-3">Known Sellable Recipes:</p>
        <ul>{player.recipes.filter(r => r.type === "sell").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")}</li>)}</ul>
      </Tab>
      <Tab eventKey="weapons" title="Weapons">
        <p className="mt-3">Known Weapon Recipes:</p>
        <ul>{player.recipes.filter(r => r.type === "equip").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")} (Bonus: +{r.bonus.damage} Damage)</li>)}</ul>
      </Tab>
      <Tab eventKey="armor" title="Armor">
        <p className="mt-3">Known Armor Recipes (Unlocks at Level 10):</p>
        <ul>{player.recipes.filter(r => r.type === "armor").map(r => <li key={r.name}>{r.name}: {r.ingredients.join(", ")} (Defense: {r.bonus.defense}) {r.unlockLevel > player.level ? "(Locked)" : ""}</li>)}</ul>
      </Tab>
      <Tab eventKey="potions" title="Potions">
        <p className="mt-3">Known Potion Recipes:</p>
        <ul>
          {player.recipes.filter(r => r.type === "heal" || r.type === "gather").map(r => (
            <li key={r.name}>
              {r.name}: {r.ingredients.join(", ")}
              {r.type === "heal" && ` (Heal: ${r.healPercent * 100}% HP, Sell: ${r.sellValue} gold)`}
              {r.type === "gather" && ` (Effect: ${r.effect.rareChanceBoost ? `+${r.effect.rareChanceBoost * 100}% Rare Chance` : `-${r.effect.cooldownReduction * 100}% Cooldown`}, ${r.effect.duration / 60000} min)`}
            </li>
          ))}
        </ul>
      </Tab>
    </Tabs>
    <div className="mt-3">
      <Button variant="secondary" onClick={() => toggleModal("craft")} className={styles.glowButton}>Cancel</Button>
      <Button variant="primary" onClick={() => {
        const selectedRecipe = player.recipes.find(r => 
          r.ingredients.every(ing => selectedIngredients.filter(i => i === ing).length >= r.ingredients.filter(i => i === ing).length) && 
          r.ingredients.length === selectedIngredients.length
        );
        craftItem(selectedRecipe ? selectedRecipe.type : activeTab);
      }} className={`${styles.glowButton} ml-2`}><FaFlask /> Craft</Button>
    </div>
  </>
);

export default CraftModal;