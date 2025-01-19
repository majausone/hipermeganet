document.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const tabButton = document.querySelector(`.tab-button[data-tab="${hash}"]`);
        if (tabButton) {
            tabButton.click();
        }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
        window.DataManager.handleGoogleAuthCallback(code);
    }

    const openDownloaderBtn = document.getElementById('openDownloaderBtn');
    if (openDownloaderBtn) {
        openDownloaderBtn.addEventListener('click', () => {
            window.TableRenderer.openDownloader();
        });
    }

    const openHelpBtn = document.getElementById('openHelpBtn');
    if (openHelpBtn) {
        openHelpBtn.addEventListener('click', () => {
            const help = document.createElement('div');
            help.id = 'help';
            document.body.appendChild(help);
            fetch('help.html')
                .then(response => response.text())
                .then(html => {
                    help.innerHTML = html;
                    window.initHelp();
                });
        });
    }
});
