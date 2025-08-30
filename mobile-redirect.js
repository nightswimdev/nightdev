/**
 * Mobile Detection and Redirect Script
 * Redirects mobile users to phone.html and blocks access to main site
 */

(function() {
    'use strict';

    // Mobile detection function
    function isMobileDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Primary mobile detection via user agent
        const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|phone|tablet/i;
        const isMobileUA = mobileRegex.test(userAgent);
        
        // Check screen size (mobile-like dimensions)
        const screenWidth = window.innerWidth || screen.width;
        const screenHeight = window.innerHeight || screen.height;
        const isMobileScreen = screenWidth <= 768 && screenHeight <= 1024;
        
        // Check for touch capability
        const isTouchDevice = 'ontouchstart' in window || 
                             navigator.maxTouchPoints > 0 || 
                             navigator.msMaxTouchPoints > 0;
        
        // Additional specific device checks
        const isIOS = /ipad|iphone|ipod/.test(userAgent);
        const isAndroid = /android/.test(userAgent);
        const isWindowsPhone = /windows phone|iemobile|wpdesktop/.test(userAgent);
        
        // Check for mobile-specific features
        const hasMobileFeatures = 'orientation' in window || 'DeviceMotionEvent' in window;
        
        // Combine all checks - prioritize user agent detection
        return isMobileUA || isIOS || isAndroid || isWindowsPhone || 
               (isMobileScreen && isTouchDevice) || 
               (isTouchDevice && hasMobileFeatures);
    }

    // Check if current page is phone.html
    function isPhonePage() {
        return window.location.pathname.includes('phone.html') || 
               window.location.href.includes('phone.html');
    }

    // Check if current page is an allowed page for mobile
    function isAllowedPage() {
        const allowedPages = ['phone.html'];
        const currentPath = window.location.pathname;
        return allowedPages.some(page => currentPath.includes(page));
    }

    // Redirect to phone.html
    function redirectToPhone() {
        const currentUrl = window.location.href;
        const baseUrl = currentUrl.split('/').slice(0, -1).join('/');
        const phoneUrl = baseUrl + '/phone.html';
        
        // Prevent infinite redirects
        if (!isPhonePage()) {
            // Add a small delay to ensure smooth transition
            setTimeout(() => {
                window.location.replace(phoneUrl);
            }, 100);
        }
    }

    // Block access function for mobile users on non-phone pages
    function blockAccess() {
        // Create overlay to block content
        const overlay = document.createElement('div');
        overlay.id = 'mobile-block-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center;
            padding: 2rem;
        `;

        // Create content for overlay
        overlay.innerHTML = `
            <div style="
                background: rgba(0, 0, 0, 0.3);
                border-radius: 20px;
                padding: 2rem;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                max-width: 90%;
            ">
                <div style="
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 1.5rem;
                    background: linear-gradient(135deg, #ff4444, #cc0000);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    box-shadow: 0 0 30px rgba(255, 68, 68, 0.4);
                ">
                    <div style="
                        position: absolute;
                        width: 40px;
                        height: 4px;
                        background: white;
                        border-radius: 2px;
                        transform: rotate(45deg);
                    "></div>
                    <div style="
                        position: absolute;
                        width: 40px;
                        height: 4px;
                        background: white;
                        border-radius: 2px;
                        transform: rotate(-45deg);
                    "></div>
                </div>
                <h2 style="
                    font-size: 1.8rem;
                    margin-bottom: 1rem;
                    background: linear-gradient(135deg, #ffffff, #cccccc);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                ">Access Restricted</h2>
                <p style="
                    color: #ff6666;
                    margin-bottom: 1rem;
                    font-size: 1.1rem;
                ">Mobile Access Issues</p>
                <p style="
                    color: #cccccc;
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                ">We're experiencing technical difficulties. Redirecting you to our mobile-optimized page...</p>
                <div style="
                    width: 30px;
                    height: 30px;
                    border: 3px solid #ff4444;
                    border-top: 3px solid transparent;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                "></div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;

        // Add overlay to page
        document.body.appendChild(overlay);

        // Redirect after showing message
        setTimeout(redirectToPhone, 2000);
    }

    // Main execution function
    function handleMobileAccess() {
        // Only run if DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', handleMobileAccess);
            return;
        }

        const isMobile = isMobileDevice();
        const isOnPhonePage = isPhonePage();

        // If mobile user and not on phone page, redirect/block
        if (isMobile && !isOnPhonePage) {
            // Hide content immediately
            document.body.style.visibility = 'hidden';
            
            // Block access and redirect
            blockAccess();
        }
        
        // If desktop user tries to access phone.html, redirect to main site
        else if (!isMobile && isOnPhonePage) {
            window.location.replace('/index.html');
        }
        
        // If mobile user is on phone page, ensure content is visible
        else if (isMobile && isOnPhonePage) {
            document.body.style.visibility = 'visible';
        }
        
        // Desktop users on main site - normal access
        else {
            document.body.style.visibility = 'visible';
        }
    }

    // Handle window resize (device orientation change)
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            // Re-check mobile status after resize
            if (isMobileDevice() && !isPhonePage()) {
                redirectToPhone();
            }
        }, 250);
    });

    // Prevent back button from bypassing redirect
    window.addEventListener('popstate', function(event) {
        if (isMobileDevice() && !isPhonePage()) {
            event.preventDefault();
            redirectToPhone();
        }
    });

    // Initialize immediately
    handleMobileAccess();

    // Also run when page is fully loaded
    window.addEventListener('load', handleMobileAccess);

})();