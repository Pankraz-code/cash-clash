# CASH CLASH – GitHub Pages + PeerJS

Diese Version benötigt kein Firebase-, Datenbank- oder PeerJS-Konto. GitHub Pages liefert die Dateien aus; der kostenlose öffentliche PeerJS-Dienst vermittelt die direkte Verbindung zwischen den Browsern.

## So veröffentlichst du das Spiel

1. Bei GitHub anmelden und oben rechts **+ → New repository** wählen.
2. Repository-Name: `cash-clash`. **Public** auswählen. Keine zusätzliche README, `.gitignore` oder Lizenz erzeugen und **Create repository** anklicken.
3. Auf der neuen Repository-Seite **uploading an existing file** anklicken.
4. Den Ordner `CASH-CLASH-PeerJS` auf deinem Computer öffnen und **den gesamten Inhalt des Ordners** in das Uploadfeld ziehen. Wichtig: `index.html` muss direkt oben im Repository liegen, nicht in einem zusätzlichen Unterordner.
5. Unten **Commit changes** wählen.
6. **Settings → Pages** öffnen. Unter **Build and deployment** bei Source **Deploy from a branch** auswählen. Branch **main**, Ordner **/(root)**, dann **Save**.
7. Nach ein bis drei Minuten erscheint dort die Adresse des Spiels, normalerweise `https://DEIN-NAME.github.io/cash-clash/`.

Auf der PeerJS-Webseite ist keine Registrierung und keine Einrichtung nötig.

## So funktioniert eine Lobby

- Eine Person erstellt einen Raum und bleibt mit geöffneter Spielseite online. Ihr Browser ist der Lobby-Host.
- Freunde öffnen dieselbe GitHub-Pages-Adresse und treten mit dem sechsstelligen Code bei.
- Rangliste, Coins, Boosts, Spielstarts und Glücksrad werden vom Browser des Hosts verwaltet.
- Der Host speichert den Lobbyzustand lokal in seinem Browser. Gäste erhalten den aktuellen Zustand live.
- Ein normales Neuladen stellt denselben Raum und die gespeicherten Coins wieder her; die Gäste verbinden sich nach ihrem Neuladen erneut.
- Wenn der Host die Seite schließt, endet die gemeinsame Lobby. Beim nächsten Erstellen entsteht ein neuer Raumcode.
- Der öffentliche PeerJS-Dienst ist ein kostenloser gemeinsam genutzter Dienst ohne Verfügbarkeitsgarantie. In manchen Schul- oder Firmennetzen können direkte WebRTC-Verbindungen blockiert sein.

## Datenschutz und Grenzen

PeerJS vermittelt nur die Verbindung. Danach werden Spieldaten direkt zwischen den Browsern übertragen. Die Verbindung ist über WebRTC verschlüsselt. Es gibt kein Benutzerkonto, kein Passwort und keine Echtgeldfunktion.

Da der Hostcode im Browser läuft, ist dies für einen privaten Freundeskreis gedacht und kein manipulationssicheres öffentliches Wettbewerbssystem. Spielverläufe werden beim Host deterministisch nachgerechnet; technisch versierte Spieler könnten trotzdem ihren Browsercode verändern. Namen, Coins und Bestwerte werden im lokalen Speicher des Host-Browsers gespeichert.

## Lokal prüfen

```text
npm test
npm run check
npm run dev
```

Dann `http://127.0.0.1:4173` öffnen. Für einen echten Verbindungstest müssen beide Browser den öffentlichen PeerJS-Dienst erreichen können.
