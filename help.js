function initHelp() {
    const closeBtn = document.getElementById('closeHelpBtn');
    const navigationLinks = document.querySelectorAll('.help-navigation a');

    closeBtn.addEventListener('click', closeHelp);
    
    navigationLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    document.body.classList.add('help-active');
}

function closeHelp() {
    const help = document.getElementById('help');
    if (help && help.parentNode) {
        help.parentNode.removeChild(help);
    }
    document.body.classList.remove('help-active');
}

window.initHelp = initHelp;
