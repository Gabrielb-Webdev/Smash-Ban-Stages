# 🌐 Guía: Editar JSON Online en Vercel

## 🎯 **Opción 1: Editar desde GitHub (Permanente)**

### **Paso a Paso:**

1. **Ve a tu repositorio**: 
   ```
   https://github.com/Gabrielb-Webdev/Smash-Ban-Stages
   ```

2. **Navega al archivo**:
   ```
   📁 public → 📁 config → 📄 tournament-settings.json
   ```

3. **Editar el archivo**:
   - Click en el ícono del **lápiz ✏️** (Edit this file)
   - Modifica el JSON directamente en GitHub

4. **Guardar cambios**:
   - Scroll hacia abajo
   - Escribe un mensaje: "Update tournament settings"
   - Click **"Commit changes"**

5. **Deploy automático**:
   - Vercel detecta el cambio automáticamente
   - En 1-2 minutos los cambios están en línea

---

## 🎮 **Opción 2: Editor desde el Panel (Temporal)**

### **Nuevo botón añadido al panel:**

1. **Ve a tu panel**: `https://tu-proyecto.vercel.app`
2. **Scroll hacia abajo** hasta "Información Actual del Torneo"
3. **Click en** "✏️ Editar JSON Online"
4. **Edita** la configuración en el editor
5. **Click** "💾 Aplicar Cambios (Temporal)"

### **⚠️ Importante:**
- Los cambios son **temporales** (se pierden al refrescar)
- Para cambios **permanentes**, usa la Opción 1

---

## 📝 **Ejemplo: Añadir Jugadores Online**

### **En GitHub:**
```json
{
  "presetPlayers": [
    { "name": "Tu Jugador Local 1", "tag": "Tag1" },
    { "name": "Tu Jugador Local 2", "tag": "Tag2" },
    { "name": "MkLeo", "tag": "MkLeo" },
    { "name": "Sparg0", "tag": "Sparg0" }
  ]
}
```

### **Resultado en el panel:**
- Botón "📋 Presets" mostrará todos estos jugadores
- Click rápido para seleccionar

---

## 🚀 **Cambios Inmediatos Online**

### **Para probar rápido:**
1. Usa el **editor del panel** (Opción 2)
2. Prueba la configuración
3. Si funciona bien, **copia el JSON**
4. **Pégalo en GitHub** para hacerlo permanente

### **Para cambios definitivos:**
1. Edita directamente en **GitHub** (Opción 1)
2. Espera 1-2 minutos el deploy
3. **Refresca** tu panel para ver cambios

---

## ⚡ **Tips para Editar Online**

### **✅ Configuraciones más comunes:**

**Jugadores locales:**
```json
"presetPlayers": [
  { "name": "Juan", "tag": "Juan" },
  { "name": "Pedro", "tag": "Pedro" },
  { "name": "Maria", "tag": "Maria" }
]
```

**Formato por defecto:**
```json
"defaultFormat": "BO3"  // o "BO5", "FT10", etc.
```

**Auto-llenado:**
```json
"defaultPlayers": {
  "player1": "Team Red",
  "player2": "Team Blue"
}
```

### **🔧 Validar JSON:**
- Usa https://jsonlint.com/ para validar sintaxis
- Asegúrate de que las comas estén bien puestas

---

## 📱 **Flujo de Trabajo Recomendado**

1. **Edita** en GitHub el `tournament-settings.json`
2. **Commit** los cambios  
3. **Espera** 1-2 minutos (deploy automático)
4. **Refresca** tu panel de admin
5. **¡Los presets y configuraciones están listos!**

### **🎮 Resultado:**
- Panel pre-configurado con tus jugadores
- Formatos personalizados
- ¡Súper fácil de usar durante torneos!