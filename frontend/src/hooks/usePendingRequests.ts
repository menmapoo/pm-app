import { useEffect, useState } from 'react';
import { profileApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export const usePendingRequests = () => {
  const { user } = useAuthStore();
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    if (user?.role !== 'ADMIN') return;
    try {
      const res = await profileApi.getPendingCount();
      setCount(res.data.count);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user?.role]);

  return { count, refresh: fetchCount };
};
