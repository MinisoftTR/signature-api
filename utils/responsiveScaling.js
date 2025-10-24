const { mobileConfig, mobileConfigHelpers } = require('../config/mobileConfig');
const ClippingPreventionAlgorithm = require('../algorithms/clippingPrevention');

class ResponsiveScalingSystem {
    constructor() {
        this.clippingPrevention = new ClippingPreventionAlgorithm();
        this.breakpoints = {
            mobile: { maxWidth: 479, device: 'mobile' },
            tablet: { maxWidth: 1023, device: 'tablet' },
            desktop: { maxWidth: Infinity, device: 'desktop' }
        };
    }

    // Main responsive scaling method
    async generateResponsiveSignature(text, fontConfig, targetDevice = 'mobile', options = {}) {
        try {
            const deviceConfig = this.getDeviceConfiguration(targetDevice);
            const fontSpecificConfig = mobileConfigHelpers.getFontConfig(fontConfig.id || 'default');

            const scalingResult = await this.calculateOptimalScaling(
                text,
                fontConfig,
                deviceConfig,
                fontSpecificConfig,
                options
            );

            return {
                success: true,
                device: targetDevice,
                original: {
                    fontSize: fontConfig.size,
                    dimensions: deviceConfig.original
                },
                optimized: scalingResult,
                responsive: await this.generateMultiDeviceScaling(text, fontConfig, options),
                recommendations: this.generateResponsiveRecommendations(scalingResult, deviceConfig),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                device: targetDevice,
                fallback: this.generateFallbackScaling(fontConfig, targetDevice)
            };
        }
    }

    // Calculate optimal scaling for specific device
    async calculateOptimalScaling(text, fontConfig, deviceConfig, fontSpecificConfig, options = {}) {
        const targetDimensions = {
            width: deviceConfig.containerWidth,
            height: deviceConfig.containerHeight
        };

        // Apply font-specific mobile scaling
        const baseScaledSize = Math.round(fontConfig.size * fontSpecificConfig.mobileScaleFactor);

        // Apply name length adjustments
        const nameLengthAdjustment = mobileConfigHelpers.calculateOptimalFontSize(
            fontConfig.id || 'default',
            text,
            baseScaledSize
        );

        // Create modified font config with initial scaling
        const scaledFontConfig = {
            ...fontConfig,
            size: nameLengthAdjustment
        };

        // Apply clipping prevention
        const clippingResult = await this.clippingPrevention.preventClipping(
            text,
            scaledFontConfig,
            targetDimensions,
            options
        );

        // Apply height-specific adjustments
        const heightAdjustedSize = Math.round(
            clippingResult.optimalFontSize * fontSpecificConfig.heightAdjustment
        );

        const finalFontSize = Math.max(
            mobileConfig.global.minFontSize,
            Math.min(mobileConfig.global.maxFontSize, heightAdjustedSize)
        );

        // Final validation test
        const finalTest = await this.clippingPrevention.testFontSize(
            text,
            { ...fontConfig, size: finalFontSize },
            finalFontSize,
            {
                width: targetDimensions.width - (deviceConfig.safeZonePadding * 2),
                height: targetDimensions.height - (deviceConfig.safeZonePadding * 2)
            }
        );

        return {
            fontSize: finalFontSize,
            scalingFactor: finalFontSize / fontConfig.size,
            textDimensions: finalTest.textDimensions,
            fitsInSafeZone: finalTest.fitsInSafeZone,
            clippingRisk: this.clippingPrevention.assessClippingRisk(
                finalTest.textDimensions,
                {
                    width: targetDimensions.width - (deviceConfig.safeZonePadding * 2),
                    height: targetDimensions.height - (deviceConfig.safeZonePadding * 2)
                }
            ),
            qualityScore: this.clippingPrevention.calculateQualityScore(finalTest, {
                width: targetDimensions.width - (deviceConfig.safeZonePadding * 2),
                height: targetDimensions.height - (deviceConfig.safeZonePadding * 2)
            }),
            deviceConfig,
            fontSpecificConfig,
            scalingSteps: {
                original: fontConfig.size,
                fontSpecificScaling: baseScaledSize,
                nameLengthAdjustment: nameLengthAdjustment,
                clippingPrevention: clippingResult.optimalFontSize,
                heightAdjustment: heightAdjustedSize,
                final: finalFontSize
            }
        };
    }

    // Generate scaling for all device types
    async generateMultiDeviceScaling(text, fontConfig, options = {}) {
        const results = {};

        for (const [deviceType, breakpoint] of Object.entries(this.breakpoints)) {
            try {
                const deviceResult = await this.generateResponsiveSignature(
                    text,
                    fontConfig,
                    breakpoint.device,
                    options
                );
                results[deviceType] = deviceResult.optimized;
            } catch (error) {
                results[deviceType] = {
                    error: error.message,
                    fallback: this.generateFallbackScaling(fontConfig, breakpoint.device)
                };
            }
        }

        return results;
    }

    // Get device-specific configuration
    getDeviceConfiguration(deviceType) {
        const config = mobileConfig.devices[deviceType];
        if (!config) {
            throw new Error(`Unknown device type: ${deviceType}`);
        }

        return {
            ...config,
            original: {
                width: config.containerWidth,
                height: config.containerHeight
            },
            safeZone: {
                width: config.containerWidth - (config.safeZonePadding * 2),
                height: config.containerHeight - (config.safeZonePadding * 2)
            }
        };
    }

    // Generate CSS media queries for responsive implementation
    generateResponsiveCSS(text, fontConfig, scalingResults) {
        const css = [];

        // Base mobile styles
        css.push(`
/* Mobile First - Base Styles */
.signature-text {
    font-family: "${fontConfig.family}", serif;
    font-size: ${scalingResults.mobile?.fontSize || 60}px;
    color: ${fontConfig.color || '#000000'};
    font-weight: ${fontConfig.weight || 'normal'};
    font-style: ${fontConfig.italic ? 'italic' : 'normal'};
    max-width: 320px;
    max-height: 128px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}`);

        // Tablet styles
        if (scalingResults.tablet) {
            css.push(`
/* Tablet Styles */
@media screen and (min-width: 480px) and (max-width: 1023px) {
    .signature-text {
        font-size: ${scalingResults.tablet.fontSize}px;
        max-width: 470px;
        max-height: 190px;
    }
}`);
        }

        // Desktop styles
        if (scalingResults.desktop) {
            css.push(`
/* Desktop Styles */
@media screen and (min-width: 1024px) {
    .signature-text {
        font-size: ${scalingResults.desktop.fontSize}px;
        max-width: 760px;
        max-height: 260px;
    }
}`);
        }

        // Container styles
        css.push(`
/* Responsive Container */
.signature-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 340px;
    height: 148px;
    padding: 10px;
    box-sizing: border-box;
    border: 2px solid #ddd;
    border-radius: 8px;
    background: #f9f9f9;
}

@media screen and (min-width: 480px) and (max-width: 1023px) {
    .signature-container {
        width: 500px;
        height: 220px;
        padding: 15px;
    }
}

@media screen and (min-width: 1024px) {
    .signature-container {
        width: 800px;
        height: 300px;
        padding: 20px;
    }
}`);

        return css.join('\n');
    }

    // Generate responsive SVG viewBox and dimensions
    generateResponsiveSVG(text, fontConfig, scalingResults, deviceType = 'mobile') {
        const scaling = scalingResults[deviceType];
        if (!scaling) {
            throw new Error(`No scaling data for device: ${deviceType}`);
        }

        const deviceConfig = this.getDeviceConfiguration(deviceType);
        const padding = deviceConfig.safeZonePadding;

        return {
            svg: {
                width: deviceConfig.containerWidth,
                height: deviceConfig.containerHeight,
                viewBox: `0 0 ${deviceConfig.containerWidth} ${deviceConfig.containerHeight}`
            },
            text: {
                x: deviceConfig.containerWidth / 2,
                y: deviceConfig.containerHeight / 2 + (scaling.textDimensions.baseline || scaling.fontSize * 0.3),
                fontSize: scaling.fontSize,
                fontFamily: fontConfig.family,
                fill: fontConfig.color || '#000000',
                textAnchor: 'middle',
                dominantBaseline: 'central'
            },
            safeZone: {
                x: padding,
                y: padding,
                width: deviceConfig.safeZone.width,
                height: deviceConfig.safeZone.height,
                stroke: '#e74c3c',
                strokeDasharray: '5,5',
                fill: 'none',
                opacity: 0.5
            }
        };
    }

    // Advanced responsive optimization
    async advancedResponsiveOptimization(text, fontConfig, options = {}) {
        const optimizationStrategies = [
            'device_specific',
            'content_aware',
            'quality_prioritized',
            'performance_optimized'
        ];

        const results = {};

        for (const strategy of optimizationStrategies) {
            try {
                results[strategy] = await this.applyOptimizationStrategy(
                    strategy,
                    text,
                    fontConfig,
                    options
                );
            } catch (error) {
                results[strategy] = {
                    error: error.message,
                    strategy: strategy
                };
            }
        }

        // Select best strategy
        const bestStrategy = this.selectBestStrategy(results);

        return {
            bestStrategy: bestStrategy.name,
            result: bestStrategy.result,
            allStrategies: results,
            performance: this.analyzePerformance(results),
            recommendations: this.generateAdvancedRecommendations(bestStrategy.result)
        };
    }

    async applyOptimizationStrategy(strategy, text, fontConfig, options) {
        switch (strategy) {
            case 'device_specific':
                return await this.deviceSpecificOptimization(text, fontConfig, options);

            case 'content_aware':
                return await this.contentAwareOptimization(text, fontConfig, options);

            case 'quality_prioritized':
                return await this.qualityPrioritizedOptimization(text, fontConfig, options);

            case 'performance_optimized':
                return await this.performanceOptimizedStrategy(text, fontConfig, options);

            default:
                throw new Error(`Unknown optimization strategy: ${strategy}`);
        }
    }

    async deviceSpecificOptimization(text, fontConfig, options) {
        const multiDevice = await this.generateMultiDeviceScaling(text, fontConfig, options);

        return {
            strategy: 'device_specific',
            scaling: multiDevice,
            qualityScore: this.calculateAverageQuality(multiDevice),
            deviceOptimization: {
                mobile: this.evaluateDeviceOptimization(multiDevice.mobile, 'mobile'),
                tablet: this.evaluateDeviceOptimization(multiDevice.tablet, 'tablet'),
                desktop: this.evaluateDeviceOptimization(multiDevice.desktop, 'desktop')
            }
        };
    }

    async contentAwareOptimization(text, fontConfig, options) {
        const textAnalysis = this.analyzeTextContent(text);
        const adjustedOptions = this.adjustOptionsForContent(options, textAnalysis);

        const mobileResult = await this.generateResponsiveSignature(
            text,
            fontConfig,
            'mobile',
            adjustedOptions
        );

        return {
            strategy: 'content_aware',
            textAnalysis,
            adjustedOptions,
            result: mobileResult.optimized,
            qualityScore: mobileResult.optimized.qualityScore
        };
    }

    async qualityPrioritizedOptimization(text, fontConfig, options) {
        const qualityOptions = {
            ...options,
            toleranceRatio: 0.85, // Stricter tolerance
            maxIterations: 30,     // More iterations
            fontSizeStep: 2        // Finer steps
        };

        const result = await this.clippingPrevention.advancedClippingPrevention(
            text,
            fontConfig,
            mobileConfig.devices.mobile,
            qualityOptions
        );

        return {
            strategy: 'quality_prioritized',
            result: result.result,
            qualityScore: result.result.qualityScore,
            allStrategies: result.allStrategies
        };
    }

    async performanceOptimizedStrategy(text, fontConfig, options) {
        const fastOptions = {
            ...options,
            maxIterations: 10,
            fontSizeStep: 8,
            toleranceRatio: 0.9
        };

        const startTime = Date.now();
        const result = await this.generateResponsiveSignature(
            text,
            fontConfig,
            'mobile',
            fastOptions
        );
        const endTime = Date.now();

        return {
            strategy: 'performance_optimized',
            result: result.optimized,
            qualityScore: result.optimized.qualityScore,
            performanceMetrics: {
                executionTime: endTime - startTime,
                iterations: result.optimized.scalingSteps ?
                           Object.keys(result.optimized.scalingSteps).length : 1
            }
        };
    }

    selectBestStrategy(results) {
        let bestStrategy = null;
        let highestScore = -1;

        for (const [strategyName, strategyResult] of Object.entries(results)) {
            if (strategyResult.error) continue;

            const score = strategyResult.qualityScore || 0;
            if (score > highestScore) {
                highestScore = score;
                bestStrategy = {
                    name: strategyName,
                    result: strategyResult
                };
            }
        }

        return bestStrategy || {
            name: 'fallback',
            result: this.generateFallbackScaling(fontConfig, 'mobile')
        };
    }

    analyzeTextContent(text) {
        return {
            length: text.length,
            hasSpecialCharacters: /[^a-zA-Z0-9\s]/.test(text),
            hasUpperCase: /[A-Z]/.test(text),
            hasLowerCase: /[a-z]/.test(text),
            hasNumbers: /[0-9]/.test(text),
            hasSpaces: /\s/.test(text),
            wordCount: text.trim().split(/\s+/).length,
            averageWordLength: text.replace(/\s/g, '').length / text.trim().split(/\s+/).length,
            complexity: this.calculateTextComplexity(text)
        };
    }

    calculateTextComplexity(text) {
        let complexity = 0;

        // Length factor
        complexity += Math.min(text.length / 20, 1) * 30;

        // Special characters
        if (/[^a-zA-Z0-9\s]/.test(text)) complexity += 20;

        // Mixed case
        if (/[A-Z]/.test(text) && /[a-z]/.test(text)) complexity += 15;

        // Numbers
        if (/[0-9]/.test(text)) complexity += 10;

        // Multiple words
        if (text.trim().split(/\s+/).length > 1) complexity += 25;

        return Math.min(complexity, 100);
    }

    adjustOptionsForContent(options, textAnalysis) {
        const adjusted = { ...options };

        // Adjust for text complexity
        if (textAnalysis.complexity > 70) {
            adjusted.toleranceRatio = 0.85;
            adjusted.maxIterations = 25;
        }

        // Adjust for length
        if (textAnalysis.length > 15) {
            adjusted.fontSizeStep = 2;
            adjusted.toleranceRatio = 0.9;
        }

        return adjusted;
    }

    calculateAverageQuality(multiDeviceResults) {
        const scores = [];

        Object.values(multiDeviceResults).forEach(result => {
            if (result && result.qualityScore) {
                scores.push(result.qualityScore);
            }
        });

        return scores.length > 0 ?
               Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    }

    evaluateDeviceOptimization(deviceResult, deviceType) {
        if (!deviceResult || deviceResult.error) {
            return { optimized: false, reason: 'Error or missing result' };
        }

        const thresholds = mobileConfig.global.qualityThresholds;
        const score = deviceResult.qualityScore || 0;

        return {
            optimized: score >= thresholds.good,
            qualityLevel: score >= thresholds.excellent ? 'excellent' :
                         score >= thresholds.good ? 'good' :
                         score >= thresholds.acceptable ? 'acceptable' : 'poor',
            score: score,
            fitsInSafeZone: deviceResult.fitsInSafeZone,
            clippingRisk: deviceResult.clippingRisk
        };
    }

    analyzePerformance(results) {
        const performanceData = {};

        Object.entries(results).forEach(([strategy, result]) => {
            if (result.performanceMetrics) {
                performanceData[strategy] = result.performanceMetrics;
            }
        });

        return performanceData;
    }

    generateFallbackScaling(fontConfig, deviceType) {
        const deviceConfig = this.getDeviceConfiguration(deviceType);
        const fallbackSize = Math.min(fontConfig.size * 0.7, 60);

        return {
            fontSize: fallbackSize,
            scalingFactor: fallbackSize / fontConfig.size,
            quality: 'fallback',
            device: deviceType,
            note: 'Fallback scaling applied due to optimization failure'
        };
    }

    generateResponsiveRecommendations(scalingResult, deviceConfig) {
        const recommendations = [];

        if (scalingResult.qualityScore < 50) {
            recommendations.push({
                type: 'quality',
                priority: 'high',
                message: 'Low quality score - consider alternative font or manual adjustment'
            });
        }

        if (!scalingResult.fitsInSafeZone) {
            recommendations.push({
                type: 'clipping',
                priority: 'high',
                message: 'Text exceeds safe zone - reduce content length or use more compact font'
            });
        }

        if (scalingResult.fontSize < 30) {
            recommendations.push({
                type: 'readability',
                priority: 'medium',
                message: 'Font size may be too small for mobile readability'
            });
        }

        return recommendations;
    }

    generateAdvancedRecommendations(result) {
        const recommendations = [];

        if (result.strategy === 'performance_optimized' && result.qualityScore < 70) {
            recommendations.push('Consider using quality_prioritized strategy for better results');
        }

        if (result.strategy === 'quality_prioritized' && result.performanceMetrics?.executionTime > 1000) {
            recommendations.push('Consider performance_optimized strategy for faster processing');
        }

        return recommendations;
    }
}

module.exports = ResponsiveScalingSystem;