  function runStealthMode() {
    const title = "Home";
    const icon = "https://classroom.google.com/favicon.ico";
    const src = window.location.href;

    const popup = window.open("about:blank", "_blank");

    if (!popup || popup.closed) {
      alert("Popup blocked. Please allow popups for stealth mode to work.");
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <link rel="icon" href="${icon}">
          <style>
            html, body {
              margin: 0;
              padding: 0;
              height: 100%;
              overflow: hidden;
            }
            iframe {
              width: 100%;
              height: 100%;
              border: none;
            }
          </style>
        </head>
        <body>
          <iframe src="${src}"></iframe>
        </body>
      </html>
    `);
    popup.document.close();

    window.location.href = "https://classroom.google.com";
  }

  window.onload = function () {
    // Remove loader/content references as these elements don't exist in index.html
    
    const stealth = JSON.parse(localStorage.getItem("stealthModeEnabled")) || false;
    const checkbox = document.getElementById("blankMode");
    if (checkbox) {
      checkbox.checked = stealth;

      if (stealth) runStealthMode();

      checkbox.addEventListener("change", function () {
        const isChecked = checkbox.checked;
        localStorage.setItem("stealthModeEnabled", JSON.stringify(isChecked));
        if (isChecked) runStealthMode();
      });
    }
  };

  document.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      var gameName = link.textContent;
      console.log("Loading " + gameName + "...");

      // Remove loader/content references as these elements don't exist in index.html
      var iframe = document.getElementById('gameFrame');
      if (iframe) {
        iframe.onload = function () {
          // Game loaded
        };
      }
    });
  });




