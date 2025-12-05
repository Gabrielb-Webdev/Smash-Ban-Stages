# Guía de Uso - Panel de Administración Simplificado

## 📋 Funcionamiento del Panel

El nuevo panel simplificado funciona automáticamente y genera el JSON sin necesidad de configurar manualmente stages y personajes.

### 🚀 Uso Básico

1. **Configurar Serie**: 
   - Introduce los nombres de los jugadores
   - Selecciona formato (BO3 o BO5)  
   - Presiona "Crear Serie"

2. **Manejar Puntos**:
   - Usa los botones **+1** para dar puntos al ganador de cada game
   - Usa los botones **-1** para corregir errores
   - El sistema calcula automáticamente en qué game van

3. **El JSON se genera automáticamente** con:
   - Nombres de jugadores
   - Formato de la serie (BO3/BO5)
   - Puntos actuales
   - Game actual calculado
   - Estado de la serie

## 🎮 Cómo funciona el cálculo automático

### Lógica de Games:
- **0 puntos total** (0-0) = **Game 1**
- **1 punto total** (1-0 o 0-1) = **Game 2**  
- **2 puntos total** (2-0, 1-1, 0-2) = **Game 3**
- **3 puntos total** (2-1, 1-2) = **Game 4** (solo BO5)
- **4 puntos total** (2-2) = **Game 5** (solo BO5)

### Condiciones de victoria:
- **BO3**: Primero en llegar a 2 puntos
- **BO5**: Primero en llegar a 3 puntos

## 📄 Ejemplo de JSON Generado

```json
{
  "sessionId": "main-session",
  "player1": {
    "name": "Nostra",
    "score": 1
  },
  "player2": {
    "name": "Iori", 
    "score": 1
  },
  "format": "BO3",
  "currentGame": 3,
  "totalGames": 3,
  "maxWins": 2,
  "isFinished": false,
  "winner": null
}
```

## 🔧 Panel Simplificado

### Lo que tu amigo necesita hacer:

1. **Solo 3 campos**:
   - ✅ Nombre Jugador 1
   - ✅ Nombre Jugador 2  
   - ✅ Formato (BO3/BO5)

2. **Durante la serie**:
   - ✅ Presionar +1 cuando alguien gane un game
   - ✅ El resto es automático

### Lo que el sistema hace automáticamente:

- 🤖 Calcula el game actual basado en puntos totales
- 🤖 Genera el JSON en tiempo real
- 🤖 Detecta cuándo la serie termina
- 🤖 Mantiene los links de tablet y stream actualizados

## ⚡ Ventajas del nuevo sistema

- **Menos formularios**: Solo nombres y formato
- **Automático**: El JSON se actualiza solo
- **Sin errores**: Imposible meter datos incorrectos
- **Visual**: Ve los puntos y el game actual en tiempo real
- **Backup**: Puede corregir puntos con -1 si se equivoca

## 🎯 Para tu amigo:

**Ya no necesitas configurar stages ni personajes manualmente**. El sistema:

1. **Toma los nombres** que pongas en el panel
2. **Cuenta los puntos** cuando presiones +1  
3. **Calcula automáticamente** en qué game van
4. **Genera el JSON** con toda la info actualizada

**¡Súper simple!** 😎