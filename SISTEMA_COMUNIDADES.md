# Sistema de Comunidades - Smash Ban Stages

## 📋 Descripción

Este sistema permite gestionar múltiples comunidades de Super Smash Bros, cada una con su propio panel de administración independiente.

## 🏠 Página Principal

La página principal (`/`) muestra una lista visual de todas las comunidades disponibles:

- **Córdoba** 🔵
- **AFK (Buenos Aires)** 🟡
- **Mendoza** 🟢

Cada comunidad tiene su propio tema de colores y emoji identificativo.

## 🔗 Rutas del Sistema

### Página de Selección
- **URL**: `/`
- **Descripción**: Muestra las comunidades disponibles
- **Funcionalidad**: Click en cualquier comunidad para acceder a su panel

### Panel de Administración por Comunidad
- **URL**: `/admin/cordoba` - Panel de Smash Córdoba
- **URL**: `/admin/afk` - Panel de Smash AFK
- **URL**: `/admin/mendoza` - Panel de Smash Mendoza

Cada panel es **independiente** y mantiene sus propias:
- Sesiones activas
- Configuración de jugadores
- Historial de partidas
- Links de streaming y tablets

## ✨ Características

### 1. Página de Selección de Comunidades
- Diseño visual atractivo con cards para cada comunidad
- Hover effects y animaciones
- Colores y temas únicos por comunidad
- Responsive design

### 2. Paneles de Administración Independientes
- Cada comunidad tiene su propio espacio aislado
- No se mezclan las sesiones entre comunidades
- Botón "Volver a Comunidades" para regresar al menú principal
- El selector de torneo está **fijo** en la comunidad seleccionada

### 3. Rutas Dinámicas
- Sistema de rutas dinámicas con Next.js
- Validación de comunidades válidas
- Página de error 404 personalizada para comunidades inexistentes

## 🎨 Temas por Comunidad

### Córdoba 🔵
- **Color primario**: Azul (#2563EB)
- **Gradiente**: from-blue-900 via-blue-700 to-blue-800

### AFK (Buenos Aires) 🟡
- **Color primario**: Rojo/Naranja (#DC2626)
- **Gradiente**: from-red-900 via-red-700 to-orange-800

### Mendoza 🟢
- **Color primario**: Verde (#059669)
- **Gradiente**: from-green-900 via-green-700 to-emerald-800

## 📱 Navegación

```
Página Principal (/)
    ↓
Selecciona una comunidad
    ↓
Panel de Administración (/admin/[comunidad])
    ↓
Botón "Volver" → Regresa a la página principal
```

## 🚀 Cómo Usar

1. **Accede a la página principal**: Abre `/` en tu navegador
2. **Selecciona una comunidad**: Click en la card de la comunidad deseada
3. **Administra tu torneo**: Usa el panel para gestionar partidas
4. **Vuelve al menú**: Click en "Volver a Comunidades" en cualquier momento

## 🔧 Componentes Modificados

- `pages/index.js` - Nueva página de selección de comunidades
- `pages/admin/[community].js` - Ruta dinámica para cada comunidad (NUEVO)
- `src/components/AdminPanel.jsx` - Adaptado para recibir `defaultCommunity` prop

## 🎯 Ventajas del Sistema

1. **Separación clara**: Cada comunidad tiene su propio espacio
2. **Escalable**: Fácil agregar nuevas comunidades
3. **Intuitivo**: Navegación clara y visual
4. **Profesional**: Diseño moderno y atractivo
5. **Mantenible**: Código organizado y reutilizable

## 📝 Agregar una Nueva Comunidad

Para agregar una nueva comunidad, edita estos archivos:

1. **pages/index.js** - Agregar la nueva comunidad al array `communities`
2. **pages/admin/[community].js** - Agregar el ID al array `validCommunities`
3. **src/components/AdminPanel.jsx** - Agregar configuración en el objeto `tournaments`

---

**Última actualización**: Diciembre 2024
