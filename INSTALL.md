# Installation Guide

## Prérequis

- Firefox 109+
- Node.js 18+
- npm ou pnpm

## Étapes d'installation

### 1. Cloner et installer les dépendances

```bash
git clone <repository-url>
cd firefox-command

# Installer les dépendances du native host
cd native-host
npm install
cd ..
```

### 2. Configurer le Native Messaging Host

Le native host permet à l'extension Firefox de communiquer avec le serveur WebSocket.

#### macOS

```bash
# Créer le répertoire s'il n'existe pas
mkdir -p ~/Library/Application\ Support/Mozilla/NativeMessagingHosts

# Copier le manifeste
cp native-host/manifest.json ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/firefox_command.json

# Éditer le chemin absolu dans le manifeste
# Remplacer /REPLACE/WITH/ABSOLUTE/PATH/TO par le chemin réel
nano ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/firefox_command.json
```

Exemple de manifeste configuré :
```json
{
  "name": "firefox_command",
  "description": "Firefox Command native messaging host",
  "path": "/Users/votre-nom/Lab/firefox-command/native-host/host.js",
  "type": "stdio",
  "allowed_extensions": ["firefox-command@example.com"]
}
```

#### Linux

```bash
mkdir -p ~/.mozilla/native-messaging-hosts
cp native-host/manifest.json ~/.mozilla/native-messaging-hosts/firefox_command.json
# Éditer le chemin absolu
nano ~/.mozilla/native-messaging-hosts/firefox_command.json
```

#### Windows

```powershell
# Créer la clé de registre
# HKEY_CURRENT_USER\Software\Mozilla\NativeMessagingHosts\firefox_command
# Valeur par défaut = chemin vers le manifeste JSON
```

### 3. Rendre le host exécutable

```bash
chmod +x native-host/host.js
```

### 4. Charger l'extension dans Firefox

1. Ouvrir Firefox
2. Aller à `about:debugging#/runtime/this-firefox`
3. Cliquer sur **"Charger un module temporaire..."**
4. Sélectionner le fichier `extension/manifest.json`

### 5. Démarrer le serveur

```bash
# Optionnel : définir un token d'authentification personnalisé
export FIREFOX_COMMAND_TOKEN="votre-token-secret"

# Démarrer le native host (normalement lancé automatiquement par Firefox)
npm start
```

## Vérification

1. Cliquer sur l'icône de l'extension dans la barre d'outils Firefox
2. Vérifier que le statut indique "Connected"
3. Tester avec l'exemple :

```bash
node examples/basic-usage.js
```

## Dépannage

### L'extension ne se connecte pas au native host

1. Vérifier que le chemin dans le manifeste native messaging est correct
2. Vérifier que `host.js` est exécutable
3. Vérifier les logs dans la console de Firefox (`about:debugging` → Inspecter)

### Erreur "Native host has exited"

1. Tester le host manuellement : `node native-host/host.js`
2. Vérifier que les dépendances sont installées : `cd native-host && npm install`

### WebSocket connection refused

1. Vérifier que le port 9222 n'est pas utilisé : `lsof -i :9222`
2. Vérifier le firewall

## Développement

Pour recharger l'extension après modification :
1. Aller à `about:debugging#/runtime/this-firefox`
2. Cliquer sur "Recharger" à côté de l'extension
