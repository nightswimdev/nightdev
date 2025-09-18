const swAllowedHostnames = ["localhost", "127.0.0.1"];
const dnsResolver = "8.8.8.8";

// Test bare server connectivity with proper headers
async function testBareServer(bareUrl) {
  try {
    const response = await fetch(bareUrl, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'x-bare-url,x-bare-headers',
        'Origin': window.location.origin
      }
    });
    
    // Also try a HEAD request to verify connectivity
    const headResponse = await fetch(bareUrl, {
      method: 'HEAD',
      headers: {
        'x-bare-url': 'https://example.com/',
        'x-bare-headers': JSON.stringify({})
      }
    });
    
    return response.ok || headResponse.ok || response.status === 400 || headResponse.status === 400;
  } catch (error) {
    console.warn(`Bare server ${bareUrl} test failed:`, error.message);
    return false;
  }
}

// Test all bare servers and log results
async function testAllBareServers() {
  const bareServers = Array.isArray(self.__uv$config.bare) ? self.__uv$config.bare : [self.__uv$config.bare];
  console.log("Testing bare servers...");
  
  for (const server of bareServers) {
    const isWorking = await testBareServer(server);
    console.log(`Bare server ${server}: ${isWorking ? '✓ Working' : '✗ Failed'}`);
  }
}

async function registerSW() {
  console.log("Bare servers: " + JSON.stringify(self.__uv$config.bare));

  if (
    location.protocol !== "https:" &&
    !swAllowedHostnames.includes(location.hostname)
  )
    throw new Error("Service workers cannot be registered without https.");

  if (!navigator.serviceWorker)
    throw new Error("Your browser doesn't support service workers.");

  try {
    // Unregister existing service workers to force refresh
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      await registration.unregister();
      console.log("Unregistered existing service worker");
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: __uv$config.prefix,
      updateViaCache: 'none' // Force fresh fetch
    });

    const scope = new URL(registration.scope).pathname;

    if (registration) {
      console.log("Successfully registered service worker with scope: " + scope);
      
      // Force update if there's a waiting service worker
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New service worker installed, reloading page...');
            window.location.reload();
          }
        });
      });
    } else {
      console.error("Failed to register service worker!");
    }
  } catch (error) {
    console.error("Error registering service worker: " + error.message);
  }
}

// Wait for UV config to be loaded before registering service worker
function waitForUVConfig() {
  return new Promise((resolve) => {
    if (typeof window.__uv$config !== 'undefined') {
      resolve();
      return;
    }
    
    let attempts = 0;
    const maxAttempts = 50;
    const checkConfig = () => {
      attempts++;
      if (typeof window.__uv$config !== 'undefined') {
        console.log('UV config loaded after', attempts, 'attempts');
        resolve();
      } else if (attempts < maxAttempts) {
        setTimeout(checkConfig, 100);
      } else {
        console.error('UV config failed to load after', maxAttempts, 'attempts');
        resolve(); // Continue anyway
      }
    };
    setTimeout(checkConfig, 100);
  });
}

window.addEventListener('load', async () => {
  console.log('Page loaded, waiting for UV config...');
  await waitForUVConfig();
  console.log('UV config ready, testing bare servers...');
  await testAllBareServers();
  console.log('Registering service worker...');
  await registerSW();
});