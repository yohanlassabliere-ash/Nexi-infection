# Copie index.html dans versions/<empreinte>.html.
# Les liens « joue à ta version » (QR de l'atelier) ne contiennent que les
# différences avec cette version d'origine : il faut donc la garder en ligne.
import os
racine = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
texte = open(os.path.join(racine, "index.html"), encoding="utf-8").read().replace("\r\n", "\n")
h = 0x811C9DC5
for o in texte.encode("utf-8"):
    h ^= o
    h = (h * 0x01000193) & 0xFFFFFFFF
nom = "%08x.html" % h
os.makedirs(os.path.join(racine, "versions"), exist_ok=True)
chemin = os.path.join(racine, "versions", nom)
if not os.path.exists(chemin):
    open(chemin, "w", encoding="utf-8", newline="\n").write(texte)
print("Version d'origine :", nom)
