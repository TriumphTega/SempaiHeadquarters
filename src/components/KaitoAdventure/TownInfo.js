 
import { useEffect, useState } from "react";
import { FaCloudSun, FaCloudRain, FaSmog } from "react-icons/fa";
import styles from "../../styles/KaitoAdventure.module.css";

const getWeatherIcon = (type) => {
  switch ((type || "").toLowerCase()) {
    case "rainy":
      return <FaCloudRain className={styles.kaWeatherIcon} />;
    case "foggy":
      return <FaSmog className={styles.kaWeatherIcon} />;
    case "sunny":
    default:
      return <FaCloudSun className={styles.kaWeatherIcon} />;
  }
};

const TownInfo = ({ currentTown, townLevels, weather, currentEvent, eventTimer, formatCountdown }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(null);

  useEffect(() => {
    if (!eventTimer) {
      setRemainingSeconds(null);
      return;
    }

    const tick = () => {
      const next = Math.max(0, Math.floor((eventTimer - Date.now()) / 1000));
      setRemainingSeconds(next);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [eventTimer]);

  return (
    <div className={`${styles.kaTownBanner} ${styles.kaFadeIn}`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className={styles.kaTownName}>{currentTown}</div>
          <div className={styles.kaTownLevel}>Lv {townLevels[currentTown]}</div>
        </div>

        <div className={styles.kaWeatherBadge}>
          {getWeatherIcon(weather?.type)}
          <span style={{ textTransform: "uppercase", letterSpacing: 2, fontSize: "0.7rem" }}>{weather?.type}</span>
        </div>
      </div>

      {currentEvent && (
        <div className={styles.kaEventBanner}>
          <span style={{ fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Event</span>
          <span style={{ color: "#f5e6d3" }}>{currentEvent.description}</span>
          {eventTimer ? (
            <span style={{ marginLeft: "auto", color: "#e08a96", fontVariantNumeric: "tabular-nums" }}>
              {remainingSeconds === null ? "--:--" : formatCountdown(remainingSeconds)}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default TownInfo;