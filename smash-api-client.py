#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de ejemplo para sincronizar panel externo con Smash Ban Stages vía API
Para usar cuando tu aplicación está desplegada online
"""

import requests
import time
from datetime import datetime

class SmashBanStagesAPI:
    def __init__(self, base_url="https://tu-app.vercel.app"):
        """
        Inicializar el cliente API
        
        Args:
            base_url: URL base de tu aplicación desplegada
                     Ejemplo: "https://smash-ban-stages.vercel.app"
        """
        self.base_url = base_url.rstrip('/')
        self.api_url = f"{self.base_url}/api/external-config"
        
    def get_config(self):
        """Obtener configuración actual"""
        try:
            response = requests.get(self.api_url, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"❌ Error obteniendo configuración: {e}")
            return None
            
    def update_config(self, player1_name=None, player2_name=None, 
                     format_type=None, create_session=False, reset_series=False):
        """
        Actualizar configuración del panel web
        
        Args:
            player1_name: Nombre del jugador 1
            player2_name: Nombre del jugador 2
            format_type: Formato del torneo ("BO3", "BEST OF 3", "BO5", "BEST OF 5")
            create_session: True para crear una nueva sesión
            reset_series: True para reiniciar la serie actual
        """
        
        # Obtener configuración actual
        current_config = self.get_config()
        if current_config is None:
            print("❌ No se pudo obtener configuración actual")
            return False
            
        # Preparar nueva configuración
        new_config = {
            "player1": {"name": player1_name or current_config.get("player1", {}).get("name", "Player 1")},
            "player2": {"name": player2_name or current_config.get("player2", {}).get("name", "Player 2")},
            "format": format_type or current_config.get("format", "BO3"),
            "actions": {
                "createSession": create_session,
                "resetSeries": reset_series
            },
            "lastUpdate": datetime.now().isoformat()
        }
        
        try:
            response = requests.put(
                self.api_url,
                json=new_config,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response.raise_for_status()
            
            result = response.json()
            if result.get('success'):
                print(f"✅ Configuración actualizada exitosamente")
                
                # Mostrar cambios
                if player1_name:
                    print(f"   👤 Player 1: {player1_name}")
                if player2_name:
                    print(f"   👤 Player 2: {player2_name}")
                if format_type:
                    print(f"   🎯 Formato: {format_type}")
                if create_session:
                    print(f"   🚀 Creando nueva sesión...")
                if reset_series:
                    print(f"   🔄 Reiniciando serie...")
                    
                return True
            else:
                print(f"❌ Error del servidor: {result.get('error')}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error enviando configuración: {e}")
            return False

# =============================================================================
# FUNCIONES DE EJEMPLO PARA TU AMIGO
# =============================================================================

def create_session_example():
    """Ejemplo: Crear una nueva sesión"""
    # CAMBIAR ESTA URL POR LA DE TU APP DESPLEGADA
    api = SmashBanStagesAPI("https://tu-app.vercel.app")
    
    # Configurar jugadores y crear sesión
    success = api.update_config(
        player1_name="Sparg0",
        player2_name="Tweek", 
        format_type="BO5",
        create_session=True
    )
    
    if success:
        print("🎉 ¡Sesión creada exitosamente!")
    else:
        print("💥 Error creando sesión")

def reset_series_example():
    """Ejemplo: Reiniciar serie actual"""
    # CAMBIAR ESTA URL POR LA DE TU APP DESPLEGADA  
    api = SmashBanStagesAPI("https://tu-app.vercel.app")
    
    success = api.update_config(reset_series=True)
    
    if success:
        print("🔄 ¡Serie reiniciada!")
    else:
        print("💥 Error reiniciando serie")

def update_players_example():
    """Ejemplo: Solo cambiar nombres de jugadores"""
    # CAMBIAR ESTA URL POR LA DE TU APP DESPLEGADA
    api = SmashBanStagesAPI("https://tu-app.vercel.app")
    
    success = api.update_config(
        player1_name="Nuevo Jugador 1",
        player2_name="Nuevo Jugador 2"
    )
    
    if success:
        print("👥 ¡Jugadores actualizados!")
    else:
        print("💥 Error actualizando jugadores")

# =============================================================================
# EJEMPLO DE INTEGRACIÓN CON TKINTER (GUI)
# =============================================================================

def create_gui_example():
    """Ejemplo de cómo integrar con tkinter"""
    try:
        import tkinter as tk
        from tkinter import ttk, messagebox
    except ImportError:
        print("❌ tkinter no disponible")
        return
        
    class SmashPanelGUI:
        def __init__(self):
            self.root = tk.Tk()
            self.root.title("Smash Ban Stages - Panel de Control")
            self.root.geometry("400x300")
            
            # CAMBIAR ESTA URL POR LA DE TU APP DESPLEGADA
            self.api = SmashBanStagesAPI("https://tu-app.vercel.app")
            
            self.setup_ui()
            
        def setup_ui(self):
            # Frame principal
            main_frame = ttk.Frame(self.root, padding="10")
            main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
            
            # Jugadores
            ttk.Label(main_frame, text="Player 1:").grid(row=0, column=0, sticky=tk.W)
            self.player1_var = tk.StringVar()
            ttk.Entry(main_frame, textvariable=self.player1_var, width=20).grid(row=0, column=1, padx=5)
            
            ttk.Label(main_frame, text="Player 2:").grid(row=1, column=0, sticky=tk.W)
            self.player2_var = tk.StringVar()  
            ttk.Entry(main_frame, textvariable=self.player2_var, width=20).grid(row=1, column=1, padx=5)
            
            # Formato
            ttk.Label(main_frame, text="Formato:").grid(row=2, column=0, sticky=tk.W)
            self.format_var = tk.StringVar(value="BO3")
            format_combo = ttk.Combobox(main_frame, textvariable=self.format_var, 
                                      values=["BO3", "BEST OF 3", "BO5", "BEST OF 5"])
            format_combo.grid(row=2, column=1, padx=5)
            
            # Botones
            ttk.Button(main_frame, text="Crear Sesión", 
                      command=self.create_session).grid(row=3, column=0, columnspan=2, pady=10)
            
            ttk.Button(main_frame, text="Reiniciar Serie", 
                      command=self.reset_series).grid(row=4, column=0, columnspan=2, pady=5)
                      
        def create_session(self):
            success = self.api.update_config(
                player1_name=self.player1_var.get(),
                player2_name=self.player2_var.get(),
                format_type=self.format_var.get(),
                create_session=True
            )
            
            if success:
                messagebox.showinfo("Éxito", "¡Sesión creada!")
            else:
                messagebox.showerror("Error", "No se pudo crear la sesión")
                
        def reset_series(self):
            if messagebox.askyesno("Confirmar", "¿Reiniciar la serie?"):
                success = self.api.update_config(reset_series=True)
                
                if success:
                    messagebox.showinfo("Éxito", "¡Serie reiniciada!")
                else:
                    messagebox.showerror("Error", "No se pudo reiniciar la serie")
                    
        def run(self):
            self.root.mainloop()
    
    # Mostrar GUI
    app = SmashPanelGUI()
    app.run()

if __name__ == "__main__":
    print("🎮 Smash Ban Stages - Cliente API")
    print("=" * 40)
    print()
    print("ANTES DE USAR:")
    print("1. Cambia 'https://tu-app.vercel.app' por tu URL real")
    print("2. Instala requests: pip install requests")
    print()
    
    # Ejemplos de uso
    while True:
        print("\n📋 Opciones:")
        print("1. Crear sesión de ejemplo")
        print("2. Reiniciar serie")
        print("3. Actualizar jugadores")
        print("4. Mostrar GUI de ejemplo (requiere tkinter)")
        print("5. Salir")
        
        choice = input("\nElige una opción (1-5): ").strip()
        
        if choice == "1":
            create_session_example()
        elif choice == "2":
            reset_series_example()
        elif choice == "3":
            update_players_example()
        elif choice == "4":
            create_gui_example()
        elif choice == "5":
            print("👋 ¡Hasta luego!")
            break
        else:
            print("❌ Opción inválida")