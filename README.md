# Tressia

Plateforme qui met en relation des **tresseuses indépendantes** et leurs clientes en Alsace (Mulhouse, Colmar, Strasbourg).

- Chaque tresseuse crée son profil, publie ses coiffures (box braids, knotless, twists, fulani, locks, nattes, tresses homme et enfant...) avec prix et durée, et choisit où elle travaille : **chez elle**, **à domicile**, ou **les deux**.
- Si elle se déplace, elle choisit les communes desservies et ses frais de déplacement.
- La cliente cherche par coiffure, par ville ou par commune (« elle vient chez moi »), choisit le lieu, puis un créneau réellement libre. Les frais de déplacement s'ajoutent au total.
- L'adresse exacte de la tresseuse n'est **jamais publique** : la fiche montre le quartier et une position arrondie à environ 1 km ; l'adresse est envoyée à la cliente seulement après une réservation chez elle.

Contact de la plateforme : 06 79 07 04 87.

## Démarrer en local

Prérequis : Node.js 22 ou plus récent, Docker.

```bash
cp .env.example .env          # si .env n'existe pas encore
docker compose up -d          # PostgreSQL (port 54329) et Mailpit (1025 / 8025)
npm install
npm run db:migrate
npm run db:seed               # tresseuses, coiffures, réservations et comptes de démo
npm run dev                   # API sur :3333, site sur http://localhost:5173
```

E-mails envoyés en développement : http://localhost:8025 (Mailpit).

> Si `docker compose up` échoue sur une erreur de « credentials » (gpg), relancez avec une configuration Docker vide :
> `DOCKER_CONFIG=$(mktemp -d) docker compose up -d`

## Comptes de démonstration

Mot de passe commun : `tressia123`

| Rôle | E-mail | Accès |
|---|---|---|
| Cliente | `client@tressia.test` | réservation, mes rendez-vous |
| Tresseuse (chez elle + domicile) | `tresseuse@tressia.test` | espace tresseuse `/pro` |
| Tresseuse (domicile uniquement) | `fatou@tressia.test` | espace tresseuse `/pro` |
| Administrateur | `admin@tressia.test` | validation des profils `/admin` |

Dans le code et la base, un profil de tresseuse s'appelle encore `salon` (table `salons`, routes `/api/salons`) et les personnes qui tressent `staff`.

## Mise en ligne

Le site et l'API tournent dans **un seul service** : en production, l'API sert aussi le build du site (`apps/web/dist`).

- **Base** : PostgreSQL gratuit sur [Neon](https://neon.com) (extension `btree_gist` créée par les migrations).
- **Service** : [Render](https://render.com), offre gratuite, décrit dans `render.yaml` (région Francfort).
- Au démarrage : migrations, puis données de démo **seulement si la base est vide**, puis lancement du serveur.
- Variables : `DATABASE_URL` (chaîne Neon), `WEB_ORIGIN` (URL publique du site), `ADMIN_PASSWORD` (mot de passe du compte admin en ligne ; sans lui, la connexion admin est désactivée), `NODE_ENV=production`. Sans `SMTP_HOST`, les e-mails sont seulement écrits dans les journaux.
- Limites de l'offre gratuite : le service se met en veille après 15 min sans visite (premier chargement d'environ une minute) ; les photos envoyées par les tresseuses ne survivent pas à un redémarrage (disque éphémère), les photos de démo sont recopiées à chaque démarrage.

## Structure

```
apps/web         Vue 3.5, Vite 8, Tailwind 4, Pinia, vue-router, GSAP + Lenis, Leaflet
apps/api         Hono (Node.js, TypeScript), Drizzle ORM, PostgreSQL, Nodemailer, sharp
packages/shared  Contrat commun : types, schémas Zod, constantes, formatage (euros, fuseau Europe/Paris avec heure d'été)
docs/            Document de conception
```

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | API et site en mode développement |
| `npm test` | tests API (intégration sur la base `tressia_test`) et web |
| `npm run typecheck` | vérification TypeScript des deux applications |
| `npm run build` | build de production du site |
| `npm run db:generate` | génère une migration après modification de `apps/api/src/db/schema.ts` |

## Règles importantes

- Une même tresseuse ne peut jamais être réservé deux fois sur le même créneau : une contrainte d'exclusion PostgreSQL le garantit, même en cas de réservations simultanées.
- Les créneaux proposés tiennent compte des horaires (avec pauses), des fermetures exceptionnelles, des congés et des rendez-vous déjà pris.
- Les droits (cliente, tresseuse, administrateur) sont vérifiés côté serveur sur chaque route.
- Les horaires sont saisis en heure de Paris : le passage à l'heure d'été et à l'heure d'hiver est géré (journées de 23 h et de 25 h), et couvert par des tests.
- Les prix sont stockés en euros entiers. La migration `0002_prix_en_euros` renomme les colonnes et convertit d'anciens montants en FCFA au taux fixe 1 € = 655,957 FCFA.
- Rendez-vous à domicile : refusés si la tresseuse ne se déplace pas (`home_not_offered`), si la commune n'est pas dans sa zone (`out_of_zone`), et un rendez-vous « chez elle » est refusé si elle ne travaille qu'à domicile (`home_only`). Le montant des frais est figé dans la réservation.
