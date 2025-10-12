/**
 * Performance Monitoring and Optimization Module
 * Tracks and optimizes website performance metrics
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.observers = {};
        this.init();
    }

    init() {
        this.setupPerformanceObserver();
        this.trackCoreWebVitals();
        this.setupResourceTiming();
        this.monitorMemoryUsage();
    }

    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            // Observe navigation timing
            const navObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.processNavigationEntry(entry);
                }
            });
            navObserver.observe({ entryTypes: ['navigation'] });

            // Observe resource timing
            const resourceObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.processResourceEntry(entry);
                }
            });
            resourceObserver.observe({ entryTypes: ['resource'] });

            this.observers.navigation = navObserver;
            this.observers.resource = resourceObserver;
        }
    }

    trackCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        this.trackLCP();
        
        // First Input Delay (FID)
        this.trackFID();
        
        // Cumulative Layout Shift (CLS)
        this.trackCLS();
    }

    trackLCP() {
        if ('PerformanceObserver' in window) {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.lcp = lastEntry.startTime;
                this.reportMetric('LCP', lastEntry.startTime);
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.lcp = lcpObserver;
        }
    }

    trackFID() {
        if ('PerformanceObserver' in window) {
            const fidObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.fid = entry.processingStart - entry.startTime;
                    this.reportMetric('FID', this.metrics.fid);
                }
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
            this.observers.fid = fidObserver;
        }
    }

    trackCLS() {
        if ('PerformanceObserver' in window) {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                this.metrics.cls = clsValue;
                this.reportMetric('CLS', clsValue);
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
            this.observers.cls = clsObserver;
        }
    }

    setupResourceTiming() {
        // Monitor slow resources
        window.addEventListener('load', () => {
            setTimeout(() => {
                const resources = performance.getEntriesByType('resource');
                const slowResources = resources.filter(resource => 
                    resource.duration > 1000 // Resources taking more than 1s
                );
                
                if (slowResources.length > 0) {
                    console.warn('Slow resources detected:', slowResources);
                    this.optimizeSlowResources(slowResources);
                }
            }, 1000);
        });
    }

    monitorMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.metrics.memory = {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit
                };
                
                // Warn if memory usage is high
                const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
                if (usagePercent > 80) {
                    console.warn('High memory usage detected:', usagePercent.toFixed(1) + '%');
                    this.suggestMemoryOptimization();
                }
            }, 30000); // Check every 30 seconds
        }
    }

    processNavigationEntry(entry) {
        this.metrics.navigation = {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            request: entry.responseStart - entry.requestStart,
            response: entry.responseEnd - entry.responseStart,
            dom: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            load: entry.loadEventEnd - entry.loadEventStart,
            total: entry.loadEventEnd - entry.navigationStart
        };
    }

    processResourceEntry(entry) {
        // Track resource performance
        if (entry.duration > 500) { // Resources taking more than 500ms
            console.log('Slow resource:', entry.name, entry.duration + 'ms');
        }
    }

    optimizeSlowResources(resources) {
        resources.forEach(resource => {
            const url = new URL(resource.name);
            
            // Suggest optimizations based on resource type
            if (url.pathname.endsWith('.js')) {
                console.log('Consider code splitting for:', resource.name);
            } else if (url.pathname.match(/\.(png|jpg|jpeg)$/)) {
                console.log('Consider image optimization for:', resource.name);
            } else if (url.pathname.endsWith('.css')) {
                console.log('Consider CSS optimization for:', resource.name);
            }
        });
    }

    suggestMemoryOptimization() {
        console.log('Memory optimization suggestions:');
        console.log('• Remove unused event listeners');
        console.log('• Clear large data structures');
        console.log('• Use WeakMap/WeakSet for temporary references');
        console.log('• Consider lazy loading for heavy components');
    }

    reportMetric(name, value) {
        // Report to analytics or monitoring service
        if (window.gtag) {
            window.gtag('event', 'web_vitals', {
                event_category: 'Performance',
                event_label: name,
                value: Math.round(value)
            });
        }
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`${name}: ${value.toFixed(2)}ms`);
        }
    }

    getMetrics() {
        return this.metrics;
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            metrics: this.metrics,
            recommendations: this.generateRecommendations()
        };
        
        console.table(this.metrics);
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.metrics.lcp > 2500) {
            recommendations.push('LCP is slow. Consider optimizing images and critical resources.');
        }
        
        if (this.metrics.fid > 100) {
            recommendations.push('FID is high. Consider reducing JavaScript execution time.');
        }
        
        if (this.metrics.cls > 0.1) {
            recommendations.push('CLS is high. Ensure elements have defined dimensions.');
        }
        
        return recommendations;
    }

    cleanup() {
        // Disconnect all observers
        Object.values(this.observers).forEach(observer => {
            if (observer && observer.disconnect) {
                observer.disconnect();
            }
        });
    }
}

// Auto-initialize performance monitoring
let performanceMonitor;

document.addEventListener('DOMContentLoaded', () => {
    performanceMonitor = new PerformanceMonitor();
    
    // Generate report after page load
    window.addEventListener('load', () => {
        setTimeout(() => {
            const report = performanceMonitor.generateReport();
            console.log('Performance Report:', report);
        }, 2000);
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (performanceMonitor) {
        performanceMonitor.cleanup();
    }
});

// Export for manual use
window.PerformanceMonitor = PerformanceMonitor;
window.performanceMonitor = performanceMonitor;
