import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎮 AFK Smash</Text>
        <Text style={styles.subtitle}>Aplicación Móvil</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          ¡Bienvenido a la app oficial de la comunidad AFK Buenos Aires!
        </Text>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>
            🚀 Iniciar Sesión con start.gg
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Esta es una versión de prueba básica.
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Hecho con ❤️ para la comunidad AFK
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#FEF3C7',
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  description: {
    fontSize: 16,
    color: '#FEF3C7',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  note: {
    fontSize: 12,
    color: '#FEF3C7',
    marginTop: 20,
    opacity: 0.8,
  },
  footer: {
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});