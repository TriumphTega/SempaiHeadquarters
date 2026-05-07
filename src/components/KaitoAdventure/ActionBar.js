 
import { Container, Dropdown } from "react-bootstrap";
import { FaFlask, FaMap, FaBook, FaStar, FaUsers } from "react-icons/fa";
import styles from "../../styles/KaitoAdventure.module.css";
import { GiCrossedSwords } from "react-icons/gi"; // Another option

const ActionBar = ({ toggleModal, startCombat, travel, currentTown, towns, player, countdown, queuedCountdown, formatCountdown }) => (
  <div className={styles.kaCommandBar}>
    <Container style={{ maxWidth: "960px" }}>
      <div className={styles.kaCommandGrid}>
        <Dropdown>
          <Dropdown.Toggle as="button" className={`${styles.kaBtn} ${styles.kaBtnPrimary}`}>
            <FaFlask className={styles.kaBtnIcon} /> Craft
          </Dropdown.Toggle>
          <Dropdown.Menu className={styles.kaDropdownMenu}>
            <div className={styles.kaDropdownHeader}>Brewmaster</div>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("craft")} role="button" tabIndex={0}>
              Craft Items
            </div>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("healing")} role="button" tabIndex={0}>
              Craft Healing Potion
            </div>
          </Dropdown.Menu>
        </Dropdown>

        <button type="button" className={`${styles.kaBtn} ${styles.kaBtnDanger}`} onClick={startCombat}>
          <GiCrossedSwords className={styles.kaBtnIcon} /> Combat
        </button>

        <Dropdown>
          <Dropdown.Toggle as="button" className={`${styles.kaBtn} ${styles.kaBtnSuccess}`}>
            <FaMap className={styles.kaBtnIcon} /> Town
          </Dropdown.Toggle>
          <Dropdown.Menu className={styles.kaDropdownMenu}>
            <div className={styles.kaDropdownHeader}>Town Actions</div>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("market")} role="button" tabIndex={0}>
              Visit Market
            </div>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("gather")} role="button" tabIndex={0}>
              Gather Ingredient
            </div>
            <div className={styles.kaDropdownDivider} />
            <div className={styles.kaDropdownHeader}>Travel</div>
            {towns.map((town) => (
              <div
                key={town.name}
                className={styles.kaDropdownItem}
                onClick={() => (currentTown === town.name ? null : travel(town.name))}
                role="button"
                tabIndex={0}
                style={{ opacity: currentTown === town.name ? 0.4 : 1, cursor: currentTown === town.name ? "not-allowed" : "pointer" }}
              >
                {town.name}
              </div>
            ))}
          </Dropdown.Menu>
        </Dropdown>

        <Dropdown>
          <Dropdown.Toggle as="button" className={styles.kaBtn}>
            <FaBook className={styles.kaBtnIcon} /> Quests ({player.quests.length})
          </Dropdown.Toggle>
          <Dropdown.Menu className={styles.kaDropdownMenu}>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("quests")} role="button" tabIndex={0}>
              Quests
            </div>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("daily")} role="button" tabIndex={0}>
              Tasks
            </div>
          </Dropdown.Menu>
        </Dropdown>

        <Dropdown>
          <Dropdown.Toggle as="button" className={styles.kaBtn}>
            <FaStar className={styles.kaBtnIcon} /> Stats
          </Dropdown.Toggle>
          <Dropdown.Menu className={styles.kaDropdownMenu}>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("stats")} role="button" tabIndex={0}>
              Stats
            </div>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("skills")} role="button" tabIndex={0}>
              Skills
            </div>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("leaderboard")} role="button" tabIndex={0}>
              Leaderboard
            </div>
          </Dropdown.Menu>
        </Dropdown>

        <Dropdown>
          <Dropdown.Toggle as="button" className={styles.kaBtn}>
            <FaUsers className={styles.kaBtnIcon} /> More
          </Dropdown.Toggle>
          <Dropdown.Menu className={styles.kaDropdownMenu}>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("community")} role="button" tabIndex={0}>
              Community
            </div>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("customize")} role="button" tabIndex={0}>
              Customize
            </div>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("events")} role="button" tabIndex={0}>
              Events
            </div>
            <div className={styles.kaDropdownItem} onClick={() => toggleModal("guild")} role="button" tabIndex={0}>
              Guild {player.guild ? `(${player.guild.name})` : ""}
            </div>
          </Dropdown.Menu>
        </Dropdown>
      </div>

      <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
        {countdown !== null && countdown > 0 ? (
          <div className={styles.kaCountdown}>Gather: {formatCountdown(countdown)}</div>
        ) : null}
        {queuedCountdown !== null && queuedCountdown > 0 ? (
          <div className={styles.kaCountdown}>Queued: {formatCountdown(queuedCountdown)}</div>
        ) : null}
      </div>
    </Container>
  </div>
);

export default ActionBar;