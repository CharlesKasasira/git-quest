// Utility functions for optional multiplayer dependencies
// Note: These modules must be installed for multiplayer features to work
// Install with: npm install socket.io-client uuid

let socketIOClient: any = null;
let uuidModule: any = null;

// Lazy load socket.io-client
export async function getSocketIO() {
  if (socketIOClient !== null) {
    return socketIOClient;
  }

  try {
    // Dynamic import - will fail at build time if module doesn't exist
    // Users need to install: npm install socket.io-client
    const moduleName = 'socket.io-client';
    socketIOClient = await import(/* @vite-ignore */ moduleName);
    return socketIOClient;
  } catch (error) {
    console.warn('socket.io-client not available. Multiplayer features will be disabled.');
    console.warn('Install with: npm install socket.io-client uuid');
    return null;
  }
}

// Lazy load uuid
export async function getUUID() {
  if (uuidModule !== null) {
    return uuidModule;
  }

  try {
    // Dynamic import - will fail at build time if module doesn't exist
    // Users need to install: npm install uuid
    const moduleName = 'uuid';
    uuidModule = await import(/* @vite-ignore */ moduleName);
    return uuidModule;
  } catch (error) {
    console.warn('uuid not available. Using fallback ID generator.');
    console.warn('Install with: npm install uuid');
    return null;
  }
}

// Generate ID (fallback if uuid is not available)
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Get UUID v4 function (with fallback)
export async function getUUIDv4(): Promise<() => string> {
  const uuid = await getUUID();
  if (uuid && uuid.v4) {
    return uuid.v4;
  }
  return generateId;
}
