/* =====================================================================
   RESTAURANT ROSELID GESTION — SERVICE WORKER
   Rôle : permettre le fonctionnement hors connexion (mode PWA),
   mettre en cache l'application et gérer les mises à jour automatiques.

   IMPORTANT : ce fichier doit être placé À LA RACINE du dépôt,
   au même niveau que index.html et manifest.json.
   ===================================================================== */

// Incrémentez ce numéro de version à chaque mise à jour importante de
// l'application pour forcer le rafraîchissement du cache chez les usagers.
const VERSION_CACHE = "roselid-gestion-v1";

// Fichiers essentiels à l'application (coquille applicative)
const FICHIERS_ESSENTIELS = [
  "./",
  "./index.html",
  "./manifest.json"
];

// --------------------------------------------------------------
// Installation : mise en cache des fichiers essentiels
// --------------------------------------------------------------
self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches.open(VERSION_CACHE).then((cache) => cache.addAll(FICHIERS_ESSENTIELS))
  );
  self.skipWaiting(); // active immédiatement la nouvelle version
});

// --------------------------------------------------------------
// Activation : suppression des anciens caches (mise à jour automatique)
// --------------------------------------------------------------
self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches.keys().then((cles) =>
      Promise.all(
        cles.filter((cle) => cle !== VERSION_CACHE).map((cle) => caches.delete(cle))
      )
    )
  );
  self.clients.claim();
});

// --------------------------------------------------------------
// Stratégie réseau :
//  - Firebase / API externes -> toujours réseau (données temps réel)
//  - Reste (HTML, manifest, polices, librairies CDN) -> réseau en priorité,
//    puis repli sur le cache si hors connexion (cache intelligent)
// --------------------------------------------------------------
self.addEventListener("fetch", (evenement) => {
  const url = evenement.request.url;

  // Ne jamais mettre en cache les échanges avec Firebase / Firestore
  if (url.includes("firestore.googleapis.com") || url.includes("googleapis.com") || url.includes("firebaseapp.com")) {
    return; // laisse la requête suivre son cours normal (réseau uniquement)
  }

  evenement.respondWith(
    fetch(evenement.request)
      .then((reponse) => {
        // Met à jour le cache avec la dernière version obtenue du réseau
        const copie = reponse.clone();
        caches.open(VERSION_CACHE).then((cache) => {
          if (evenement.request.method === "GET") cache.put(evenement.request, copie);
        });
        return reponse;
      })
      .catch(() =>
        // Hors connexion : on sert la version en cache si disponible
        caches.match(evenement.request).then((reponseCache) => reponseCache || caches.match("./index.html"))
      )
  );
});
