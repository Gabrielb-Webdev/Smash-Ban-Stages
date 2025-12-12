# Variables de entorno para configurar en Vercel

Necesitas agregar estas variables de entorno en tu dashboard de Vercel:

## 1. Ve a tu proyecto en Vercel:
https://vercel.com/gabriel/smash-ban-stages

## 2. Ve a Settings > Environment Variables

## 3. Agrega estas variables:

### START_GG_CLIENT_ID
```
368
```

### START_GG_CLIENT_SECRET
```
ecaa153f06cbdcbff30902831c2381308524dc67b7412a4b0e97237fa13ae392
```

### EXPO_PROJECT_ID
```
(tu_expo_project_id_aqui - lo configuraremos después)
```

### JWT_SECRET
```
(generar_un_secret_random_aqui)
```

## 4. Redeploy tu aplicación

Después de agregar las variables, haz un redeploy para que tomen efecto.

## 5. Crear archivo .env local

Crea un archivo `.env` en la raíz del proyecto con:

```
START_GG_CLIENT_ID=368
START_GG_CLIENT_SECRET=ecaa153f06cbdcbff30902831c2381308524dc67b7412a4b0e97237fa13ae392
API_BASE_URL=https://smash-ban-stages.vercel.app
WS_URL=wss://sweet-insight-production-80c1.up.railway.app
DEFAULT_COMMUNITY=afk
APP_NAME="AFK Smash"
JWT_SECRET=tu_jwt_secret_aqui
```