import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase/supabaseClient';

export const useBenefactorStatus = (userId) => {
  const [isBenefactor, setIsBenefactor] = useState(false);
  const [benefactorLevel, setBenefactorLevel] = useState('bronze');
  const [benefactorSince, setBenefactorSince] = useState(null);
  const [totalPayments, setTotalPayments] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBenefactorStatus = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_benefactor, benefactor_level, benefactor_since, total_benefactor_payments')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching benefactor status:', error);
          return;
        }

        if (data) {
          setIsBenefactor(data.is_benefactor || false);
          setBenefactorLevel(data.benefactor_level || 'bronze');
          setBenefactorSince(data.benefactor_since);
          setTotalPayments(data.total_benefactor_payments || 0);
        }
      } catch (error) {
        console.error('Error in useBenefactorStatus:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBenefactorStatus();
  }, [userId]);

  return {
    isBenefactor,
    benefactorLevel,
    benefactorSince,
    totalPayments,
    loading
  };
};
