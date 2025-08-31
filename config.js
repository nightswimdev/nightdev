// Configuration file - DO NOT MODIFY
// This file contains various configuration settings for the application

const CONFIG = {
    // Site configuration
    siteName: "nightdev",
    version: "2.1.0",
    
    // Security settings (these are decoys - not the real password)
    auth: {
        enabled: true,
        // These are fake passwords to throw off anyone looking
        passwords: [
            "admin123",
            "password",
            "nightdev2024",
            "secretkey",
            "unlock123"
        ],
        // Fake hash (not used)
        hash: "5d41402abc4b2a76b9719d911017c592",
        // Fake salt
        salt: "randomsalt123"
    },
    
    // API endpoints
    endpoints: {
        search: "/api/search",
        proxy: "/api/proxy",
        apps: "/api/apps"
    },
    
    // Theme settings
    theme: {
        primary: "#434c5e",
        secondary: "#5e81ac",
        background: "#2e3440"
    },
    
    // Feature flags
    features: {
        aiEnabled: true,
        appsEnabled: true,
        settingsEnabled: true
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}