// v2.0.0 — La app sin H
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, StatusBar,
  ActivityIndicator, Image, Modal, Pressable, BackHandler, Linking, ScrollView, Platform, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

var BASE_URL = 'https://smash-ban-stages.vercel.app';
var CLIENT_ID = '435';
var REDIRECT_URI = BASE_URL + '/auth/callback';
var CURRENT_VERSION = '2.0.0';
var SESSION_KEY = 'afk_session_v2';
var ADMIN_HOME = BASE_URL + '/';
var SB = StatusBar.currentHeight || 24;

export default function App() {
  var [sessionLoading, setSessionLoading] = useState(true);
  var [user, setUser] = useState(null);
  var [isAdmin, setIsAdmin] = useState(false);
  var [authLoading, setAuthLoading] = useState(false);
  var [authError, setAuthError] = useState(null);
  var [showOAuth, setShowOAuth] = useState(false);
  var [dropdownOpen, setDropdownOpen] = useState(false);
  var [showSettings, setShowSettings] = useState(false);
  var [updateInfo, setUpdateInfo] = useState(null);
  var [checkingUpdate, setCheckingUpdate] = useState(false);
  var [webUrl, setWebUrl] = useState(null);
  var [webKey, setWebKey] = useState(0);
  var [showBell, setShowBell] = useState(false);
  var webViewRef = useRef(null);

  // Restaurar sesión al iniciar
  useEffect(function () {
    AsyncStorage.getItem(SESSION_KEY)
      .then(function (stored) {
        if (stored) {
          try {
            var session = JSON.parse(stored);
            if (session && session.user) {
              setUser(session.user);
              setIsAdmin(!!session.isAdmin);
              if (session.isAdmin) {
                setWebUrl(ADMIN_HOME);
              } else {
                setWebUrl(BASE_URL + '/home');
              }
            }
          } catch (e) {}
        }
        setSessionLoading(false);
      })
      .catch(function () { setSessionLoading(false); });
    checkForUpdate();
  }, []);

  // Registrar Service Worker en WebView (para web push via navegador)
  // No se necesita librería nativa: el ChomeWebView de Android soporta service workers
  // y web push nativo. Las notificaciones se manejan directo desde la web.

  // Botón atrás Android
  useEffect(function () {
    function onBack() {
      if (showSettings) { setShowSettings(false); return true; }
      if (dropdownOpen) { setDropdownOpen(false); return true; }
      if (showOAuth) { setShowOAuth(false); return true; }
      if (webViewRef.current) { webViewRef.current.goBack(); return true; }
      return false;
    }
    var sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return function () { sub.remove(); };
  }, [showSettings, dropdownOpen, showOAuth, webUrl, isAdmin]);

  function checkForUpdate() {
    fetch(BASE_URL + '/api/app-version')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.latestVersion && data.latestVersion !== CURRENT_VERSION) setUpdateInfo(data);
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
    if (!match) { setShowOAuth(false); setAuthError('Error al autenticar'); return false; }
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
        if (data.isAdmin) {
          setWebUrl(ADMIN_HOME);
        } else {
          setWebUrl(BASE_URL + '/home');
        }
        setWebKey(function (k) { return k + 1; });
      })
      .catch(function () {
        setAuthLoading(false);
        setAuthError('No se pudo conectar al servidor');
      });
  }

  function handleLogout() {
    AsyncStorage.removeItem(SESSION_KEY).catch(function () {});
    setUser(null); setIsAdmin(false);
    setDropdownOpen(false); setWebUrl(null); setShowSettings(false);
  }

  function navigateTo(newUrl) {
    setDropdownOpen(false);
    setWebUrl(newUrl);
    setWebKey(function (k) { return k + 1; });
  }

  function downloadAndInstall() {
    if (!updateInfo || !updateInfo.downloadUrl) return;
    // Abrir en el navegador para que el SO maneje la descarga e instalación del APK
    Linking.openURL(updateInfo.downloadUrl).catch(function () {
      Alert.alert('Error', 'No se pudo abrir el link de descarga.');
    });
  }

  // ── Carga inicial ──────────────────────────────────────────
  if (sessionLoading) {
    return (
      <View style={[styles.full, styles.center]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Text style={styles.loadingTitle}>La app sin H</Text>
        <ActivityIndicator color="#E88E00" size="large" style={{ marginTop: 24 }} />
      </View>
    );
  }

  // ── OAuth WebView ──────────────────────────────────────────
  if (showOAuth) {
    return (
      <View style={styles.full}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <View style={[styles.oauthBar, { paddingTop: SB + 12 }]}>
          <TouchableOpacity onPress={function () { setShowOAuth(false); }}>
            <Text style={styles.backText}>← Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.barLabel}>Iniciando sesión...</Text>
        </View>
        <WebView
          key="oauth"
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

  // ── Login ──────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[styles.full, styles.center]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={styles.loginScreen}>
          <Text style={styles.title}>La app sin H</Text>
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
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={function () { setAuthError(null); setShowOAuth(true); }}
              >
                <Text style={styles.loginBtnText}>Ingresar con Start.gg</Text>
              </TouchableOpacity>
              <Text style={styles.loginHint}>Iniciá sesión para acceder. Solo se pide una vez.</Text>
            </>
          )}
        </View>
      </View>
    );
  }

  // ── Shared UI (dropdown + settings + floating button) ─────

  var DropdownModal = (
    <Modal
      transparent
      visible={dropdownOpen}
      animationType="fade"
      onRequestClose={function () { setDropdownOpen(false); }}
    >
      <Pressable style={styles.modalOverlay} onPress={function () { setDropdownOpen(false); }}>
        <View style={[styles.dropdown, { top: SB + 60 }]}>
          <View style={styles.dropdownUser}>
            {user.avatar
              ? <Image source={{ uri: user.avatar }} style={styles.dropdownAvatar} />
              : <View style={[styles.dropdownAvatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{user.name ? user.name[0].toUpperCase() : '?'}</Text>
                </View>
            }
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownName}>{user.name || user.slug || 'Usuario'}</Text>
              {user.slug && <Text style={styles.dropdownRole}>@{user.slug.replace(/^user\//, '')}</Text>}
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineBadgeText}>En línea</Text>
            </View>
          </View>
          <View style={styles.dropdownDivider} />
          {isAdmin && (
            <TouchableOpacity style={styles.dropdownItem} onPress={function () { navigateTo(ADMIN_HOME); }}>
              <View style={[styles.dropdownIconBox, { backgroundColor: 'rgba(232,142,0,0.15)' }]}>
                <Text style={styles.dropdownItemIcon}>🏆</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownItemText}>Panel de Admin</Text>
                <Text style={styles.dropdownItemSub}>Gestionar torneos y setups</Text>
              </View>
              <Text style={styles.dropdownChevron}>›</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.dropdownItem} onPress={function () { navigateTo(BASE_URL + '/friends'); }}>
            <View style={[styles.dropdownIconBox, { backgroundColor: 'rgba(124,58,237,0.15)' }]}>
              <Text style={styles.dropdownItemIcon}>👥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownItemText}>Amigos</Text>
              <Text style={styles.dropdownItemSub}>Ver y agregar amigos</Text>
            </View>
            <Text style={styles.dropdownChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={function () { setDropdownOpen(false); setShowSettings(true); }}
          >
            <View style={[styles.dropdownIconBox, { backgroundColor: 'rgba(107,114,128,0.15)' }]}>
              <Text style={styles.dropdownItemIcon}>⚙️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownItemText}>Configuración</Text>
              <Text style={styles.dropdownItemSub}>Preferencias y actualizaciones</Text>
            </View>
            {updateInfo && <View style={styles.updateDot} />}
          </TouchableOpacity>
          <View style={styles.dropdownDivider} />
          <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
            <Text style={styles.dropdownItemIcon}>🚪</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dropdownItemText, { color: '#f87171' }]}>Cerrar sesión</Text>
              <Text style={[styles.dropdownItemSub, { color: 'rgba(239,68,68,0.6)' }]}>Salir de la cuenta</Text>
            </View>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  var SettingsModal = (
    <Modal
      transparent
      visible={showSettings}
      animationType="slide"
      onRequestClose={function () { setShowSettings(false); }}
    >
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
                  : <View style={[styles.settingsAvatar, styles.avatarFallback]}>
                      <Text style={[styles.avatarInitial, { fontSize: 20 }]}>{user.name ? user.name[0].toUpperCase() : '?'}</Text>
                    </View>
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
                    <Text style={styles.updateBannerText}>🆕 Nueva versión: v{updateInfo.latestVersion}</Text>
                  </View>
                  <TouchableOpacity style={styles.settingsUpdateBtn} onPress={downloadAndInstall}>
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
                      if (data.latestVersion && data.latestVersion !== CURRENT_VERSION) setUpdateInfo(data);
                      else setUpdateInfo(null);
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

  // Header nativo (imita el diseño del header web)
  var NativeHeader = (
    <View style={styles.nativeAppHeader}>
      {/* Izquierda: Avatar del usuario */}
      <TouchableOpacity
        style={styles.headerLeft}
        onPress={function () { setDropdownOpen(true); }}
        activeOpacity={0.75}
      >
        <View style={styles.headerAvatarWrap}>
          {user.avatar
            ? <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
            : <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                <Text style={styles.avatarInitial}>{user.name ? user.name[0].toUpperCase() : '?'}</Text>
              </View>
          }
          {updateInfo && <View style={styles.headerUpdateDot} />}
        </View>
      </TouchableOpacity>

      {/* Centro: Logo */}
      <View style={styles.headerCenter}>
        <View style={styles.headerLogoBox}>
          <Text style={{ fontSize: 16 }}>🎮</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={styles.headerLogoAfk}>LA APP</Text>
          <Text style={styles.headerLogoSmash}> SIN H</Text>
        </View>
      </View>

      {/* Derecha: Campana */}
      <TouchableOpacity
        style={styles.headerRight}
        activeOpacity={0.7}
        onPress={function () {
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript("var b=document.getElementById('app-bell-btn');if(b)b.click();true;");
          }
        }}
      >
        <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)' }}>🔔</Text>
      </TouchableOpacity>
    </View>
  );

  // Inyectar sesión en localStorage del WebView para que la web reconozca al usuario
  var sessionPayload = JSON.stringify({ user: user, isAdmin: isAdmin });

  // Se inyecta ANTES de que cargue el JS de la página para que home.js
  // encuentre la sesión en localStorage inmediatamente al montar
  var injectedBeforeLoad = "try{localStorage.setItem('afk_user'," + JSON.stringify(sessionPayload) + ");}catch(e){}true;";

  // Después de cargar: ocultar controles duplicados del header web
  var injectedAfterLoad = [
    "try{localStorage.setItem('afk_user'," + JSON.stringify(sessionPayload) + ");}catch(e){}",
    "var s=document.createElement('style');s.innerHTML='#app-top-header{display:none!important}#app-profile-header{display:none!important}#app-bell-btn{display:none!important}';document.head.appendChild(s);",
    "true;",
  ].join('');

  // ── WebView para todos los usuarios autenticados ────────
  return (
    <View style={styles.full}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {DropdownModal}
      {SettingsModal}
      {/* Spacer sólido del alto de la barra de estado */}
      <View style={{ height: SB, backgroundColor: '#0a0a0a' }} />
      {NativeHeader}
      <WebView
        key={webKey}
        ref={webViewRef}
        style={styles.webview}
        source={{ uri: webUrl || (BASE_URL + '/home') }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
        injectedJavaScript={injectedAfterLoad}
        onNavigationStateChange={function (ns) {
          // Evitar que navegue al login de la web (la app maneja auth)
          if (ns.url && ns.url.includes('/login')) {
            webViewRef.current && webViewRef.current.injectJavaScript(
              "try{localStorage.setItem('afk_user'," + JSON.stringify(sessionPayload) + ");}catch(e){}" +
              "window.location.replace('" + BASE_URL + "/home');true;"
            );
          }
        }}
      />
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
    backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backText: { color: '#E88E00', fontSize: 15, fontWeight: '700' },
  barLabel: { color: '#666', fontSize: 12 },
  // Login
  loginScreen: { width: '100%', paddingHorizontal: 24, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
  sub: { fontSize: 11, fontWeight: '700', color: '#E88E00', textAlign: 'center', letterSpacing: 4, marginBottom: 28 },
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
  // Native header (no-admin home)
  nativeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a1a1a',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  headerProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#111', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#333',
  },
  // Header nativo (replica el diseño del header web)
  nativeAppHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#0a0a12',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flex: 1, alignItems: 'flex-end', padding: 5 },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(232,142,0,0.35)' },
  headerAvatarFallback: {
    backgroundColor: 'rgba(232,142,0,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  headerUpdateDot: {
    position: 'absolute', top: -2, right: -2,
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#E88E00',
    borderWidth: 2, borderColor: '#0a0a0a',
  },
  headerLogoBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#FF8C00', alignItems: 'center', justifyContent: 'center',
  },
  headerLogoAfk: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  headerLogoSmash: { fontSize: 16, fontWeight: '300', color: 'rgba(232,142,0,0.7)', letterSpacing: 1.5 },
  // Shared (usado en dropdown y settings)
  avatarFallback: { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 13, fontWeight: '700' },
  // Dropdown
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  dropdown: {
    position: 'absolute', right: 12,
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
  dropdownItemSub: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 1 },
  updateDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E88E00' },
  // Settings
  settingsOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  settingsSheet: { backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 32 },
  settingsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f1f1f',
  },
  settingsTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  settingsClose: { fontSize: 17, color: '#666', padding: 4 },
  settingsSectionTitle: {
    fontSize: 10, fontWeight: '700', color: '#4b5563',
    letterSpacing: 2, marginTop: 20, marginBottom: 8, paddingHorizontal: 20,
  },
  settingsCard: {
    backgroundColor: '#161616', marginHorizontal: 16,
    borderRadius: 12, borderWidth: 1, borderColor: '#222', overflow: 'hidden',
  },
  settingsUserRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  settingsAvatar: { width: 48, height: 48, borderRadius: 24 },
  settingsUserName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  settingsUserRole: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  settingsRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#1f1f1f',
  },
  settingsRowLabel: { color: '#9ca3af', fontSize: 14 },
  settingsRowValue: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
  settingsLinkBtn: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1f1f1f' },
  settingsLinkText: { color: '#E88E00', fontSize: 14 },
  updateBanner: { backgroundColor: '#1f1200', marginHorizontal: 14, marginTop: 8, borderRadius: 8, padding: 10 },
  updateBannerText: { color: '#fbbf24', fontSize: 13, textAlign: 'center' },
  settingsUpdateBtn: {
    backgroundColor: '#E88E00', marginHorizontal: 14, marginTop: 8,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  settingsUpdateBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  progressContainer: { padding: 14, gap: 8 },
  progressBar: { height: 6, backgroundColor: '#2a2a2a', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#E88E00', borderRadius: 3 },
  progressText: { color: '#9ca3af', fontSize: 12, textAlign: 'center' },
  downloadError: { color: '#f87171', fontSize: 12, textAlign: 'center', paddingHorizontal: 14, paddingTop: 8 },
  // Online badge
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)', borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 4 },
  onlineBadgeText: { fontSize: 10, fontWeight: '700', color: '#22C55E' },
  // Dropdown icon box
  dropdownIconBox: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  dropdownChevron: { fontSize: 20, color: 'rgba(255,255,255,0.25)', marginLeft: 4 },
  settingsLogoutBtn: {
    marginHorizontal: 16, marginTop: 16, backgroundColor: '#1a0a0a',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#3f1111',
  },
  settingsLogoutText: { color: '#f87171', fontSize: 15, fontWeight: '600' },
  // Home no-admin
  homeContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  homeComingSoon: { color: '#6b7280', fontSize: 14, marginTop: 8 },
});
