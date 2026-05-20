import React, { useState } from "react";
import styles from "./BenefactorPricing.module.css";

const BenefactorPricing = ({ onSelectPlan, isProcessing = false, creatorId = null, creatorName = null }) => {
  const [hoveredPlan, setHoveredPlan] = useState(null);
  const [selectedToken, setSelectedToken] = useState("USDC");

  const tokens = [
    { id: "USDC", name: "USDC", logo: "/images/usdc-logo.png" },
    { id: "SOL", name: "SOL", logo: "/images/sol-logo.png" },
    { id: "SKR", name: "SKR", logo: "/images/skr-logo.png" },
  ];

  const plans = [
    {
      id: "blue",
      name: "Blue",
      price: "$1",
      chapters: "3 advance chapters",
      svg: "/plan-image/Blue.svg",
      features: [
        "Early access to advance chapters",
        creatorName ? `Support ${creatorName}` : "Support your favorite creators",
        "Exclusive benefactor badge",
      ],
    },
    {
      id: "iron",
      name: "Iron",
      price: "$2",
      chapters: "6 advance chapters",
      svg: "/plan-image/Black.svg",
      features: [
        "Early access to advance chapters",
        creatorName ? `Support ${creatorName}` : "Support your favorite creators",
        "Exclusive benefactor badge",
        "Priority support",
      ],
    },
    {
      id: "silver",
      name: "Silver",
      price: "$3",
      chapters: "10 advance chapters",
      svg: "/plan-image/Silver.svg",
      features: [
        "Early access to advance chapters",
        creatorName ? `Support ${creatorName}` : "Support your favorite creators",
        "Exclusive benefactor badge",
        "Priority support",
        "Creator recognition",
      ],
    },
    {
      id: "gold",
      name: "Gold",
      price: "$5",
      chapters: "Universal access to advance chapters",
      svg: "/plan-image/Gold.svg",
      featured: true,
      features: [
        "Unlimited access to all advance chapters",
        creatorName ? `Support ${creatorName}` : "Support your favorite creators",
        "Exclusive benefactor badge",
        "Priority support",
        "Creator recognition",
        "Voting rights",
      ],
    },
  ];

  const handlePlanSelect = (plan) => {
    if (!isProcessing) {
      onSelectPlan({ ...plan, selectedToken });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Become a Benefactor</h2>
        <p className={styles.subtitle}>
          Support creators and unlock exclusive early access to advance chapters
        </p>
      </div>

      {/* Token Selection */}
      <div className={styles.tokenSelector}>
        <h3 className={styles.tokenSelectorTitle}>Select Payment Token</h3>
        <div className={styles.tokenOptions}>
          {tokens.map((token) => (
            <div
              key={token.id}
              className={`${styles.tokenOption} ${selectedToken === token.id ? styles.selected : ""}`}
              onClick={() => setSelectedToken(token.id)}
            >
              <img src={token.logo} alt={token.name} className={styles.tokenLogo} />
              <span className={styles.tokenName}>{token.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.plansGrid}>
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.planCard} ${plan.featured ? styles.featured : ""} ${
              hoveredPlan === plan.id ? styles.hovered : ""
            }`}
            onMouseEnter={() => setHoveredPlan(plan.id)}
            onMouseLeave={() => setHoveredPlan(null)}
            onClick={() => handlePlanSelect(plan)}
          >
            {plan.featured && <div className={styles.featuredBadge}>RECOMMENDED</div>}
            
            <div className={styles.planImage}>
              <img src={plan.svg} alt={plan.name} className={styles.svgImage} />
            </div>

            <div className={styles.planName}>{plan.name}</div>

            <div className={styles.planPrice}>
              <span className={styles.priceAmount}>{plan.price}</span>
            </div>

            <div className={styles.planChapters}>{plan.chapters}</div>

            <button
              className={styles.selectButton}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className={styles.processingText}>Processing...</span>
              ) : (
                <span className={styles.buttonText}>Select {plan.name}</span>
              )}
            </button>

            <div className={styles.planFeatures}>
              {plan.features.map((feature, index) => (
                <div key={index} className={styles.feature}>✓ {feature}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          All benefactor plans include exclusive access to advance chapters before public release
        </p>
      </div>
    </div>
  );
};

export default BenefactorPricing;
