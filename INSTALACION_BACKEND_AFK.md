# 🚀 Guía de Instalación - la App sin H Mobile (AFK)

## 📋 Pre-requisitos Completados

✅ Backend API endpoints creados
✅ Schema de base de datos diseñado
✅ Utilidades GraphQL para Start.gg
✅ Sistema de autenticación OAuth

## 🔧 Pasos de Configuración

### 1. Instalar Dependencias del Backend

```bash
cd "Gabriel Dev/Smash-Ban-Stages"
npm install
```

Esto instalará:
- `@supabase/supabase-js` - Cliente de Supabase
- `jsonwebtoken` - Para session tokens JWT

### 2. Configurar Start.gg OAuth

#### A. Crear Aplicación OAuth en Start.gg

1. Ve a: https://start.gg/admin/profile/developer/applications
2. Click en "Create Application"
3. Rellena:
   - **Name:** la App sin H - AFK
   - **Description:** Aplicación móvil para gestión de torneos de Smash AFK
   - **Redirect URI:** `https://smash-ban-stages.vercel.app/api/auth/startgg/callback`
   - **Scopes:** user.identity, user.email

4. Guarda el **Client ID** y **Client Secret**

#### B. Crear API Token Personal

1. Ve a: https://start.gg/admin/profile/developer
2. Click "Create new token"
3. Descripción: "la App sin H Backend"
4. Copia el token inmediatamente (solo se muestra una vez)

### 3. Configurar Supabase

#### A. Crear Proyecto

1. Ve a: https://supabase.com
2. Click "New Project"
3. Configura:
   - **Name:** la-app-sin-h-afk
   - **Database Password:** (genera una segura)
   - **Region:** East US (North Virginia) - más cercano a Argentina
   - **Pricing Plan:** Free (suficiente para empezar)

4. Espera ~2 minutos a que el proyecto se inicialice

#### B. Ejecutar Schema SQL

1. En tu proyecto Supabase, ve a: **SQL Editor**
2. Click "New Query"
3. Copia TODO el contenido de `supabase-schema.sql`
4. Pega y ejecuta con "Run"
5. Verifica que se crearon las tablas:
   - users
   - tournaments
   - setups
   - matches
   - match_results
   - notifications
   - admin_actions

#### C. Obtener API Keys

1. Ve a: **Settings** → **API**
2. Copia:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public:** `eyJhbGc...` (para cliente)
   - **service_role:** `eyJhbGc...` (para servidor, ⚠️ MANTENER SECRETO)

### 4. Configurar Variables de Entorno

#### A. Crear archivo `.env.local`

```bash
cp .env.local.example .env.local
```

#### B. Editar `.env.local` con tus valores reales:

```bash
# Start.gg OAuth Configuration
STARTGG_CLIENT_ID=tu_client_id_aqui
STARTGG_CLIENT_SECRET=tu_client_secret_aqui
STARTGG_REDIRECT_URI=https://smash-ban-stages.vercel.app/api/auth/startgg/callback
STARTGG_API_TOKEN=tu_api_token_aqui

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# JWT Secret (genera con: openssl rand -base64 32)
JWT_SECRET=tu_jwt_secret_seguro_aqui

# App Configuration
NEXT_PUBLIC_APP_URL=https://smash-ban-stages.vercel.app
```

#### C. Generar JWT Secret

En tu terminal:
```bash
openssl rand -base64 32
```

Copia el output y pégalo en `JWT_SECRET`

### 5. Testing Local del Backend

#### A. Iniciar servidor

```bash
npm run dev
```

#### B. Probar endpoints

**Health check:**
```bash
curl http://localhost:3000/api/auth/me
```

**Iniciar OAuth:**
1. Abre: http://localhost:3000/api/auth/startgg/authorize
2. Deberías ser redirigido a Start.gg
3. Autoriza la aplicación
4. Deberías volver con una sesión creada

### 6. Configurar Firebase (Para Notificaciones)

#### A. Crear Proyecto Firebase

1. Ve a: https://console.firebase.google.com
2. Click "Add Project"
3. Nombre: "la-app-sin-h"
4. Desactiva Google Analytics (opcional)
5. Click "Create Project"

#### B. Habilitar Cloud Messaging

1. En tu proyecto, ve a: **Build** → **Cloud Messaging**
2. Click "Get Started"
3. Para Android:
   - Descarga `google-services.json`
   - Guárdalo para cuando crees la app móvil

4. Para iOS:
   - Descarga `GoogleService-Info.plist`
   - Guárdalo para cuando crees la app móvil

#### C. Obtener Server Key

1. Ve a: **Project Settings** → **Cloud Messaging**
2. En "Project credentials", copia el **Server key**
3. Agrégalo a `.env.local`:
   ```
   FIREBASE_SERVER_KEY=tu_server_key_aqui
   ```

### 7. Deploy a Vercel (Producción)

#### A. Instalar Vercel CLI

```bash
npm install -g vercel
```

#### B. Deploy

```bash
vercel
```

Sigue el wizard:
- Link to existing project? No
- Project name: smash-ban-stages
- Framework: Next.js
- Deploy? Yes

#### C. Configurar Variables de Entorno en Vercel

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a: **Settings** → **Environment Variables**
4. Agrega TODAS las variables de `.env.local`
5. Scope: Production, Preview, Development

#### D. Actualizar Redirect URI en Start.gg

1. Ve a tu aplicación OAuth en Start.gg
2. Actualiza Redirect URI a: `https://tu-dominio.vercel.app/api/auth/startgg/callback`
3. Actualiza `.env.local` con la nueva URL
4. Redeploy: `vercel --prod`

---

## 🧪 Verificación Post-Setup

### ✅ Checklist

- [ ] Servidor Next.js corriendo localmente
- [ ] Supabase database creada con todas las tablas
- [ ] Start.gg OAuth app configurada
- [ ] Variables de entorno configuradas
- [ ] `/api/auth/startgg/authorize` redirige a Start.gg
- [ ] Callback exitoso crea usuario en Supabase
- [ ] `/api/auth/me` devuelve usuario autenticado
- [ ] Firebase Cloud Messaging configurado

### 🔍 Testing Endpoints

#### 1. Test OAuth Flow (Manual)

1. Visita: `http://localhost:3000/api/auth/startgg/authorize`
2. Autoriza en Start.gg
3. Deberías volver a `/dashboard/afk?welcome=true`
4. Verifica en Supabase que el usuario fue creado:
   ```sql
   SELECT * FROM users ORDER BY created_at DESC LIMIT 1;
   ```

#### 2. Test API con curl

**Get current user:**
```bash
# Primero obtén tu session token desde cookie del navegador
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TU_SESSION_TOKEN"
```

**Get tournaments:**
```bash
curl -X GET http://localhost:3000/api/tournaments?community=afk \
  -H "Authorization: Bearer TU_SESSION_TOKEN"
```

---

## 📱 Próximos Pasos

Ahora que el backend está configurado, los siguientes pasos son:

### Fase 2: App Móvil con Expo

1. **Inicializar proyecto Expo:**
   ```bash
   npx create-expo-app la-app-sin-h-mobile
   cd la-app-sin-h-mobile
   ```

2. **Instalar dependencias:**
   ```bash
   npx expo install expo-auth-session expo-web-browser
   npx expo install @react-navigation/native @react-navigation/stack
   npx expo install expo-notifications
   npx expo install @supabase/supabase-js
   ```

3. **Configurar app.json:**
   - Bundle ID: `com.afk.laappsính`
   - OAuth scheme: `la-app-sin-h`

4. **Crear pantallas:**
   - LoginScreen (WebView OAuth)
   - HomeScreen (Torneos activos)
   - MatchScreen (TabletControl adaptado)
   - ReportResultScreen
   - AdminDashboard

¿Quieres que continue con el setup de la app móvil con Expo?

---

## 🆘 Troubleshooting

### Error: "Missing Supabase environment variables"
- Verifica que `.env.local` existe
- Reinicia el servidor: `npm run dev`

### Error: "Invalid JWT token"
- El JWT_SECRET debe ser el mismo en toda la app
- Regenera con: `openssl rand -base64 32`

### OAuth redirect no funciona
- Verifica que la Redirect URI en Start.gg coincide exactamente
- Debe incluir protocolo (http:// o https://)

### Supabase RLS blocking requests
- Las políticas RLS están configuradas
- Verifica que estás usando `supabaseAdmin` (service_role) en el backend
- Para testing, puedes desactivar RLS temporalmente

### Tokens de Start.gg expirados
- Los access tokens duran 7 días
- Usa `/api/auth/startgg/refresh` para renovar
- El refresh token dura más tiempo

---

## 📚 Recursos

- [Start.gg API Docs](https://developer.start.gg/docs/intro)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [JWT.io](https://jwt.io) - Para debuggear tokens
- [GraphQL Start.gg Explorer](https://developer.start.gg/explorer)

## 💬 Soporte

Si tienes problemas:
1. Revisa los logs del servidor
2. Verifica las variables de entorno
3. Testea cada endpoint individualmente
4. Revisa la documentación de Start.gg

¡Estás listo para comenzar! 🚀
