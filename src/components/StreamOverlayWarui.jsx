import { useEffect } from 'react';

export default function StreamOverlayWarui() {
  useEffect(() => {
    document.body.style.background = 'transparent';
    document.documentElement.style.background = 'transparent';
    return () => {
      document.body.style.background = '';
      document.documentElement.style.background = '';
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'transparent', position: 'relative' }}>
      <img
        src="/overlays/warui/img/Warui Banner.png"
        alt="Arena Warui"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '150px',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
    </div>
  );
}
