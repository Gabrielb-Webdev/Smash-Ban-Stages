// v1.0.8
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, TextInput, StatusBar,
  ActivityIndicator, Image, Modal, Pressable, BackHandler, Linking, ScrollView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

var BASE_URL = 'https://smash-ban-stages.vercel.app';
var CLIENT_ID = '435';
var REDIRECT_URI = BASE_URL + '/auth/callback';
var CURRENT_VERSION = '1.0.8';
var SESSION_KEY = 'afk_session_v2';

var SETUPS = [
  { id: 'afk-setup1', label: 'Setup 1', color: '#7C3AED' },
  { id: 'afk-setup2', label: 'Setup 2', color: '#2563EB' },
  { id: 'afk-setup3', label: 'Setup 3', color: '#059669' },
  { id: 'afk-setup4', label: 'Setup 4', color: '#D97706' },
  { id: 'afk-setup5', label: 'Setup 5', color: '#DB2777' },
];

export default function App() {
  var [sessionLoading, setSessionLoading] = useState(true);
  var [url, setUrl] = useState(null);
  var [customId, setCustomId] = useState('');
  var [user, setUser] = useState(null);
  var [isAdmin, setIsAdmin] = useState(false);
  var [authLoading, setAuthLoading] = useState(false);
  var [authError, setAuthError] = useState(null);
  var [showOAuth, setShowOAuth] = useState(false);
  var [dropdownOpen, setDropdownOpen] = useState(false);
  var [showSettings, setShowSettings] = useState(false);
  var [updateInfo, setUpdateInfo] = useState(null);
  var [checkingUpdate, setCheckingUpdate] = useState(false);

  // Restaurar sesión guardada al iniciar
  useEffect(function () {
    AsyncStorage.getItem(SESSION_KEY)
      .then(function (stored) {
        if (stored) {
          var session = JSON.parse(stored);
          if (session && session.user) {
            setUser(session.user);
            setIsAdmin(!!session.isAdmin);
          }
        }
        setSessionLoading(false);
      })
      .catch(function () {
        setSessionLoading(false);
      });
    checkForUpdate();
  }, []);

  // Botón atrás de Android
  useEffect(function () {
    function onBack() {
      if (showSettings) { setShowSettings(false); return true; }
      if (dropdownOpen) { setDropdownOpen(false); return true; }
      if (url) { setUrl(null); return true; }
      if (showOAuth) { setShowOAuth(false); return true; }
      return false;
    }
    var sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return function () { sub.remove(); };
  }, [url, showOAuth, dropdownOpen, showSettings]);

  function checkForUpdate() {
    fetch(BASE_URL + '/api/app-version')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.latestVersion && data.latestVersion !== CURRENT_VERSION) {
          setUpdateInfo(data);
        }
      })
      .catch(function () {});
  }

  function saveSession(session) {
    AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session)).catch(function () {});
  }

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
        var session = { user: data.user, isAdmin: !!data.isAdmin };
        saveSession(session);
        setUser(data.user);
        setIsAdmin(!!data.isAdmin);
      })
      .catch(function () {
        setAuthLoading(false);
        setAuthError('No se pudo conectar al servidor');
      });
  }

  function handleLogout() {
    AsyncStorage.removeItem(SESSION_KEY).catch(function () {});
    setUser(null);
    setIsAdmin(false);
    setDropdownOpen(false);
    setUrl(null);
    setShowSettings(false);
  }

  // ── Carga inicial ──────────────────────────────────────────
  if (sessionLoading) {
    return (
      <View style={[styles.full, styles.center]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <Text style={styles.loadingTitle}>AFK Smash</Text>
        <ActivityIndicator color="#E88E00" size="large" style={{ marginTop: 24 }} />
      </View>
    );
  }

  // ── OAuth WebView ──────────────────────────────────────────
  if (showOAuth) {
    return (
      <View style={styles.full}>
        <StatusBar barStyle="light-content" backgroundColor="#111" />
        <View style={styles.oauthBar}>
          <TouchableOpacity onPress={function () { setShowOAuth(false); }} style={styles.backBtn}>
            <Text style={styles.backText}>← Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.barLabel}>Iniciando sesión...</Text>
        </View>
        <WebView
          style={styles.webview}
          source={{ uri: getOAuthUrl() }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onShouldStartLoadWithRequest={handleOAuthNavigation}
          onNavigationStateChange={function (ns) { handleOAuthNavigation(ns); }}
        />
      </View>
    );
  }

  // ── WebView de contenido (sin barra — usar botón atrás de Android) ──
  if (url) {
    return (
      <View style={styles.full}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <WebView
          style={styles.webview}
          source={{ uri: url }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    );
  }

  // ── Login ──────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={styles.full}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loginScreen}>
          <Text style={styles.title}>AFK Smash</Text>
          <Text style={styles.sub}>BIENVENIDO</Text>
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
              <TouchableOpacity style={styles.loginBtn} onPress={function () { setAuthError(null); setShowOAuth(true); }}>
                <Text style={styles.loginBtnText}>Ingresar con Start.gg</Text>
              </TouchableOpacity>
              <Text style={styles.loginHint}>Iniciá sesión para acceder. Solo se pide una vez.</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  // ── Componentes compartidos tras login ─────────────────────

  var dropdownModal = (
    <Modal transparent visible={dropdownOpen} animationType="fade" onRequestClose={function () { setDropdownOpen(false); }}>
      <Pressable style={styles.modalOverlay} onPress={function () { setDropdownOpen(false); }}>
        <View style={styles.dropdown}>
          <View style={styles.dropdownUser}>
            {user.avatar
              ? <Image source={{ uri: user.avatar }} style={styles.dropdownAvatar} />
              : <View style={[styles.dropdownAvatar, styles.avatarFallback]}><Text style={styles.avatarInitial}>{user.name ? user.name[0].toUpperCase() : '?'}</Text></View>
            }
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownName}>{user.name}</Text>
              <Text style={styles.dropdownRole}>{isAdmin ? 'Administrador' : 'Usuario'}</Text>
            </View>
          </View>
          <View style={styles.dropdownDivider} />
          {isAdmin && (
            <TouchableOpacity style={styles.dropdownItem} onPress={function () { setDropdownOpen(false); setUrl(BASE_URL + '/admin/afk-multi'); }}>
              <Text style={styles.dropdownItemIcon}>🎮</Text>
              <Text style={styles.dropdownItemText}>Panel Admin</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.dropdownItem} onPress={function () { setDropdownOpen(false); setUrl(BASE_URL + '/home'); }}>
            <Text style={styles.dropdownItemIcon}>🏠</Text>
            <Text style={styles.dropdownItemText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={function () { setDropdownOpen(false); setShowSettings(true); }}>
            <Text style={styles.dropdownItemIcon}>⚙️</Text>
            <Text style={styles.dropdownItemText}>Configuración</Text>
            {updateInfo && <View style={styles.updateDot} />}
          </TouchableOpacity>
          <View style={styles.dropdownDivider} />
          <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
            <Text style={styles.dropdownItemIcon}>🚪</Text>
            <Text style={[styles.dropdownItemText, { color: '#f87171' }]}>Salir</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  var settingsModal = (
    <Modal transparent visible={showSettings} animationType="slide" onRequestClose={function () { setShowSettings(false); }}>
      <View style={styles.settingsOverlay}>
        <View style={styles.settingsSheet}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Configuración</Text>
            <TouchableOpacity onPress={function () { setShowSettings(false); }}>
              <Text style={styles.settingsClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.settingsSectionTitle}>CUENTA</Text>
            <View style={styles.settingsCard}>
              <View style={styles.settingsUserRow}>
                {user.avatar
                  ? <Image source={{ uri: user.avatar }} style={styles.settingsAvatar} />
                  : <View style={[styles.settingsAvatar, styles.avatarFallback]}><Text style={[styles.avatarInitial, { fontSize: 20 }]}>{user.name ? user.name[0].toUpperCase() : '?'}</Text></View>
                }
                <View>
                  <Text style={styles.settingsUserName}>{user.name}</Text>
                  <Text style={styles.settingsUserRole}>{isAdmin ? '⭐ Administrador' : '👤 Usuario'}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.settingsLinkBtn}
                onPress={function () { Linking.openURL('https://www.start.gg/' + (user.slug || '')); }}
              >
                <Text style={styles.settingsLinkText}>Editar perfil en Start.gg →</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.settingsSectionTitle}>APLICACIÓN</Text>
            <View style={styles.settingsCard}>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsRowLabel}>Versión instalada</Text>
                <Text style={styles.settingsRowValue}>v{CURRENT_VERSION}</Text>
              </View>
              {updateInfo ? (
                <>
                  <View style={styles.updateBanner}>
                    <Text style={styles.updateBannerText}>Nueva versión: v{updateInfo.latestVersion}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.settingsUpdateBtn}
                    onPress={function () { Linking.openURL(updateInfo.downloadUrl); }}
                  >
                    <Text style={styles.settingsUpdateBtnText}>⬇ Descargar actualización</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.settingsRow}>
                  <Text style={styles.settingsRowLabel}>Estado</Text>
                  <Text style={[styles.settingsRowValue, { color: '#4ade80' }]}>✓ Actualizada</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.settingsLinkBtn}
                onPress={function () {
                  setCheckingUpdate(true);
                  fetch(BASE_URL + '/api/app-version')
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                      setCheckingUpdate(false);
                      if (data.latestVersion && data.latestVersion !== CURRENT_VERSION) {
                        setUpdateInfo(data);
                      } else {
                        setUpdateInfo(null);
                      }
                    })
                    .catch(function () { setCheckingUpdate(false); });
                }}
              >
                <Text style={styles.settingsLinkText}>{checkingUpdate ? 'Verificando...' : 'Buscar actualizaciones'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.settingsLogoutBtn} onPress={handleLogout}>
              <Text style={styles.settingsLogoutText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  var profileHeader = (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>AFK Smash</Text>
      <TouchableOpacity style={styles.profileBtn} onPress={function () { setDropdownOpen(true); }}>
        {user.avatar
          ? <Image source={{ uri: user.avatar }} style={styles.avatar} />
          : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{user.name ? user.name[0].toUpperCase() : '?'}</Text></View>
        }
        {updateInfo && <View style={styles.headerUpdateDot} />}
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Pantalla home (no-admin) ───────────────────────────────
  if (!isAdmin) {
    return (
      <View style={styles.full}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        {dropdownModal}
        {settingsModal}
        {profileHeader}
        <View style={styles.homeContent}>
          <Text style={styles.title}>AFK Smash</Text>
          <Text style={styles.homeComingSoon}>Próximamente</Text>
        </View>
      </View>
    );
  }

  // ── Selector de setups (admin) ─────────────────────────────
  return (
    <View style={styles.full}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {dropdownModal}
      {settingsModal}
      {profileHeader}
      <ScrollView style={styles.selectorScroll} contentContainerStyle={styles.selector}>
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
      </ScrollView>
    </View>
  );
}

var styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
  webview: { flex: 1, backgroundColor: '#0a0a0a' },
  // OAuth bar
  oauthBar: {
    backgroundColor: '#111', paddingHorizontal: 16, paddingVertical: 12, paddingTop: 40,
    borderBottomWidth: 1, borderBottomColor: '#222', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {},
  backText: { color: '#E88E00', fontSize: 15, fontWeight: '700' },
  barLabel: { color: '#666', fontSize: 12 },
  // Login
  loginScreen: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 11, fontWeight: '700', color: '#E88E00', textAlign: 'center', letterSpacing: 4, marginBottom: 20 },
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
  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 48, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  profileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#111', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#333',
  },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 13, fontWeight: '700' },
  chevron: { color: '#888', fontSize: 11 },
  headerUpdateDot: { position: 'absolute', top: 4, right: 28, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E88E00' },
  // Dropdown
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'flex-end', paddingTop: 95, paddingRight: 12 },
  dropdown: {
    backgroundColor: '#161616', borderRadius: 14, borderWidth: 1, borderColor: '#2a2a2a',
    width: 210, overflow: 'hidden', elevation: 10,
  },
  dropdownUser: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  dropdownAvatar: { width: 36, height: 36, borderRadius: 18 },
  dropdownName: { color: '#e5e7eb', fontSize: 13, fontWeight: '600' },
  dropdownRole: { color: '#6b7280', fontSize: 11, marginTop: 1 },
  dropdownDivider: { height: 1, backgroundColor: '#222' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 10 },
  dropdownItemIcon: { fontSize: 16 },
  dropdownItemText: { color: '#d1d5db', fontSize: 14, flex: 1 },
  updateDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E88E00' },
  // Settings sheet
  settingsOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  settingsSheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 32 },
  settingsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f',
  },
  settingsTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  settingsClose: { fontSize: 17, color: '#666', padding: 4 },
  settingsSectionTitle: { fontSize: 10, fontWeight: '700', color: '#4b5563', letterSpacing: 2, marginTop: 20, marginBottom: 8, paddingHorizontal: 20 },
  settingsCard: { backgroundColor: '#161616', marginHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  settingsUserRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  settingsAvatar: { width: 48, height: 48, borderRadius: 24 },
  settingsUserName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  settingsUserRole: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  settingsRowLabel: { color: '#9ca3af', fontSize: 14 },
  settingsRowValue: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
  settingsLinkBtn: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  settingsLinkText: { color: '#E88E00', fontSize: 14 },
  updateBanner: { backgroundColor: '#1f1200', marginHorizontal: 14, marginTop: 8, borderRadius: 8, padding: 10 },
  updateBannerText: { color: '#fbbf24', fontSize: 13, textAlign: 'center' },
  settingsUpdateBtn: { backgroundColor: '#E88E00', marginHorizontal: 14, marginTop: 8, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  settingsUpdateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  settingsLogoutBtn: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#1a0a0a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#3f1111' },
  settingsLogoutText: { color: '#f87171', fontSize: 15, fontWeight: '600' },
  // Selector
  selectorScroll: { flex: 1 },
  selector: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  btn: { backgroundColor: '#111', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 10, borderWidth: 2, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  customRow: { marginTop: 8, marginBottom: 8 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#333', marginBottom: 10 },
  // Home no-admin
  homeContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  homeComingSoon: { color: '#6b7280', fontSize: 14, marginTop: 8 },
});
