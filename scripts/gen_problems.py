"""Génère shared/problems.json.

Chaque exercice contient une solution de référence : les sorties attendues des
tests sont calculées en exécutant cette solution, jamais écrites à la main.

    python scripts/gen_problems.py
"""
import json
import pathlib
import textwrap

P = []


def problem(id, title, level, tags, statement, func, params, ref, tests, hint, tol=None, examples=3):
    P.append(dict(id=id, title=title, level=level, tags=tags, statement=textwrap.dedent(statement).strip(),
                  func=func, params=params, ref=textwrap.dedent(ref).strip(), tests=tests, hint=hint,
                  tol=tol, examples=examples))


# ───────────────────────────── Niveau 1 ─────────────────────────────
problem("multiples-3-5", "Multiples de 3 ou 5", 1, ["arithmétique", "boucles"],
        r"""
        Calculer la somme de tous les entiers naturels **strictement inférieurs** à $n$
        qui sont multiples de $3$ ou de $5$.

        $$S(n) = \sum_{\substack{0 \le k < n \\ 3 \mid k \;\lor\; 5 \mid k}} k$$

        *Bonus :* une formule fermée en $O(1)$ existe grâce au principe d'inclusion–exclusion.
        """, "solve", ["n"],
        """
        def solve(n):
            def s(d):
                m = (n - 1) // d
                return d * m * (m + 1) // 2
            return s(3) + s(5) - s(15)
        """, [[10], [1], [16], [1000], [10**6], [10**12]],
        "Inclusion–exclusion : multiples de 3 + multiples de 5 − multiples de 15.")

problem("factorielle", "Factorielle", 1, ["récurrence"],
        r"""
        Retourner $n! = \prod_{k=1}^{n} k$, avec la convention $0! = 1$.
        """, "solve", ["n"],
        """
        def solve(n):
            r = 1
            for k in range(2, n + 1):
                r *= k
            return r
        """, [[0], [1], [5], [10], [20], [30]],
        "Une simple boucle qui multiplie un accumulateur.")

problem("est-premier", "Test de primalité", 1, ["nombres premiers"],
        r"""
        Retourner `True` si $n$ est premier, `False` sinon.

        Rappel : il suffit de tester les diviseurs $d \le \sqrt{n}$.
        """, "solve", ["n"],
        """
        def solve(n):
            if n < 2:
                return False
            d = 2
            while d * d <= n:
                if n % d == 0:
                    return False
                d += 1
            return True
        """, [[2], [1], [17], [91], [97], [7919], [1_000_000_007], [999_999_999_999]],
        "Teste les diviseurs jusqu'à √n, pas au-delà.")

problem("pgcd", "Algorithme d'Euclide", 1, ["arithmétique", "récurrence"],
        r"""
        Calculer $\gcd(a, b)$ avec l'algorithme d'Euclide (sans `math.gcd`).

        $$\gcd(a, b) = \gcd(b,\; a \bmod b), \qquad \gcd(a, 0) = a$$
        """, "solve", ["a", "b"],
        """
        def solve(a, b):
            while b:
                a, b = b, a % b
            return a
        """, [[12, 18], [17, 5], [0, 9], [270, 192], [10**18, 6**20], [1071, 462]],
        "Remplace (a, b) par (b, a mod b) jusqu'à ce que b vaille 0.")

problem("somme-chiffres", "Somme des chiffres", 1, ["arithmétique"],
        r"""
        Retourner la somme des chiffres décimaux de $n \ge 0$, **sans convertir en chaîne**.

        Indice : $n \bmod 10$ donne le dernier chiffre, $\lfloor n / 10 \rfloor$ le retire.
        """, "solve", ["n"],
        """
        def solve(n):
            s = 0
            while n:
                s += n % 10
                n //= 10
            return s
        """, [[0], [7], [1234], [99999], [2**100]],
        "Utilise % 10 et // 10 dans une boucle.")

problem("fibonacci", "Suite de Fibonacci", 1, ["suites", "récurrence"],
        r"""
        Retourner $F_n$ avec $F_0 = 0$, $F_1 = 1$ et $F_{n} = F_{n-1} + F_{n-2}$.

        Attention : la récursion naïve est en $O(\varphi^n)$. Fais mieux.
        """, "solve", ["n"],
        """
        def solve(n):
            a, b = 0, 1
            for _ in range(n):
                a, b = b, a + b
            return a
        """, [[0], [1], [2], [10], [50], [200]],
        "Garde seulement les deux derniers termes en mémoire.")

problem("leibniz-pi", "Série de Leibniz", 1, ["séries", "analyse"],
        r"""
        Retourner la somme partielle de la série de Leibniz multipliée par 4 :

        $$\pi_n = 4 \sum_{k=0}^{n-1} \frac{(-1)^k}{2k+1}$$

        (Tolérance : $10^{-9}$.)
        """, "solve", ["n"],
        """
        def solve(n):
            return 4 * sum((-1) ** k / (2 * k + 1) for k in range(n))
        """, [[1], [2], [10], [1000], [100000]],
        "Le signe alterne : (-1)**k.", tol=1e-9)

problem("palindrome-nombre", "Nombre palindrome", 1, ["arithmétique"],
        r"""
        Retourner `True` si l'écriture décimale de $n \ge 0$ se lit pareil dans les deux sens.
        Essaie de le faire **arithmétiquement** en construisant le nombre renversé.
        """, "solve", ["n"],
        """
        def solve(n):
            r, m = 0, n
            while m:
                r = r * 10 + m % 10
                m //= 10
            return r == n
        """, [[0], [121], [123], [1221], [10], [12345678987654321]],
        "Construis r = r*10 + dernier chiffre.")

# ───────────────────────────── Niveau 2 ─────────────────────────────
problem("crible", "Crible d'Ératosthène", 2, ["nombres premiers", "tableaux"],
        r"""
        Retourner la liste triée des nombres premiers $p \le n$.

        Complexité visée : $O(n \log \log n)$.
        """, "solve", ["n"],
        """
        def solve(n):
            if n < 2:
                return []
            is_p = [True] * (n + 1)
            is_p[0] = is_p[1] = False
            i = 2
            while i * i <= n:
                if is_p[i]:
                    for j in range(i * i, n + 1, i):
                        is_p[j] = False
                i += 1
            return [i for i in range(n + 1) if is_p[i]]
        """, [[1], [10], [30], [100], [2000]],
        "Pour chaque premier p, barre ses multiples à partir de p².")

problem("decomposition", "Décomposition en facteurs premiers", 2, ["nombres premiers"],
        r"""
        Retourner la décomposition $n = \prod p_i^{e_i}$ sous forme de liste
        `[[p1, e1], [p2, e2], ...]` triée par $p$ croissant ($n \ge 2$).

        Exemple : $360 = 2^3 \cdot 3^2 \cdot 5$ → `[[2, 3], [3, 2], [5, 1]]`.
        """, "solve", ["n"],
        """
        def solve(n):
            out, d = [], 2
            while d * d <= n:
                if n % d == 0:
                    e = 0
                    while n % d == 0:
                        n //= d
                        e += 1
                    out.append([d, e])
                d += 1
            if n > 1:
                out.append([n, 1])
            return out
        """, [[360], [2], [97], [1024], [600851475143], [2 * 3 * 5 * 7 * 11 * 13 * 17]],
        "Divise par d tant que possible, puis passe à d+1 ; s'arrêter à √n.")

problem("conversion-base", "Changement de base", 2, ["numération"],
        r"""
        Écrire $n \ge 0$ en base $b$ ($2 \le b \le 16$) et retourner la chaîne obtenue,
        avec les chiffres `0-9` puis `A-F`.

        $$n = \sum_k d_k\, b^k, \quad 0 \le d_k < b$$
        """, "solve", ["n", "b"],
        """
        def solve(n, b):
            digits = "0123456789ABCDEF"
            if n == 0:
                return "0"
            s = ""
            while n:
                s = digits[n % b] + s
                n //= b
            return s
        """, [[10, 2], [255, 16], [0, 7], [2026, 3], [123456789, 16], [8, 8]],
        "Divisions successives par b : les restes donnent les chiffres de droite à gauche.")

problem("collatz", "Conjecture de Syracuse", 2, ["suites"],
        r"""
        Pour $n \ge 1$, on itère $u \mapsto u/2$ si $u$ est pair, $u \mapsto 3u+1$ sinon.
        Retourner le **nombre d'étapes** pour atteindre $1$.
        """, "solve", ["n"],
        """
        def solve(n):
            s = 0
            while n != 1:
                n = n // 2 if n % 2 == 0 else 3 * n + 1
                s += 1
            return s
        """, [[1], [6], [7], [27], [97], [837799]],
        "Compte les itérations dans une boucle while.")

problem("nombres-parfaits", "Nombres parfaits", 2, ["diviseurs"],
        r"""
        Un entier est **parfait** s'il est égal à la somme de ses diviseurs propres
        (ex. $28 = 1+2+4+7+14$). Retourner la liste des nombres parfaits $\le n$.
        """, "solve", ["n"],
        """
        def solve(n):
            out = []
            for k in range(2, n + 1):
                s, d = 1, 2
                while d * d <= k:
                    if k % d == 0:
                        s += d
                        if d != k // d:
                            s += k // d
                    d += 1
                if s == k:
                    out.append(k)
            return out
        """, [[10], [30], [500], [10000]],
        "Les diviseurs vont par paires (d, k/d) : boucle jusqu'à √k.")

problem("pascal", "Triangle de Pascal", 2, ["combinatoire"],
        r"""
        Retourner la ligne $n$ du triangle de Pascal : $\left[\binom{n}{0}, \binom{n}{1}, \dots, \binom{n}{n}\right]$.

        $$\binom{n}{k} = \binom{n-1}{k-1} + \binom{n-1}{k}$$
        """, "solve", ["n"],
        """
        def solve(n):
            row = [1]
            for _ in range(n):
                row = [1] + [row[i] + row[i + 1] for i in range(len(row) - 1)] + [1]
            return row
        """, [[0], [1], [4], [10], [30]],
        "Construis chaque ligne à partir de la précédente.")

problem("ppcm-liste", "PPCM d'une liste", 2, ["arithmétique"],
        r"""
        Retourner $\operatorname{ppcm}(a_1, \dots, a_k)$ pour une liste d'entiers positifs.

        $$\operatorname{ppcm}(a,b) = \frac{a\,b}{\gcd(a,b)}$$
        """, "solve", ["nums"],
        """
        def solve(nums):
            from math import gcd
            r = 1
            for x in nums:
                r = r * x // gcd(r, x)
            return r
        """, [[[4, 6]], [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], [[7]], [list(range(1, 21))], [[12, 18, 30]]],
        "ppcm est associatif : réduis la liste deux par deux.")

problem("newton-sqrt", "Racine carrée par Newton", 2, ["analyse numérique"],
        r"""
        Approcher $\sqrt{x}$ ($x \ge 0$) par la méthode de Newton–Raphson **sans `math.sqrt` ni `** 0.5`** :

        $$u_{k+1} = \frac{1}{2}\left(u_k + \frac{x}{u_k}\right)$$

        (Tolérance relative : $10^{-9}$.)
        """, "solve", ["x"],
        """
        def solve(x):
            if x == 0:
                return 0.0
            u = x if x > 1 else 1.0
            for _ in range(200):
                v = 0.5 * (u + x / u)
                if abs(v - u) < 1e-15 * v:
                    break
                u = v
            return v
        """, [[4], [2], [0], [0.25], [1e10], [12345.678]],
        "Commence avec u₀ = x (ou 1) et itère jusqu'à stabilisation.", tol=1e-9)

problem("derivee-polynome", "Dérivée d'un polynôme", 2, ["algèbre"],
        r"""
        Un polynôme $P(x) = c_0 + c_1 x + \dots + c_d x^d$ est représenté par `[c0, c1, ..., cd]`.
        Retourner les coefficients de $P'$ (liste `[0]` si $P$ est constant).
        """, "solve", ["coeffs"],
        """
        def solve(coeffs):
            d = [k * coeffs[k] for k in range(1, len(coeffs))]
            return d if d else [0]
        """, [[[5]], [[1, 2, 3]], [[0, 0, 0, 4]], [[3, -1, 0, 2, 7]]],
        "Le coefficient de xᵏ⁻¹ dans P' est k·cₖ.")

# ───────────────────────────── Niveau 3 ─────────────────────────────
problem("expo-modulaire", "Exponentiation rapide modulaire", 3, ["arithmétique modulaire", "diviser pour régner"],
        r"""
        Calculer $a^b \bmod m$ en $O(\log b)$ **sans utiliser `pow` à trois arguments**.

        $$a^{b} = \begin{cases} (a^{b/2})^2 & b \text{ pair} \\ a \cdot a^{b-1} & b \text{ impair}\end{cases}$$
        """, "solve", ["a", "b", "m"],
        """
        def solve(a, b, m):
            r, a = 1 % m, a % m
            while b:
                if b & 1:
                    r = r * a % m
                a = a * a % m
                b >>= 1
            return r
        """, [[2, 10, 1000], [3, 0, 7], [7, 128, 13], [123456789, 10**18, 10**9 + 7], [5, 3, 1]],
        "Parcours les bits de b : carré à chaque étape, multiplie quand le bit vaut 1.")

problem("phi-euler", "Indicatrice d'Euler", 3, ["arithmétique modulaire", "nombres premiers"],
        r"""
        Retourner $\varphi(n)$, le nombre d'entiers $1 \le k \le n$ premiers avec $n$.

        $$\varphi(n) = n \prod_{p \mid n}\left(1 - \frac{1}{p}\right)$$
        """, "solve", ["n"],
        """
        def solve(n):
            r, d = n, 2
            while d * d <= n:
                if n % d == 0:
                    while n % d == 0:
                        n //= d
                    r -= r // d
                d += 1
            if n > 1:
                r -= r // n
            return r
        """, [[1], [9], [10], [36], [97], [1_000_000]],
        "Factorise n et applique la formule produit, en restant en entiers.")

problem("simpson", "Intégration de Simpson", 3, ["analyse numérique", "polynômes"],
        r"""
        Approcher $\int_a^b P(x)\,dx$ par la méthode de Simpson composite avec $n$ sous-intervalles ($n$ pair),
        où $P$ est donné par ses coefficients `[c0, c1, ...]`.

        $$\int_a^b f \approx \frac{h}{3}\Big[f(x_0) + 4\!\!\sum_{i \text{ impair}}\! f(x_i) + 2\!\!\sum_{i \text{ pair}}\! f(x_i) + f(x_n)\Big]$$

        (Tolérance : $10^{-6}$.)
        """, "solve", ["coeffs", "a", "b", "n"],
        """
        def solve(coeffs, a, b, n):
            f = lambda x: sum(c * x ** k for k, c in enumerate(coeffs))
            h = (b - a) / n
            s = f(a) + f(b)
            for i in range(1, n):
                s += (4 if i % 2 else 2) * f(a + i * h)
            return s * h / 3
        """, [[[0, 0, 1], 0, 3, 10], [[1], 0, 1, 2], [[0, 0, 0, 0, 1], -1, 2, 100], [[2, -3, 0, 1, 0, 1], 0, 1, 1000]],
        "Évalue P avec Horner ou une somme, puis applique les poids 1-4-2-4-…-4-1.", tol=1e-6)

problem("produit-matrices", "Produit matriciel", 3, ["algèbre linéaire"],
        r"""
        Retourner $C = A B$ pour $A \in \mathcal{M}_{n,p}$ et $B \in \mathcal{M}_{p,q}$ (listes de listes).

        $$C_{ij} = \sum_{k=1}^{p} A_{ik} B_{kj}$$
        """, "solve", ["A", "B"],
        """
        def solve(A, B):
            return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]
        """, [[[[1, 2], [3, 4]], [[5, 6], [7, 8]]], [[[1, 0, 2]], [[1], [2], [3]]], [[[2]], [[3]]],
              [[[1, 2, 3], [4, 5, 6]], [[7, 8], [9, 10], [11, 12]]]],
        "Trois boucles imbriquées : i, j, puis k pour la somme.")

problem("determinant", "Déterminant exact", 3, ["algèbre linéaire"],
        r"""
        Retourner $\det(M)$ pour une matrice carrée à coefficients **entiers**. Le résultat doit être un entier exact.

        Le développement de Laplace est en $O(n!)$ ; vise le pivot de Gauss (avec `fractions.Fraction`)
        ou l'algorithme de Bareiss en $O(n^3)$.
        """, "solve", ["M"],
        """
        def solve(M):
            from fractions import Fraction
            A = [[Fraction(x) for x in row] for row in M]
            n, det = len(A), Fraction(1)
            for c in range(n):
                p = next((r for r in range(c, n) if A[r][c] != 0), None)
                if p is None:
                    return 0
                if p != c:
                    A[c], A[p] = A[p], A[c]
                    det = -det
                det *= A[c][c]
                for r in range(c + 1, n):
                    f = A[r][c] / A[c][c]
                    for k in range(c, n):
                        A[r][k] -= f * A[c][k]
            return int(det)
        """, [[[[3]]], [[[1, 2], [3, 4]]], [[[2, 0, 1], [1, 3, 2], [1, 1, 1]]], [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]],
              [[[0, 1], [1, 0]]], [[[i ** j for j in range(6)] for i in range(1, 7)]]],
        "Triangule la matrice ; le déterminant est le produit des pivots (attention aux échanges de lignes).")

problem("inverse-modulaire", "Inverse modulaire", 3, ["arithmétique modulaire"],
        r"""
        Retourner l'unique $x \in [0, m)$ tel que $a x \equiv 1 \pmod m$, ou $-1$ s'il n'existe pas.

        Utilise l'algorithme d'Euclide étendu : trouve $u, v$ tels que $au + mv = \gcd(a, m)$.
        """, "solve", ["a", "m"],
        """
        def solve(a, m):
            r0, r1, u0, u1 = a % m, m, 1, 0
            while r1:
                q = r0 // r1
                r0, r1 = r1, r0 - q * r1
                u0, u1 = u1, u0 - q * u1
            return u0 % m if r0 == 1 else -1
        """, [[3, 11], [10, 17], [6, 9], [1, 1], [123456789, 10**9 + 7], [42, 2017]],
        "L'inverse existe ssi gcd(a, m) = 1 ; c'est alors le coefficient u de Bézout.")

problem("racine-polynome", "Newton–Raphson sur un polynôme", 3, ["analyse numérique", "polynômes"],
        r"""
        Partant de $x_0$, appliquer Newton–Raphson à $P$ (coefficients `[c0, c1, ...]`) :

        $$x_{k+1} = x_k - \frac{P(x_k)}{P'(x_k)}$$

        jusqu'à $|x_{k+1} - x_k| < 10^{-12}$ (au plus 100 itérations) et retourner la racine trouvée.
        (Tolérance : $10^{-6}$.)
        """, "solve", ["coeffs", "x0"],
        """
        def solve(coeffs, x0):
            P = lambda x: sum(c * x ** k for k, c in enumerate(coeffs))
            dP = lambda x: sum(k * c * x ** (k - 1) for k, c in enumerate(coeffs) if k)
            x = x0
            for _ in range(100):
                nx = x - P(x) / dP(x)
                if abs(nx - x) < 1e-12:
                    return nx
                x = nx
            return x
        """, [[[-2, 0, 1], 1.0], [[-2, 0, 1], -3.0], [[-1, -1, 1], 2.0], [[-6, 11, -6, 1], 3.6], [[-5, 0, 0, 1], 2.0]],
        "Code P et P' séparément (ou avec Horner) et itère.", tol=1e-6)

problem("nombres-amicaux", "Nombres amicaux", 3, ["diviseurs"],
        r"""
        Soit $d(n)$ la somme des diviseurs propres de $n$. Si $d(a) = b$, $d(b) = a$ et $a \ne b$, alors $a$ et $b$
        sont **amicaux** (ex. $220$ et $284$). Retourner la somme de tous les nombres amicaux $< n$.
        """, "solve", ["n"],
        """
        def solve(n):
            N = max(n, 2) * 4
            d = [0] * N
            for i in range(1, N):
                for j in range(2 * i, N, i):
                    d[j] += i
            tot = 0
            for a in range(2, n):
                b = d[a]
                if b != a and b < N and d[b] == a:
                    tot += a
            return tot
        """, [[300], [1000], [10000], [20000]],
        "Pré-calcule d(k) pour tous les k avec un crible additif.")

# ───────────────────────────── Niveau 4 ─────────────────────────────
problem("fibonacci-matrice", "Fibonacci en O(log n)", 4, ["algèbre linéaire", "arithmétique modulaire"],
        r"""
        Retourner $F_n \bmod m$ pour $n$ pouvant aller jusqu'à $10^{18}$.

        $$\begin{pmatrix}1 & 1\\ 1 & 0\end{pmatrix}^{n} = \begin{pmatrix}F_{n+1} & F_n\\ F_n & F_{n-1}\end{pmatrix}$$
        """, "solve", ["n", "m"],
        """
        def solve(n, m):
            def mul(X, Y):
                return [[(X[0][0]*Y[0][0] + X[0][1]*Y[1][0]) % m, (X[0][0]*Y[0][1] + X[0][1]*Y[1][1]) % m],
                        [(X[1][0]*Y[0][0] + X[1][1]*Y[1][0]) % m, (X[1][0]*Y[0][1] + X[1][1]*Y[1][1]) % m]]
            R, M = [[1, 0], [0, 1]], [[1, 1], [1, 0]]
            while n:
                if n & 1:
                    R = mul(R, M)
                M = mul(M, M)
                n >>= 1
            return R[0][1] % m
        """, [[10, 1000], [0, 7], [1, 7], [100, 10**9 + 7], [10**18, 10**9 + 7], [2026, 1]],
        "Exponentiation rapide… mais sur des matrices 2×2.")

problem("partitions", "Partitions d'un entier", 4, ["combinatoire", "programmation dynamique"],
        r"""
        Retourner $p(n)$, le nombre de façons d'écrire $n$ comme somme d'entiers positifs (sans tenir compte de l'ordre).
        Ex. $p(4) = 5$ : $4,\ 3{+}1,\ 2{+}2,\ 2{+}1{+}1,\ 1{+}1{+}1{+}1$.
        """, "solve", ["n"],
        """
        def solve(n):
            p = [1] + [0] * n
            for k in range(1, n + 1):
                for s in range(k, n + 1):
                    p[s] += p[s - k]
            return p[n]
        """, [[1], [4], [5], [10], [100], [500]],
        "DP : p[s] += p[s − k] pour chaque taille de part k (comme un rendu de monnaie).")

problem("chemins-grille", "Chemins dans une grille", 4, ["combinatoire", "programmation dynamique"],
        r"""
        Une grille est donnée par une liste de lignes de `0` (libre) et `1` (obstacle).
        Compter les chemins du coin haut-gauche au coin bas-droite en ne se déplaçant **qu'à droite ou en bas**.

        Sans obstacle, la réponse est $\binom{h+w-2}{h-1}$.
        """, "solve", ["grid"],
        """
        def solve(grid):
            h, w = len(grid), len(grid[0])
            dp = [[0] * w for _ in range(h)]
            for i in range(h):
                for j in range(w):
                    if grid[i][j]:
                        continue
                    if i == 0 and j == 0:
                        dp[i][j] = 1
                    else:
                        dp[i][j] = (dp[i-1][j] if i else 0) + (dp[i][j-1] if j else 0)
            return dp[-1][-1]
        """, [[[[0, 0], [0, 0]]], [[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], [[[0] * 10 for _ in range(10)]], [[[1]]],
              [[[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [1, 0, 1, 0]]], [[[0] * 18 for _ in range(18)]]],
        "dp[i][j] = dp[i−1][j] + dp[i][j−1], et 0 sur un obstacle.")

problem("lis", "Plus longue sous-suite croissante", 4, ["programmation dynamique"],
        r"""
        Retourner la longueur de la plus longue sous-suite **strictement croissante** de `nums`.

        $O(n^2)$ passe, mais $O(n \log n)$ (patience sorting + recherche dichotomique) est l'objectif.
        """, "solve", ["nums"],
        """
        def solve(nums):
            from bisect import bisect_left
            tails = []
            for x in nums:
                i = bisect_left(tails, x)
                if i == len(tails):
                    tails.append(x)
                else:
                    tails[i] = x
            return len(tails)
        """, [[[10, 9, 2, 5, 3, 7, 101, 18]], [[]], [[5, 5, 5]], [[1, 2, 3, 4]], [[(i * 7919) % 1009 for i in range(3000)]]],
        "tails[k] = plus petite fin possible d'une sous-suite de longueur k+1.")

problem("rendu-monnaie", "Rendu de monnaie optimal", 4, ["programmation dynamique"],
        r"""
        Avec des pièces de valeurs `pieces` (quantité illimitée), retourner le **nombre minimal** de pièces
        pour former exactement `montant`, ou $-1$ si c'est impossible.
        L'algorithme glouton n'est pas toujours optimal (essaie $\{1, 3, 4\}$ et $6$).
        """, "solve", ["pieces", "montant"],
        """
        def solve(pieces, montant):
            INF = float("inf")
            dp = [0] + [INF] * montant
            for s in range(1, montant + 1):
                for c in pieces:
                    if c <= s and dp[s - c] + 1 < dp[s]:
                        dp[s] = dp[s - c] + 1
            return dp[montant] if dp[montant] != INF else -1
        """, [[[1, 3, 4], 6], [[2], 3], [[1, 2, 5], 11], [[7], 0], [[186, 419, 83, 408], 6249], [[3, 7, 405, 436], 8839]],
        "dp[s] = 1 + min(dp[s − c]) sur les pièces c ≤ s.")

problem("gauss", "Système linéaire (pivot de Gauss)", 4, ["algèbre linéaire", "analyse numérique"],
        r"""
        Résoudre $A x = b$ pour $A$ carrée inversible et retourner $x$ (liste de flottants).
        Utilise le pivot de Gauss **avec pivot partiel** (choisir le plus grand $|a_{ic}|$).

        (Tolérance : $10^{-6}$.)
        """, "solve", ["A", "b"],
        """
        def solve(A, b):
            n = len(A)
            M = [list(map(float, A[i])) + [float(b[i])] for i in range(n)]
            for c in range(n):
                p = max(range(c, n), key=lambda r: abs(M[r][c]))
                M[c], M[p] = M[p], M[c]
                for r in range(n):
                    if r != c:
                        f = M[r][c] / M[c][c]
                        for k in range(c, n + 1):
                            M[r][k] -= f * M[c][k]
            return [M[i][n] / M[i][i] for i in range(n)]
        """, [[[[2, 1], [1, 3]], [3, 5]], [[[1, 0, 0], [0, 2, 0], [0, 0, 4]], [1, 1, 1]],
              [[[0, 1], [1, 0]], [2, 3]], [[[3, 2, -1], [2, -2, 4], [-1, 0.5, -1]], [1, -2, 0]],
              [[[4, -2, 1, 3], [3, 6, -4, 2], [2, 1, 8, -5], [1, -1, 2, 7]], [20, 9, 14, 18]]],
        "Élimine colonne par colonne ; pense à échanger les lignes si le pivot est nul.", tol=1e-6)

problem("binomial-mod", "Coefficients binomiaux modulo p", 4, ["combinatoire", "arithmétique modulaire"],
        r"""
        Retourner $\binom{n}{k} \bmod p$ avec $p = 10^9 + 7$ (premier) et $n \le 10^6$.

        $$\binom{n}{k} = \frac{n!}{k!\,(n-k)!} \equiv n! \cdot (k!)^{-1} \cdot ((n-k)!)^{-1} \pmod p$$

        Rappel (Fermat) : $a^{-1} \equiv a^{p-2} \pmod p$.
        """, "solve", ["n", "k"],
        """
        def solve(n, k):
            p = 10**9 + 7
            if k < 0 or k > n:
                return 0
            num = den = 1
            for i in range(k):
                num = num * (n - i) % p
                den = den * (i + 1) % p
            return num * pow(den, p - 2, p) % p
        """, [[5, 2], [10, 0], [3, 5], [1000, 500], [10**6, 123456], [52, 5]],
        "Calcule numérateur et dénominateur modulo p, puis inverse le dénominateur.")

# ───────────────────────────── Niveau 5 ─────────────────────────────
problem("somme-premiers", "Somme des premiers ≤ n", 5, ["nombres premiers", "performance"],
        r"""
        Retourner $\displaystyle\sum_{p \le n,\ p \text{ premier}} p$ pour $n$ jusqu'à $2\cdot 10^6$
        (le code tourne dans le navigateur : il faut un crible efficace, idéalement avec `bytearray` et du slicing).
        """, "solve", ["n"],
        """
        def solve(n):
            if n < 2:
                return 0
            s = bytearray([1]) * (n + 1)
            s[0] = s[1] = 0
            for i in range(2, int(n ** 0.5) + 1):
                if s[i]:
                    s[i*i::i] = bytes(len(range(i*i, n + 1, i)))
            return sum(i for i in range(n + 1) if s[i])
        """, [[10], [1], [100], [2 * 10**6]],
        "Le slicing s[i*i::i] = bytes(...) barre tous les multiples d'un coup.")

problem("restes-chinois", "Théorème des restes chinois", 5, ["arithmétique modulaire"],
        r"""
        Trouver le plus petit $x \ge 0$ tel que $x \equiv r_i \pmod{m_i}$ pour tout $i$.
        Les modules **ne sont pas forcément premiers entre eux** : retourner $-1$ si le système est incompatible.

        Pour deux congruences : solution ssi $\gcd(m_1, m_2) \mid r_2 - r_1$.
        """, "solve", ["restes", "modules"],
        """
        def solve(restes, modules):
            from math import gcd
            x, M = 0, 1
            for r, m in zip(restes, modules):
                g = gcd(M, m)
                if (r - x) % g:
                    return -1
                l = M // g * m
                t = ((r - x) // g) * pow(M // g, -1, m // g) % (m // g) if m // g > 1 else 0
                x = (x + M * t) % l
                M = l
            return x % M
        """, [[[2, 3, 2], [3, 5, 7]], [[1, 2], [4, 6]], [[3, 1], [4, 6]], [[0], [5]], [[1, 2, 3, 4], [5, 7, 9, 11]],
              [[10, 4, 12], [11, 12, 13]]],
        "Fusionne les congruences deux à deux avec l'inverse modulaire de M/g modulo m/g.")

problem("triangulaire-diviseurs", "Triangulaire très divisible", 5, ["diviseurs", "performance"],
        r"""
        Les nombres triangulaires sont $T_k = \frac{k(k+1)}{2}$. Retourner le premier $T_k$ ayant **strictement plus de**
        $d$ diviseurs.

        Astuce : $k$ et $k+1$ sont premiers entre eux, donc $\tau(T_k)$ se factorise.
        """, "solve", ["d"],
        """
        def solve(d):
            def tau(n):
                c, p = 1, 2
                while p * p <= n:
                    e = 0
                    while n % p == 0:
                        n //= p
                        e += 1
                    c *= e + 1
                    p += 1
                return c * (2 if n > 1 else 1)
            k = 1
            while True:
                a, b = (k // 2, k + 1) if k % 2 == 0 else (k, (k + 1) // 2)
                if tau(a) * tau(b) > d:
                    return k * (k + 1) // 2
                k += 1
        """, [[1], [5], [50], [200], [320]],
        "τ est multiplicative : τ(T_k) = τ(k/2)·τ(k+1) ou τ(k)·τ((k+1)/2).")

problem("marches-graphe", "Marches dans un graphe", 5, ["algèbre linéaire", "graphes"],
        r"""
        Soit $A$ la matrice d'adjacence d'un graphe orienté à $n$ sommets. Le nombre de marches de longueur $k$
        de $i$ à $j$ vaut $(A^k)_{ij}$. Retourner le nombre de marches de longueur $k$ du sommet $0$ au sommet $n-1$,
        modulo $10^9+7$, avec $k$ jusqu'à $10^{12}$.
        """, "solve", ["adj", "k"],
        """
        def solve(adj, k):
            MOD = 10**9 + 7
            n = len(adj)
            def mul(X, Y):
                return [[sum(X[i][t] * Y[t][j] for t in range(n)) % MOD for j in range(n)] for i in range(n)]
            R = [[int(i == j) for j in range(n)] for i in range(n)]
            M = [row[:] for row in adj]
            while k:
                if k & 1:
                    R = mul(R, M)
                M = mul(M, M)
                k >>= 1
            return R[0][n - 1]
        """, [[[[0, 1], [1, 0]], 3], [[[0, 1], [1, 0]], 2], [[[1, 1, 0], [0, 1, 1], [1, 0, 1]], 5],
              [[[0, 1, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 1, 0]], 10**12], [[[1]], 7]],
        "Exponentiation rapide de la matrice d'adjacence.")

problem("cycle-decimal", "Période du développement décimal", 5, ["arithmétique modulaire", "numération"],
        r"""
        Pour $2 \le d < n$, $\frac{1}{d}$ a un développement décimal éventuellement périodique.
        Retourner le $d$ dont la **période** est la plus longue (le plus petit en cas d'égalité).

        La période de $1/d$ (après avoir retiré les facteurs $2$ et $5$) est l'ordre multiplicatif de $10$ modulo $d$.
        """, "solve", ["n"],
        """
        def solve(n):
            best, best_d = -1, 2
            for d in range(2, n):
                m = d
                while m % 2 == 0:
                    m //= 2
                while m % 5 == 0:
                    m //= 5
                if m == 1:
                    L = 0
                else:
                    L, r = 1, 10 % m
                    while r != 1:
                        r = r * 10 % m
                        L += 1
                if L > best:
                    best, best_d = L, d
            return best_d
        """, [[10], [100], [1000], [3000]],
        "Simule la division longue, ou calcule l'ordre de 10 modulo d.")


SAFE = 2**53 - 1


def enc(v):
    """Les entiers > 2^53 perdraient leur précision en JavaScript : on les encode {"$big": "..."}."""
    if isinstance(v, bool):
        return v
    if isinstance(v, int) and abs(v) > SAFE:
        return {"$big": str(v)}
    if isinstance(v, (list, tuple)):
        return [enc(x) for x in v]
    return v


def main():
    out = []
    for p in P:
        ns = {}
        exec(p["ref"], ns)
        f = ns[p["func"]]
        tests = []
        for args in p["tests"]:
            got = f(*json.loads(json.dumps(args)))
            tests.append({"args": enc(args), "expected": enc(got)})
        q = {k: v for k, v in p.items() if k not in ("tests", "ref")}
        q["tests"] = tests
        q["solution"] = p["ref"]
        q["rating"] = 800 + 250 * (p["level"] - 1)
        q["starter"] = f"def {p['func']}({', '.join(p['params'])}):\n    # ton code ici\n    pass\n"
        out.append(q)
    dest = pathlib.Path(__file__).resolve().parent.parent / "shared" / "problems.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(out)} exercices -> {dest}")
    for lvl in range(1, 6):
        print(f"  niveau {lvl}: {sum(1 for q in out if q['level'] == lvl)}")


if __name__ == "__main__":
    main()
