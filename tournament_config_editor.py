#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🎮 Editor de Configuración para Smash Ban Stages
Edita fácilmente el JSON de configuración del panel de admin
"""

import json
import os
import requests
from pathlib import Path

class TournamentConfigEditor:
    def __init__(self, local_path=None, github_repo=None):
        """
        Inicializar el editor
        
        Args:
            local_path: Ruta local al archivo JSON (para desarrollo)
            github_repo: "owner/repo" para edición online vía API
        """
        self.local_path = local_path
        self.github_repo = github_repo
        self.config = {}
        
    def cargar_config(self):
        """Cargar configuración actual"""
        try:
            if self.local_path and os.path.exists(self.local_path):
                # Cargar desde archivo local
                with open(self.local_path, 'r', encoding='utf-8') as f:
                    self.config = json.load(f)
                print("✅ Configuración cargada desde archivo local")
            else:
                # Cargar desde la web (Vercel)
                url = "https://smash-ban-stages.vercel.app/config/tournament-settings.json"
                response = requests.get(url)
                if response.status_code == 200:
                    self.config = response.json()
                    print("✅ Configuración cargada desde Vercel")
                else:
                    print("❌ Error cargando desde web, usando configuración por defecto")
                    self._crear_config_default()
        except Exception as e:
            print(f"⚠️ Error: {e}")
            self._crear_config_default()
    
    def _crear_config_default(self):
        """Crear configuración por defecto"""
        self.config = {
            "defaultPlayers": {
                "player1": "Team Red",
                "player2": "Team Blue"
            },
            "formats": [
                {"id": "BO3", "name": "Best of 3", "maxWins": 2, "totalGames": 3},
                {"id": "BO5", "name": "Best of 5", "maxWins": 3, "totalGames": 5}
            ],
            "defaultFormat": "BO3",
            "presetPlayers": [],
            "quickSettings": {
                "enablePresetPlayers": True,
                "enableQuickFormats": True,
                "autoFillLastUsed": True
            }
        }
    
    def mostrar_config_actual(self):
        """Mostrar configuración actual"""
        print("\n" + "="*50)
        print("📋 CONFIGURACIÓN ACTUAL")
        print("="*50)
        print(f"🎮 Jugadores por defecto: {self.config['defaultPlayers']['player1']} vs {self.config['defaultPlayers']['player2']}")
        print(f"🏆 Formato por defecto: {self.config['defaultFormat']}")
        print(f"👤 Presets de jugadores: {len(self.config.get('presetPlayers', []))} jugadores")
        print(f"📊 Formatos disponibles: {len(self.config.get('formats', []))} formatos")
        print("\nJugadores preconfigurados:")
        for player in self.config.get('presetPlayers', []):
            print(f"  • {player['name']}")
    
    def agregar_jugador(self, nombre, tag=None):
        """Agregar un jugador a los presets"""
        if 'presetPlayers' not in self.config:
            self.config['presetPlayers'] = []
        
        nuevo_jugador = {"name": nombre, "tag": tag or nombre}
        self.config['presetPlayers'].append(nuevo_jugador)
        print(f"✅ Jugador '{nombre}' agregado")
    
    def eliminar_jugador(self, nombre):
        """Eliminar un jugador de los presets"""
        if 'presetPlayers' not in self.config:
            return False
        
        original_len = len(self.config['presetPlayers'])
        self.config['presetPlayers'] = [p for p in self.config['presetPlayers'] if p['name'] != nombre]
        
        if len(self.config['presetPlayers']) < original_len:
            print(f"✅ Jugador '{nombre}' eliminado")
            return True
        else:
            print(f"❌ Jugador '{nombre}' no encontrado")
            return False
    
    def cambiar_formato_default(self, formato):
        """Cambiar formato por defecto"""
        formatos_validos = [f['id'] for f in self.config.get('formats', [])]
        if formato in formatos_validos:
            self.config['defaultFormat'] = formato
            print(f"✅ Formato por defecto cambiado a: {formato}")
        else:
            print(f"❌ Formato '{formato}' no válido. Opciones: {', '.join(formatos_validos)}")
    
    def cambiar_nombres_default(self, player1=None, player2=None):
        """Cambiar nombres por defecto"""
        if player1:
            self.config['defaultPlayers']['player1'] = player1
            print(f"✅ Jugador 1 por defecto: {player1}")
        if player2:
            self.config['defaultPlayers']['player2'] = player2
            print(f"✅ Jugador 2 por defecto: {player2}")
    
    def agregar_formato(self, id_formato, nombre, max_wins, total_games):
        """Agregar nuevo formato"""
        if 'formats' not in self.config:
            self.config['formats'] = []
        
        nuevo_formato = {
            "id": id_formato,
            "name": nombre,
            "maxWins": max_wins,
            "totalGames": total_games
        }
        self.config['formats'].append(nuevo_formato)
        print(f"✅ Formato '{nombre}' agregado")
    
    def guardar_config(self, archivo_salida=None):
        """Guardar configuración"""
        archivo = archivo_salida or self.local_path or "tournament-settings.json"
        
        try:
            # Crear directorio si no existe
            os.makedirs(os.path.dirname(archivo) if os.path.dirname(archivo) else '.', exist_ok=True)
            
            with open(archivo, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
            print(f"💾 Configuración guardada en: {archivo}")
            
            # Mostrar instrucciones para subir a GitHub
            print("\n📤 PRÓXIMOS PASOS:")
            print("1. Sube este archivo a GitHub en: public/config/tournament-settings.json")
            print("2. O copia el contenido al editor online del panel")
            print("3. Los cambios se aplicarán automáticamente en Vercel")
            
        except Exception as e:
            print(f"❌ Error guardando: {e}")
    
    def exportar_para_github(self):
        """Exportar JSON formateado para GitHub"""
        json_content = json.dumps(self.config, indent=2, ensure_ascii=False)
        
        print("\n" + "="*60)
        print("📋 COPIA ESTE CONTENIDO A GITHUB:")
        print("="*60)
        print(json_content)
        print("="*60)
        print("📍 Ubicación en GitHub: public/config/tournament-settings.json")

def menu_interactivo():
    """Menú interactivo para editar configuración"""
    print("🎮 EDITOR DE CONFIGURACIÓN SMASH BAN STAGES")
    print("="*50)
    
    editor = TournamentConfigEditor()
    editor.cargar_config()
    
    while True:
        print("\n📋 OPCIONES:")
        print("1. 👀 Mostrar configuración actual")
        print("2. 👤 Agregar jugador")
        print("3. 🗑️  Eliminar jugador") 
        print("4. 🏆 Cambiar formato por defecto")
        print("5. 📝 Cambiar nombres por defecto")
        print("6. ➕ Agregar formato personalizado")
        print("7. 💾 Guardar configuración")
        print("8. 📤 Exportar para GitHub")
        print("9. 🚪 Salir")
        
        opcion = input("\n🎯 Selecciona una opción (1-9): ").strip()
        
        if opcion == "1":
            editor.mostrar_config_actual()
            
        elif opcion == "2":
            nombre = input("👤 Nombre del jugador: ").strip()
            tag = input("🏷️  Tag (opcional, presiona Enter para usar el nombre): ").strip()
            editor.agregar_jugador(nombre, tag if tag else None)
            
        elif opcion == "3":
            nombre = input("🗑️  Nombre del jugador a eliminar: ").strip()
            editor.eliminar_jugador(nombre)
            
        elif opcion == "4":
            formatos = [f"{f['id']} ({f['name']})" for f in editor.config.get('formats', [])]
            print("🏆 Formatos disponibles:", ", ".join(formatos))
            formato = input("Nuevo formato por defecto (ID): ").strip()
            editor.cambiar_formato_default(formato)
            
        elif opcion == "5":
            player1 = input("🔴 Jugador 1 por defecto (actual: {}): ".format(editor.config['defaultPlayers']['player1'])).strip()
            player2 = input("🔵 Jugador 2 por defecto (actual: {}): ".format(editor.config['defaultPlayers']['player2'])).strip()
            editor.cambiar_nombres_default(player1 if player1 else None, player2 if player2 else None)
            
        elif opcion == "6":
            id_formato = input("🆔 ID del formato (ej: FT10): ").strip()
            nombre = input("📝 Nombre del formato (ej: First to 10): ").strip()
            max_wins = int(input("🏆 Puntos para ganar: "))
            total_games = int(input("📊 Máximo de games: "))
            editor.agregar_formato(id_formato, nombre, max_wins, total_games)
            
        elif opcion == "7":
            archivo = input("💾 Nombre del archivo (Enter para default): ").strip()
            editor.guardar_config(archivo if archivo else None)
            
        elif opcion == "8":
            editor.exportar_para_github()
            
        elif opcion == "9":
            print("👋 ¡Hasta luego!")
            break
            
        else:
            print("❌ Opción no válida")

if __name__ == "__main__":
    # Ejemplo de uso rápido
    print("🚀 MODO RÁPIDO: Configuración de ejemplo")
    print("Para modo interactivo, ejecuta: menu_interactivo()")
    
    # Crear editor con configuración de ejemplo
    editor = TournamentConfigEditor()
    editor.cargar_config()
    
    # Agregar algunos jugadores de ejemplo
    editor.agregar_jugador("MkLeo", "MkLeo")
    editor.agregar_jugador("Sparg0", "Sparg0") 
    editor.agregar_jugador("Nostra", "Nostra")
    editor.agregar_jugador("Iori", "Iori")
    
    # Cambiar configuración
    editor.cambiar_nombres_default("Team Red", "Team Blue")
    editor.cambiar_formato_default("BO3")
    
    # Agregar formato personalizado
    editor.agregar_formato("FT10", "First to 10", 10, 19)
    
    # Mostrar resultado
    editor.mostrar_config_actual()
    
    # Guardar
    editor.guardar_config("mi-configuracion.json")
    
    print("\n🎯 Para usar el modo interactivo, ejecuta:")
    print("python script.py")
    print(">>> menu_interactivo()")