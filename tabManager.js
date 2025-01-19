window.addEventListener('modulesLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const contentDiv = document.getElementById('content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const tabName = button.getAttribute('data-tab');
            window.loadTabContent(tabName);
        });
    });

    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab) {
        window.loadTabContent(activeTab.getAttribute('data-tab'));
    } else {
        const defaultTab = document.querySelector('.tab-button[data-tab="accounts"]');
        if (defaultTab) {
            defaultTab.classList.add('active');
            window.loadTabContent('accounts');
        } else {
            console.error('No se encontró la pestaña predeterminada. Asegúrate de que exista una pestaña con data-tab="accounts".');
        }
    }
});

function updateChannel(id, field, value) {
    window.electronAPI.databaseUpdate('channels', id, { [field]: value })
        .then(() => console.log(`Channel ${id} updated successfully`))
        .catch(error => console.error('Error updating channel:', error));
}

function updateVideo(id, field, value) {
    window.electronAPI.databaseUpdate('videos', id, { [field]: value })
        .then(() => console.log(`Video ${id} updated successfully`))
        .catch(error => console.error('Error updating video:', error));
}

window.updateChannel = updateChannel;
window.updateVideo = updateVideo;
