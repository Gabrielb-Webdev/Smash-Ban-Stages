// v1.1.0
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, StatusBar,
  ActivityIndicator, Image, Modal, Pressable, BackHandler, Linking, ScrollView, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';

// Configurar cómo mostrar notificaciones en foreground (DEBE estar en nivel de módulo)
Notifications.setNotificationHandler({
  handleNotification: async function () {
    return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true };
  },
});

var BASE_URL = 'https://smash-ban-stages.vercel.app';
var CLIENT_ID = '435';
var REDIRECT_URI = BASE_URL + '/auth/callback';
var CURRENT_VERSION = '1.2.0';
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
  var [downloadProgress, setDownloadProgress] = useState(null);
  var [downloadError, setDownloadError] = useState(null);
  var [webUrl, setWebUrl] = useState(null);
  var [webKey, setWebKey] = useState(0);
  var [showBell, setShowBell] = useState(false);
  var webViewRef = useRef(null);
  var downloadRef = useRef(null);

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

  // Registrar push notifications cuando el usuario se loguea
  useEffect(function () {
    if (!user || !user.id) return;

    // Listener para cuando el usuario toca una notificación (app en background/cerrada)
    var responseSub = Notifications.addNotificationResponseReceivedListener(function (response) {
      try {
        var data = response.notification.request.content.data;
        var url = data && data.url ? data.url : '/home';
        setWebUrl(BASE_URL + url);
        setWebKey(function (k) { return k + 1; });
      } catch (e) {}
    });

    (async function () {
      try {
        // En Android el canal DEBE crearse ANTES de pedir permisos
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'AFK Smash',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF8C00',
            sound: 'default',
          });
        }
        // Pedir permiso
        var perm = await Notifications.requestPermissionsAsync();
        if (perm.status !== 'granted') return;
        // Obtener Expo push token
        var tokenData = await Notifications.getExpoPushTokenAsync({ projectId: '1cc82cc6-5c6c-437d-aa76-3a3d79eda94e' });
        var expoPushToken = tokenData.data;
        if (!expoPushToken) return;
        // Registrar token en el servidor
        await fetch(BASE_URL + '/api/notifications/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: String(user.id), type: 'expo', token: expoPushToken }),
        });
      } catch (e) { /* push no disponible */ }
    })();

    return function () { responseSub.remove(); };
  }, [user?.id]);

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
    setDownloadProgress(0);
    setDownloadError(null);
    var localUri = FileSystem.cacheDirectory + 'afk-smash-update.apk';
    var dl = FileSystem.createDownloadResumable(
      updateInfo.downloadUrl,
      localUri,
      {},
      function (progress) {
        var pct = progress.totalBytesExpectedToWrite > 0
          ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite : 0;
        setDownloadProgress(pct);
      }
    );
    downloadRef.current = dl;
    dl.downloadAsync()
      .then(function (result) {
        setDownloadProgress(null);
        downloadRef.current = null;
        return FileSystem.getContentUriAsync(result.uri);
      })
      .then(function (contentUri) {
        return IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
          type: 'application/vnd.android.package-archive',
        });
      })
      .catch(function () {
        setDownloadProgress(null);
        downloadRef.current = null;
        setDownloadError('No se pudo descargar. Intentá de nuevo.');
      });
  }

  // ── Carga inicial ──────────────────────────────────────────
  if (sessionLoading) {
    return (
      <View style={[styles.full, styles.center]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Text style={styles.loadingTitle}>AFK Smash</Text>
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
              {user.slug && <Text style={styles.dropdownRole}>@{user.slug}</Text>}
            </View>
          </View>
          <View style={styles.dropdownDivider} />
          {isAdmin && (
            <TouchableOpacity style={styles.dropdownItem} onPress={function () { navigateTo(ADMIN_HOME); }}>
              <Text style={styles.dropdownItemIcon}>🎮</Text>
              <Text style={styles.dropdownItemText}>Panel Admin</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.dropdownItem} onPress={function () { navigateTo(BASE_URL + '/home'); }}>
            <Text style={styles.dropdownItemIcon}>🏠</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownItemText}>Home</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dropdownItem} onPress={function () { navigateTo(BASE_URL + '/profile'); }}>
            <Text style={styles.dropdownItemIcon}>🎮</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownItemText}>Mi perfil</Text>
              <Text style={styles.dropdownItemSub}>Start.GG</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={function () { setDropdownOpen(false); setShowSettings(true); }}
          >
            <Text style={styles.dropdownItemIcon}>⚙️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownItemText}>Configuración</Text>
              <Text style={styles.dropdownItemSub}>Preferencias</Text>
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
                  {downloadProgress !== null ? (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: Math.round(downloadProgress * 100) + '%' }]} />
                      </View>
                      <Text style={styles.progressText}>Descargando... {Math.round(downloadProgress * 100)}%</Text>
                    </View>
                  ) : (
                    <>
                      {downloadError ? <Text style={styles.downloadError}>{downloadError}</Text> : null}
                      <TouchableOpacity style={styles.settingsUpdateBtn} onPress={downloadAndInstall}>
                        <Text style={styles.settingsUpdateBtnText}>⬇ Actualizar ahora</Text>
                      </TouchableOpacity>
                    </>
                  )}
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

  // Botón de perfil flotante (sobre WebViews)
  var FloatingProfileBtn = (
    <View style={[styles.floatingHeader, { top: SB + 8 }]}>
      {/* Campana */}
      <TouchableOpacity
        style={styles.floatingBellBtn}
        onPress={function () {
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript("var b=document.getElementById('app-bell-btn');if(b)b.click();true;");
          }
        }}
      >
        <Text style={{ fontSize: 18 }}>🔔</Text>
      </TouchableOpacity>
      {/* Perfil */}
      <TouchableOpacity
        style={styles.floatingProfileBtn}
        onPress={function () { setDropdownOpen(true); }}
      >
        {user.avatar
          ? <Image source={{ uri: user.avatar }} style={styles.avatar} />
          : <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{user.name ? user.name[0].toUpperCase() : '?'}</Text>
            </View>
        }
        {updateInfo && <View style={styles.profileUpdateDot} />}
        <Text style={styles.chevron}>▾</Text>
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
    "var s=document.createElement('style');s.innerHTML='#app-profile-header{display:none!important}#app-bell-btn{display:none!important}';document.head.appendChild(s);",
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
      {FloatingProfileBtn}
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
  floatingHeader: {
    position: 'absolute', right: 12, zIndex: 100, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  floatingBellBtn: {
    backgroundColor: 'rgba(17,17,17,0.85)', borderRadius: 20,
    paddingVertical: 7, paddingHorizontal: 10,
    borderWidth: 1, borderColor: 'rgba(80,80,80,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  // Floating profile button (over WebView)
  floatingProfileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(17,17,17,0.85)', borderRadius: 20,
    paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderColor: 'rgba(80,80,80,0.6)',
  },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#fff', fontSize: 13, fontWeight: '700' },
  chevron: { color: '#aaa', fontSize: 11 },
  profileUpdateDot: {
    position: 'absolute', top: 2, right: 24,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#E88E00',
  },
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
