# Tressia : plateforme de réservation de salons de coiffure

Date : 2026-11-12 · Langue de l'interface : français

## 1. Intention

Tressia n'est plus le site vitrine d'un seul salon. C'est une **plateforme web qui réunit plusieurs salons de coiffure** (Mulhouse, Colmar et Strasbourg d'abord, le reste de la France ensuite).

- **Besoin :** une personne vient trouver un salon dans sa zone, ou ailleurs, à l'aide de filtres. Elle consulte le catalogue, choisit une coiffure et réserve un rendez-vous sur la plateforme selon le calendrier de disponibilité du salon. C'est le **propriétaire ou le responsable du salon** qui reçoit la réservation.
- **Contraintes explicites :** une vraie application avec un front et un back ; des animations avec Lenis et GSAP (Framer Motion a été écarté parce qu'il est réservé à React, voir §7) ; Vue, Vite et Tailwind mis à jour ; une direction artistique inspirée du dossier `inspi/`.

### Objectifs
1. Un client trouve un salon (près de lui ou par quartier) et réserve un créneau réellement libre en moins de 2 minutes, sur mobile.
2. Un salon publie son catalogue, ses coiffeurs et ses horaires, puis gère ses rendez-vous sans aide.
3. Le site public donne une impression premium et éditoriale, à la hauteur des inspirations, tout en restant rapide sur une connexion mobile moyenne.

### Hors périmètre (v1)
- Paiement en ligne. On paie au salon ; Mobile Money via FedaPay ou KKiaPay viendra plus tard.
- Rappels par SMS ou WhatsApp. En v1 : e-mail, plus un bouton « Écrire au salon sur WhatsApp » (lien `wa.me`).
- Application mobile native, multilingue, gestion de plusieurs salons par propriétaire dans l'interface (le modèle de données le permet déjà), choix des services faisables par chaque coiffeur (tous les coiffeurs actifs font tous les services).
- Déploiement en production : à décider dans un second temps (skill `deciding-infrastructure`).

### Anti-objectifs (échec même si « ça marche »)
- **Double réservation** d'un même coiffeur sur le même créneau, même avec deux réservations simultanées.
- Afficher un créneau qui n'est pas réellement réservable.
- Des animations qui gênent l'usage : scroll détourné dans l'espace salon, contenu invisible si le JS échoue, `prefers-reduced-motion` ignoré.
- Des droits vérifiés seulement dans l'interface. Toute règle de rôle ou de propriété est vérifiée côté serveur.

## 2. Acteurs et parcours

| Acteur | Ce qu'il fait |
|---|---|
| Visiteur | Cherche, filtre, consulte les salons. Ne réserve qu'après connexion. |
| Client | Réserve, consulte et annule ses rendez-vous, laisse un avis après un rendez-vous honoré. |
| Propriétaire (`owner`) | Crée son compte et son salon, gère le catalogue, les coiffeurs, les horaires, les fermetures, la galerie et les rendez-vous. |
| Administrateur (`admin`) | Valide, suspend ou réactive les salons. Consulte la liste des utilisateurs. |

### 2.1 Parcours client
1. **Accueil** → barre de recherche (texte, quartier/ville, « autour de moi »).
2. **Résultats** : liste de cartes de salons, avec bascule liste/carte. Filtres :
   - catégorie de prestation (tresses, tissage, nattes, locks, coupe homme, barbe, coloration, soins, défrisage, perruques, enfants) ;
   - ville et quartier ;
   - public (femmes / hommes / mixte) ;
   - prix maximum (sur le prix des prestations) ;
   - **disponible le <date>** : le salon a au moins un créneau libre ce jour-là pour sa prestation active la plus courte ;
   - « autour de moi » : géolocalisation du navigateur, tri par distance, rayon en km.
3. **Page salon** : couverture, nom, note moyenne, adresse et carte, horaires, catalogue groupé par catégorie (photo, prix, durée), coiffeurs avec leur disponibilité du jour (« Libre jusqu'à 17:00 » ou « Complet aujourd'hui »), galerie, avis, bouton WhatsApp.
4. **Tunnel de réservation** (une page, en étapes) :
   1. choisir une ou plusieurs prestations ;
   2. choisir un coiffeur, ou « Sans préférence » ;
   3. choisir un jour (14 jours affichés, jusqu'à 60 jours) puis un créneau ;
   4. se connecter ou créer un compte en ligne, sans perdre la sélection ;
   5. récapitulatif avec une note facultative, puis « Confirmer ».
   La confirmation est **immédiate**. Un e-mail est envoyé au client et au salon.
5. **Mes rendez-vous** : à venir et passés. Annulation possible jusqu'à **2 h avant**. Un avis (1 à 5 étoiles et un commentaire) peut être laissé une seule fois, après un rendez-vous marqué « honoré ».

### 2.2 Parcours salon
1. **Inscription « Je suis un salon »** : compte `owner`, puis assistant de création :
   - infos (nom, description, public, téléphone, WhatsApp) ;
   - adresse, ville, quartier et position cliquée sur une carte ;
   - horaires ;
   - premières prestations ;
   - premiers coiffeurs.
   Le salon est alors **en attente de validation** : invisible au public mais modifiable.
2. **Tableau de bord** : rendez-vous du jour, prochains rendez-vous, compteurs de la semaine (rendez-vous, chiffre d'affaires estimé), alerte « salon en attente de validation » si besoin.
3. **Agenda** : vue jour (colonnes par coiffeur) et vue semaine. Fiche d'un rendez-vous : client, téléphone, prestations, note. Actions :
   - **Annuler** (motif obligatoire, e-mail au client) ;
   - **Honoré** ou **Client absent** (seulement une fois l'heure de début passée).
4. **Catalogue** : CRUD des prestations (nom, catégorie, description, prix en euros, durée en minutes, photo, active ou non, ordre).
5. **Coiffeurs** : CRUD (nom, photo, courte bio, actif ou non) et **indisponibilités** (congés : début et fin).
6. **Horaires** : plusieurs plages par jour de semaine (pour gérer une pause), plus des **fermetures exceptionnelles** (plage de dates et motif).
7. **Galerie** : ajout, suppression et réordonnancement des photos.
8. **Profil du salon** : modification des informations de l'étape 1.

### 2.3 Parcours admin
Liste des salons filtrée par statut. Actions : publier, suspendre, réactiver. Liste des utilisateurs en lecture seule. Le compte admin est créé par le script d'amorçage ou en ligne de commande, jamais par inscription publique.

## 3. Règles métier

- **Fuseau horaire :** `Europe/Paris` (UTC+1 l'hiver, UTC+2 l'été). Les dates sont stockées en `timestamptz` et toujours affichées dans ce fuseau ; les conversions passent par `zonedTimeToUtc` et `toLocalDate`, jamais par un décalage fixe.
- **Monnaie :** euro, en entiers, affichés `45 €` ou `1 250 €`.
- **Calcul des créneaux** (date `D`, prestations `S`, coiffeur `c` ou « sans préférence ») :
  - durée totale = somme des durées de `S` ; pas de grille = **15 min** ;
  - pour chaque coiffeur actif concerné : fenêtres d'ouverture du salon pour le jour de semaine de `D`, moins les fermetures exceptionnelles du salon, moins les indisponibilités du coiffeur, moins ses rendez-vous au statut `confirmed` ;
  - un créneau `t` est proposé si `[t, t + durée]` tient entièrement dans une fenêtre libre ;
  - créneaux exclus : ceux à moins de **1 h** de maintenant et ceux à plus de **60 jours** ;
  - « Sans préférence » : union des créneaux de tous les coiffeurs. À la réservation, le serveur attribue le premier coiffeur libre (ordre stable : celui qui a le moins de rendez-vous ce jour-là, puis par identifiant).
- **Anti-double-réservation :** contrainte d'exclusion PostgreSQL (`btree_gist`) sur `(staff_id, tstzrange(starts_at, ends_at))` pour les réservations `confirmed`. Le serveur revérifie aussi la disponibilité dans la transaction. En cas de conflit : HTTP 409 « Ce créneau vient d'être pris ».
- **Statuts d'une réservation :** `confirmed` → `completed` | `no_show` | `cancelled_by_client` | `cancelled_by_salon`. Aucun retour en arrière.
- **Instantané :** chaque ligne de réservation copie le nom, le prix et la durée de la prestation au moment de la réservation.
- **Salons visibles au public :** uniquement ceux au statut `published`. Les pages et réservations d'un salon `pending` ou `suspended` renvoient 404.
- **Note d'un salon :** moyenne des avis, arrondie à 0,1, accompagnée du nombre d'avis.

## 4. Architecture du dépôt (décisions)

### Contexte retenu
- Développeur solo. Le dépôt actuel est une SPA Vue 3 / Vite 2 (vitrine, contenus factices).
- Trois publics (client, salon, admin), mais une seule équipe et un seul design system.
- Hypothèse : le trafic est faible au lancement (quelques dizaines de salons).

### D-REPO-01 : Monorepo avec workspaces npm
- Décision : un seul dépôt, des workspaces npm : `apps/web`, `apps/api`, `packages/shared`.
- Contraintes servies : le front et le back partagent les schémas de validation, les types et les constantes métier ; il n'y a qu'un développeur.
- Alternatives écartées : plusieurs dépôts (schémas en double, changements à synchroniser) ; pnpm (le projet utilise déjà npm, aucun besoin propre à pnpm).
- À revoir si : une autre équipe reprend une des applications.
- Vérification : déduit · Responsable : architecte · Statut : proposé.

### D-REPO-02 : Deux applications déployables : `web` (SPA unique) et `api`
- Décision : l'espace public, l'espace salon (`/pro/...`) et l'admin (`/admin/...`) sont des sections d'une seule SPA Vue, chargées à la demande. L'API est un monolithe modulaire.
- Contraintes servies : même design system, petit public admin, rythme de changement identique.
- Alternatives écartées : back-office séparé (doublerait la configuration pour 1 à 2 utilisateurs) ; microservices (aucun domaine indépendant).
- À revoir si : l'admin doit être fermée au niveau réseau, ou l'espace salon prend un rythme de livraison différent.
- Vérification : déduit · Responsable : architecte · Statut : proposé.

### D-REPO-03 : Le schéma de base appartient à `apps/api`
- Décision : schéma Drizzle et migrations (`drizzle-kit`) dans `apps/api/src/db`. Les migrations sont lancées une seule fois, avant le démarrage.
- À revoir si : une deuxième application accède directement à la base.
- Vérification : déduit · Statut : proposé.

### D-REPO-04 : Sessions et rôles
- Décision : un seul mécanisme de session (cookie `httpOnly`, jeton aléatoire dont le hash SHA-256 est stocké en base) et un rôle par utilisateur (`client`, `owner`, `admin`). Garde-fous côté serveur sur chaque route : rôle, plus propriété du salon pour toutes les routes `/pro`.
- Écart assumé avec la règle par défaut (« une session par public ») : une seule SPA, un seul domaine, et l'admin n'a qu'un ou deux comptes.
- À revoir si : l'admin devient une application séparée.
- Vérification : déduit · Statut : proposé.

### Arborescence cible
```
apps/
  api/   src/{server.ts, app.ts, env.ts, db/{schema.ts, client.ts, migrations/, seed.ts},
              modules/{auth, salons, catalog, staff, schedule, availability, bookings,
                       reviews, uploads, admin, notifications}, lib/} · tests/
  web/   src/{main.ts, App.vue, router/, stores/, api/, composables/, components/{ui, public, pro},
              layouts/, pages/{public, account, pro, admin}, styles/, motion/} · public/
packages/
  shared/ src/{schemas/*.ts, constants.ts, format.ts, index.ts}
docker-compose.yml   (postgres:17 sur le port 54329, mailpit sur 1025/8025)
```

## 5. Pile technique (vérifiée le 2026-11-12)

| Domaine | Choix | Version |
|---|---|---|
| Runtime | Node.js | 26 (installé) |
| Front | Vue, Vue Router, Pinia | 3.5.x, 5.x, 4.x |
| Build | Vite, @vitejs/plugin-vue | 8.x, 6.x |
| Style | Tailwind CSS (via `@tailwindcss/vite`, configuration CSS `@theme`) | 4.x |
| Animation | GSAP (ScrollTrigger, SplitText : gratuits depuis 3.13), Lenis (`lenis/vue`) | 3.15.x, 1.3.x |
| Carte | Leaflet + tuiles OpenStreetMap | 1.9.x |
| API | Hono + `@hono/node-server` + `@hono/zod-validator` | 4.13.x, 2.x, 0.9.x |
| Validation | Zod (schémas partagés dans `packages/shared`) | 4.x |
| BDD | PostgreSQL 17 (Docker), Drizzle ORM + drizzle-kit, pilote `postgres` | 0.45.x / 0.31.x |
| E-mail | Nodemailer → Mailpit en dev | 10.x |
| Images | `sharp` : redimensionnement et conversion WebP à l'envoi | 0.35.x |
| TS | TypeScript **6.0.x** (pas 7 : `vue-tsc` s'appuie sur l'API JS de TS) ; `tsx` pour lancer l'API | 6.0.x, 4.x |
| Tests | Vitest (api : intégration sur une vraie BDD de test ; web : composables et composants avec @vue/test-utils + happy-dom), Playwright (un test de bout en bout du parcours de réservation) | 5.x, 1.65.x |
| Polices | Auto-hébergées via `@fontsource` | 5.x |

### Contrat d'API (préfixe `/api`, JSON, erreurs `{ error: { code, message, fields? } }`)
- **Auth :** `POST /auth/register` (rôle `client` ou `owner`), `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
- **Public :**
  - `GET /categories`, `GET /cities` (villes et quartiers présents)
  - `GET /salons?q&city&neighborhood&category&audience&maxPrice&date&lat&lng&radiusKm&page`
  - `GET /salons/:slug` (détail, catalogue, coiffeurs, horaires, galerie, note)
  - `GET /salons/:slug/reviews`
  - `GET /salons/:slug/staff-today`
  - `GET /salons/:slug/availability?date&serviceIds&staffId`
- **Client :**
  - `POST /bookings` (`salonId`, `serviceIds`, `staffId|null`, `startsAt`, `note`)
  - `GET /me/bookings`
  - `POST /me/bookings/:id/cancel`
  - `POST /me/bookings/:id/review`
- **Pro** (`owner`, salon possédé) :
  - `POST /pro/salon`, `GET|PATCH /pro/salon`
  - `GET|PUT /pro/salon/hours`
  - `GET|POST|DELETE /pro/salon/closures`
  - `/pro/services` (CRUD)
  - `/pro/staff` (CRUD) et `/pro/staff/:id/time-off` (CRUD)
  - `/pro/gallery` (POST upload, DELETE, PATCH ordre)
  - `GET /pro/bookings?from&to&staffId`
  - `POST /pro/bookings/:id/{cancel|complete|no-show}`
  - `GET /pro/stats`
- **Upload :** `POST /pro/uploads` (multipart, image jpeg/png/webp ≤ 5 Mo, type contrôlé par les octets de signature) → `{ url }`.
- **Admin :** `GET /admin/salons?status`, `POST /admin/salons/:id/{publish|suspend}`, `GET /admin/users`.
- **Sécurité :**
  - mots de passe hachés avec `scrypt` (node:crypto) ;
  - cookie `SameSite=Lax`, `Secure` en production ;
  - toute requête qui modifie des données doit avoir une en-tête `Origin` autorisée ;
  - limitation de débit en mémoire sur `/auth/*` (10 requêtes par minute et par IP).

### Modèle de données (PostgreSQL)
- `users` : id, email (unique, en minuscules), password_hash, full_name, phone, role, created_at.
- `sessions` : id (hash du jeton), user_id, expires_at (30 jours, prolongé à l'usage).
- `salons` : id, owner_id, slug (unique), name, description, phone, whatsapp, address, city, neighborhood, lat, lng, audience, status (`pending|published|suspended`), cover_url, created_at.
- `opening_hours` : salon_id, weekday (0 = dimanche … 6), opens_at, closes_at (type `time`).
- `closures` : id, salon_id, starts_on, ends_on (dates incluses), reason.
- `categories` : id, slug, label, position (données d'amorçage).
- `services` : id, salon_id, category_id, name, description, price_eur, duration_min, image_url, active, position.
- `staff` : id, salon_id, name, photo_url, bio, active, position.
- `staff_time_off` : id, staff_id, starts_at, ends_at, reason.
- `bookings` : id, salon_id, client_id, staff_id, starts_at, ends_at, status, total_price_eur, client_note, cancel_reason, created_at. Plus la contrainte d'exclusion.
- `booking_items` : booking_id, service_id, name, price_eur, duration_min.
- `reviews` : id, booking_id (unique), salon_id, client_id, rating de 1 à 5, comment, created_at.
- `salon_photos` : id, salon_id, url, position.

### Données d'amorçage (`npm run db:seed`)
- 6 salons publiés à Mulhouse, Colmar et Strasbourg (Centre-ville, Gare, Coteaux, Centre historique, Krutenau, Neudorf), plus 1 salon en attente.
- Pour chacun : 3 à 8 prestations, 2 ou 3 coiffeurs, des horaires, quelques avis.
- Les images réutilisent celles de `src/assets/` actuel.
- Comptes de démo : `admin@tressia.test`, `tresseuse@tressia.test`, `client@tressia.test`, tous avec le mot de passe `tressia123`.

## 6. Direction artistique (à partir de `inspi/`)

Synthèse : **l'élégance éditoriale de Vogue et ASETA, la générosité de Mr. Blade, la modernité de « nova »**.

- **Palette (tokens Tailwind `@theme`) :**

  | Token | Valeur | Usage |
  |---|---|---|
  | `cream` | #F3ECE3 | fond principal |
  | `sand` | #E6D8C8 | fond secondaire |
  | `terracotta` | #9C3F2A | couleur de marque (ASETA) |
  | `terracotta-deep` | #6E2A1C | |
  | `ink` | #17110F | noir chaud (Mr. Blade) |
  | `copper` | #B7793F | boutons et accents (Mr. Blade) |
  | `gold` | #C9A46A | détails rares |
  | `sage` | #2F4A44 | statuts « disponible » (rappel du vert de Mr. Blade) |

  Contrastes d'au moins AA pour le texte.
- **Typographie :**
  - titres en serif éditoriale **Cormorant Garamond** (300 à 600), grandes tailles et capitales espacées pour les surtitres (style « VOGUE ») ;
  - un mot d'accent en script **Pinyon Script**, posé en chevauchement comme « curly » dans Vogue, au maximum une fois par section ;
  - texte courant en **Manrope Variable**.
- **Motifs :**
  - **hero** : grande photo plein cadre dans une carte aux coins très arrondis (nova), titre révélé mot par mot (SplitText), carte en verre dépoli « Prochain créneau libre · Salon X · 14:30 » qui flotte et suit légèrement le scroll ;
  - **catégories** : grille bento (nova), cartes photo avec léger zoom au survol ;
  - **prestations sur la page salon** : lignes séparées par des filets, vignette à gauche, nom au centre en serif capitale, description et prix à droite (Mr. Blade) ;
  - **coiffeurs** : portraits en arche (Mr. Blade), pastille sage « Libre jusqu'à 17:00 » ;
  - **bandeau de marque** : « TRESSIA » répété en grand, en filigrane, qui défile au scroll (ASETA) ;
  - **sections** : alternance de fonds crème, encre et terracotta ; grain de papier léger (SVG noise) sur les fonds crème.
- **Mouvement :**
  - Lenis pour le défilement doux sur les **pages publiques uniquement** ; il est désactivé dans `/pro`, dans `/admin` et quand `prefers-reduced-motion` est actif ;
  - GSAP ScrollTrigger pour l'apparition des sections (fondu et translation de 24 px), un parallaxe léger des images et le titre du hero en SplitText ;
  - transitions de page par fondu ;
  - **tout le contenu reste visible sans JS** : les états initiaux sont posés par GSAP, pas par le CSS ;
  - avec `prefers-reduced-motion`, plus de translation ni de parallaxe : fondus courts seulement.
- **Espace salon et admin :** même identité, mais dense et fonctionnelle. Fond crème, barre latérale encre, aucune animation au scroll.
- **Responsive :** conçu d'abord pour le mobile (360 px) ; barre de réservation collante en bas de la page salon sur mobile.
- **Accessibilité :** navigation au clavier dans le tunnel de réservation, focus visible, libellés de formulaire, `alt` sur les images, cibles tactiles d'au moins 44 px.

## 7. Laissé au constructeur
- Découpage précis des composants, nommage, structure interne des modules API.
- Pagination des résultats : 12 par page.
- Libellés exacts et micro-copies (en français, ton chaleureux et sobre).
- Choix des icônes : Lucide via `lucide-vue-next`, qui remplace Font Awesome par CDN.
- Remplacement complet de la SPA vitrine actuelle : les anciens fichiers de `src/` disparaissent et leurs images sont déplacées dans le dossier d'amorçage de l'API.
- `inspi/` reste hors du dépôt (ajouté au `.gitignore`).

## 8. Critères d'acceptation
1. `docker compose up -d && npm install && npm run db:migrate && npm run db:seed && npm run dev` lance le web (5173) et l'API (3333).
2. Parcours complet du client démo dans un navigateur : recherche « tresses » à Mulhouse → salon → 2 prestations → « sans préférence » → créneau → connexion → confirmation → visible dans « Mes rendez-vous » et dans l'agenda du salon démo, e-mails visibles dans Mailpit.
3. Deux réservations simultanées sur le même créneau du même coiffeur : une seule réussit, l'autre reçoit 409 (test d'intégration).
4. Tests unitaires de l'algorithme de créneaux : horaires avec pause, fermeture exceptionnelle, congé d'un coiffeur, rendez-vous existant, limite de 1 h, « sans préférence ».
5. Un `owner` ne peut ni lire ni modifier le salon d'un autre `owner` (test d'intégration), et un `client` reçoit 403 sur `/pro/*` et `/admin/*`.
6. `npm run build` et `npm run typecheck` passent sans erreur ; `npm test` est vert.
7. Avec `prefers-reduced-motion`, Lenis est inactif et aucun élément ne reste masqué.

## Évolution : place de marché de tresseuses (Tressia)

La plateforme ne liste plus des salons à adresse fixe mais des **tresseuses indépendantes**. Le modèle de données garde le nom technique `salons` (un profil = un « salon ») et `staff` (la ou les personnes qui tressent).

- `salons.service_mode` : `chez_moi`, `domicile` ou `les_deux`.
- `salons.travel_zone` (tableau de communes, liste fermée `TRAVEL_COMMUNES`) et `salons.travel_fee_eur` (0 à 50 €).
- `bookings.location` (`chez_tresseuse` ou `domicile`), `client_address`, `client_city`, `travel_fee_eur` ; le total inclut les frais.
- Recherche : `mode=domicile&city=X` renvoie les tresseuses qui se déplacent dans la commune X ; `mode=chez_tresseuse` celles qui reçoivent.
- Vie privée : la fiche publique renvoie `address: null` et une position arrondie à 0,01° ; l'adresse n'est transmise qu'à la cliente, dans la réservation et l'e-mail, et seulement pour un rendez-vous chez la tresseuse.
- Migration `0003_tresseuses_domicile`.
