# icecrew · KK LAB

**Ton compagnon de code.** icecrew installe un petit pingouin en pixel art en
bas de ton terminal, sous Codex, Claude Code ou Gemini CLI. Il vit au rythme de
l’IA : il bosse avec elle, prend un café sur les longues tâches, fête la fin, se
cache les yeux quand tu l’interromps. Entre deux tâches, il te raconte ses
histoires, comme un petit dessin animé. Rien à configurer : il comprend tout
seul ce qui se passe, et ne recouvre jamais l’IA.

> **Bienvenue sur la banquise !** Ce petit pingouin est ravi de vous tenir
> compagnie pendant que vous codez. Merci de tout cœur de l’avoir installé :
> vous allez bien vous amuser ensemble !

![Le bandeau sous l’IA, quatre moments de ses histoires : Bulle pris à l’hameçon, Nounours l’ours qui demande au pingouin d’être son ami, une balade sur le dos de Bernadette la baleine, l’aurore boréale](docs/penguin-band.png)

## Installation

Il te faut **[Node.js](https://nodejs.org) 24 ou plus récent** et une IA en
ligne de commande (Codex, Claude Code ou Gemini CLI).

```sh
npm install -g icecrew
icecrew codex     # ou : icecrew claude / icecrew gemini
```

Pour l’essayer sans l’installer : `npx icecrew codex`.

- **Linux** : `npm install -g --allow-scripts=node-pty icecrew`, avec `python3`,
  `make` et `g++` installés (le terminal virtuel s’y compile).
- **Windows** : si PowerShell refuse de lancer `npm` ou `icecrew`, tape
  `npm.cmd` et `icecrew.cmd`.
- Sous Windows et macOS, l’avertissement de npm sur les scripts de `node-pty`
  est sans conséquence.

Désinstallation : `npm uninstall -g icecrew`.

## Ce qui fait réagir le pingouin

| Ce que fait l’IA | Réaction dans le bandeau |
| --- | --- |
| Elle se met au travail | Le pingouin glisse jusqu’à son ordi et s’y concentre |
| Plus de 45 s de travail | Pause café |
| Plus de 2 min 30 | L’escargot : ça traîne |
| Elle a fini vite | EZ |
| Elle a fini après une longue tâche | Trophée, cape de héros et XP |
| Elle attend ton feu vert (permission) | Regard suspicieux |
| Tu l’interromps | Facepalm |
| Erreur d’API | Pierre tombale |
| 5 min sans activité | Lunettes de soleil, pêche, puis il s’endort |

## Ses histoires

Quand tout est calme, il raconte 19 petites histoires de 20 à 45 secondes avec
sa bande : Gaspard la mouette, Bulle le poisson farceur, Flocon le bonhomme de
neige, Nounours l’ours polaire, Pistache le phoque et Bernadette la baleine.
**L’IA passe toujours en premier** : dès qu’elle se remet au travail, l’histoire
se met en pause.

Les histoires demandent au moins 60 colonnes ; dans un terminal plus étroit, le
pingouin lit, peint ou joue de la guitare. Clique sur lui, sur la mer ou dans le
ciel : il te répond.

## Commandes et réglages

| Commande | Rôle |
| --- | --- |
| `icecrew codex [args]` | Lance Codex avec le pingouin (aussi `claude` et `gemini`) |
| `icecrew intro` | Rejoue l’intro KK LAB |
| `icecrew --version` | Affiche la version |

| Variable | Effet |
| --- | --- |
| `ICECREW_INTRO=0` | Pas d’intro au lancement |
| `ICECREW_AMBIENT=0` | Pas de pingouin sous l’IA |

Le bandeau prend 10 lignes et demande un terminal d’au moins 40 × 18
caractères. La molette fait défiler l’historique de l’IA ; pour sélectionner du
texte, maintiens Maj en glissant.

![Intro KK LAB : le tigre KK LAB et son message](docs/kk-lab-intro.png)

## Vie privée

Tout reste **local** : aucune requête réseau, aucune télémétrie, rien
d’enregistré. Le pingouin lit l’écran de l’IA en mémoire pour repérer quelques
indices (travail en cours, permission, erreur) et n’en garde que des oui/non,
jamais ton code ni tes questions. Aucune touche n’est simulée. Pour signaler une
faille, voir [SECURITY.md](SECURITY.md).

## Développement

```sh
git clone https://github.com/KKanisvaran/icecrew.git && cd icecrew
npm ci
npm test               # build + tests
npm run ai -- codex    # lance depuis les sources (PowerShell : npm.cmd run ai -- codex)
```

`dist/` est versionné pour que l’installation n’ait rien à compiler : après une
modification de `src/`, lance `npm run build` et commite `dist/` avec.

## Licence

Code sous licence **MIT**, voir [LICENSE](LICENSE). Le nom et le logo **KK
LAB**, la mascotte tigre, le pingouin et ses planches de dessin restent
© KKanisvaran, **tous droits réservés** : un fork peut reprendre le code, mais
doit remplacer ces éléments.

---

Un projet **KK LAB**, par [KKanisvaran](https://github.com/KKanisvaran).
