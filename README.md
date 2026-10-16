# Improve myskills app

> ∀ jour, progrès > 0

Tableau de bord personnel, sombre et « papier millimétré », pour progresser chaque jour en **échecs**, **calcul mental** et **algorithmie Python appliquée aux maths**.

Stack : **Vue 3 + Vite** (client) · **Express** (API) · stockage JSON local · Python exécuté **dans le navigateur** avec [Pyodide](https://pyodide.org).

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvre <http://localhost:5173>. (L'API tourne sur le port 3001, Vite la proxifie.)

Production locale :

```bash
npm run build
npm start          # sert l'app compilée sur http://localhost:3001
```

## Fonctionnalités

| Onglet | Contenu |
|---|---|
| **∑ Tableau de bord** | Salutation, séries, formule du jour (KaTeX), état des 3 défis, tuiles de classement, courbes d'évolution (échecs / calcul / Python / focus) avec objectifs, calendrier d'activité 26 semaines, activité récente. |
| **∂ Défis du jour** | 1 puzzle Lichess calibré sur ton classement, 1 Zetamac classique de 120 s, 1 exercice Python choisi selon ton niveau. ×1,5 XP. |
| **∇ Entraînement** | Puzzles illimités par thème (fourchette, clouage, mat en 2…) et difficulté, **carnet d'erreurs** (les puzzles ratés reviennent jusqu'à réussite), puzzle officiel Lichess du jour. 6 modes de calcul mental (classique, tables, carrés & puissances, mixte ingénieur, maths discrètes…) avec analyse du point faible. 37 exercices Python sur 5 niveaux + bouton « exercice adapté ». |
| **τ Focus** | Pomodoro / minuteur / chrono minimalistes (inspiré de studiestimer.com), plein écran, sons, notifications, tours, sessions comptabilisées. Le minuteur continue quand tu changes d'onglet. |
| **∫ Progression** | Niveaux à titres mathématiques (∅ Ensemble vide → Axiome → Lemme → … → Médaille Fields), 23 succès, thèmes tactiques les plus faibles, records Zetamac, focus par sujet. |
| **ℝ Profil & Elo** | Stats Chess.com en direct (compte `304frst` par défaut), **estimation Elo** combinant Chess.com et tes puzzles (+ équivalents Lichess / FIDE), objectifs, export / import des données. |

Raccourcis : `Alt+1…6` pour naviguer · `Ctrl+Entrée` pour lancer les tests Python · `Espace`/`R`/`F`/`N`/`L` dans Focus.

## Système de progression

- **Classement puzzle** : Elo (K = 48 → 20) contre le classement Lichess du puzzle ; initialisé avec ton classement tactique Chess.com. Indice = demi-point, solution = défaite.
- **Classement Python** : Elo contre la difficulté de l'exercice (800 → 1800 selon le niveau) ; seule la première résolution compte.
- **Zetamac** : moyenne des 5 dernières parties classiques de 120 s.
- **XP** : puzzle 15 + bonus de difficulté · Zetamac ≈ 1,2 × réponses/min · Python 25 × niveau · focus 1 XP / 2 min · défis ×1,5 + 10. Niveau *n* à 50·n·(n−1) XP.

## Estimation Elo

$$\hat R = w\,R_{\text{chess.com}} + (1-w)\,(R_{\text{puzzle}} - 550)$$

`w` croît avec le nombre de parties Chess.com et décroît avec leur incertitude (RD). Conversions Lichess / FIDE : régressions approximatives, à titre indicatif.

## Données

Tout est dans `data/db.json` (ignoré par git). Exporte-le depuis **Profil → Données**.

## Ajouter des exercices Python

Les exercices vivent dans [`scripts/gen_problems.py`](scripts/gen_problems.py) avec une **solution de référence** : les sorties attendues sont calculées en l'exécutant.

```bash
npm run gen:problems
```

## Sources

- Puzzles : [API Lichess](https://lichess.org/api) (`/api/puzzle/next`, `/api/puzzle/daily`)
- Stats : [API publique Chess.com](https://www.chess.com/news/view/published-data-api)
- Échiquier : [chessground](https://github.com/lichess-org/chessground) + [chess.js](https://github.com/jhlywa/chess.js)
- Calcul mental : d'après [Zetamac](https://arithmetic.zetamac.com)
