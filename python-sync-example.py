#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de ejemplo para sincronizar panel externo con Smash Ban Stages
Tu amigo puede adaptar este código a su panel existente
"""

import json
import os
import time
from datetime import datetime, timezone

# Ruta al archivo JSON compartido (ajustar según la ubicación)
JSON_PATH = "path/to/Smash Ban Stages/public/shared-config.json"

def read_config():
    """Lee la configuración actual"""
    try:
        with open(JSON_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {
            "player1": {"name": "Player 1"},
            "player2": {"name": "Player 2"},
            "format": "BO3",
            "actions": {"createSession": False, "resetSeries": False},
            "lastUpdate": datetime.now(timezone.utc).isoformat()
        }

def update_config(player1_name=None, player2_name=None, format_type=None, 
                 create_session=False, reset_series=False):
    """Actualiza la configuración y sincroniza con el panel web"""
    config = read_config()
    
    # Actualizar nombres
    if player1_name:
        config["player1"]["name"] = player1_name
        print(f"✅ Player 1 actualizado: {player1_name}")
    
    if player2_name:
        config["player2"]["name"] = player2_name
        print(f"✅ Player 2 actualizado: {player2_name}")
    
    # Traducir formato
    if format_type:
        if "BEST OF 3" in format_type.upper() or "BO3" in format_type.upper():
            config["format"] = "BO3"
        elif "BEST OF 5" in format_type.upper() or "BO5" in format_type.upper():
            config["format"] = "BO5"
        else:
            config["format"] = "BO3"  # Default
        print(f"✅ Formato actualizado: {format_type} → {config['format']}")
    
    # Acciones
    if create_session:
        config["actions"]["createSession"] = True
        print("🚀 Señal para crear sesión enviada")
    
    if reset_series:
        config["actions"]["resetSeries"] = True
        print("🔄 Señal para reiniciar serie enviada")
    
    # Actualizar timestamp
    config["lastUpdate"] = datetime.now(timezone.utc).isoformat()
    
    # Guardar archivo
    try:
        os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
        with open(JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        print("💾 Configuración guardada exitosamente")
        return True
    except Exception as e:
        print(f"❌ Error guardando configuración: {e}")
        return False

# ==========================================
# EJEMPLOS DE USO PARA EL PANEL DE TU AMIGO
# ==========================================

def ejemplo_actualizar_jugadores():
    """Ejemplo: Actualizar nombres de jugadores"""
    update_config(
        player1_name="GANOMHORSE",
        player2_name="IORI"
    )

def ejemplo_cambiar_formato():
    """Ejemplo: Cambiar formato de torneo"""
    update_config(format_type="BEST OF 5")

def ejemplo_crear_sesion():
    """Ejemplo: Crear nueva sesión en el panel web"""
    update_config(
        player1_name="GANOMHORSE",
        player2_name="IORI", 
        format_type="BEST OF 3",
        create_session=True
    )

def ejemplo_reiniciar_serie():
    """Ejemplo: Reiniciar serie actual"""
    update_config(reset_series=True)

def ejemplo_actualizacion_completa():
    """Ejemplo: Actualización completa como la haría el panel"""
    update_config(
        player1_name="GANOMHORSE",
        player2_name="IORI",
        format_type="BEST OF 3",
        create_session=True
    )

# ==========================================
# FUNCIONES PARA INTEGRAR EN SU PANEL
# ==========================================

class SmashBanStagesSync:
    """Clase para integrar en el panel existente de tu amigo"""
    
    def __init__(self, json_path):
        self.json_path = json_path
    
    def sync_players(self, player1, player2):
        """Sincronizar nombres de jugadores"""
        return update_config(player1_name=player1, player2_name=player2)
    
    def sync_format(self, format_str):
        """Sincronizar formato de torneo"""
        return update_config(format_type=format_str)
    
    def create_session(self, player1=None, player2=None, format_str=None):
        """Crear sesión en el panel web"""
        return update_config(
            player1_name=player1,
            player2_name=player2,
            format_type=format_str,
            create_session=True
        )
    
    def reset_series(self):
        """Reiniciar serie actual"""
        return update_config(reset_series=True)

if __name__ == "__main__":
    # Ejemplo de uso
    print("🎮 Smash Ban Stages - Sincronización de Panel")
    print("=" * 50)
    
    # Configurar ruta (tu amigo debe cambiar esta ruta)
    JSON_PATH = "./public/shared-config.json"  # Ruta de ejemplo
    
    # Ejemplo de sincronización
    ejemplo_actualizacion_completa()
    
    print("\n✨ Sincronización completada!")
    print("El panel web debería actualizarse automáticamente en ~2 segundos")