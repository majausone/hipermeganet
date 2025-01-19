import * as TableRenderer from './TableRenderer.js';
import * as DataManager from './DataManager.js';
import * as TabFilter from './TabFilter.js';
import * as popupManager from './popupManager.js';

Object.assign(window, {
    TableRenderer,
    DataManager,
    TabFilter,
    ...popupManager,
    loadAccounts: TableRenderer.loadAccounts,
    loadChannels: TableRenderer.loadChannels,
    loadVideos: TableRenderer.loadVideos,
    loadVideoDetails: TableRenderer.loadVideoDetails,
    loadVideoDetails2: TableRenderer.loadVideoDetails2,
    loadLanguages: TableRenderer.loadLanguages,
    loadConfig: TableRenderer.loadConfig,
    editTitle: DataManager.editTitle,
    editItem: DataManager.editItem,
    deleteItem: DataManager.deleteItem,
    deleteVideo: DataManager.deleteVideo,
    applyToAll: DataManager.applyToAll,
    sortTable: TableRenderer.sortTable,
    loadTabContent: TabFilter.loadTabContent,
    syncAccount: DataManager.syncAccount,
    syncChannel: DataManager.syncChannel,
    syncAllChannels: DataManager.syncAllChannels,
    setupUnifiedFilter: TabFilter.setupUnifiedFilter,
    showChannelSelectPopup: TabFilter.showChannelSelectPopup,
    applyUnifiedFilter: TabFilter.applyUnifiedFilter,
    applyChannelFilter: TabFilter.applyChannelFilter,
    resetFilters: TabFilter.resetFilters,
    handleGoogleAuthCallback: DataManager.handleGoogleAuthCallback,
    updateConfig: DataManager.updateConfig,
    updateChannel: DataManager.updateChannel,
    updateVideo: DataManager.updateVideo
});

window.dispatchEvent(new Event('modulesLoaded'));
