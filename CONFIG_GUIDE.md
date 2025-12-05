# Guía de Configuración - Panel de Administración con JSON

## 📋 Cómo Funciona

El panel de administración ahora se **alimenta** desde un archivo JSON que facilita la configuración de torneos.

### 📁 Archivo de Configuración
**Ubicación**: `/public/config/tournament-settings.json`

Este archivo contiene toda la configuración del panel para hacer el setup más rápido y fácil.

## 🎮 Estructura del JSON

```json
{
  "defaultPlayers": {
    "player1": "Jugador 1",
    "player2": "Jugador 2"
  },
  "formats": [
    {
      "id": "BO3",
      "name": "Best of 3", 
      "maxWins": 2,
      "totalGames": 3
    },
    {
      "id": "BO5",
      "name": "Best of 5",
      "maxWins": 3, 
      "totalGames": 5
    }
  ],
  "defaultFormat": "BO3",
  "presetPlayers": [
    {
      "name": "Nostra",
      "tag": "Nostra"
    },
    {
      "name": "Iori", 
      "tag": "Iori"
    }
  ],
  "quickSettings": {
    "enablePresetPlayers": true,
    "enableQuickFormats": true,
    "autoFillLastUsed": true
  }
}
```

## ⚙️ Configuraciones Disponibles

### 1. **Jugadores Por Defecto**
```json
"defaultPlayers": {
  "player1": "Nombre por defecto J1",
  "player2": "Nombre por defecto J2"
}
```
- Se llenan automáticamente al cargar el panel

### 2. **Presets de Jugadores**
```json
"presetPlayers": [
  { "name": "MkLeo", "tag": "MkLeo" },
  { "name": "Sparg0", "tag": "Sparg0" }
]
```
- Aparecen en dropdowns para selección rápida
- Botón "📋 Presets" junto a cada campo de jugador

### 3. **Formatos Personalizados**
```json
"formats": [
  {
    "id": "BO3",
    "name": "Best of 3",
    "maxWins": 2,
    "totalGames": 3
  }
]
```
- Define formatos disponibles
- `maxWins`: Puntos necesarios para ganar
- `totalGames`: Máximo de games posibles

### 4. **Configuraciones Rápidas**
```json
"quickSettings": {
  "enablePresetPlayers": true,    // Mostrar botones de presets
  "enableQuickFormats": true,     // Mostrar formatos personalizados
  "autoFillLastUsed": true        // Auto-llenar con valores por defecto
}
```

## 🚀 Funcionalidades del Panel

### Para tu amigo es súper fácil:

1. **Pre-configurado**: Los jugadores y formato se cargan automáticamente
2. **Presets rápidos**: Click en "📋 Presets" para seleccionar jugadores comunes
3. **Controles rápidos**: 
   - 🔄 Intercambiar jugadores
   - 🗑️ Limpiar campos
4. **Formatos visuales**: Botones grandes con información clara

### Durante la serie:
- **Botones +1/-1**: Para manejar puntos
- **Cálculo automático**: Game actual basado en puntos totales
- **Visual claro**: Información del estado actual

## 📝 Ejemplos de Personalización

### Añadir más jugadores presets:
```json
"presetPlayers": [
  { "name": "Nostra", "tag": "Nostra" },
  { "name": "Iori", "tag": "Iori" },
  { "name": "MkLeo", "tag": "MkLeo" },
  { "name": "Sparg0", "tag": "Sparg0" }
]
```

### Crear formato personalizado:
```json
{
  "id": "FT10",
  "name": "First to 10",
  "maxWins": 10,
  "totalGames": 19
}
```

### Cambiar valores por defecto:
```json
"defaultPlayers": {
  "player1": "Team Red",
  "player2": "Team Blue"
},
"defaultFormat": "BO5"
```

## ✅ Beneficios

- **Setup rápido**: Todo pre-configurado desde el JSON
- **Menos errores**: Presets evitan typos en nombres
- **Flexible**: Fácil de personalizar editando el JSON
- **Visual**: Interface clara y fácil de usar
- **Automático**: Cálculos y estados manejados automáticamente

## 📋 Para tu amigo:

**Ahora solo necesita**:
1. Editar el JSON una vez con sus jugadores y configuraciones
2. Usar el panel que ya estará pre-configurado
3. Solo hacer click en presets o escribir nombres
4. Presionar +1 durante los matches
5. **¡Todo lo demás es automático!** 🎮✨