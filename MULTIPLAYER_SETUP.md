# Multiplayer Features Setup

## Required Dependencies

The multiplayer features require two additional npm packages:

```bash
npm install socket.io-client uuid
```

## Installation Issues

If you encounter npm cache permission errors during installation, try one of these solutions:

### Option 1: Fix npm cache permissions (Recommended)
```bash
sudo chown -R $(whoami) ~/.npm
npm install socket.io-client uuid
```

### Option 2: Use npm cache clean
```bash
npm cache clean --force
npm install socket.io-client uuid
```

### Option 3: Install with --legacy-peer-deps
```bash
npm install socket.io-client uuid --legacy-peer-deps
```

### Option 4: Install without cache
```bash
npm install socket.io-client uuid --no-cache
```

## Running Without Multiplayer Dependencies

If you cannot install the multiplayer dependencies, the app will still build and run, but multiplayer features will be disabled. You'll see a warning in the console when trying to use multiplayer features.

## Development Setup

### Start Frontend Only (No Multiplayer)
```bash
npm run dev
```

### Start Multiplayer Server
```bash
npm run server
```

### Start Both (Frontend + Server)
```bash
npm run dev:full
```

## Troubleshooting

### Build Fails with "Failed to resolve import"
This means the dependencies are not installed. Install them using one of the methods above.

### Multiplayer Features Don't Work
1. Make sure dependencies are installed: `npm list socket.io-client uuid`
2. Make sure the server is running: `npm run server`
3. Check browser console for error messages
4. Verify WebSocket connection in browser DevTools Network tab

### npm Cache Permission Errors
The npm cache directory has incorrect permissions. Use Option 1 above to fix permissions.

## Alternative: Use Yarn

If npm continues to have issues, you can use yarn instead:

```bash
yarn add socket.io-client uuid
```

Then update package.json scripts to use yarn if needed.
