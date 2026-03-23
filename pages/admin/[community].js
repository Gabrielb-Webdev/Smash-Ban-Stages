import TestAdminPage from './_panel';

// Renderiza el panel unificado directamente sin redireccionar.
// El community se lee del path (/admin/cordoba → router.query.community = 'cordoba').
export default function CommunityAdmin() {
  return <TestAdminPage />;
}
