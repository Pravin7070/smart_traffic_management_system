/**
 * Utility Functions
 * Common helper functions used across modules
 */

const Utils = {
    /**
     * Format a number as currency
     */
    formatCurrency: (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    },

    /**
     * Format a number with thousand separators
     */
    formatNumber: (value) => {
        return new Intl.NumberFormat('en-US').format(value);
    },

    /**
     * Format date and time
     */
    formatDateTime: (date, includeTime = true) => {
        const d = new Date(date);
        const dateStr = d.toLocaleDateString('en-US');
        const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return includeTime ? `${dateStr} ${timeStr}` : dateStr;
    },

    /**
     * Clamp a value between min and max
     */
    clamp: (value, min, max) => {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * Debounce a function
     */
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Show notification
     */
    showNotification: (message, type = 'info', duration = 3000) => {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, duration);
    },

    /**
     * Generate unique ID
     */
    generateId: () => {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Sleep for ms
     */
    sleep: (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Get color based on percentage
     */
    getColorByPercentage: (percentage) => {
        if (percentage >= 80) return '#ff4444'; // Red
        if (percentage >= 60) return '#ffaa00'; // Orange
        if (percentage >= 40) return '#ffdd00'; // Yellow
        return '#00ff88'; // Green
    },

    /**
     * Validate email
     */
    isValidEmail: (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
};
