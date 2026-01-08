# Firefox Command

Extension Firefox permettant le contrôle à distance du navigateur par des agents de code (Claude, Cursor, etc.).

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│  Coding Agent   │◄──────────────────►│  Native Host     │
│  (Claude, etc.) │    localhost:9222  │  (Node.js)       │
└─────────────────┘                    └────────┬─────────┘
                                                │ Native Messaging
                                                ▼
                                       ┌──────────────────┐
                                       │ Firefox Extension│
                                       │  (Background.js) │
                                       └────────┬─────────┘
                                                │ Content Script
                                                ▼
                                       ┌──────────────────┐
                                       │   Web Page DOM   │
                                       └──────────────────┘
```

## Installation

### Prérequis

- Firefox 109+
- Node.js 18+

### Étapes

1. **Installer les dépendances**
   ```bash
   npm install
   ```

2. **Installer le native messaging host**
   ```bash
   npm run install-host
   ```

3. **Charger l'extension dans Firefox**
   - Ouvrir `about:debugging#/runtime/this-firefox`
   - Cliquer sur "Charger un module temporaire..."
   - Sélectionner `extension/manifest.json`

4. **Démarrer le serveur**
   ```bash
   npm start
   ```

## API

### Connexion

```javascript
const ws = new WebSocket('ws://localhost:9222');

ws.onopen = () => {
  // Authentification
  ws.send(JSON.stringify({
    id: '1',
    method: 'auth',
    params: { token: 'your-token' }
  }));
};
```

### Commandes disponibles

#### Navigation

| Méthode | Paramètres | Description |
|---------|------------|-------------|
| `navigate` | `{ url }` | Naviguer vers une URL |
| `back` | - | Page précédente |
| `forward` | - | Page suivante |
| `reload` | - | Recharger la page |
| `getTabs` | - | Lister les onglets |
| `switchTab` | `{ tabId }` | Changer d'onglet |
| `newTab` | `{ url? }` | Nouvel onglet |
| `closeTab` | `{ tabId? }` | Fermer un onglet |

#### Interaction DOM

| Méthode | Paramètres | Description |
|---------|------------|-------------|
| `query` | `{ selector }` | Trouver des éléments |
| `click` | `{ selector }` | Cliquer sur un élément |
| `type` | `{ selector, text }` | Saisir du texte |
| `scroll` | `{ x?, y?, selector? }` | Faire défiler |
| `hover` | `{ selector }` | Survoler un élément |

#### Extraction de données

| Méthode | Paramètres | Description |
|---------|------------|-------------|
| `getHTML` | `{ selector? }` | Récupérer le HTML |
| `getText` | `{ selector? }` | Récupérer le texte |
| `getUrl` | - | URL courante |
| `getTitle` | - | Titre de la page |
| `screenshot` | `{ fullPage? }` | Capture d'écran |

#### JavaScript

| Méthode | Paramètres | Description |
|---------|------------|-------------|
| `evaluate` | `{ code }` | Exécuter du JS |

### Format des messages

**Requête :**
```json
{
  "id": "unique-id",
  "method": "navigate",
  "params": { "url": "https://example.com" }
}
```

**Réponse :**
```json
{
  "id": "unique-id",
  "success": true,
  "result": { ... }
}
```

**Erreur :**
```json
{
  "id": "unique-id",
  "success": false,
  "error": {
    "code": "ELEMENT_NOT_FOUND",
    "message": "No element matches selector"
  }
}
```

## Développement

```bash
# Lancer en mode développement
npm run dev

# Linter
npm run lint

# Build pour distribution
npm run build
```

## Sécurité

- Le serveur WebSocket écoute uniquement sur `localhost`
- Authentification par token requise
- Permissions Firefox limitées au nécessaire

## Licence

MIT
