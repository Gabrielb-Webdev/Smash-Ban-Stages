import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      Alert.alert(
        'Error de Autenticación',
        'No se pudo conectar con start.gg. Por favor, intenta de nuevo.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <LinearGradient
      colors={['#DC2626', '#991B1B', '#7F1D1D']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AFK Smash</Text>
          <Text style={styles.subtitle}>Comunidad Buenos Aires</Text>
        </View>

        {/* Imagen central */}
        <View style={styles.imageContainer}>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>🎮</Text>
          </View>
        </View>

        {/* Descripción */}
        <View style={styles.description}>
          <Text style={styles.descriptionText}>
            Conectate con la comunidad AFK, inscríbete a torneos y recibe notificaciones cuando te toque jugar.
          </Text>
        </View>

        {/* Botón de login */}
        <View style={styles.loginSection}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <View style={styles.loginButtonContent}>
              <Text style={styles.loginButtonIcon}>🚀</Text>
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Conectando...' : 'Iniciar Sesión con start.gg'}
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.loginNote}>
            Usa tu cuenta de start.gg para acceder a todos los torneos de la comunidad AFK
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Versión 1.0.0 • Hecho con ❤️ para la comunidad
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#FEF3C7',
    textAlign: 'center',
    marginTop: 8,
  },
  imageContainer: {
    marginVertical: 40,
    alignItems: 'center',
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  placeholderText: {
    fontSize: 60,
  },
  description: {
    marginBottom: 50,
    paddingHorizontal: 10,
  },
  descriptionText: {
    fontSize: 16,
    color: '#FEF3C7',
    textAlign: 'center',
    lineHeight: 24,
  },
  loginSection: {
    width: '100%',
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  loginNote: {
    fontSize: 12,
    color: '#FEF3C7',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
    opacity: 0.8,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});