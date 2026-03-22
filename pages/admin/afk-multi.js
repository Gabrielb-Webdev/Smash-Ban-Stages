import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Redirige al panel unificado test.js con community=afk-multi
export default function AfkMultiPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/test?community=afk-multi');
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
