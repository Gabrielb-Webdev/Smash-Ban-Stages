# 🎮 Guía Práctica: Cómo Poblar el JSON

## 📁 Archivo: `/public/config/tournament-settings.json`

### 🔥 **Ejemplo Real de Configuración**

```json
{
  "defaultPlayers": {
    "player1": "Team Red", 
    "player2": "Team Blue"
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
    },
    {
      "id": "FT10",
      "name": "First to 10",
      "maxWins": 10,
      "totalGames": 19
    }
  ],
  "defaultFormat": "BO3",
  "presetPlayers": [
    { "name": "MkLeo", "tag": "MkLeo" },
    { "name": "Sparg0", "tag": "Sparg0" },
    { "name": "Nostra", "tag": "Nostra" },
    { "name": "Iori", "tag": "Iori" }
  ],
  "quickSettings": {
    "enablePresetPlayers": true,
    "enableQuickFormats": true,
    "autoFillLastUsed": true
  }
}
```

## 🎯 **Cómo Usar el Panel**

### **Paso 1: Al abrir el panel**
- Se autocargan "Team Red" y "Team Blue" 
- Formato por defecto: BO3
- Dropdown de presets disponible

### **Paso 2: Seleccionar jugadores**
1. **Opción A**: Escribir nombres manualmente
2. **Opción B**: Click en "📋 Presets" → seleccionar de la lista
3. **Botón 🔄**: Intercambiar posiciones
4. **Botón 🗑️**: Limpiar campos

### **Paso 3: Seleccionar formato** 
- Botones visuales grandes con descripción
- Ejemplo: "First to 10 - Máximo 19 games"

### **Paso 4: Durante la serie**
- Botones **+1/-1** para cada jugador
- **Cálculo automático** del game actual
- **Detección automática** de ganador

## 🛠️ **Personalización Común**

### **Para torneos locales:**
```json
"presetPlayers": [
  { "name": "Juan", "tag": "Juan" },
  { "name": "Pedro", "tag": "Pedro" },
  { "name": "Maria", "tag": "Maria" },
  { "name": "Carlos", "tag": "Carlos" }
]
```

### **Para eventos grandes:**
```json
"presetPlayers": [
  { "name": "MkLeo", "tag": "MkLeo" },
  { "name": "Sparg0", "tag": "Sparg0" },
  { "name": "Acola", "tag": "Acola" },
  { "name": "Shuton", "tag": "Shuton" }
]
```

### **Para moneymatch:**
```json
"formats": [
  {
    "id": "FT10",
    "name": "First to 10",
    "maxWins": 10,
    "totalGames": 19
  }
],
"defaultFormat": "FT10"
```

## ⚡ **Cambios en Vivo**

1. Edita el JSON
2. Refresca la página del panel
3. **¡Los cambios se aplican inmediatamente!**

## 🎮 **Resultado Final**

Con el JSON poblado, tu panel tendrá:

✅ **Lista de jugadores frecuentes** para selección rápida  
✅ **Formatos configurados** con información clara  
✅ **Auto-llenado** de campos comunes  
✅ **Controles rápidos** para intercambiar/limpiar  
✅ **Cálculos automáticos** de games y ganadores  

**¡Panel súper fácil de usar!** 🚀