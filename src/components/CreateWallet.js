// components/CreateWallet.js
import { useContext, useState } from "react";
import { EmbeddedWalletContext } from "./EmbeddedWalletProvider";
import styles from "../styles/CreateWallet.module.css"; // New CSS file

export const CreateWallet = () => {
  const { wallet, createWallet, isLoading, error } = useContext(EmbeddedWalletContext);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleCreateWallet = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (password.length < 8) {
      alert("Password must be at least 8 characters long!");
      return;
    }
    const publicKey = await createWallet(password);
    if (publicKey) {
      alert(`Wallet created successfully! Public Key: ${publicKey}`);
    }
  };

  if (wallet) {
    return <p>Wallet: {wallet.publicKey}</p>;
  }

  return (
    <div className={styles.container}>
      <h2>Create Your Wallet</h2>
      <form onSubmit={handleCreateWallet}>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={styles.input}
          disabled={isLoading}
        />
        <button type="submit" className={styles.button} disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Wallet"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </div>
  );
};