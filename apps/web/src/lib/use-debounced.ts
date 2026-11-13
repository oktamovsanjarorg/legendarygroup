import { useEffect, useState } from 'react';

/** Qiymatni kechiktirib qaytaradi (qidiruv: har harfda so'rov yubormaslik uchun). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}
