# 🎮 Tutorial: Cómo controlar el panel de Smash Ban Stages desde tu código Python

## 📋 Información necesaria

**URLs que Gabriel te proporcionó:**
- 🌐 **Panel principal**: `https://TU-APP.vercel.app`
- 📡 **API endpoint**: `https://TU-APP.vercel.app/api/external-config`

> ⚠️ **IMPORTANTE**: Reemplaza `TU-APP.vercel.app` con la URL real que Gabriel te dé.

## 🛠️ Configuración inicial

### Paso 1: Instalar dependencias
```bash
pip install requests
```

### Paso 2: Descargar el cliente
Descarga el archivo `smash-api-client.py` de Gabriel, o usa el código base a continuación.

## 💻 Código base para integrar en tu panel

```python
import requests
import json
from datetime import datetime

class SmashPanelController:
    def __init__(self, base_url):
        """
        Inicializar controlador del panel de Smash
        
        Args:
            base_url: URL que te dio Gabriel (ej: "https://smash-ban-stages.vercel.app")
        """
        self.api_url = f"{base_url.rstrip('/')}/api/external-config"
        
    def get_current_state(self):
        """Obtener estado actual del panel de Gabriel"""
        try:
            response = requests.get(self.api_url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error obteniendo estado: {e}")
            return None
    
    def create_new_session(self, player1_name, player2_name, format_type="BO3"):
        """
        Crear nueva sesión en el panel de Gabriel
        
        Args:
            player1_name: Nombre del jugador 1
            player2_name: Nombre del jugador 2 
            format_type: "BO3", "BEST OF 3", "BO5", "BEST OF 5"
        """
        config = {
            "player1": {"name": player1_name},
            "player2": {"name": player2_name},
            "format": format_type,
            "actions": {
                "createSession": True,  # Esto le dice al panel que cree la sesión
                "resetSeries": False
            },
            "lastUpdate": datetime.now().isoformat()
        }
        
        return self._send_config(config)
    
    def reset_current_series(self):
        """Reiniciar la serie actual"""
        # Primero obtener config actual
        current = self.get_current_state()
        if not current:
            return False
            
        # Solo cambiar la acción de reset
        current["actions"]["resetSeries"] = True
        current["lastUpdate"] = datetime.now().isoformat()
        
        return self._send_config(current)
    
    def update_players_only(self, player1_name=None, player2_name=None):
        """Actualizar solo los nombres, sin crear sesión nueva"""
        current = self.get_current_state()
        if not current:
            return False
            
        if player1_name:
            current["player1"]["name"] = player1_name
        if player2_name:
            current["player2"]["name"] = player2_name
            
        current["lastUpdate"] = datetime.now().isoformat()
        return self._send_config(current)
    
    def _send_config(self, config):
        """Enviar configuración al panel de Gabriel"""
        try:
            response = requests.put(
                self.api_url,
                json=config,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get('success', False)
            
        except Exception as e:
            print(f"Error enviando configuración: {e}")
            return False

# =============================================================================
# EJEMPLO DE INTEGRACIÓN CON TU CÓDIGO EXISTENTE
# =============================================================================

# Inicializar el controlador (CAMBIAR POR LA URL REAL)
smash_controller = SmashPanelController("https://TU-URL-REAL.vercel.app")

def ejemplo_crear_sesion():
    """Ejemplo de cómo crear una sesión nueva"""
    success = smash_controller.create_new_session(
        player1_name="Sparg0",
        player2_name="Tweek", 
        format_type="BO5"
    )
    
    if success:
        print("✅ ¡Sesión creada en el panel de Gabriel!")
    else:
        print("❌ Error creando sesión")

def ejemplo_reset_serie():
    """Ejemplo de cómo reiniciar serie"""
    success = smash_controller.reset_current_series()
    
    if success:
        print("✅ ¡Serie reiniciada!")
    else:
        print("❌ Error reiniciando serie")

def ejemplo_actualizar_jugadores():
    """Ejemplo de cómo cambiar solo los nombres"""
    success = smash_controller.update_players_only(
        player1_name="MkLeo",
        player2_name="Shuton"
    )
    
    if success:
        print("✅ ¡Nombres actualizados!")
    else:
        print("❌ Error actualizando nombres")

# =============================================================================
# INTEGRACIÓN CON TU PANEL EXISTENTE
# =============================================================================

class TuPanelExistente:
    def __init__(self):
        # CAMBIAR POR LA URL REAL QUE TE DIO GABRIEL
        self.smash_controller = SmashPanelController("https://TU-URL-REAL.vercel.app")
    
    def on_boton_crear_sesion(self):
        """Cuando haces clic en tu botón de crear sesión"""
        # Obtener datos de tu interfaz
        player1 = self.get_player1_from_your_ui()
        player2 = self.get_player2_from_your_ui() 
        formato = self.get_format_from_your_ui()  # "BO3" o "BO5"
        
        # Enviar al panel de Gabriel
        success = self.smash_controller.create_new_session(player1, player2, formato)
        
        if success:
            self.show_success_message("¡Sesión enviada al panel de Gabriel!")
        else:
            self.show_error_message("Error enviando al panel de Gabriel")
    
    def on_boton_reset(self):
        """Cuando haces clic en reset"""
        success = self.smash_controller.reset_current_series()
        
        if success:
            self.show_success_message("¡Serie reiniciada en el panel de Gabriel!")
        else:
            self.show_error_message("Error reiniciando en el panel de Gabriel")
    
    # Métodos que debes implementar según tu interfaz
    def get_player1_from_your_ui(self):
        # Retornar el nombre del jugador 1 desde tu interfaz
        pass
    
    def get_player2_from_your_ui(self):
        # Retornar el nombre del jugador 2 desde tu interfaz
        pass
    
    def get_format_from_your_ui(self):
        # Retornar "BO3" o "BO5" según tu interfaz
        pass
    
    def show_success_message(self, message):
        # Mostrar mensaje de éxito en tu interfaz
        print(f"✅ {message}")
    
    def show_error_message(self, message):
        # Mostrar mensaje de error en tu interfaz
        print(f"❌ {message}")

# =============================================================================
# EJEMPLO PARA TKINTER
# =============================================================================

def ejemplo_gui_tkinter():
    """Ejemplo completo con tkinter"""
    import tkinter as tk
    from tkinter import ttk, messagebox
    
    class SmashControlPanel:
        def __init__(self):
            self.root = tk.Tk()
            self.root.title("Control Panel - Smash Ban Stages")
            self.root.geometry("400x250")
            
            # CAMBIAR POR LA URL REAL
            self.smash_controller = SmashPanelController("https://TU-URL-REAL.vercel.app")
            
            self.setup_ui()
        
        def setup_ui(self):
            main_frame = ttk.Frame(self.root, padding="10")
            main_frame.pack(fill=tk.BOTH, expand=True)
            
            # Player 1
            ttk.Label(main_frame, text="Player 1:").grid(row=0, column=0, sticky=tk.W, pady=2)
            self.player1_var = tk.StringVar()
            ttk.Entry(main_frame, textvariable=self.player1_var, width=25).grid(row=0, column=1, padx=5)
            
            # Player 2  
            ttk.Label(main_frame, text="Player 2:").grid(row=1, column=0, sticky=tk.W, pady=2)
            self.player2_var = tk.StringVar()
            ttk.Entry(main_frame, textvariable=self.player2_var, width=25).grid(row=1, column=1, padx=5)
            
            # Formato
            ttk.Label(main_frame, text="Formato:").grid(row=2, column=0, sticky=tk.W, pady=2)
            self.format_var = tk.StringVar(value="BO3")
            format_combo = ttk.Combobox(main_frame, textvariable=self.format_var, 
                                       values=["BO3", "BO5"], width=22)
            format_combo.grid(row=2, column=1, padx=5)
            
            # Botones
            button_frame = ttk.Frame(main_frame)
            button_frame.grid(row=3, column=0, columnspan=2, pady=20)
            
            ttk.Button(button_frame, text="Crear Sesión", 
                      command=self.crear_sesion).pack(side=tk.LEFT, padx=5)
            
            ttk.Button(button_frame, text="Reset Serie", 
                      command=self.reset_serie).pack(side=tk.LEFT, padx=5)
            
            # Status
            self.status_var = tk.StringVar(value="Listo")
            status_label = ttk.Label(main_frame, textvariable=self.status_var, 
                                   foreground="blue")
            status_label.grid(row=4, column=0, columnspan=2, pady=10)
        
        def crear_sesion(self):
            self.status_var.set("Creando sesión...")
            self.root.update()
            
            success = self.smash_controller.create_new_session(
                self.player1_var.get(),
                self.player2_var.get(),
                self.format_var.get()
            )
            
            if success:
                self.status_var.set("✅ ¡Sesión creada!")
                messagebox.showinfo("Éxito", "Sesión enviada al panel de Gabriel")
            else:
                self.status_var.set("❌ Error creando sesión")
                messagebox.showerror("Error", "No se pudo enviar al panel de Gabriel")
        
        def reset_serie(self):
            if messagebox.askyesno("Confirmar", "¿Reiniciar la serie actual?"):
                self.status_var.set("Reiniciando...")
                self.root.update()
                
                success = self.smash_controller.reset_current_series()
                
                if success:
                    self.status_var.set("✅ ¡Serie reiniciada!")
                    messagebox.showinfo("Éxito", "Serie reiniciada en el panel de Gabriel")
                else:
                    self.status_var.set("❌ Error reiniciando")
                    messagebox.showerror("Error", "No se pudo reiniciar la serie")
        
        def run(self):
            self.root.mainloop()
    
    # Ejecutar GUI
    app = SmashControlPanel()
    app.run()

if __name__ == "__main__":
    print("🎮 Smash Ban Stages - Control Remoto")
    print("=" * 40)
    print("IMPORTANTE: Cambia 'TU-URL-REAL.vercel.app' por la URL que te dio Gabriel")
    print()
    
    while True:
        print("\n📋 Opciones de prueba:")
        print("1. Crear sesión de ejemplo")
        print("2. Reset serie")
        print("3. Actualizar solo nombres")
        print("4. GUI con tkinter")
        print("5. Salir")
        
        choice = input("\nElige opción (1-5): ").strip()
        
        if choice == "1":
            ejemplo_crear_sesion()
        elif choice == "2":
            ejemplo_reset_serie()
        elif choice == "3":
            ejemplo_actualizar_jugadores()
        elif choice == "4":
            ejemplo_gui_tkinter()
        elif choice == "5":
            break
        else:
            print("❌ Opción inválida")
```

## 🔧 Pasos para implementar

### 1. **Gabriel te da la URL**
Cuando Gabriel despliegue, te dará algo como:
```
https://smash-ban-stages-abc123.vercel.app
```

### 2. **Reemplazas en tu código**
```python
# Cambiar esta línea:
smash_controller = SmashPanelController("https://TU-URL-REAL.vercel.app")

# Por la URL real:
smash_controller = SmashPanelController("https://smash-ban-stages-abc123.vercel.app")
```

### 3. **Integras con tu panel existente**
```python
def tu_funcion_existente():
    # Tu código actual...
    
    # Agregar al final:
    smash_controller.create_new_session(player1, player2, "BO3")
```

## 🧪 Cómo probar

### Prueba básica:
```python
# Probar conexión
controller = SmashPanelController("https://URL-DE-GABRIEL.vercel.app")
state = controller.get_current_state()
print(state)  # Debe mostrar la configuración actual
```

### Prueba completa:
```python
# Crear sesión
success = controller.create_new_session("TestPlayer1", "TestPlayer2", "BO3")
print(f"Sesión creada: {success}")
```

## 🐛 Solución de problemas

### Error de conexión:
- ✅ Verificar que la URL sea correcta
- ✅ Verificar conexión a internet
- ✅ Preguntar a Gabriel si el sitio está funcionando

### Error 405 (Method not allowed):
- ❌ Estás enviando a la URL equivocada
- ✅ Debe ser `/api/external-config`, no `/shared-config.json`

### Error 400 (Bad Request):
- ❌ Datos mal formateados
- ✅ Verificar que `player1_name` y `player2_name` no estén vacíos

## 💡 Tips importantes

1. **Siempre usa HTTPS**, no HTTP
2. **Guarda la URL** que te dé Gabriel, no cambies
3. **Prueba primero** con los ejemplos antes de integrar
4. **Maneja errores** en tu código (internet puede fallar)
5. **Usa timeouts** para evitar que se cuelgue tu aplicación

¡Con esto podrás controlar el panel de Gabriel desde tu código Python! 🚀