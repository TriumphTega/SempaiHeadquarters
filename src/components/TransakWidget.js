"use client";

import { useEffect, useRef } from 'react';
import { Transak } from '@transak/ui-js-sdk';

export default function TransakWidget({ walletAddress, onClose }) {
  const transakRef = useRef(null);

  const openTransak = async () => {
    try {
      // Call your backend to get the secure widgetUrl
      const res = await fetch('/api/transak-widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          fiatCurrency: 'USD',
          defaultFiatAmount: '100',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate Transak widget URL');
      }

      const { widgetUrl } = await res.json();

      const config = {
        widgetUrl,           // ← This is now required
        widgetWidth: '100%',
        widgetHeight: '650px',
      };

      transakRef.current = new Transak(config);
      transakRef.current.init();

      // Event listeners
      Transak.on(Transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL, (order) => {
        console.log('✅ Transak order successful:', order);
        transakRef.current?.close();
        if (onClose) onClose();
      });

      Transak.on(Transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
        console.log('Transak widget closed');
        if (onClose) onClose();
      });

    } catch (error) {
      console.error('Error opening Transak:', error);
      alert('Failed to open Transak. Please try again.');
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (transakRef.current) {
        transakRef.current.close?.();
        transakRef.current.cleanup?.();
      }
    };
  }, []);

  return (
    <button 
      onClick={openTransak}
      className="px-6 py-3 bg-[#D94F04] text-white rounded-lg font-semibold hover:bg-[#b33f03] transition"
    >
      Open Transak Widget
    </button>
  );
}
