# -*- coding: utf-8 -*-
"""
Nexi : Infection — serveur de l'atelier SANS Internet (secours pour le stand).

  py atelier_local.py        (ou double-clic sur lancer_atelier.bat)

- Sert ce dossier (le jeu, l'atelier, la page « jouer ») sur le réseau local,
  par exemple ton partage de connexion.
- Ouvre l'atelier dans le navigateur avec l'adresse IP du PC : le QR code
  « Jouer sur mon téléphone » pointe alors vers ce PC.
- Le téléphone du visiteur doit être connecté au MÊME Wi-Fi que ce PC.
- Bibliothèque standard Python uniquement : rien à installer.
"""
import functools
import http.server
import os
import socket
import subprocess
import sys
import webbrowser

PORT = 8000
DOSSIER = os.path.dirname(os.path.abspath(__file__))


def ip_locale():
    """L'adresse du PC sur le réseau (celle que les téléphones peuvent joindre)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))   # aucune donnée envoyée : sert juste à choisir l'interface
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


class Gestionnaire(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")   # toujours la dernière version des fichiers
        super().end_headers()

    def log_message(self, *args):
        pass                                             # pas de journal des visiteurs


def main():
    # la version d'origine doit exister dans versions/ pour les liens « jouer »
    subprocess.run([sys.executable, os.path.join(DOSSIER, "outils", "archiver_version.py")], check=False)
    ip = ip_locale()
    serveur = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), functools.partial(Gestionnaire, directory=DOSSIER))
    adresse = "http://%s:%d/atelier/" % (ip, PORT)
    print("=" * 60)
    print(" Atelier Nexi : Infection - mode sans Internet")
    print(" Atelier :", adresse)
    print(" Les téléphones doivent être sur le même Wi-Fi que ce PC.")
    print(" Si Windows demande l'accès réseau : autoriser (réseau privé).")
    print(" Pour arrêter : fermer cette fenêtre (ou Ctrl+C).")
    print("=" * 60)
    webbrowser.open(adresse)
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
