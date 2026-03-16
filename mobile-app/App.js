// v1.0.7
import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, Image, Modal, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';

var BASE_URL = 'https://smash-ban-stages.vercel.app';
var CLIENT_ID = '435';
var REDIRECT_URI = BASE_URL + '/auth/callback';

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
  var [showOAuth, setShowOAuth] = useState(false);
  var [dropdownOpen, setDropdownOpen] = useState(false);

  function getOAuthUrl() {
    var params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: 'user.identity',
    });
    return 'https://start.gg/oauth/authorize?' + params.toString();
  }

  function handleOAuthNavigation(navState) {
    var navUrl = navState.url || '';
    if (!navUrl.startsWith(REDIRECT_URI)) return true;

    var match = navUrl.match(/[?&]code=([^&]+)/);
    if (!match) {
      setShowOAuth(false);
      setAuthError('Error al autenticar con Start.gg');
      return false;
    }
    setShowOAuth(false);
    exchangeCode(match[1]);
    return false;
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

  // WebView OAuth (Start.gg login en pantalla completa dentro de la app)
  if (showOAuth) {
    return (
      <View style={styles.full}>
        <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />
        <View style={styles.bar}>
          <TouchableOpacity onPress={function () { setShowOAuth(false); }} style={styles.backBtn}>
            <Text style={styles.backText}>← Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.barUser}>Iniciando sesión...</Text>
        </View>
        <WebView
          style={styles.webview}
          source={{ uri: getOAuthUrl() }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onShouldStartLoadWithRequest={handleOAuthNavigation}
          onNavigationStateChange={function (navState) {
            handleOAuthNavigation(navState);
          }}
        />
      </View>
    );
  }

  // WebView de tablet/admin
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

  // Pantalla de login
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
              <TouchableOpacity style={styles.loginBtn} onPress={function () { setShowOAuth(true); }}>
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

  // Selector de setups
  return (
    <View style={styles.full}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />

      {/* Header con perfil */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AFK Smash</Text>
        <TouchableOpacity style={styles.profileBtn} onPress={function () { setDropdownOpen(true); }}>
          {user.avatar
            ? <Image source={{ uri: user.avatar }} style={styles.avatar} />
            : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{user.name ? user.name[0].toUpperCase() : '?'}</Text></View>
          }
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* Dropdown modal */}
      <Modal transparent visible={dropdownOpen} animationType="fade" onRequestClose={function () { setDropdownOpen(false); }}>
        <Pressable style={styles.modalOverlay} onPress={function () { setDropdownOpen(false); }}>
          <View style={styles.dropdown}>
            <View style={styles.dropdownUser}>
              {user.avatar
                ? <Image source={{ uri: user.avatar }} style={styles.dropdownAvatar} />
                : <View style={[styles.dropdownAvatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{user.name ? user.name[0].toUpperCase() : '?'}</Text></View>
              }
              <Text style={styles.dropdownName}>{user.name}</Text>
            </View>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity style={styles.dropdownItem} onPress={function () { setDropdownOpen(false); setUrl(BASE_URL + '/admin/afk-multi'); }}>
              <Text style={styles.dropdownItemIcon}>🎮</Text>
              <Text style={styles.dropdownItemText}>Panel Admin</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dropdownItem} onPress={function () { setDropdownOpen(false); setUrl(BASE_URL + '/home'); }}>
              <Text style={styles.dropdownItemIcon}>🏠</Text>
              <Text style={styles.dropdownItemText}>Home</Text>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity style={styles.dropdownItem} onPress={function () { setDropdownOpen(false); setUser(null); }}>
              <Text style={styles.dropdownItemIcon}>🚪</Text>
              <Text style={[styles.dropdownItemText, styles.dropdownLogout]}>Salir</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <View style={styles.selector}>
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
      </View>
    </View>
  );
}

var styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#0a0a0a' },
  // Barra OAuth / WebView
  bar: {
    backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 40,
    borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: { color: '#E88E00', fontSize: 15, fontWeight: '700' },
  barUser: { color: '#888', fontSize: 12 },
  webview: { flex: 1, backgroundColor: '#0a0a0a' },
  // Login
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
  // Header selector
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  profileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#333' },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 13, fontWeight: '700' },
  chevron: { color: '#888', fontSize: 11 },
  // Dropdown modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'flex-end', paddingTop: 90, paddingRight: 12 },
  dropdown: { backgroundColor: '#161616', borderRadius: 14, borderWidth: 1, borderColor: '#2a2a2a', width: 200, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
  dropdownUser: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  dropdownAvatar: { width: 32, height: 32, borderRadius: 16 },
  dropdownName: { color: '#ccc', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  dropdownDivider: { height: 1, backgroundColor: '#222' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 10 },
  dropdownItemIcon: { fontSize: 16 },
  dropdownItemText: { color: '#d1d5db', fontSize: 14 },
  dropdownLogout: { color: '#f87171' },
  // Selector
  selector: { flex: 1, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 11, fontWeight: '700', color: '#E88E00', textAlign: 'center', letterSpacing: 4, marginBottom: 20 },
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
});
