 
import { ListGroup, Button } from "react-bootstrap";
import { FaCoins } from "react-icons/fa";
import styles from "../../../styles/Combat.module.css";

const MarketModal = ({ currentTown, towns, player, sellDrink, buyIngredient, townLevels, currentEvent, weather, setSelectedNPC, toggleModal }) => {
  const townData = towns.find(t => t.name === currentTown);

  return (
    <>
      <h5>Sell Your Items:</h5>
      <ListGroup className="mb-3">
        {player.inventory
          .filter(item => player.recipes.some(r => r.name === item.name && (r.sellValue || r.baseGold)))
          .map(item => {
            const recipe = player.recipes.find(r => r.name === item.name);
            const demandMultiplier = (townData.demand[item.name] || 1.0) * 
              (currentEvent?.type === "festival" ? 1.5 : 1) * 
              (weather.demandBonus[item.name] || 1);
            const price = Math.floor((recipe.sellValue || recipe.baseGold) * 
              townData.rewardMultiplier * demandMultiplier);
            return (
              <ListGroup.Item key={item.name} className="align-items-center d-flex justify-content-between">
                <span>{item.name}: {item.quantity} (Sells for {price} gold each)</span>
                <Button 
                  variant="outline-success" 
                  size="sm" 
                  onClick={() => sellDrink(item.name)} 
                  disabled={item.quantity === 0}
                  className={styles.glowButton}
                >
                  Sell One
                </Button>
              </ListGroup.Item>
            );
          })}
      </ListGroup>
      <h5>NPC Buyers:</h5>
      <ListGroup>
        {townData.npcOffers.map((offer, idx) => (
          <ListGroup.Item key={idx} className="align-items-center d-flex justify-content-between">
            <span>{offer.ingredient} (Buy for {Math.floor(offer.price / townLevels[currentTown])} gold)</span>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={() => buyIngredient(offer.ingredient, offer.price)} 
              disabled={player.gold < Math.floor(offer.price / townLevels[currentTown])} 
              className={styles.glowButton}
            >
              Buy One
            </Button>
          </ListGroup.Item>
        ))}
      </ListGroup>
      <Button 
        variant="outline-info" 
        className={`${styles.glowButton} mt-3`} 
        onClick={() => { setSelectedNPC(townData.npcs[0]); toggleModal("npc"); }}
      >
        Talk to NPC
      </Button>
      <div className="mt-3">
        <Button variant="secondary" onClick={() => toggleModal("market")} className={styles.glowButton}>Close</Button>
      </div>
    </>
  );
};

export default MarketModal;