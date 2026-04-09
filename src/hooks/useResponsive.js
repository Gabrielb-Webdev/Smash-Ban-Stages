import { useState, useEffect } from 'react';

const BP_DESKTOP = 768;
const BP_WIDE    = 1200;

export function useResponsive() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return {
    width,
    isDesktop: width >= BP_DESKTOP,
    isWide:    width >= BP_WIDE,
  };
}
