import React from 'react';
import { StyleSheet, Linking } from 'react-native';
import { WebView } from 'react-native-webview';

var BASE_URL = 'https://smash-ban-stages.vercel.app';

var HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { height: 100%; background: #0a0a0a; color: white; font-family: -apple-system, Arial, sans-serif; }
    body { padding: 52px 16px 32px; overflow-y: auto; }
    h1 { font-size: 28px; font-weight: 900; text-align: center; margin-bottom: 4px; }
    .sub { font-size: 11px; color: #E88E00; text-align: center; letter-spacing: 4px; margin-bottom: 28px; }
    .btn { display: block; width: 100%; background: #111; border-radius: 12px; padding: 16px; margin-bottom: 10px; color: white; font-size: 15px; font-weight: 700; border: 2px solid; cursor: pointer; text-align: center; }
    .btn:active { opacity: 0.7; }
    input { display: block; width: 100%; background: #1a1a1a; border-radius: 10px; padding: 12px 14px; color: white; font-size: 14px; border: 1px solid #333; margin-bottom: 10px; outline: none; -webkit-appearance: none; }
    input::placeholder { color: #555; }
    .admin { background: #1a1a2e !important; border-color: #7C3AED !important; color: #a78bfa; margin-top: 16px; }
  </style>
</head>
<body>
  <h1>AFK Smash</h1>
  <p class="sub">PANEL DE CONTROL</p>
  <button class="btn" style="border-color:#DC2626" onclick="go('/tablet/afk-stream')">Setup Stream</button>
  <button class="btn" style="border-color:#7C3AED" onclick="go('/tablet/afk-setup1')">Setup 1</button>
  <button class="btn" style="border-color:#2563EB" onclick="go('/tablet/afk-setup2')">Setup 2</button>
  <button class="btn" style="border-color:#059669" onclick="go('/tablet/afk-setup3')">Setup 3</button>
  <button class="btn" style="border-color:#D97706" onclick="go('/tablet/afk-setup4')">Setup 4</button>
  <button class="btn" style="border-color:#DB2777" onclick="go('/tablet/afk-setup5')">Setup 5</button>
  <div style="margin-top:8px">
    <input id="cid" placeholder="ID personalizado (ej: cordoba)" autocorrect="off" autocapitalize="none" />
    <button class="btn" style="border-color:#E88E00" onclick="connectCustom()">Conectar</button>
  </div>
  <button class="btn admin" onclick="go('/admin/afk-multi')">Panel Admin (Multi Setup)</button>
  <script>
    function go(path) {
      window.ReactNativeWebView.postMessage('${BASE_URL}' + path);
    }
    function connectCustom() {
      var id = document.getElementById('cid').value.trim();
      if (id) go('/tablet/' + id);
    }
  </script>
</body>
</html>
`;

export default function App() {
  function handleMessage(event) {
    Linking.openURL(event.nativeEvent.data);
  }

  return (
    <WebView
      style={styles.webview}
      source={{ html: HTML }}
      javaScriptEnabled={true}
      onMessage={handleMessage}
    />
  );
}

var styles = StyleSheet.create({
  webview: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});


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
