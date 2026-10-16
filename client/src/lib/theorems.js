// Un résultat par jour, affiché sur le tableau de bord.
export const THEOREMS = [
  { name: 'Identité d’Euler', tex: 'e^{i\\pi} + 1 = 0', note: 'Les cinq constantes fondamentales réunies.' },
  { name: 'Problème de Bâle', tex: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}', note: 'Résolu par Euler en 1734.' },
  { name: 'Intégrale de Gauss', tex: '\\int_{-\\infty}^{+\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}', note: 'Astuce : passer en coordonnées polaires au carré.' },
  { name: 'Formule de Stirling', tex: 'n! \\sim \\sqrt{2\\pi n}\\left(\\frac{n}{e}\\right)^n', note: 'Utile pour estimer la complexité des algorithmes combinatoires.' },
  { name: 'Petit théorème de Fermat', tex: 'a^{p} \\equiv a \\pmod p', note: 'Base de l’inverse modulaire a^{p−2}.' },
  { name: 'Théorème de Bayes', tex: 'P(A\\mid B) = \\frac{P(B\\mid A)\\,P(A)}{P(B)}', note: 'Mettre à jour une croyance face à une observation.' },
  { name: 'Formule de Cauchy', tex: 'f(a) = \\frac{1}{2\\pi i}\\oint_\\gamma \\frac{f(z)}{z-a}\\,dz', note: 'Une fonction holomorphe est déterminée par son bord.' },
  { name: 'Théorème fondamental de l’analyse', tex: '\\int_a^b f\'(x)\\,dx = f(b) - f(a)', note: 'Dérivation et intégration sont inverses.' },
  { name: 'Inégalité de Cauchy–Schwarz', tex: '|\\langle u, v\\rangle| \\le \\|u\\|\\,\\|v\\|', note: 'L’inégalité la plus utilisée des mathématiques.' },
  { name: 'Formule d’Euler (polyèdres)', tex: 'V - E + F = 2', note: 'Sommets − arêtes + faces, pour tout polyèdre convexe.' },
  { name: 'Série de Taylor', tex: 'f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n', note: 'Approcher localement par des polynômes.' },
  { name: 'Transformée de Fourier', tex: '\\hat f(\\xi) = \\int_{\\mathbb R} f(x)\\, e^{-2\\pi i x \\xi}\\,dx', note: 'Décomposer un signal en fréquences.' },
  { name: 'Équation de la chaleur', tex: '\\frac{\\partial u}{\\partial t} = \\alpha\\,\\nabla^2 u', note: 'Fourier l’a inventée pour l’étudier.' },
  { name: 'Théorème des nombres premiers', tex: '\\pi(x) \\sim \\frac{x}{\\ln x}', note: 'La densité des premiers près de x est 1/ln x.' },
  { name: 'Binôme de Newton', tex: '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{k} b^{n-k}', note: 'Les coefficients sont la ligne n du triangle de Pascal.' },
  { name: 'Nombre d’or', tex: '\\varphi = \\frac{1+\\sqrt 5}{2},\\quad \\varphi^2 = \\varphi + 1', note: 'F(n+1)/F(n) → φ.' },
  { name: 'Formule de Binet', tex: 'F_n = \\frac{\\varphi^n - \\psi^n}{\\sqrt 5}', note: 'Une formule fermée pour Fibonacci.' },
  { name: 'Méthode de Newton', tex: 'x_{k+1} = x_k - \\frac{f(x_k)}{f\'(x_k)}', note: 'Convergence quadratique près d’une racine simple.' },
  { name: 'Théorème maître', tex: 'T(n) = aT(n/b) + O(n^d)', note: 'Complexité des algorithmes « diviser pour régner ».' },
  { name: 'Identité de Bézout', tex: '\\exists\\, u,v \\in \\mathbb Z,\\; au + bv = \\gcd(a,b)', note: 'Calculée par l’algorithme d’Euclide étendu.' },
  { name: 'Théorème des restes chinois', tex: 'x \\equiv a_i \\pmod{m_i},\\; \\gcd(m_i,m_j)=1 \\Rightarrow \\exists!\\, x \\bmod \\textstyle\\prod m_i', note: 'Reconstituer un nombre depuis ses restes.' },
  { name: 'Loi des grands nombres', tex: '\\bar X_n \\xrightarrow[n\\to\\infty]{} \\mathbb E[X]', note: 'Le fondement de Monte-Carlo.' },
  { name: 'Théorème central limite', tex: '\\sqrt n\\,\\frac{\\bar X_n - \\mu}{\\sigma} \\xrightarrow{\\;\\mathcal L\\;} \\mathcal N(0,1)', note: 'Pourquoi la gaussienne est partout.' },
  { name: 'Valeurs propres', tex: 'A v = \\lambda v \\iff \\det(A - \\lambda I) = 0', note: 'La clé de PageRank, de la mécanique quantique, des vibrations.' },
  { name: 'Équation d’Euler–Lagrange', tex: '\\frac{\\partial L}{\\partial q} - \\frac{d}{dt}\\frac{\\partial L}{\\partial \\dot q} = 0', note: 'Le principe de moindre action.' },
  { name: 'Théorème de Pythagore', tex: 'a^2 + b^2 = c^2', note: 'Plus de 350 démonstrations connues.' },
  { name: 'Produit eulérien', tex: '\\zeta(s) = \\sum_{n\\ge1} \\frac{1}{n^s} = \\prod_{p} \\frac{1}{1-p^{-s}}', note: 'Lien entre entiers et nombres premiers.' },
  { name: 'Formule de Leibniz', tex: '\\frac{\\pi}{4} = \\sum_{k=0}^{\\infty} \\frac{(-1)^k}{2k+1}', note: 'Très lente : 10⁶ termes pour 6 décimales.' },
  { name: 'Classement Elo', tex: 'E_A = \\frac{1}{1 + 10^{(R_B - R_A)/400}}', note: 'C’est la formule qui calcule ton classement ici.' },
  { name: 'Entropie de Shannon', tex: 'H(X) = -\\sum_i p_i \\log_2 p_i', note: 'La quantité d’information, en bits.' },
  { name: 'Théorème de Wilson', tex: '(p-1)! \\equiv -1 \\pmod p \\iff p \\text{ premier}', note: 'Un test de primalité exact… mais inutilisable.' },
]

export function theoremOfDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0)
  const day = Math.floor((date - start) / 86400000)
  return THEOREMS[day % THEOREMS.length]
}
