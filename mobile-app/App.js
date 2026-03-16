// v1.0.4
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, StatusBar, Linking, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

var BASE_URL = 'https://smash-ban-stages.vercel.app';
var CLIENT_ID = '435';
var REDIRECT_URI = 'afk-smash://auth';

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
  var [user, setUser] = useState(null);
  var [authLoading, setAuthLoading] = useState(false);
  var [authError, setAuthError] = useState(null);

  useEffect(function () {
    function handleUrl(event) {
      handleDeepLink(event.url);
    }
    var subscription = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(function (initialUrl) {
      if (initialUrl) handleDeepLink(initialUrl);
    });
    return function () { subscription.remove(); };
  }, []);

  function handleDeepLink(linkUrl) {
    if (!linkUrl || !linkUrl.startsWith('afk-smash://auth')) return;
    var match = linkUrl.match(/[?&]code=([^&]+)/);
    if (!match) return;
    exchangeCode(match[1]);
  }

  function handleStartGGLogin() {
    setAuthError(null);
    var params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: 'user.identity',
    });
    Linking.openURL('https://start.gg/oauth/authorize?' + params.toString());
  }

  function exchangeCode(code) {
    setAuthLoading(true);
    setAuthError(null);
    fetch(BASE_URL + '/api/auth/startgg/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, redirectUri: REDIRECT_URI }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        setAuthLoading(false);
        if (data.error) { setAuthError('Error al autenticar'); return; }
        if (!data.isAdmin) { setAuthError('Tu cuenta no tiene permisos de administrador'); return; }
        setUser(data.user);
      })
      .catch(function () {
        setAuthLoading(false);
        setAuthError('No se pudo conectar al servidor');
      });
  }

  if (url) {
    return (
      <View style={styles.full}>
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />
        <View style={styles.bar}>
          <TouchableOpacity onPress={function () { setUrl(null); }} style={styles.backBtn}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
          {user && <Text style={styles.barUser}>{user.name}</Text>}
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

  if (!user) {
    return (
      <View style={styles.full}>
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />
        <View style={styles.loginScreen}>
          <Text style={styles.title}>AFK Smash</Text>
          <Text style={styles.sub}>PANEL DE ADMINISTRACIÓN</Text>
          {authLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#E88E00" size="large" />
              <Text style={styles.loadingText}>Autenticando...</Text>
            </View>
          ) : (
            <>
              {authError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.loginBtn} onPress={handleStartGGLogin}>
                <Text style={styles.loginBtnText}>Ingresar con Start.gg</Text>
              </TouchableOpacity>
              <Text style={styles.loginHint}>
                Solo cuentas autorizadas pueden acceder al panel.
              </Text>
            </>
          )}
        </View>
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
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={function () { setUser(null); }}
        >
          <Text style={styles.logoutText}>Cerrar sesión ({user.name})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

var styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#0a0a0a' },
  bar: {
    backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 40,
    borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: { color: '#E88E00', fontSize: 15, fontWeight: '700' },
  barUser: { color: '#888', fontSize: 12 },
  webview: { flex: 1, backgroundColor: '#0a0a0a' },
  loginScreen: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  loadingBox: { alignItems: 'center', marginTop: 32 },
  loadingText: { color: '#888', marginTop: 12, fontSize: 14 },
  errorBox: {
    backgroundColor: '#2a0a0a', borderRadius: 10, borderWidth: 1,
    borderColor: '#7f1d1d', padding: 14, marginBottom: 16, width: '100%',
  },
  errorText: { color: '#fca5a5', fontSize: 13, textAlign: 'center' },
  loginBtn: {
    backgroundColor: '#E88E00', borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 32, alignItems: 'center', width: '100%', marginTop: 8,
  },
  loginBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  loginHint: { color: '#444', fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  selector: { flex: 1, paddingHorizontal: 16, paddingTop: 48, paddingBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 11, fontWeight: '700', color: '#E88E00', textAlign: 'center', letterSpacing: 4, marginBottom: 28 },
  btn: {
    backgroundColor: '#111', borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 20, marginBottom: 10, borderWidth: 2, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  customRow: { marginTop: 8, marginBottom: 8 },
  input: {
    backgroundColor: '#1a1a1a', borderRadius: 10, paddingVertical: 12,
    paddingHorizontal: 14, color: '#fff', fontSize: 14,
    borderWidth: 1, borderColor: '#333', marginBottom: 10,
  },
  adminBtn: {
    marginTop: 16, backgroundColor: '#1a1a2e', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#7C3AED',
  },
  adminText: { color: '#a78bfa', fontSize: 14, fontWeight: '700' },
  logoutBtn: { marginTop: 10, paddingVertical: 10, alignItems: 'center' },
  logoutText: { color: '#444', fontSize: 12 },
});
