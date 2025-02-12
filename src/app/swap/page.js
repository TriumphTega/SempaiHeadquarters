'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BootstrapProvider from '../../components/BootstrapProvider';
import ConnectButton from '../../components/ConnectButton'; // Assuming you have a button to connect wallet
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, unpackAccount } from "@solana/spl-token";
import Link from 'next/link';
import { supabase } from '../../services/supabase/supabaseClient';
import { AMETHYST_MINT_ADDRESS, RPC_URL } from '@/constants';
import TreasuryBalance from "../../components/TreasuryBalance";
import LoadingPage from '../../components/LoadingPage';




const connection = new Connection(RPC_URL);

export default function SwapPage() {
  const { connected, publicKey, wallet, disconnect, sendTransaction } = useWallet(); // Use the wallet adapter's hook
  const [amount, setAmount] = useState('');
  const [coinFrom, setCoinFrom] = useState('Amethyst');
  const [coinTo, setCoinTo] = useState('SMP');
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const checkBalance = async () => {
    if (!publicKey) {
      console.log("No public key found. Wallet might not be connected.");
      return;
    }

    try {
      const amethystAtaAddress = getAssociatedTokenAddressSync(AMETHYST_MINT_ADDRESS, publicKey);
      const amethystAtaInfo = await connection.getAccountInfo(amethystAtaAddress);
      if(!amethystAtaInfo){
        console.log("user has no amethyst");
        setBalance(0);
        return;
      }

      const amethystAta = unpackAccount(amethystAtaAddress, amethystAtaInfo);
      setBalance(Number(amethystAta.amount)/1_000_000);
    } catch (error) {
        console.error("Unexpected error fetching balance:", error);
    }
  };
  useEffect(() => {
    if (connected) {
      checkBalance(); // Fetch balance from Supabase when wallet connects
    }
  }, [connected, publicKey]); // Run when connection changes



  // Handle the coin swap
  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!connected) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);

    try {
      console.log(`Swapping ${amount} ${coinFrom} to ${coinTo}`);

      const { transaction, blockhashInfo, error, message } = await fetch("/api/swap", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userAddress: publicKey,
          amethystAmount: parseFloat(amount)
        })
      }).then((r) => r.json());

      if(error){
        console.error(`${error}: ${message}`);
        // TODO: show error
        alert(`${error}: ${message}`);
        return;
      }
      console.log(`received transaction: ${transaction}`);

      const signature = await sendTransaction(
        Transaction.from(Buffer.from(transaction, "base64")),
        connection,
      );
      console.log(`signature: ${signature}`);

      alert(`Swap successful! ${signature}`);
    } catch (error) {
      console.error('Error swapping coins:', error);
      alert('Swap failed. Please try again.');
    }
    finally {
      setLoading(false);
    }
  };

 if (loading) {
    return <LoadingPage />;
  }

  return (

    <>404</>
//     <div >
//       <BootstrapProvider />
//       <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-3 shadow">
//         <div className="container">
//           {/* Brand Logo */}
//           <Link href="/" className="navbar-brand">
//           <img
//             src="/images/logo.jpg"  // The path is correct if the image is in the public folder
//             alt="Sempai HQ"
//             className="navbar-logo"
//             style={{ width: "40px", height: "40px", borderRadius: "50%" }}
//           />
//           </Link>
//           {/* Toggle Button for Mobile View */}
//           <button
//             className="navbar-toggler"
//             type="button"
//             data-bs-toggle="collapse"
//             data-bs-target="#navbarNav"
//             aria-controls="navbarNav"
//             aria-expanded="false"
//             aria-label="Toggle navigation"
//           >
//             <span className="navbar-toggler-icon"></span>
//           </button>
//           {/* Navbar Links */}
//           <div className="collapse navbar-collapse" id="navbarNav">
//             <ul className="navbar-nav me-auto">
//               <li className="nav-item">
//                 <Link href="/" className="nav-link text-light fw-semibold hover-effect">
//                   Home
//                 </Link>
//               </li>
//               <li className="nav-item">
//                 <Link href="/swap" className="nav-link text-light fw-semibold hover-effect">
//                   Swap
//                 </Link>
//               </li>
//             </ul>
//             {/* Wallet and Creator Dashboard */}

//           </div>
//         </div>
//       </nav>


//       <header className="bg-orange py-5 text-center text-white" style={{ background: 'linear-gradient(135deg,rgb(243, 99, 22), #feb47b)' }}>
//         <div className="container">
//           <h1 className="display-4">Coin Swap</h1>
//           <p className="lead">Swap your coins easily and securely.</p>
//           <TreasuryBalance />

//         </div>
//       </header>

//       <div className="container my-5">
//         <div className="row justify-content-center">
//           <div className="col-md-8 col-lg-6">
//             <div className="card shadow-lg border-0">
//               <div>
//                 {!connected ? (
//                   <div className="alert alert-danger">
//                     Please connect your wallet to proceed.
//                     <ConnectButton />
//                   </div>
//                 ) : (
//                   <div className='bubble-form'>
//                     <h4 className=" mb-4 form-label">Swap {coinFrom} for {coinTo}</h4>
//                     <h5 className="text-success">
//                       Balance: {balance} Amethyst
//                       <button onClick={checkBalance} className="btn btn-sm btn-outline-primary ms-2">
//                         Refresh
//                       </button>
//                     </h5>



//                     <div className="mb-3 form-label">
//                       <label className="form-label">Amount to Swap</label>
//                       <input
//                         type="number"
//                         className="form-control"
//                         value={amount}
//                         onChange={(e) => setAmount(e.target.value)}
//                         min="0"
//                       />
//                     </div>

//                     <div className="mb-3">
//                       <label className="form-label">From</label>
//                       <select
//                         className="form-select"
//                         value={coinFrom}
//                         onChange={(e) => setCoinFrom(e.target.value)}
//                       >
//                         <option value="Amethyst">Amethyst</option>
//                         <option value="SMP">SMP</option>
//                         {/* Add more coins as needed */}
//                       </select>
//                     </div>

//                     <div className="mb-3">
//                       <label className="form-label">To</label>
//                       <select
//                         className="form-select"
//                         value={coinTo}
//                         onChange={(e) => setCoinTo(e.target.value)}
//                       >
//                         <option value="SMP">SMP</option>
//                         <option value="Amethyst">Amethyst</option>
//                         {/* Add more coins as needed */}
//                       </select>
//                     </div>

//                     <button
//                       className="glass-button w-100"
//                       onClick={handleSwap}
//                       disabled={loading}
//                     >
//                       {loading ? 'Swapping...' : 'Swap Coins'}
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       <footer className="bg-dark py-4 text-center text-white">
//         <p>&copy; 2025 Sempai HQ. All rights reserved.</p>
//       </footer>
//       <style jsx>{`
//     .glass-button {
//     background: rgba(243, 99, 22, 0.15); /* More transparency */
//     backdrop-filter: blur(15px); /* Stronger glass blur */
//     -webkit-backdrop-filter: blur(15px);
//     border: 2px solid rgba(243, 99, 22, 0.4);
//     padding: 14px 22px;
//     font-size: 17px;
//     font-weight: bold;
//     color: rgb(243, 99, 22); /* Fixes text color */
//     border-radius: 30px; /* Rounded shape */
//     cursor: pointer;
//     transition: all 0.3s ease-in-out;
//     box-shadow: 0 6px 12px rgba(243, 99, 22, 0.35);
// }

// .glass-button:hover {
//     background: rgba(243, 99, 22, 0.5);
//     box-shadow: 0 8px 18px rgba(243, 99, 22, 0.4);
//     transform: translateY(-3px);
// }

// .glass-button:disabled {
//     background: rgba(243, 99, 22, 0.2);
//     cursor: not-allowed;
//     box-shadow: none;
//     opacity: 0.6;
// }


// `}</style>
//     </div>
  );
}
