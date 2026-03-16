// v1.0.2
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';

var BASE_URL = 'https://smash-ban-stages.vercel.app';

var SETUPS = [
  { id: 'afk-setup1', label: 'Setup 1', color: '#7C3AED' },
  { id: 'afk-setup2', label: 'Setup 2', color: '#2563EB' },
  { id: 'afk-setup3', label: 'Setup 3', color: '#059669' },
  { id: 'afk-setup4', label: 'Setup 4', color: '#D97706' },
  { id: 'afk-setup5', label: 'Setup 5', color: '#DB2777' },
];

export default function App() {
  var [url, setUrl] = useState(null);
  var [customId, setCustomId] = useState('');

  if (url) {
    return (
      <View style={styles.full}>
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />
        <View style={styles.bar}>
          <TouchableOpacity onPress={function () { setUrl(null); }} style={styles.backBtn}>
            <Text style={styles.backText}>volver</Text>
          </TouchableOpacity>
        </View>
        <WebView
          style={styles.webview}
          source={{ uri: url }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    );
  }

  return (
    <View style={styles.full}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />
      <View style={styles.selector}>
        <Text style={styles.title}>AFK Smash</Text>
        <Text style={styles.sub}>SELECCIONA TU SETUP</Text>

        {SETUPS.map(function (s) {
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.btn, { borderColor: s.color }]}
              onPress={function () { setUrl(BASE_URL + '/tablet/' + s.id); }}
            >
              <Text style={styles.btnText}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.customRow}>
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
            onPress={function () {
              var id = customId.trim();
              if (id) setUrl(BASE_URL + '/tablet/' + id);
            }}
          >
            <Text style={styles.btnText}>Conectar</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.adminBtn}
          onPress={function () { setUrl(BASE_URL + '/admin/afk-multi'); }}
        >
          <Text style={styles.adminText}>Panel Admin</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

var styles = StyleSheet.create({
  full: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  bar: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#E88E00',
    fontSize: 15,
    fontWeight: '700',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  selector: {
    flex: 1,
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
  sub: {
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
  customRow: {
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
