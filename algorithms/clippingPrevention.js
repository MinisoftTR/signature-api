const Canvas = require('canvas');
const fs = require('fs');

class ClippingPreventionAlgorithm {
    constructor() {
        this.defaultOptions = {
            targetWidth: 340,
            targetHeight: 148,
            safeZonePadding: 10,
            maxIterations: 20,
            fontSizeStep: 4,
            toleranceRatio: 0.95,
            minFontSize: 24,
            maxFontSize: 120
        };
    }

    // Main clipping prevention method
    async preventClipping(text, fontConfig, targetDimensions = null, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        const dimensions = targetDimensions || {
            width: config.targetWidth,
            height: config.targetHeight
        };

        const safeZone = {
            width: dimensions.width - (config.safeZonePadding * 2),
            height: dimensions.height - (config.safeZonePadding * 2)
        };

        // Special handling for problematic fonts
        if (fontConfig.family === 'BlondeyRich' || fontConfig.id === 'ember' ||
            fontConfig.family === 'Cassavania' || fontConfig.id === 'storm' ||
            fontConfig.family === 'Breakloft' || fontConfig.id === 'wave') {
            fontConfig = { ...fontConfig, size: Math.min(fontConfig.size, 360) };
            config.toleranceRatio = 0.85; // Stricter tolerance for problematic fonts
        }

        try {
            const result = await this.findOptimalFontSize(text, fontConfig, safeZone, config);
            return {
                success: true,
                originalFontSize: fontConfig.size,
                optimalFontSize: result.fontSize,
                scalingFactor: result.fontSize / fontConfig.size,
                textDimensions: result.textDimensions,
                fitsInSafeZone: result.fitsInSafeZone,
                clippingRisk: this.assessClippingRisk(result.textDimensions, safeZone),
                qualityScore: this.calculateQualityScore(result, safeZone),
                iterations: result.iterations,
                safeZone,
                targetDimensions: dimensions,
                algorithm: 'binary_search_optimization'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                originalFontSize: fontConfig.size,
                optimalFontSize: config.minFontSize,
                clippingRisk: 'unknown',
                qualityScore: 0
            };
        }
    }

    // Binary search optimization for font size
    async findOptimalFontSize(text, fontConfig, safeZone, config) {
        let minSize = config.minFontSize;
        let maxSize = Math.min(config.maxFontSize, fontConfig.size * 1.2);
        let bestFit = null;
        let iterations = 0;

        // First, test if original size fits
        const originalTest = await this.testFontSize(text, fontConfig, fontConfig.size, safeZone);
        if (originalTest.fitsInSafeZone) {
            return { ...originalTest, iterations: 1 };
        }

        // Binary search for optimal size
        while (minSize <= maxSize && iterations < config.maxIterations) {
            iterations++;
            const testSize = Math.round((minSize + maxSize) / 2);
            const testResult = await this.testFontSize(text, fontConfig, testSize, safeZone);

            if (testResult.fitsInSafeZone) {
                bestFit = testResult;
                minSize = testSize + 1; // Try larger size
            } else {
                maxSize = testSize - 1; // Try smaller size
            }
        }

        // If no perfect fit found, return the best approximation
        if (!bestFit) {
            bestFit = await this.testFontSize(text, fontConfig, maxSize, safeZone);
        }

        return { ...bestFit, iterations };
    }

    // Test specific font size
    async testFontSize(text, fontConfig, fontSize, safeZone) {
        try {
            // Create a test canvas
            const canvas = Canvas.createCanvas(800, 400);
            const ctx = canvas.getContext('2d');

            // Register font if path exists
            if (fontConfig.path && fs.existsSync(fontConfig.path)) {
                Canvas.registerFont(fontConfig.path, { family: fontConfig.family });
            }

            // Set font properties
            const fontWeight = fontConfig.weight || 'normal';
            const fontStyle = fontConfig.italic ? 'italic' : 'normal';
            ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontConfig.family}", serif`;

            // Measure text
            const metrics = ctx.measureText(text);

            // Calculate actual dimensions
            const actualWidth = metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft;
            const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

            const textDimensions = {
                width: Math.ceil(actualWidth),
                height: Math.ceil(actualHeight),
                baseline: metrics.actualBoundingBoxAscent
            };

            // Check if it fits in safe zone with tolerance
            const fitsInSafeZone =
                textDimensions.width <= safeZone.width * this.defaultOptions.toleranceRatio &&
                textDimensions.height <= safeZone.height * this.defaultOptions.toleranceRatio;

            return {
                fontSize,
                textDimensions,
                fitsInSafeZone,
                metrics: {
                    width: metrics.width,
                    actualBoundingBoxLeft: metrics.actualBoundingBoxLeft,
                    actualBoundingBoxRight: metrics.actualBoundingBoxRight,
                    actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
                    actualBoundingBoxDescent: metrics.actualBoundingBoxDescent
                }
            };

        } catch (error) {
            throw new Error(`Font testing failed: ${error.message}`);
        }
    }

    // Assess clipping risk level
    assessClippingRisk(textDimensions, safeZone) {
        const widthRatio = textDimensions.width / safeZone.width;
        const heightRatio = textDimensions.height / safeZone.height;
        const maxRatio = Math.max(widthRatio, heightRatio);

        if (maxRatio <= 0.7) return 'very_low';
        if (maxRatio <= 0.85) return 'low';
        if (maxRatio <= 0.95) return 'medium';
        if (maxRatio <= 1.05) return 'high';
        return 'very_high';
    }

    // Calculate quality score based on multiple factors
    calculateQualityScore(result, safeZone) {
        const { textDimensions, fontSize } = result;
        let score = 0;

        // Space utilization score (40 points max)
        const widthUtilization = Math.min(textDimensions.width / safeZone.width, 1);
        const heightUtilization = Math.min(textDimensions.height / safeZone.height, 1);
        const utilizationScore = (widthUtilization * 0.7 + heightUtilization * 0.3) * 40;
        score += utilizationScore;

        // Clipping avoidance score (30 points max)
        if (result.fitsInSafeZone) {
            score += 30;
        } else {
            const overage = Math.max(
                textDimensions.width / safeZone.width,
                textDimensions.height / safeZone.height
            ) - 1;
            score += Math.max(0, 30 - (overage * 100));
        }

        // Font size adequacy score (20 points max)
        const minReadableSize = 36;
        const maxOptimalSize = 90;
        if (fontSize >= minReadableSize) {
            const sizeScore = Math.min(fontSize / maxOptimalSize, 1) * 20;
            score += sizeScore;
        }

        // Aspect ratio balance score (10 points max)
        const aspectRatio = textDimensions.width / textDimensions.height;
        const idealAspectRatio = safeZone.width / safeZone.height;
        const aspectScore = 10 - Math.abs(aspectRatio - idealAspectRatio) * 5;
        score += Math.max(0, aspectScore);

        return Math.round(Math.max(0, Math.min(100, score)));
    }

    // Advanced clipping prevention with multiple strategies
    async advancedClippingPrevention(text, fontConfig, targetDimensions, options = {}) {
        const strategies = [
            'binary_search',
            'proportional_scaling',
            'character_based_scaling',
            'aspect_ratio_optimization'
        ];

        const results = [];

        for (const strategy of strategies) {
            try {
                const result = await this.applyStrategy(strategy, text, fontConfig, targetDimensions, options);
                results.push({ strategy, ...result });
            } catch (error) {
                results.push({
                    strategy,
                    success: false,
                    error: error.message,
                    qualityScore: 0
                });
            }
        }

        // Select best strategy based on quality score
        const bestResult = results.reduce((best, current) => {
            return (current.qualityScore || 0) > (best.qualityScore || 0) ? current : best;
        }, results[0]);

        return {
            bestStrategy: bestResult.strategy,
            result: bestResult,
            allStrategies: results,
            recommendation: this.generateStrategyRecommendation(bestResult)
        };
    }

    async applyStrategy(strategy, text, fontConfig, targetDimensions, options) {
        switch (strategy) {
            case 'binary_search':
                return await this.preventClipping(text, fontConfig, targetDimensions, options);

            case 'proportional_scaling':
                return await this.proportionalScaling(text, fontConfig, targetDimensions, options);

            case 'character_based_scaling':
                return await this.characterBasedScaling(text, fontConfig, targetDimensions, options);

            case 'aspect_ratio_optimization':
                return await this.aspectRatioOptimization(text, fontConfig, targetDimensions, options);

            default:
                throw new Error(`Unknown strategy: ${strategy}`);
        }
    }

    // Proportional scaling strategy
    async proportionalScaling(text, fontConfig, targetDimensions, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        const safeZone = {
            width: targetDimensions.width - (config.safeZonePadding * 2),
            height: targetDimensions.height - (config.safeZonePadding * 2)
        };

        // Test original size first
        const originalTest = await this.testFontSize(text, fontConfig, fontConfig.size, safeZone);

        if (originalTest.fitsInSafeZone) {
            return {
                success: true,
                optimalFontSize: fontConfig.size,
                scalingFactor: 1.0,
                ...originalTest
            };
        }

        // Calculate proportional scale factors
        const widthScale = safeZone.width / originalTest.textDimensions.width;
        const heightScale = safeZone.height / originalTest.textDimensions.height;
        const scaleFactor = Math.min(widthScale, heightScale) * config.toleranceRatio;

        const newFontSize = Math.max(config.minFontSize,
                                   Math.min(config.maxFontSize,
                                          Math.round(fontConfig.size * scaleFactor)));

        const finalTest = await this.testFontSize(text, fontConfig, newFontSize, safeZone);

        return {
            success: true,
            originalFontSize: fontConfig.size,
            optimalFontSize: newFontSize,
            scalingFactor: newFontSize / fontConfig.size,
            textDimensions: finalTest.textDimensions,
            fitsInSafeZone: finalTest.fitsInSafeZone,
            clippingRisk: this.assessClippingRisk(finalTest.textDimensions, safeZone),
            qualityScore: this.calculateQualityScore(finalTest, safeZone),
            algorithm: 'proportional_scaling'
        };
    }

    // Character-based scaling strategy
    async characterBasedScaling(text, fontConfig, targetDimensions, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        const safeZone = {
            width: targetDimensions.width - (config.safeZonePadding * 2),
            height: targetDimensions.height - (config.safeZonePadding * 2)
        };

        // Character count factor
        const charCount = text.length;
        let scaleFactor = 1.0;

        if (charCount <= 5) {
            scaleFactor = 1.1;  // Short names can be larger
        } else if (charCount <= 8) {
            scaleFactor = 1.0;  // Normal size
        } else if (charCount <= 12) {
            scaleFactor = 0.9;  // Slightly smaller
        } else if (charCount <= 16) {
            scaleFactor = 0.8;  // Smaller
        } else {
            scaleFactor = 0.7;  // Very long names
        }

        const adjustedFontSize = Math.round(fontConfig.size * scaleFactor);
        const clampedFontSize = Math.max(config.minFontSize,
                                       Math.min(config.maxFontSize, adjustedFontSize));

        const finalTest = await this.testFontSize(text, fontConfig, clampedFontSize, safeZone);

        return {
            success: true,
            originalFontSize: fontConfig.size,
            optimalFontSize: clampedFontSize,
            scalingFactor: clampedFontSize / fontConfig.size,
            textDimensions: finalTest.textDimensions,
            fitsInSafeZone: finalTest.fitsInSafeZone,
            clippingRisk: this.assessClippingRisk(finalTest.textDimensions, safeZone),
            qualityScore: this.calculateQualityScore(finalTest, safeZone),
            characterCount: charCount,
            algorithm: 'character_based_scaling'
        };
    }

    // Aspect ratio optimization strategy
    async aspectRatioOptimization(text, fontConfig, targetDimensions, options = {}) {
        const config = { ...this.defaultOptions, ...options };
        const safeZone = {
            width: targetDimensions.width - (config.safeZonePadding * 2),
            height: targetDimensions.height - (config.safeZonePadding * 2)
        };

        const targetAspectRatio = safeZone.width / safeZone.height;

        // Test multiple font sizes to find best aspect ratio match
        let bestResult = null;
        let bestAspectDiff = Infinity;

        for (let fontSize = config.minFontSize; fontSize <= config.maxFontSize; fontSize += config.fontSizeStep) {
            const testResult = await this.testFontSize(text, fontConfig, fontSize, safeZone);

            if (testResult.fitsInSafeZone) {
                const textAspectRatio = testResult.textDimensions.width / testResult.textDimensions.height;
                const aspectDiff = Math.abs(textAspectRatio - targetAspectRatio);

                if (aspectDiff < bestAspectDiff) {
                    bestAspectDiff = aspectDiff;
                    bestResult = { ...testResult, fontSize };
                }
            }
        }

        if (!bestResult) {
            // Fallback to largest size that fits
            for (let fontSize = config.maxFontSize; fontSize >= config.minFontSize; fontSize -= config.fontSizeStep) {
                const testResult = await this.testFontSize(text, fontConfig, fontSize, safeZone);
                if (testResult.fitsInSafeZone) {
                    bestResult = { ...testResult, fontSize };
                    break;
                }
            }
        }

        if (!bestResult) {
            bestResult = await this.testFontSize(text, fontConfig, config.minFontSize, safeZone);
            bestResult.fontSize = config.minFontSize;
        }

        return {
            success: true,
            originalFontSize: fontConfig.size,
            optimalFontSize: bestResult.fontSize,
            scalingFactor: bestResult.fontSize / fontConfig.size,
            textDimensions: bestResult.textDimensions,
            fitsInSafeZone: bestResult.fitsInSafeZone,
            clippingRisk: this.assessClippingRisk(bestResult.textDimensions, safeZone),
            qualityScore: this.calculateQualityScore(bestResult, safeZone),
            aspectRatioDifference: bestAspectDiff,
            algorithm: 'aspect_ratio_optimization'
        };
    }

    generateStrategyRecommendation(result) {
        const recommendations = [];

        if (result.qualityScore >= 90) {
            recommendations.push('Excellent optimization achieved');
        } else if (result.qualityScore >= 70) {
            recommendations.push('Good optimization - minor adjustments may improve quality');
        } else if (result.qualityScore >= 50) {
            recommendations.push('Acceptable optimization - consider alternative font or manual adjustment');
        } else {
            recommendations.push('Poor optimization - manual intervention recommended');
        }

        if (!result.fitsInSafeZone) {
            recommendations.push('Text still exceeds safe zone - consider shorter text or different font');
        }

        if (result.optimalFontSize < 30) {
            recommendations.push('Font size may be too small for good readability');
        }

        return recommendations;
    }
}

module.exports = ClippingPreventionAlgorithm;