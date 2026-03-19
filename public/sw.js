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
  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/home';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf('/home') !== -1 && 'focus' in list[i]) return list[i].focus();
      }
      return clients.openWindow(url);
    })
  );
});
