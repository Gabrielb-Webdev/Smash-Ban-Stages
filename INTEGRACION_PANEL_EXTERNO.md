# 🎮 Integración Panel Externo - Smash Ban Stages

## 📋 Resumen
Tu panel de Python puede controlar el panel web de Smash Ban Stages mediante un archivo JSON compartido.

## 🔧 Configuración

### 1. Ubicación del archivo JSON
El archivo debe estar en: `public/shared-config.json` dentro del proyecto de Smash Ban Stages.

### 2. Estructura del JSON
```json
{
  "player1": {
    "name": "GANOMHORSE"
  },
  "player2": {
    "name": "IORI"
  },
  "format": "BO3",
  "actions": {
    "createSession": false,
    "resetSeries": false
  },
  "lastUpdate": "2025-12-05T10:30:00Z"
}
```

## 🎯 Funcionalidades

### ✅ Sincronización de Nombres
- Lo que escribas en tu panel → Se actualiza automáticamente en el panel web
- Ejemplo: "GANOMHORSE" en tu panel → "GANOMHORSE" en el panel web

### ✅ Traducción de Formato
- **Tu panel**: "BEST OF 3" → **Panel web**: "BO3"
- **Tu panel**: "BEST OF 5" → **Panel web**: "BO5"

### ✅ Acciones Remotas
- **Crear Sesión**: Activa `createSession: true` → El panel web crea la sesión automáticamente
- **Reiniciar Serie**: Activa `resetSeries: true` → El panel web reinicia la serie

## 🚀 Implementación en tu panel

### Opción 1: Función simple
```python
import json
from datetime import datetime, timezone

def sync_with_smash_panel(player1, player2, format_type, action=None):
    config = {
        "player1": {"name": player1},
        "player2": {"name": player2},
        "format": "BO3" if "BEST OF 3" in format_type.upper() else "BO5",
        "actions": {
            "createSession": action == "create",
            "resetSeries": action == "reset"
        },
        "lastUpdate": datetime.now(timezone.utc).isoformat()
    }
    
    with open("path/to/smash-ban-stages/public/shared-config.json", "w") as f:
        json.dump(config, f, indent=2)
```

### Opción 2: Usar la clase del archivo python-sync-example.py
```python
from SmashBanStagesSync import SmashBanStagesSync

sync = SmashBanStagesSync("path/to/shared-config.json")

# Sincronizar jugadores
sync.sync_players("GANOMHORSE", "IORI")

# Crear sesión
sync.create_session("GANOMHORSE", "IORI", "BEST OF 3")

# Reiniciar serie
sync.reset_series()
```

## 🔄 Flujo de trabajo

1. **Tu panel** actualiza los nombres/formato
2. **Tu script Python** modifica el `shared-config.json`
3. **Panel web** detecta el cambio (cada 2 segundos)
4. **Panel web** se actualiza automáticamente
5. **Panel web** ejecuta acciones (crear sesión/reiniciar)

## 🎮 Elementos que necesitas agregar a tu panel

### En tu interfaz:
1. **Dropdown para formato**:
   - BEST OF 3
   - BEST OF 5

2. **Botón "CREAR SESIÓN"**:
   - Ejecuta: `sync.create_session(player1, player2, formato)`

3. **Botón "REINICIAR SERIE"**:
   - Ejecuta: `sync.reset_series()`

### En tu código:
1. **Callback cuando cambien nombres**:
   ```python
   def on_player_name_change(player1, player2):
       sync.sync_players(player1, player2)
   ```

2. **Callback cuando cambie formato**:
   ```python
   def on_format_change(format_str):
       sync.sync_format(format_str)
   ```

## 📝 Ejemplo completo de integración

```python
# En el evento de tu botón "CREAR SESIÓN"
def on_create_session_clicked():
    player1 = get_player1_name_from_ui()  # Tu función
    player2 = get_player2_name_from_ui()  # Tu función
    format_type = get_format_from_dropdown()  # Tu función
    
    # Sincronizar con el panel web
    sync.create_session(player1, player2, format_type)
    
    print("✅ Sesión creada en el panel web!")

# En el evento de tu botón "REINICIAR SERIE"
def on_reset_series_clicked():
    sync.reset_series()
    print("🔄 Serie reiniciada en el panel web!")
```

## ⚠️ Notas importantes

1. **Ruta del archivo**: Asegúrate de que la ruta al `shared-config.json` sea correcta
2. **Permisos**: Tu script debe tener permisos de escritura en la carpeta
3. **Sincronización**: El panel web revisa el archivo cada 2 segundos
4. **Backup**: El panel web mantendrá el JSON actualizado

## 🐛 Troubleshooting

### Problema: No se actualiza el panel web
- ✅ Verificar que el archivo `shared-config.json` se esté creando
- ✅ Verificar que el `lastUpdate` esté cambiando
- ✅ Revisar la consola del navegador para errores

### Problema: Formato no se traduce
- ✅ Verificar que uses "BEST OF 3" o "BEST OF 5" exactamente
- ✅ El script es case-insensitive, pero mantén la consistencia

### Problema: Acciones no se ejecutan
- ✅ Verificar que los nombres de jugadores no estén vacíos
- ✅ Las acciones se resetean automáticamente después de ejecutarse