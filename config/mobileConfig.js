// Mobile optimization configurations for different font styles
const mobileConfig = {
    // Global mobile container settings
    global: {
        targetWidth: 340,
        targetHeight: 148,
        safeZonePadding: 10,
        maxFontSize: 120,
        minFontSize: 24,
        defaultScalingFactor: 0.8,
        qualityThresholds: {
            excellent: 90,
            good: 70,
            acceptable: 50,
            poor: 30
        }
    },

    // Font-specific mobile configurations
    fontConfigs: {
        // Elegant fonts - generally need smaller sizes for mobile
        zephyr: {
            mobileScaleFactor: 0.75,
            preferredFontSize: 85,
            heightAdjustment: 0.9,
            clippingTolerance: 0.05
        },
        quixel: {
            mobileScaleFactor: 0.8,
            preferredFontSize: 90,
            heightAdjustment: 0.85,
            clippingTolerance: 0.03
        },
        prism: {
            mobileScaleFactor: 0.72,
            preferredFontSize: 80,
            heightAdjustment: 0.95,
            clippingTolerance: 0.05
        },

        // Bold/strong fonts - can handle larger sizes
        nexus: {
            mobileScaleFactor: 0.85,
            preferredFontSize: 95,
            heightAdjustment: 0.8,
            clippingTolerance: 0.02
        },
        vortex: {
            mobileScaleFactor: 0.82,
            preferredFontSize: 92,
            heightAdjustment: 0.82,
            clippingTolerance: 0.03
        },

        // Script fonts - need careful sizing
        flux: {
            mobileScaleFactor: 0.7,
            preferredFontSize: 75,
            heightAdjustment: 1.0,
            clippingTolerance: 0.08
        },
        crisp: {
            mobileScaleFactor: 0.78,
            preferredFontSize: 88,
            heightAdjustment: 0.88,
            clippingTolerance: 0.04
        },

        // Artistic fonts - require special handling
        ember: {
            mobileScaleFactor: 0.65,
            preferredFontSize: 75,
            heightAdjustment: 0.85,
            clippingTolerance: 0.08
        },
        storm: {
            mobileScaleFactor: 0.68,
            preferredFontSize: 75,
            heightAdjustment: 0.85,
            clippingTolerance: 0.08
        },

        // Minimalist fonts - can use larger sizes
        lunar: {
            mobileScaleFactor: 0.88,
            preferredFontSize: 100,
            heightAdjustment: 0.75,
            clippingTolerance: 0.02
        },
        pixel: {
            mobileScaleFactor: 0.9,
            preferredFontSize: 105,
            heightAdjustment: 0.7,
            clippingTolerance: 0.01
        },

        // Default configurations for remaining fonts
        frost: {
            mobileScaleFactor: 0.8,
            preferredFontSize: 90,
            heightAdjustment: 0.85,
            clippingTolerance: 0.04
        },
        drift: {
            mobileScaleFactor: 0.79,
            preferredFontSize: 89,
            heightAdjustment: 0.87,
            clippingTolerance: 0.04
        },
        blaze: {
            mobileScaleFactor: 0.81,
            preferredFontSize: 91,
            heightAdjustment: 0.83,
            clippingTolerance: 0.03
        },
        ocean: {
            mobileScaleFactor: 0.77,
            preferredFontSize: 87,
            heightAdjustment: 0.89,
            clippingTolerance: 0.05
        },
        ghost: {
            mobileScaleFactor: 0.74,
            preferredFontSize: 84,
            heightAdjustment: 0.91,
            clippingTolerance: 0.06
        },
        chrome: {
            mobileScaleFactor: 0.83,
            preferredFontSize: 93,
            heightAdjustment: 0.81,
            clippingTolerance: 0.03
        },
        twist: {
            mobileScaleFactor: 0.75,
            preferredFontSize: 85,
            heightAdjustment: 0.9,
            clippingTolerance: 0.05
        },
        cloud: {
            mobileScaleFactor: 0.84,
            preferredFontSize: 94,
            heightAdjustment: 0.8,
            clippingTolerance: 0.02
        },
        ridge: {
            mobileScaleFactor: 0.78,
            preferredFontSize: 88,
            heightAdjustment: 0.88,
            clippingTolerance: 0.04
        },
        wave: {
            mobileScaleFactor: 0.7,
            preferredFontSize: 78,
            heightAdjustment: 0.85,
            clippingTolerance: 0.08
        },
        stone: {
            mobileScaleFactor: 0.85,
            preferredFontSize: 95,
            heightAdjustment: 0.8,
            clippingTolerance: 0.02
        },
        magic: {
            mobileScaleFactor: 0.73,
            preferredFontSize: 82,
            heightAdjustment: 0.92,
            clippingTolerance: 0.06
        },
        pulse: {
            mobileScaleFactor: 0.82,
            preferredFontSize: 92,
            heightAdjustment: 0.82,
            clippingTolerance: 0.03
        },
        swift: {
            mobileScaleFactor: 0.86,
            preferredFontSize: 96,
            heightAdjustment: 0.79,
            clippingTolerance: 0.02
        },
        coral: {
            mobileScaleFactor: 0.76,
            preferredFontSize: 86,
            heightAdjustment: 0.9,
            clippingTolerance: 0.05
        },
        tidal: {
            mobileScaleFactor: 0.81,
            preferredFontSize: 91,
            heightAdjustment: 0.83,
            clippingTolerance: 0.03
        },
        flame: {
            mobileScaleFactor: 0.74,
            preferredFontSize: 84,
            heightAdjustment: 0.91,
            clippingTolerance: 0.06
        },
        bloom: {
            mobileScaleFactor: 0.77,
            preferredFontSize: 87,
            heightAdjustment: 0.89,
            clippingTolerance: 0.05
        },
        creek: {
            mobileScaleFactor: 0.8,
            preferredFontSize: 90,
            heightAdjustment: 0.85,
            clippingTolerance: 0.04
        },
        amber: {
            mobileScaleFactor: 0.83,
            preferredFontSize: 93,
            heightAdjustment: 0.81,
            clippingTolerance: 0.03
        },
        blade: {
            mobileScaleFactor: 0.87,
            preferredFontSize: 97,
            heightAdjustment: 0.78,
            clippingTolerance: 0.02
        },
        cyber: {
            mobileScaleFactor: 0.89,
            preferredFontSize: 102,
            heightAdjustment: 0.72,
            clippingTolerance: 0.01
        },
        pearl: {
            mobileScaleFactor: 0.75,
            preferredFontSize: 85,
            heightAdjustment: 0.9,
            clippingTolerance: 0.05
        },
        crystal: {
            mobileScaleFactor: 0.78,
            preferredFontSize: 88,
            heightAdjustment: 0.88,
            clippingTolerance: 0.04
        },
        glacial: {
            mobileScaleFactor: 0.84,
            preferredFontSize: 94,
            heightAdjustment: 0.8,
            clippingTolerance: 0.02
        },
        blossom: {
            mobileScaleFactor: 0.76,
            preferredFontSize: 86,
            heightAdjustment: 0.9,
            clippingTolerance: 0.05
        },
        thunder: {
            mobileScaleFactor: 0.85,
            preferredFontSize: 95,
            heightAdjustment: 0.8,
            clippingTolerance: 0.02
        },
        radiant: {
            mobileScaleFactor: 0.79,
            preferredFontSize: 89,
            heightAdjustment: 0.87,
            clippingTolerance: 0.04
        },
        celestial: {
            mobileScaleFactor: 0.74,
            preferredFontSize: 84,
            heightAdjustment: 0.91,
            clippingTolerance: 0.06
        },
        digital: {
            mobileScaleFactor: 0.91,
            preferredFontSize: 108,
            heightAdjustment: 0.68,
            clippingTolerance: 0.01
        },
        inferno: {
            mobileScaleFactor: 0.72,
            preferredFontSize: 80,
            heightAdjustment: 0.95,
            clippingTolerance: 0.07
        },
        sharp: {
            mobileScaleFactor: 0.88,
            preferredFontSize: 100,
            heightAdjustment: 0.75,
            clippingTolerance: 0.02
        },
        spark: {
            mobileScaleFactor: 0.8,
            preferredFontSize: 90,
            heightAdjustment: 0.85,
            clippingTolerance: 0.04
        }
    },

    // Name length based adjustments
    nameLength: {
        short: {  // 1-5 characters
            scaleFactor: 1.1,
            maxFontSizeBonus: 15
        },
        medium: { // 6-10 characters
            scaleFactor: 1.0,
            maxFontSizeBonus: 0
        },
        long: {   // 11-15 characters
            scaleFactor: 0.9,
            maxFontSizeBonus: -10
        },
        veryLong: { // 16+ characters
            scaleFactor: 0.8,
            maxFontSizeBonus: -20
        }
    },

    // Device-specific adjustments
    devices: {
        mobile: {
            containerWidth: 340,
            containerHeight: 148,
            safeZonePadding: 10,
            scaleFactor: 1.0
        },
        tablet: {
            containerWidth: 500,
            containerHeight: 220,
            safeZonePadding: 15,
            scaleFactor: 1.3
        },
        desktop: {
            containerWidth: 800,
            containerHeight: 300,
            safeZonePadding: 20,
            scaleFactor: 1.8
        }
    }
};

// Helper functions
const mobileConfigHelpers = {
    // Get configuration for a specific font
    getFontConfig(fontId) {
        return mobileConfig.fontConfigs[fontId] || {
            mobileScaleFactor: mobileConfig.global.defaultScalingFactor,
            preferredFontSize: 90,
            heightAdjustment: 0.85,
            clippingTolerance: 0.04
        };
    },

    // Get name length category
    getNameLengthCategory(name) {
        const length = name.length;
        if (length <= 5) return 'short';
        if (length <= 10) return 'medium';
        if (length <= 15) return 'long';
        return 'veryLong';
    },

    // Calculate optimal font size for mobile
    calculateOptimalFontSize(fontId, name, originalFontSize) {
        const fontConfig = this.getFontConfig(fontId);
        const nameLengthConfig = mobileConfig.nameLength[this.getNameLengthCategory(name)];

        let optimalSize = fontConfig.preferredFontSize;

        // Apply name length adjustment
        optimalSize = optimalSize * nameLengthConfig.scaleFactor;
        optimalSize += nameLengthConfig.maxFontSizeBonus;

        // Ensure within bounds
        optimalSize = Math.max(mobileConfig.global.minFontSize,
                              Math.min(mobileConfig.global.maxFontSize, optimalSize));

        return Math.round(optimalSize);
    },

    // Get safe zone dimensions for device
    getSafeZoneDimensions(deviceType = 'mobile') {
        const device = mobileConfig.devices[deviceType];
        return {
            width: device.containerWidth - (device.safeZonePadding * 2),
            height: device.containerHeight - (device.safeZonePadding * 2)
        };
    },

    // Check if font is mobile optimized
    isMobileOptimized(fontId, name, containerDimensions = null) {
        const dimensions = containerDimensions || mobileConfig.devices.mobile;
        const fontConfig = this.getFontConfig(fontId);
        const optimalSize = this.calculateOptimalFontSize(fontId, name, 100);

        return {
            isOptimized: optimalSize >= mobileConfig.global.minFontSize * 1.5,
            optimalFontSize: optimalSize,
            fontConfig,
            dimensions
        };
    },

    // Generate mobile optimization recommendations
    generateRecommendations(fontId, name, analysisResults) {
        const recommendations = [];
        const fontConfig = this.getFontConfig(fontId);
        const nameLengthCategory = this.getNameLengthCategory(name);

        if (analysisResults.clippingRisk === 'high') {
            recommendations.push({
                type: 'clipping',
                priority: 'high',
                message: `High clipping risk detected. Consider reducing font size by ${Math.round((1 - fontConfig.mobileScaleFactor) * 100)}%`,
                action: 'reduce_font_size',
                suggestedValue: fontConfig.preferredFontSize
            });
        }

        if (nameLengthCategory === 'veryLong') {
            recommendations.push({
                type: 'name_length',
                priority: 'medium',
                message: 'Very long name detected. Consider using a more compact font style',
                action: 'use_compact_font',
                suggestedFonts: ['digital', 'pixel', 'sharp', 'lunar']
            });
        }

        if (analysisResults.qualityScore < mobileConfig.global.qualityThresholds.acceptable) {
            recommendations.push({
                type: 'quality',
                priority: 'medium',
                message: 'Low quality score. Font size and spacing may need adjustment',
                action: 'adjust_spacing',
                suggestedAction: 'increase_font_size'
            });
        }

        return recommendations;
    }
};

module.exports = {
    mobileConfig,
    mobileConfigHelpers
};