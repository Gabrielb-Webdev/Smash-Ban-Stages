# 🌐 Integración Panel Externo - Versión Online

## ⚠️ IMPORTANTE: Para aplicaciones desplegadas

Cuando tu aplicación está desplegada online (Vercel, Netlify, etc.), el archivo JSON estático **NO se puede modificar** directamente. Por eso hemos creado un **sistema de API** que permite la comunicación bidireccional.

## 🏗️ Arquitectura del Sistema

```
Panel Externo (Python) ←→ API (/api/external-config) ←→ AdminPanel (React)
                           ↓
                    Base de datos / Archivo JSON
```

## 📁 Archivos Creados

### 1. `/pages/api/external-config.js`
- **Propósito**: API endpoint para leer/escribir configuración
- **Métodos**: GET (leer), PUT/POST (escribir)
- **CORS**: Habilitado para acceso externo
- **Almacenamiento**: Archivo JSON local (en desarrollo) o base de datos (producción)

### 2. `/data/external-config.json` 
- **Propósito**: Almacenamiento de configuración
- **Acceso**: Solo vía API, no directamente
- **Backup**: Se crea automáticamente con valores por defecto

### 3. `/smash-api-client.py`
- **Propósito**: Cliente Python para tu amigo
- **Características**: GUI con tkinter, ejemplos de uso, manejo de errores
- **Configuración**: Solo cambiar la URL base

## 🚀 Configuración para tu amigo

### Paso 1: Instalar dependencias
```bash
pip install requests
```

### Paso 2: Configurar URL
En `smash-api-client.py`, cambiar:
```python
# ANTES
api = SmashBanStagesAPI("https://tu-app.vercel.app")

# DESPUÉS  
api = SmashBanStagesAPI("https://TU-URL-REAL.vercel.app")
```

### Paso 3: Ejemplo de uso básico
```python
from smash_api_client import SmashBanStagesAPI

# Inicializar cliente
api = SmashBanStagesAPI("https://tu-url.vercel.app")

# Crear sesión
api.update_config(
    player1_name="Sparg0",
    player2_name="Tweek", 
    format_type="BO5",
    create_session=True
)

# Reiniciar serie
api.update_config(reset_series=True)
```

## 🔄 Flujo de Comunicación

### Desde Panel Externo → Panel Web:
1. Panel externo llama a `PUT /api/external-config`
2. API guarda la nueva configuración
3. AdminPanel polling detecta cambios (cada 2 segundos)
4. AdminPanel ejecuta acciones automáticamente
5. API limpia las flags de acción

### Desde Panel Web → Panel Externo:
1. AdminPanel actualiza configuración vía `PUT /api/external-config`  
2. Panel externo puede leer cambios vía `GET /api/external-config`

## 📋 Estructura de la API

### GET `/api/external-config`
```json
{
  "player1": {"name": "Sparg0"},
  "player2": {"name": "Tweek"},
  "format": "BO5", 
  "actions": {
    "createSession": false,
    "resetSeries": false
  },
  "lastUpdate": "2024-12-05T15:30:00.000Z"
}
```

### PUT `/api/external-config`
```json
{
  "player1": {"name": "Nuevo Jugador"},
  "player2": {"name": "Otro Jugador"},
  "format": "BO3",
  "actions": {
    "createSession": true,  // Trigger crear sesión
    "resetSeries": false
  }
}
```

## 🎯 Funcionalidades Disponibles

### Para tu amigo:
- ✅ Cambiar nombres de jugadores
- ✅ Seleccionar formato (BO3/BO5)
- ✅ Crear nueva sesión automáticamente
- ✅ Reiniciar serie actual
- ✅ GUI con tkinter (opcional)
- ✅ Manejo de errores y timeouts

### Para tu panel web:
- ✅ Detección automática de cambios
- ✅ Traducción de formatos
- ✅ Ejecución automática de acciones
- ✅ Limpieza de flags después de ejecutar
- ✅ Logging detallado para debugging

## 🔧 Personalización para tu amigo

Tu amigo puede integrar el cliente en su panel existente:

```python
# En su código existente
from smash_api_client import SmashBanStagesAPI

class SuPanelExistente:
    def __init__(self):
        self.smash_api = SmashBanStagesAPI("https://tu-url.vercel.app")
    
    def on_crear_sesion_click(self):
        # Cuando hace clic en "crear sesión"
        player1 = self.get_player1_input()
        player2 = self.get_player2_input() 
        formato = self.get_formato_selected()
        
        success = self.smash_api.update_config(
            player1_name=player1,
            player2_name=player2,
            format_type=formato,
            create_session=True
        )
        
        if success:
            self.show_success_message("¡Sesión creada!")
        else:
            self.show_error_message("Error creando sesión")
```

## 🌐 URLs importantes

Una vez desplegado, las URLs serán:
- **Panel principal**: `https://tu-app.vercel.app`
- **API de configuración**: `https://tu-app.vercel.app/api/external-config`
- **Panel tablet**: `https://tu-app.vercel.app/tablet/SESSION_ID`
- **Stream overlay**: `https://tu-app.vercel.app/stream/SESSION_ID`

## ⚡ Ventajas del sistema API

1. **Bidireccional**: Ambos paneles pueden leer/escribir
2. **Real-time**: Cambios se reflejan en 2 segundos
3. **Confiable**: Manejo de errores y timeouts
4. **Escalable**: Funciona con múltiples usuarios
5. **Seguro**: CORS configurado, validación de datos
6. **Fácil**: Tu amigo solo cambia la URL

## 🐛 Debugging

Si algo no funciona:

1. **Verificar URL**: Asegúrate que la URL sea correcta
2. **Verificar red**: Probar `GET /api/external-config` en navegador  
3. **Verificar logs**: Tanto en Python como en DevTools del navegador
4. **Verificar CORS**: Si hay problemas de origen cruzado

¡Con este sistema tu amigo podrá controlar tu panel desde cualquier parte del mundo! 🌎