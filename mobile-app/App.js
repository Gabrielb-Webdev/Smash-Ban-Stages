import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  Linking,
  StyleSheet,
} from 'react-native';

const BASE_URL = 'https://smash-ban-stages.vercel.app';

const SETUPS = [
  { id: 'afk-stream', label: 'Setup Stream', color: '#DC2626' },
  { id: 'afk-setup1', label: 'Setup 1', color: '#7C3AED' },
  { id: 'afk-setup2', label: 'Setup 2', color: '#2563EB' },
  { id: 'afk-setup3', label: 'Setup 3', color: '#059669' },
  { id: 'afk-setup4', label: 'Setup 4', color: '#D97706' },
  { id: 'afk-setup5', label: 'Setup 5', color: '#DB2777' },
];

export default function App() {
  const [customId, setCustomId] = useState('');

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.title}>AFK Smash</Text>
        <Text style={styles.subtitle}>PANEL DE CONTROL</Text>

        {SETUPS.map(function(s) {
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.btn, { borderColor: s.color }]}
              onPress={function() { Linking.openURL(BASE_URL + '/tablet/' + s.id); }}
            >
              <Text style={styles.btnText}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.customSection}>
          <TextInput
            style={styles.input}
            value={customId}
            onChangeText={setCustomId}
            placeholder="ID personalizado (ej: cordoba)"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.btn, { borderColor: '#E88E00', opacity: customId.trim() ? 1 : 0.4 }]}
            onPress={function() {
              var id = customId.trim();
              if (id) Linking.openURL(BASE_URL + '/tablet/' + id);
            }}
          >
            <Text style={styles.btnText}>Conectar</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.adminBtn}
          onPress={function() { Linking.openURL(BASE_URL + '/admin/afk-multi'); }}
        >
          <Text style={styles.adminText}>Panel Admin (Multi Setup)</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

var styles = StyleSheet.create({
  safe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a0a',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E88E00',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 28,
  },
  btn: {
    backgroundColor: '#111',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  customSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  adminBtn: {
    marginTop: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED',
  },
  adminText: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '700',
  },
});
