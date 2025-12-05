#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cliente para controlar el panel de Smash Ban Stages de Gabriel
URL: https://smash-ban-stages.vercel.app
"""

import requests
from datetime import datetime

class SmashController:
    def __init__(self):
        # URL fija del panel de Gabriel
        self.api_url = "https://smash-ban-stages.vercel.app/api/external-config"
    
    def crear_sesion(self, player1_name, player2_name, formato="BO3"):
        """
        Crear nueva sesión en el panel de Gabriel
        
        Args:
            player1_name: Nombre del jugador 1
            player2_name: Nombre del jugador 2 
            formato: "BO3", "BEST OF 3", "BO5", "BEST OF 5"
        """
        config = {
            "player1": {"name": player1_name},
            "player2": {"name": player2_name},
            "format": formato,
            "actions": {
                "createSession": True,
                "resetSeries": False
            },
            "lastUpdate": datetime.now().isoformat()
        }
        
        try:
            response = requests.put(
                self.api_url,
                json=config,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.ok:
                result = response.json()
                print(f"✅ Sesión creada: {player1_name} vs {player2_name} ({formato})")
                return True
            else:
                print(f"❌ Error crear sesión: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error conexión: {e}")
            return False
    
    def reset_serie(self):
        """Reiniciar la serie actual"""
        try:
            # Obtener configuración actual
            current = requests.get(self.api_url, timeout=10).json()
            
            # Solo activar reset
            current["actions"]["resetSeries"] = True
            current["actions"]["createSession"] = False
            current["lastUpdate"] = datetime.now().isoformat()
            
            response = requests.put(
                self.api_url,
                json=current,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.ok:
                print("✅ Serie reiniciada")
                return True
            else:
                print(f"❌ Error reset: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error conexión: {e}")
            return False
    
    def actualizar_jugadores(self, player1_name=None, player2_name=None):
        """Actualizar solo los nombres, sin crear sesión"""
        try:
            # Obtener configuración actual
            current = requests.get(self.api_url, timeout=10).json()
            
            # Actualizar nombres
            if player1_name:
                current["player1"]["name"] = player1_name
            if player2_name:
                current["player2"]["name"] = player2_name
                
            current["lastUpdate"] = datetime.now().isoformat()
            
            response = requests.put(
                self.api_url,
                json=current,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.ok:
                print("✅ Jugadores actualizados")
                return True
            else:
                print(f"❌ Error actualizar: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error conexión: {e}")
            return False
    
    def obtener_estado(self):
        """Obtener el estado actual del panel"""
        try:
            response = requests.get(self.api_url, timeout=10)
            if response.ok:
                return response.json()
            else:
                print(f"❌ Error obtener estado: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Error conexión: {e}")
            return None

# =============================================================================
# EJEMPLO DE INTEGRACIÓN CON TU PANEL EXISTENTE
# =============================================================================

# Inicializar controlador (YA CON LA URL DE GABRIEL)
smash = SmashController()

def ejemplo_tu_boton_crear_sesion():
    """Ejemplo para integrar en tu botón 'Crear Sesión'"""
    # Obtener datos de tu interfaz actual
    player1 = "Sparg0"      # <- Cambiar por tu input
    player2 = "Tweek"       # <- Cambiar por tu input  
    formato = "BO5"         # <- Cambiar por tu dropdown
    
    # Enviar al panel de Gabriel
    success = smash.crear_sesion(player1, player2, formato)
    
    if success:
        print("🎉 ¡Enviado al panel de Gabriel!")
        # Aquí tu código para mostrar éxito
    else:
        print("💥 Error enviando al panel")
        # Aquí tu código para mostrar error

def ejemplo_tu_boton_reset():
    """Ejemplo para integrar en tu botón 'Reset'"""
    success = smash.reset_serie()
    
    if success:
        print("🔄 ¡Serie reiniciada en el panel de Gabriel!")
        # Aquí tu código para mostrar éxito
    else:
        print("💥 Error reiniciando")
        # Aquí tu código para mostrar error

# =============================================================================
# GUI DE EJEMPLO CON TKINTER
# =============================================================================

def crear_gui_ejemplo():
    """GUI de ejemplo para probar"""
    try:
        import tkinter as tk
        from tkinter import ttk, messagebox
    except ImportError:
        print("❌ tkinter no disponible")
        return
        
    class SmashGUI:
        def __init__(self):
            self.root = tk.Tk()
            self.root.title("Control Panel - Gabriel's Smash Ban Stages")
            self.root.geometry("450x300")
            self.setup_ui()
            
        def setup_ui(self):
            main_frame = ttk.Frame(self.root, padding="15")
            main_frame.pack(fill=tk.BOTH, expand=True)
            
            # Título
            title = ttk.Label(main_frame, text="🎮 Control Remoto - Panel de Gabriel", 
                            font=("Arial", 14, "bold"))
            title.grid(row=0, column=0, columnspan=2, pady=(0, 20))
            
            # Player 1
            ttk.Label(main_frame, text="Player 1:").grid(row=1, column=0, sticky=tk.W, pady=5)
            self.player1_var = tk.StringVar(value="Sparg0")
            ttk.Entry(main_frame, textvariable=self.player1_var, width=25).grid(row=1, column=1, padx=10)
            
            # Player 2  
            ttk.Label(main_frame, text="Player 2:").grid(row=2, column=0, sticky=tk.W, pady=5)
            self.player2_var = tk.StringVar(value="Tweek")
            ttk.Entry(main_frame, textvariable=self.player2_var, width=25).grid(row=2, column=1, padx=10)
            
            # Formato
            ttk.Label(main_frame, text="Formato:").grid(row=3, column=0, sticky=tk.W, pady=5)
            self.format_var = tk.StringVar(value="BO5")
            format_combo = ttk.Combobox(main_frame, textvariable=self.format_var, 
                                       values=["BO3", "BEST OF 3", "BO5", "BEST OF 5"], width=22)
            format_combo.grid(row=3, column=1, padx=10)
            
            # Botones
            button_frame = ttk.Frame(main_frame)
            button_frame.grid(row=4, column=0, columnspan=2, pady=30)
            
            ttk.Button(button_frame, text="🚀 Crear Sesión", 
                      command=self.crear_sesion).pack(side=tk.LEFT, padx=10)
            
            ttk.Button(button_frame, text="🔄 Reset Serie", 
                      command=self.reset_serie).pack(side=tk.LEFT, padx=10)
            
            ttk.Button(button_frame, text="📊 Ver Estado", 
                      command=self.ver_estado).pack(side=tk.LEFT, padx=10)
            
            # Status
            self.status_var = tk.StringVar(value="✅ Conectado a: smash-ban-stages.vercel.app")
            status_label = ttk.Label(main_frame, textvariable=self.status_var, 
                                   foreground="green", font=("Arial", 9))
            status_label.grid(row=5, column=0, columnspan=2, pady=15)
        
        def crear_sesion(self):
            self.status_var.set("⏳ Creando sesión...")
            self.root.update()
            
            success = smash.crear_sesion(
                self.player1_var.get(),
                self.player2_var.get(),
                self.format_var.get()
            )
            
            if success:
                self.status_var.set("✅ ¡Sesión enviada al panel de Gabriel!")
                messagebox.showinfo("Éxito", f"Sesión creada:\n{self.player1_var.get()} vs {self.player2_var.get()}")
            else:
                self.status_var.set("❌ Error enviando sesión")
                messagebox.showerror("Error", "No se pudo conectar con el panel de Gabriel")
        
        def reset_serie(self):
            if messagebox.askyesno("Confirmar", "¿Reiniciar la serie en el panel de Gabriel?"):
                self.status_var.set("⏳ Reiniciando serie...")
                self.root.update()
                
                success = smash.reset_serie()
                
                if success:
                    self.status_var.set("✅ ¡Serie reiniciada!")
                    messagebox.showinfo("Éxito", "Serie reiniciada en el panel de Gabriel")
                else:
                    self.status_var.set("❌ Error reiniciando")
                    messagebox.showerror("Error", "No se pudo reiniciar la serie")
        
        def ver_estado(self):
            estado = smash.obtener_estado()
            if estado:
                info = f"""Estado actual del panel:

Player 1: {estado['player1']['name']}
Player 2: {estado['player2']['name']}
Formato: {estado['format']}
Última actualización: {estado['lastUpdate'][:19]}"""
                messagebox.showinfo("Estado del Panel", info)
            else:
                messagebox.showerror("Error", "No se pudo obtener el estado")
        
        def run(self):
            self.root.mainloop()
    
    app = SmashGUI()
    app.run()

if __name__ == "__main__":
    print("🎮 Control Remoto - Panel de Gabriel")
    print("URL: https://smash-ban-stages.vercel.app")
    print("=" * 50)
    
    while True:
        print("\n📋 Opciones:")
        print("1. Crear sesión de prueba")
        print("2. Reset serie")
        print("3. Ver estado actual")
        print("4. GUI completa")
        print("5. Salir")
        
        choice = input("\nElige opción (1-5): ").strip()
        
        if choice == "1":
            print("🚀 Creando sesión de prueba...")
            smash.crear_sesion("TestPlayer1", "TestPlayer2", "BO3")
        elif choice == "2":
            print("🔄 Reiniciando serie...")
            smash.reset_serie()
        elif choice == "3":
            print("📊 Obteniendo estado...")
            estado = smash.obtener_estado()
            if estado:
                print(f"Player 1: {estado['player1']['name']}")
                print(f"Player 2: {estado['player2']['name']}")
                print(f"Formato: {estado['format']}")
        elif choice == "4":
            crear_gui_ejemplo()
        elif choice == "5":
            print("👋 ¡Hasta luego!")
            break
        else:
            print("❌ Opción inválida")