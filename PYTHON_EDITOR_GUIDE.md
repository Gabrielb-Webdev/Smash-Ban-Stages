# 🐍 Editor Python para Configuración de Torneo

Este script de Python te permite editar fácilmente la configuración JSON del panel de administración sin necesidad de editar manualmente archivos o usar GitHub.

## 🚀 **Instalación Rápida**

### 1. **Instalar Python (si no lo tienes)**
```bash
# Windows (usando Chocolatey)
choco install python

# O descarga desde: https://www.python.org/downloads/
```

### 2. **Instalar dependencias**
```bash
pip install requests
```

## 📋 **Modos de Uso**

### 🎯 **Modo Interactivo (Recomendado)**
```bash
python tournament_config_editor.py
```

Después ejecutar:
```python
menu_interactivo()
```

### ⚡ **Modo Script Rápido**
```python
# Importar el editor
from tournament_config_editor import TournamentConfigEditor

# Crear editor
editor = TournamentConfigEditor()
editor.cargar_config()

# Agregar jugadores
editor.agregar_jugador("MkLeo", "MkLeo")
editor.agregar_jugador("Sparg0", "Sparg0")
editor.agregar_jugador("Nostra", "Nostra")

# Cambiar configuración
editor.cambiar_nombres_default("Team Red", "Team Blue")
editor.cambiar_formato_default("BO5")

# Agregar formato personalizado
editor.agregar_formato("FT15", "First to 15", 15, 29)

# Guardar
editor.guardar_config("mi-configuracion.json")
```

## 🛠️ **Funciones Disponibles**

### 👤 **Gestión de Jugadores**
```python
# Agregar jugador
editor.agregar_jugador("NombreJugador", "Tag")

# Eliminar jugador
editor.eliminar_jugador("NombreJugador")

# Ver jugadores actuales
editor.mostrar_config_actual()
```

### 🏆 **Configuración de Formatos**
```python
# Cambiar formato por defecto
editor.cambiar_formato_default("BO5")  # BO3, BO5, FT5, FT7, FT10

# Agregar formato personalizado
editor.agregar_formato("FT15", "First to 15", 15, 29)
#                      ID      Nombre        Puntos Max_Games
```

### 📝 **Configuración General**
```python
# Cambiar nombres por defecto
editor.cambiar_nombres_default("Player 1", "Player 2")

# Mostrar configuración actual
editor.mostrar_config_actual()

# Guardar cambios
editor.guardar_config("archivo-salida.json")

# Exportar para GitHub
editor.exportar_para_github()
```

## 📁 **Estructura del JSON**
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
    }
  ],
  "defaultFormat": "BO3",
  "presetPlayers": [
    {"name": "MkLeo", "tag": "MkLeo"},
    {"name": "Sparg0", "tag": "Sparg0"}
  ],
  "quickSettings": {
    "enablePresetPlayers": true,
    "enableQuickFormats": true,
    "autoFillLastUsed": true
  }
}
```

## 🔄 **Flujo de Trabajo**

### 🖥️ **Para Desarrollo Local**
1. Ejecutar script Python
2. Editar configuración
3. Guardar archivo JSON
4. Copiar a `public/config/tournament-settings.json`

### 🌐 **Para Vercel/GitHub**
1. Ejecutar script Python
2. Usar `exportar_para_github()`
3. Copiar JSON generado
4. Editar archivo en GitHub
5. Esperar deploy automático de Vercel

### 📱 **Para Cambios Rápidos Online**
1. Usar el editor online en el panel
2. Hacer cambios temporales
3. Si funcionan bien, usar Python para permanentes

## 💡 **Ejemplos de Uso**

### 🎮 **Configurar torneo local**
```python
editor = TournamentConfigEditor()
editor.cargar_config()

# Jugadores del torneo
players = ["MkLeo", "Sparg0", "Nostra", "Iori", "Riddles", "Light"]
for player in players:
    editor.agregar_jugador(player)

# Configurar BO5
editor.cambiar_formato_default("BO5")
editor.cambiar_nombres_default("Winner", "Loser")

editor.guardar_config("torneo-local.json")
```

### 🏆 **Setup para stream**
```python
editor = TournamentConfigEditor()
editor.cargar_config()

# Agregar top players
top_players = [
    ("MkLeo", "🇲🇽 MkLeo"),
    ("Sparg0", "🇲🇽 Sparg0"), 
    ("Nostra", "🇦🇷 Nostra"),
    ("Iori", "🇦🇷 Iori")
]

for name, tag in top_players:
    editor.agregar_jugador(name, tag)

# Formato para Grand Finals
editor.agregar_formato("GF", "Grand Finals", 3, 7)
editor.cambiar_formato_default("GF")

editor.exportar_para_github()
```

## ⚠️ **Importante**

### 📝 **Backup automático**
El script siempre carga la configuración actual antes de hacer cambios, así que no perderás datos.

### 🔄 **Sincronización**
- **Local**: Los cambios son inmediatos en desarrollo
- **Vercel**: Necesitas hacer push a GitHub para que se actualice en línea

### 🐛 **Resolución de errores**
```python
# Si hay errores, el script mostrará:
"❌ Error cargando desde web, usando configuración por defecto"

# Usa la configuración por defecto y continúa
```

## 📞 **Soporte**
Si tienes problemas:
1. Revisa que Python esté instalado: `python --version`
2. Revisa que requests esté instalado: `pip list | findstr requests`
3. Verifica que el archivo JSON sea válido con: `editor.mostrar_config_actual()`