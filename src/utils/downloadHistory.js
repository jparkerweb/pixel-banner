// Manages history of downloaded AI-generated images
export class DownloadHistory {
    constructor() {
        this.maxHistory = 50;
        this.loadHistory();
    }

    loadHistory() {
        const saved = localStorage.getItem('pixel-banner-download-history');
        this.history = saved ? JSON.parse(saved) : [];
    }

    saveHistory() {
        localStorage.setItem('pixel-banner-download-history', JSON.stringify(this.history));
    }

    addImage(imageId) {
        if (!this.history.includes(imageId)) {
            this.history.unshift(imageId);
            if (this.history.length > this.maxHistory) {
                this.history.pop();
            }
        }
        this.saveHistory();
    }

    hasImage(imageId) {
        return this.history.includes(imageId);
    }
}
