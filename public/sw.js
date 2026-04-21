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
  var urlPath = url.split('?')[0].split('#')[0];
  var isHomePath = urlPath === '/home' || urlPath === '' || urlPath === '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      var appClient = null;
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url && client.url.startsWith(self.location.origin)) {
          appClient = client;
          break;
        }
      }

      if (appClient) {
        // Siempre mandar postMessage para que la página maneje navegación in-app
        try { appClient.postMessage({ type: 'NOTIF_NAVIGATE', url: url }); } catch (e) {}
        // Si no es el home, navegar a la URL externa (ej: /tablet/...)
        if (!isHomePath && 'navigate' in appClient) {
          return appClient.navigate(targetUrl).then(function (c) {
            if (c && 'focus' in c) return c.focus();
          }).catch(function () { return appClient.focus(); });
        }
        return appClient.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});
