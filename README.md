# icecrew · KK LAB

**Ton compagnon de code.** Coder avec une IA, c’est souvent passer des heures
face à un terminal froid et à des lignes de code qui défilent. icecrew y
installe un petit pingouin en pixel art, là pour te tenir compagnie et te
divertir.

Lance Codex, Claude Code ou Gemini CLI avec `icecrew` : le pingouin
s’installe sur sa banquise, en bas du terminal, sous un ciel étoilé. Il vit au
rythme de l’IA : il bosse avec elle, prend un café sur les longues tâches, fête
la fin, se cache les yeux quand tu l’interromps. Entre deux tâches, il te
raconte ses histoires, comme un petit dessin animé : la mouette qui lui vole son
dîner, le poisson farceur pris à l’hameçon, l’étoile filante tombée sur la
glace… Et il te répond quand tu cliques dessus. Rien à configurer, rien à
taper : il comprend tout seul ce qui se passe, et ne vient jamais interrompre
ni recouvrir l’IA.

> **Bienvenue sur la banquise !** Ce petit pingouin est ravi de vous tenir
> compagnie pendant que vous codez. Merci de tout cœur de l’avoir installé :
> vous allez bien vous amuser ensemble !

![Le bandeau sous l’IA, quatre moments de ses histoires : Bulle pris à l’hameçon, Nounours l’ours qui demande au pingouin d’être son ami, une balade sur le dos de Bernadette la baleine, l’aurore boréale](docs/penguin-band.png)

*Le bandeau tel que le dessine le programme, dans quatre de ses histoires :
« La pêche », « L’ours », « La baleine » et « L’aurore ».*

- **Un compagnon vivant** : 44 poses reprises pixel pour pixel de trois planches
  de dessin, 19 petites histoires racontées par un narrateur, et des réponses à
  tes clics, toujours gentilles.
- **Il comprend tout seul** : ses réactions viennent de ce qu’affiche l’IA,
  sans mot-clé, sans prompt et sans configuration.
- **En bas, jamais par-dessus** : le bandeau vit sous l’IA, qui reste visible et
  utilisable à chaque instant. Sans fenêtre ni overlay.
- **Fluide** : 60 images par seconde, et seules les cellules qui changent sont
  envoyées au terminal.
- **Discret** : tout reste en local, rien n’est enregistré ni envoyé.

![Intro KK LAB : le tigre KK LAB et son message](docs/kk-lab-intro.png)

## Installation

Prérequis : **[Node.js](https://nodejs.org) 24 ou plus récent** et une IA en
ligne de commande (Codex, Claude Code ou Gemini CLI). Puis, dans un terminal :

```sh
npm install -g icecrew
icecrew codex     # lance Codex avec le pingouin (ou : icecrew claude / gemini)
```

C’est tout : rien à configurer, rien à télécharger d’autre. Pour l’essayer sans
rien installer durablement : `npx icecrew codex`.

| Système | Installation |
| --- | --- |
| Windows 10 1809+ / 11 | `npm install -g icecrew` |
| macOS | `npm install -g icecrew` |
| Linux | `npm install -g --allow-scripts=node-pty icecrew`, avec `python3`, `make` et `g++` : le terminal virtuel s’y compile |

Sous Windows et macOS, npm peut prévenir que `node-pty` a des scripts
d’installation non autorisés : c’est sans conséquence, ses binaires sont déjà
fournis. Sous Windows, si PowerShell refuse de lancer `npm` ou `icecrew`
(scripts désactivés sur le système), tape `npm.cmd` et `icecrew.cmd`.

Depuis les sources : `git clone` du dépôt, `npm ci`, puis `npm run ai -- codex`
(sous Windows PowerShell : `npm.cmd run ai -- codex`). Le `--` transmet `codex`
au lanceur plutôt qu’à npm.

Désinstallation : `npm uninstall -g icecrew`.

icecrew s’appelait avant ai-reactions. Tu avais cette version ? Retire-la avec
`npm uninstall -g ai-reactions` ; tes réglages `AI_REACTIONS_*` restent
reconnus. Si elle avait encore ses mots-clés, retire aussi le serveur MCP
qu’elle avait enregistré dans tes IA : `codex mcp remove ai-reactions`,
`claude mcp remove ai-reactions` ou `gemini mcp remove ai-reactions`.

## Ce qui fait réagir le pingouin

| Ce que fait l’IA | Réaction dans le bandeau |
| --- | --- |
| Elle se met au travail | Le pingouin glisse jusqu’à son ordi, puis s’y concentre, avec un coup d’œil de temps en temps |
| Elle travaille longtemps | Il réfléchit, une bulle au-dessus de la tête |
| Plus de 45 s de travail | Pause café |
| Plus de 2 min 30 | L’escargot : ça traîne |
| Elle a fini, en 15 à 40 s | EZ |
| Elle a fini, en 40 s à 2 min | Encouragement ou fusée |
| Elle a fini, après plus de 2 min | Trophée, cape de héros et XP |
| Elle attend ton feu vert (permission) | Regard suspicieux |
| Tu l’interromps | Facepalm |
| Erreur d’API | Pierre tombale |
| 5 min sans activité | Lunettes de soleil et lo-fi, puis il part pêcher et finit par s’endormir |
| Tu reviens taper | Boop, il se réveille |

Les réactions sont en pixel art, dans le décor : cœurs, tasse fumante, escargot,
palmier, trophée, fusée, pierre tombale… Seule leur légende est du texte. Tout
est silencieux : le pingouin ne fait jamais de bruit.

## Le pingouin compagnon

**Quand tout est calme, il raconte des histoires.** Des épisodes de 20 à 45
secondes, comme un petit dessin animé. Chaque histoire a son enjeu, son
rebondissement et sa chute, et on y retrouve sa bande d’amis :

- **Gaspard**, la mouette gourmande au grand cœur, et son bébé ;
- **Bulle**, le poisson orange qui adore faire des farces ;
- **Flocon**, le bonhomme de neige timide, souvent seul ;
- **Nounours**, l’ours polaire, énorme et tout doux ;
- **Pistache**, le phoque jongleur ;
- **Bernadette**, la baleine qui fait des balades en mer ;
- et une étoile filante qui a perdu son chemin.

On sait toujours qui parle : chaque épisode s’ouvre sur son titre, seul, comme
un carton (« ÉPISODE : LA PÊCHE ») ; le narrateur écrit ensuite chaque plan en
blanc, sans nom devant ; quand un personnage parle, son nom apparaît en orange
devant sa réplique (« Gaspard : « Pardon… elle est vraiment belle. » »). Le
premier épisode de chaque session, « Les amis », présente la bande un par un, et
chaque épisode rappelle qui est qui la première fois qu’un ami apparaît.

| Épisode | L’histoire |
| --- | --- |
| La pêche | Bulle arrose le pêcheur, finit pris à l’hameçon… et revient le remercier avec un coquillage |
| Le voleur | Gaspard vole son dîner ; aux jumelles, on découvre qu’il nourrit son bébé |
| L’étoile | Une étoile filante tombe sur la glace ; le pingouin la renvoie au ciel avec son ballon |
| Flocon | Personne ne vient voir Flocon ; une chanson, et tous les amis arrivent |
| L’igloo | Il construit une maison… trop petite pour lui, mais parfaite pour Gaspard |
| Le peintre | Un coup d’aile ruine sa toile, qui devient « Gaspard, période bleue » |
| La photo | Trop tard, trop tôt… puis pile au bon moment |
| Le concert | Un concert pour personne, puis pour tout le monde |
| La fleur | La première fleur de la banquise, et le héros qui la protège |
| La surprise | Tout le monde a oublié son anniversaire… vraiment ? |
| La potion | Une expérience qui fait boum… et neiger des paillettes |
| Le roi | Une couronne trouvée dans la neige, et un premier décret : la fête |
| Le fantôme | Une histoire qui fait peur, une ombre aux yeux jaunes… |
| La partie | Une boule de neige volée, puis une partie à trois |
| La baignade | Un bain de minuit, avec Bulle pour compagnie |
| L’ours | Des pas lourds, un ours polaire… qui n’a que faim |
| La baleine | Un jet d’eau géant, et une balade sur le dos de Bernadette |
| Le phoque | Une boule de neige sur le nez, sur la tête, puis à deux |
| L’aurore | Le ciel s’allume en vert et violet, et tout le monde vient admirer |

Après « Les amis », chaque session les raconte toutes dans un ordre différent
avant d’en raconter une deuxième fois, soit plus de dix minutes d’histoires. Entre deux épisodes, il cligne des yeux, regarde autour de
lui, salue ou se promène. **L’IA passe toujours en premier** : dès qu’elle se met
au travail, l’épisode se met en pause, et il reprend au début du plan quand elle
a fini (après une longue absence, il recommence depuis le début). En pleine
baignade, il rentre à la nage au lieu de disparaître de l’eau.

Les histoires ont besoin d’un peu de place : 10 épisodes à partir de 60
colonnes, 18 à 80, et Flocon à partir de 100. Dans un terminal plus étroit, le
pingouin s’occupe à sa façon : il lit, peint, jongle, chante, joue de la
guitare…

**Clique dans le bandeau** et il te répond, toujours avec bienveillance :

| Où tu cliques | Ce qui se passe |
| --- | --- |
| Sur le pingouin | Il est content, puis salue, saute et danse : un peu plus heureux à chaque clic |
| Sur le pingouin au large | Des cœurs montent là où il flotte |
| Sur le bonhomme de neige | Le pingouin le salue |
| Sur la mer | Un poisson saute hors de l’eau |
| Dans le ciel | Une étoile filante passe |

Ses poses viennent pixel pour pixel des planches de dessin KK LAB, jamais
redessinées. La troisième planche dessine un pingouin plus long : chaque pose y
a seulement perdu ses lignes les plus redondantes, jamais le visage ni les
pieds, pour garder la même taille que les autres.

La molette de la souris fait défiler l’historique de l’IA, comme une page ;
n’importe quelle touche ramène l’écran en direct. Pour sélectionner du texte,
maintiens Maj en glissant.

Le lancement commence par l’intro KK LAB : le tigre se dessine, puis son message
s’écrit phrase après phrase, au rythme de la lecture. Une touche passe l’intro
(`ICECREW_INTRO=0` la supprime, `icecrew intro` la rejoue). Puis le
pingouin se dessine à son tour dans le bandeau, contour d’abord.

## Comment ce projet est né

Tout part d’un réflexe qu’on a tous en codant avec une IA : on lui parle comme à
un coéquipier. On s’impatiente quand elle tourne en rond, on la félicite quand
elle trouve enfin le bug. Mais elle ne voit rien de tout ça, et l’échange reste
un mur de texte.

En septembre 2026, j’ai voulu rendre ces moments **visibles et drôles** sans
casser le flux de travail. La première version tenait en quatre réactions,
taquineries et encouragements, déclenchées par un mot-clé dans le chat et
jouées dans une fenêtre à part. Deux contraintes ont façonné la suite :

1. **Rester dans le terminal de l’IA.** La solution : un lanceur qui héberge
   l’IA dans un pseudo-terminal avec un écran virtuel, et qui dessine lui-même
   ce que tu vois.
2. **Ne jamais toucher à l’IA.** Pas de touches simulées, pas d’interruption de
   processus : l’IA continue de travailler pendant chaque animation.

Les réactions sont ensuite devenues plus variées et plus chill, puis le projet
est devenu une vraie CLI installable, avec l’identité **KK LAB** et son tigre en
intro.

La version 2 a retiré la dernière friction : taper un mot-clé, c’est envoyer un
prompt à l’IA. Un pingouin vit désormais dans un bandeau sous l’IA, lit son
écran en mémoire et réagit tout seul, sans jamais la recouvrir. Les mots-clés
ont fini par disparaître complètement, avec le serveur MCP qui les servait : il
n’y a plus rien à configurer.

Puis le pingouin est devenu un **compagnon** : ses poses sont reprises de trois
planches de dessin, il répond aux clics, et le tout tourne à 60 images par
seconde. Enfin, plutôt que d’enchaîner des occupations au hasard, il s’est mis à
raconter de vraies histoires, avec ses amis.

## Comment ça marche

```text
  l’IA (Codex, Claude Code, Gemini CLI)
   │  tourne dans un pseudo-terminal du lanceur
   ▼
  lanceur icecrew
   │  garde une copie de l’écran de l’IA, en mémoire,
   │  et y lit quelques indices (« esc to interrupt », permission,
   │  interruption, erreur) ─────────────► humeur du pingouin
   ▼
  ton terminal, 60 images par seconde
  ┌──────────────────────────────────────────┐
  │ l’IA, intacte et utilisable              │
  │ …                                        │
  ├──────────────────────────────────────────┤
  │ bandeau : le pingouin dans sa nuit       │  10 lignes
  │ polaire, ses histoires et ses réactions  │
  └──────────────────────────────────────────┘
```

- **Lanceur** (`scripts/session.mjs`, `src/session-terminal.ts`, `src/mouse.ts`) :
  lance l’IA dans un pseudo-terminal `node-pty`, garde une copie de son écran
  avec `@xterm/headless` et réserve le bas du terminal au bandeau. Il ne renvoie
  que les lignes et les cellules qui changent, et gère la molette et les clics.
- **Horloge** (`src/frame-clock.ts`) : 60 images par seconde sur des échéances
  fixées d’avance (les timers de Windows n’avancent que par pas de ~15,6 ms) ;
  une image en retard est sautée, jamais rejouée en rafale, et une image est
  sautée si le terminal n’a pas fini d’afficher la précédente.
- **Bandeau** (`src/ambient.ts`, `src/companion.ts`, `src/penguin.ts`,
  `src/decor.ts`, `src/scenes.ts`, `src/reactions.ts`) : l’humeur du pingouin,
  déduite de l’écran virtuel en mémoire uniquement ; ses occupations et ses
  réponses aux clics ; ses 44 poses ; sa nuit polaire (ciel en dégradé, étoiles
  qui scintillent, lune, montagnes, mer qui miroite, banquise, bonhomme de
  neige, petite neige) ; les réactions en pixel art et leurs légendes.
- **Histoires** (`src/stories.ts`, `src/cast.ts`) : les 19 épisodes et « Les amis », plan par
  plan (ce que dit le narrateur, ce que fait le pingouin, ce que font les
  autres), et les amis du pingouin dessinés à l’échelle du bandeau. Une frame
  d’épisode coûte environ 0,1 ms et envoie en moyenne 0,2 Ko au terminal.
- **Intro** (`src/intro.ts`, `src/mascot-render.ts`, `src/mascot-image.ts`) : à
  chaque lancement, la mascotte KK LAB se dessine au centre d’après son SVG, avec
  son message en dessous. Dans un terminal compatible Sixel (Windows Terminal
  1.22+, WezTerm, iTerm2), l’image elle-même remplace le dessin ; ailleurs, dont
  le terminal de VS Code sous Windows, le tigre reste en demi-blocs Unicode
  truecolor.

## Commandes

| Commande | Rôle |
| --- | --- |
| `icecrew codex [args]` | Lance Codex avec le pingouin, aussi `claude` et `gemini` |
| `icecrew intro` | Rejoue l’intro KK LAB |
| `icecrew --version` | Affiche la version |

## Réglages

| Variable | Défaut | Effet |
| --- | --- | --- |
| `ICECREW_INTRO` | `1` | `0` désactive l’intro du lancement |
| `ICECREW_AMBIENT` | `1` | `0` retire le pingouin sous l’IA |

Le bandeau fait toujours 10 lignes : comme une image sur une page web, le
pingouin garde sa taille et seul le décor suit la largeur du terminal (le
bonhomme de neige apparaît à partir de 100 colonnes, les scènes sont coupées au
bord quand la place manque). Il demande au moins 40 × 18 caractères ; en
dessous, l’IA garde tout l’écran. L’intro s’adapte au terminal, à partir de
30 × 13.

## Sécurité et vie privée

- Tout reste **local** : aucun port ouvert, aucune requête réseau, aucune
  télémétrie, aucune donnée enregistrée.
- Le bandeau lit le bas de l’écran de l’IA, en mémoire, pour y repérer quelques
  indices génériques (« esc to interrupt », une demande de permission, une
  erreur d’API). Il n’en garde que des oui/non : jamais le texte, ni ton code, ni
  tes questions. `ICECREW_AMBIENT=0` le coupe.
- Aucune touche n’est simulée et aucun processus n’est interrompu.

Pour signaler une faille, voir [SECURITY.md](SECURITY.md).

## Développement

```sh
git clone https://github.com/KKanisvaran/Ai-reactions.git && cd Ai-reactions
npm ci
npm test               # build + 28 tests : bandeau, pingouin, histoires, intro, horloge, pseudo-terminal réel
npm run ai -- codex    # lanceur depuis les sources (Windows PowerShell : npm.cmd run ai -- codex)
```

`dist/` est versionné pour que l’installation n’ait rien à compiler. Après une
modification de `src/`, lance `npm run build` et commite `dist/` avec. La CI le
vérifie sur Windows, Linux et macOS.

Pour ajouter une réaction : son titre et ses légendes dans `src/reactions.ts`,
ce qui la déclenche dans `AmbientMood` (`src/ambient.ts`), la pose du pingouin
dans `penguinFrame` (même fichier) et sa scène en pixel art dans `src/scenes.ts`.

Pour ajouter une histoire : un épisode de plus dans `stories` (`src/stories.ts`),
plan par plan. Chaque plan a sa durée, sa phrase (le test vérifie qu’elle tient
en entier dans un terminal de 80 colonnes), la pose du pingouin et ce que font
les autres ; les personnages et leurs objets sont dans `src/cast.ts`.

## Licence

Code sous licence **MIT**, voir [LICENSE](LICENSE).

**Exception** : le nom et le logo **KK LAB**, la mascotte tigre (son image dans
`src/mascot-image.ts` et l’intro), le pingouin (ses poses dans `src/penguin.ts`)
et les planches de dessin (`assets/`) restent © KKanisvaran, **tous droits
réservés**. Un fork peut reprendre le code, mais doit remplacer ces éléments.

---

Un projet **KK LAB**, par [KKanisvaran](https://github.com/KKanisvaran).
