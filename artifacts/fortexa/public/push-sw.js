self.addEventListener("push", (event) => {
  let data = { title: "Fortexa", body: "Vous avez une nouvelle notification.", url: "/notifications", tag: "fortexa" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Keep the fallback notification when a provider sends a non-JSON payload.
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Fortexa", {
      body: data.body || "Vous avez une nouvelle notification.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "fortexa",
      data: { url: data.url || "/notifications" },
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/notifications", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => "focus" in client);
    if (existing) {
      existing.navigate(target);
      return existing.focus();
    }
    return clients.openWindow(target);
  }));
});