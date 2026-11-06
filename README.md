# Nexi-infection

Mini-jeu modifiable via le code dans le cadre du salon Your Future.

Jeu d'action 2D en pixel art, jouable dans le navigateur (PC et téléphone), créé pour l'atelier code de NEXA Digital School au salon Your Future (Lyon). Nexi, la mascotte, descend dans l'Abysse du dark web pour récupérer le Ver Ultime et vaincre le Tyran qui a envahi la NEXA.

## Jouer

- **Version stable** (branche `main`) : https://yohanlassabliere-ash.github.io/Nexi-infection/
- **Version de test** (branche `dev`) : https://yohanlassabliere-ash.github.io/Nexi-infection/dev/
- **Démo perso** (pour tester vite : choix de la salle à chaque porte, sauvegarde séparée ; pas destinée aux visiteurs) : https://yohanlassabliere-ash.github.io/Nexi-infection/demo/

Commandes sur PC : flèches ou ZQSD, Espace (saut), J (attaque), K (compétence), Échap (pause). Sur téléphone : les boutons à l'écran.

## Modifier le jeu

Tout le jeu tient dans un seul fichier : `index.html`. Ouvre-le dans un éditeur de texte, change une valeur dans la partie `★ DÉBUTANT` (en haut du fichier), enregistre, recharge la page : c'est tout.

Le jeu ne collecte aucune donnée : la sauvegarde reste dans le navigateur du joueur.

- **Guide du code** : https://yohanlassabliere-ash.github.io/Nexi-infection/guide/ (PDF : `guide/guide_nexi_infection.pdf`)

## L'atelier (modifier le code et jouer à sa version)

- **En ligne** : https://yohanlassabliere-ash.github.io/Nexi-infection/atelier/ — le code à gauche, le jeu à droite, bouton ▶ LANCER. « Jouer sur mon téléphone » affiche un QR code : le visiteur repart avec sa version (le lien ne contient que ses modifications).
- **Sans Internet (secours)** : télécharge ce dépôt (bouton Code > Download ZIP), puis double-clic sur `lancer_atelier.bat` (Python requis). L'atelier s'ouvre avec l'adresse IP du PC ; les téléphones doivent être sur le même Wi-Fi.
- Le dossier `versions/` garde chaque version d'origine du jeu : les liens des visiteurs en ont besoin, ne le vide pas.
