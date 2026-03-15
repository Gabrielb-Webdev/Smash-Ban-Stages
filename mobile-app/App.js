import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const BASE_URL = 'https://smash-ban-stages.vercel.app';

export default function App() {
  const [sessionId, setSessionId] = useState('');

  const handleConnect = async (id) => {
    const trimmed = (id || sessionId).trim();
    if (!trimmed) return;
    await WebBrowser.openBrowserAsync(`${BASE_URL}/tablet/${trimmed}`, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      controlsColor: '#DC2626',
      toolbarColor: '#000000',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <View style={styles.logo}>
        <Image
          source={{ uri: `${BASE_URL}/images/AFK.webp` }}
          style={styles.logoImg}
          resizeMode="contain"
        />
        <Text style={styles.title}>AFK Smash Stages</Text>
        <Text style={styles.subtitle}>Control de Tablet</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>ID de sesión</Text>
        <TextInput
          style={styles.input}
          value={sessionId}
          onChangeText={setSessionId}
          placeholder="Ej: afk-test"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => handleConnect()}
        />
        <TouchableOpacity
          style={[styles.btnMain, !sessionId.trim() && styles.btnDisabled]}
          onPress={() => handleConnect()}
          disabled={!sessionId.trim()}
        >
          <Text style={styles.btnMainText}>🎮 Conectar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickAccess}>
        <Text style={styles.quickLabel}>Accesos rápidos</Text>
        <View style={styles.quickRow}>
          {['afk-test', 'afk', 'cordoba', 'mendoza'].map((id) => (
            <TouchableOpacity
              key={id}
              style={styles.quickBtn}
              onPress={() => handleConnect(id)}
            >
              <Text style={styles.quickBtnText}>{id}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  logo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImg: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  label: {
    color: '#888',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#444',
    color: '#fff',
    fontSize: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  btnMain: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnMainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quickAccess: {
    alignItems: 'center',
  },
  quickLabel: {
    color: '#555',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  quickBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: '#111',
  },
  quickBtnText: {
    color: '#aaa',
    fontSize: 13,
  },
});