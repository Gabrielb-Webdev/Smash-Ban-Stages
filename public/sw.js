// Service Worker para Push Notifications — AFK Smash
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'AFK Smash', body: event.data ? event.data.text() : '' }; }

  var title = data.title || 'AFK Smash';
  var options = {
    body: data.body || '',
    icon: '/images/icon-192.png',
    badge: '/images/icon-192.png',
    data: data.data || {},
    vibrate: [200, 100, 200],
    tag: data.tag || 'afk-notif',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/home';
  var targetUrl = url.startsWith('http') ? url : (self.location.origin + url);
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          // Navegar a la URL correcta en la ventana existente
          if ('navigate' in client) {
            return client.navigate(targetUrl).then(function(c) { return c && c.focus(); });
          }
          // Fallback: postMessage para que la página navegue
          client.postMessage({ type: 'NOTIF_NAVIGATE', url: url });
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
