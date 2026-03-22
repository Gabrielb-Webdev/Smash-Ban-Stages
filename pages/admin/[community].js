import { useRouter } from 'next/router';
import { useEffect } from 'react';

// Redirige al panel unificado test.js con el community como query param.
// Con esto, cordoba/mendoza/afk usan exactamente el mismo panel de administración
// que "test", con sus propios setups (cordoba-1..5, mendoza-1..5, afk-1..5).
export default function CommunityAdmin() {
  const router = useRouter();
  const { community } = router.query;

  useEffect(() => {
    if (!community) return;
    router.replace(`/admin/test?community=${community}`);
  }, [community]);

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

