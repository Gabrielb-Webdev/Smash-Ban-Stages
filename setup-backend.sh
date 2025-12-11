#!/bin/bash

# =============================================================================
# Setup Script - la App sin H Backend
# =============================================================================

set -e  # Exit on error

echo "🚀 la App sin H - Backend Setup"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}⚠️  No se encontró .env.local${NC}"
    echo "Copiando template..."
    cp .env.local.example .env.local
    echo -e "${GREEN}✅ .env.local creado${NC}"
    echo ""
    echo -e "${YELLOW}📝 IMPORTANTE: Edita .env.local con tus credenciales:${NC}"
    echo "   - STARTGG_CLIENT_ID"
    echo "   - STARTGG_CLIENT_SECRET"
    echo "   - STARTGG_API_TOKEN"
    echo "   - NEXT_PUBLIC_SUPABASE_URL"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - JWT_SECRET (genera con: openssl rand -base64 32)"
    echo ""
    read -p "Presiona Enter cuando hayas configurado .env.local..."
else
    echo -e "${GREEN}✅ .env.local encontrado${NC}"
fi

echo ""
echo "📦 Instalando dependencias..."
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
else
    echo -e "${RED}❌ Error instalando dependencias${NC}"
    exit 1
fi

echo ""
echo "🔑 Generando JWT Secret..."
JWT_SECRET=$(openssl rand -base64 32)

# Check if JWT_SECRET is set in .env.local
if grep -q "JWT_SECRET=your_jwt_secret_here" .env.local; then
    echo "Actualizando JWT_SECRET en .env.local..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|JWT_SECRET=your_jwt_secret_here|JWT_SECRET=$JWT_SECRET|g" .env.local
    else
        # Linux
        sed -i "s|JWT_SECRET=your_jwt_secret_here|JWT_SECRET=$JWT_SECRET|g" .env.local
    fi
    echo -e "${GREEN}✅ JWT_SECRET generado y guardado${NC}"
else
    echo -e "${YELLOW}⚠️  JWT_SECRET ya estaba configurado${NC}"
fi

echo ""
echo "✅ Setup completado!"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. Configura Supabase:"
echo "   - Crea un proyecto en https://supabase.com"
echo "   - Ejecuta el contenido de supabase-schema.sql en SQL Editor"
echo "   - Copia las API keys a .env.local"
echo ""
echo "2. Configura Start.gg OAuth:"
echo "   - Crea una app en https://start.gg/admin/profile/developer/applications"
echo "   - Configura Redirect URI: http://localhost:3000/api/auth/startgg/callback"
echo "   - Copia Client ID y Secret a .env.local"
echo ""
echo "3. Inicia el servidor:"
echo "   npm run dev"
echo ""
echo "4. Prueba el OAuth flow:"
echo "   http://localhost:3000/api/auth/startgg/authorize"
echo ""
echo "📖 Documentación completa: INSTALACION_BACKEND_AFK.md"
echo ""
