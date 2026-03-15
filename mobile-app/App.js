import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  Linking,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';

// ─────────────────────────────────────────────────────────────
// ERROR BOUNDARY — muestra errores en pantalla en vez de cerrar
// ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />
          <Text style={{ color: '#E88E00', fontSize: 20, fontWeight: '900', marginBottom: 12 }}>Error de inicio</Text>
          <Text style={{ color: '#fff', fontSize: 13, textAlign: 'center', marginBottom: 16 }}>
            {this.state.error?.message || 'Error desconocido'}
          </Text>
          <Text style={{ color: '#555', fontSize: 11, textAlign: 'center' }}>
            {this.state.error?.stack?.slice(0, 300)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const BASE_URL = 'https://smash-ban-stages.vercel.app';
const START_GG_CLIENT_ID = '435';
const REDIRECT_URI = 'afk-smash://auth';
const AUTH_URL =
  'https://start.gg/oauth/authorize' +
  '?client_id=' + START_GG_CLIENT_ID +
  '&response_type=code' +
  '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
  '&scope=user.identity';

// ─────────────────────────────────────────────────────────────
// PANTALLA DE LOGIN
// ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);

  useEffect(() => {
    // Cuando la app se abre desde el deep link de start.gg
    Linking.getInitialURL().then((url) => {
      if (url && url.startsWith('afk-smash://')) {
        handleRedirectUrl(url);
      }
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url && url.startsWith('afk-smash://')) {
        handleRedirectUrl(url);
      }
    });

    return () => sub.remove();
  }, []);

  const handleRedirectUrl = (url) => {
    if (loadingRef.current) return;
    const match = url.match(/[?&]code=([^&#]+)/);
    const code = match ? decodeURIComponent(match[1]) : null;
    if (code) {
      loadingRef.current = true;
      setLoading(true);
      exchangeCode(code);
    }
  };

  const exchangeCode = (code) => {
    fetch(BASE_URL + '/api/auth/startgg/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code, redirectUri: REDIRECT_URI }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().catch(() => ({})).then((err) => {
            throw new Error(err.error || 'Error al intercambiar el codigo');
          });
        }
        return res.json();
      })
      .then((data) => {
        onLogin({ token: data.access_token, user: data.user || null });
      })
      .catch((e) => {
        loadingRef.current = false;
        Alert.alert('Error', e.message || 'No se pudo completar el login.');
        setLoading(false);
      });
  };

  const handleLogin = () => {
    setLoading(true);
    Linking.openURL(AUTH_URL).catch((e) => {
      Alert.alert('Error', 'No se pudo abrir el navegador: ' + e.message);
      setLoading(false);
    });
  };

  return (
    <SafeAreaView style={styles.loginSafe}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.loginContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🎮</Text>
          <Text style={styles.appTitle}>AFK Smash</Text>
          <Text style={styles.appSubtitle}>PANEL DE CONTROL</Text>
        </View>

        <View style={styles.descCard}>
          <Text style={styles.descText}>
            Iniciá sesión con tu cuenta de Start.gg para acceder al panel de control de setups.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.startggBtn, loading && styles.btnDisabled]}
          disabled={loading}
          onPress={handleLogin}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.startggBtnText}>⚡  Iniciar sesión con Start.gg</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.loginHint}>
          {loading ? 'Completá el login en el navegador y volvé aquí...' : 'Necesitás una cuenta en start.gg para continuar'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL (post-login)
// ─────────────────────────────────────────────────────────────
const SETUPS = [
  { id: 'afk-stream', label: 'Setup Stream', icon: '📡', color: '#DC2626' },
  { id: 'afk-setup1', label: 'Setup 1', icon: '🎮', color: '#7C3AED' },
  { id: 'afk-setup2', label: 'Setup 2', icon: '🎮', color: '#2563EB' },
  { id: 'afk-setup3', label: 'Setup 3', icon: '🎮', color: '#059669' },
  { id: 'afk-setup4', label: 'Setup 4', icon: '🎮', color: '#D97706' },
  { id: 'afk-setup5', label: 'Setup 5', icon: '🎮', color: '#DB2777' },
];

function MainScreen({ user, onLogout }) {
  const [customId, setCustomId] = useState('');

  const openTablet = (id) => {
    const target = (id || customId).trim();
    if (!target) return;
    Linking.openURL(BASE_URL + '/tablet/' + target);
  };

  return (
    <SafeAreaView style={styles.mainSafe}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ScrollView contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>

        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            {user && user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>
                  {user && user.name ? user.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.userName}>{user && user.name ? user.name : 'Usuario'}</Text>
              <Text style={styles.userSlug}>
                {user && user.slug ? '@' + user.slug : 'Start.gg'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Setups AFK</Text>
        <View style={styles.setupsGrid}>
          {SETUPS.map((setup) => (
            <TouchableOpacity
              key={setup.id}
              style={[styles.setupCard, { borderColor: setup.color }]}
              onPress={() => openTablet(setup.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.setupIcon}>{setup.icon}</Text>
              <Text style={styles.setupLabel}>{setup.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Sesión personalizada</Text>
        <View style={styles.customCard}>
          <TextInput
            style={styles.input}
            value={customId}
            onChangeText={setCustomId}
            placeholder="ID de sesión (ej: cordoba)"
            placeholderTextColor="#555"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => openTablet()}
          />
          <TouchableOpacity
            style={[styles.connectBtn, !customId.trim() && styles.btnDisabled]}
            onPress={() => openTablet()}
            disabled={!customId.trim()}
          >
            <Text style={styles.connectBtnText}>Conectar →</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.adminBtn}
          onPress={() => Linking.openURL(BASE_URL + '/admin/afk-multi')}
        >
          <Text style={styles.adminBtnText}>🖥️  Abrir Panel Admin (Multi Setup)</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(null);

  return (
    <ErrorBoundary>
      {auth
        ? <MainScreen user={auth.user} onLogout={() => setAuth(null)} />
        : <LoginScreen onLogin={setAuth} />}
    </ErrorBoundary>
  );
}

// ─────────────────────────────────────────────────────────────
// ESTILOS
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loginSafe: { flex: 1, backgroundColor: '#0a0a0a' },
  loginContainer: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoEmoji: { fontSize: 64, marginBottom: 8 },
  appTitle: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  appSubtitle: { fontSize: 12, fontWeight: '700', color: '#E88E00', letterSpacing: 4, marginTop: 4 },
  descCard: {
    backgroundColor: '#ffffff0f',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ffffff15',
    width: '100%',
    marginBottom: 24,
  },
  descText: { color: '#aaa', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  startggBtn: {
    backgroundColor: '#E88E00',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    elevation: 6,
    marginBottom: 16,
  },
  startggBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  loginHint: { color: '#444', fontSize: 12, textAlign: 'center' },
  btnDisabled: { opacity: 0.4 },

  mainSafe: { flex: 1, backgroundColor: '#0a0a0a' },
  mainScroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff0a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ffffff15',
    marginBottom: 20,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#E88E00', marginRight: 12 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E88E0033',
    borderWidth: 2,
    borderColor: '#E88E00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarFallbackText: { color: '#E88E00', fontSize: 18, fontWeight: '800' },
  userName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  userSlug: { color: '#888', fontSize: 12, marginTop: 1 },
  logoutBtn: { backgroundColor: '#ffffff15', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  logoutText: { color: '#aaa', fontSize: 13, fontWeight: '600' },

  sectionTitle: {
    color: '#E88E00',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  setupsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  setupCard: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: '#ffffff08',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    margin: 4,
  },
  setupIcon: { fontSize: 26, marginBottom: 6 },
  setupLabel: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },

  customCard: {
    backgroundColor: '#ffffff08',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ffffff15',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#ffffff15',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ffffff20',
    marginBottom: 10,
  },
  connectBtn: { backgroundColor: '#E88E00', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  connectBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  adminBtn: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED55',
  },
  adminBtnText: { color: '#a78bfa', fontSize: 14, fontWeight: '700' },
});