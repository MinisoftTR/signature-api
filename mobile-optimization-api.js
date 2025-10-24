const express = require('express');
const Canvas = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

class MobileOptimizationAPI {
    constructor() {
        this.router = express.Router();
        this.setupRoutes();
        this.mobileConfig = {
            targetWidth: 340,
            targetHeight: 148,
            safeZonePadding: 10,
            maxFontSize: 120,
            minFontSize: 24,
            qualityThresholds: {
                excellent: 90,
                good: 70,
                acceptable: 50,
                poor: 30
            }
        };
    }

    setupRoutes() {
        this.router.get('/mobile-config', this.getMobileConfig.bind(this));
        this.router.post('/optimize-signature', this.optimizeSignature.bind(this));
        this.router.post('/analyze-clipping', this.analyzeClipping.bind(this));
        this.router.post('/bulk-analyze', this.bulkAnalyze.bind(this));
        this.router.get('/font-recommendations/:name', this.getFontRecommendations.bind(this));
    }

    getMobileConfig(req, res) {
        res.json({
            success: true,
            config: this.mobileConfig,
            containerDimensions: {
                width: this.mobileConfig.targetWidth,
                height: this.mobileConfig.targetHeight,
                safeZone: {
                    width: this.mobileConfig.targetWidth - (this.mobileConfig.safeZonePadding * 2),
                    height: this.mobileConfig.targetHeight - (this.mobileConfig.safeZonePadding * 2)
                }
            }
        });
    }

    async optimizeSignature(req, res) {
        try {
            const { name, fontStyle, targetDimensions } = req.body;

            if (!name || !fontStyle) {
                return res.status(400).json({
                    success: false,
                    error: 'Name and fontStyle are required'
                });
            }

            const dimensions = targetDimensions || {
                width: this.mobileConfig.targetWidth,
                height: this.mobileConfig.targetHeight
            };

            const optimization = await this.performOptimization(name, fontStyle, dimensions);

            res.json({
                success: true,
                optimization,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Mobile optimization error:', error);
            res.status(500).json({
                success: false,
                error: 'Optimization failed',
                details: error.message
            });
        }
    }

    async performOptimization(name, fontStyle, targetDimensions) {
        const signatureStyles = require('./config/signatureStyles');
        const style = signatureStyles.find(s => s.id === fontStyle);

        if (!style) {
            throw new Error(`Font style '${fontStyle}' not found`);
        }

        const safeZone = {
            width: targetDimensions.width - (this.mobileConfig.safeZonePadding * 2),
            height: targetDimensions.height - (this.mobileConfig.safeZonePadding * 2)
        };

        let optimalFontSize = style.fontConfig.size;
        let attempts = [];

        for (let fontSize = this.mobileConfig.maxFontSize; fontSize >= this.mobileConfig.minFontSize; fontSize -= 8) {
            const testResult = await this.testFontSize(name, style, fontSize, safeZone);
            attempts.push(testResult);

            if (testResult.fitsInSafeZone) {
                optimalFontSize = fontSize;
                break;
            }
        }

        const finalResult = attempts.find(a => a.fitsInSafeZone) || attempts[attempts.length - 1];

        return {
            originalFontSize: style.fontConfig.size,
            optimalFontSize,
            scalingFactor: optimalFontSize / style.fontConfig.size,
            clippingRisk: this.calculateClippingRisk(finalResult, safeZone),
            qualityScore: this.calculateQualityScore(finalResult, safeZone),
            recommendations: this.generateRecommendations(finalResult, safeZone),
            analysis: finalResult,
            attempts: attempts.length,
            targetDimensions,
            safeZone
        };
    }

    async testFontSize(name, style, fontSize, safeZone) {
        try {
            const canvas = Canvas.createCanvas(800, 400);
            const ctx = canvas.getContext('2d');

            if (fs.existsSync(style.fontConfig.path)) {
                Canvas.registerFont(style.fontConfig.path, { family: style.fontConfig.family });
            }

            ctx.font = `${fontSize}px "${style.fontConfig.family}", serif`;
            ctx.fillStyle = style.fontConfig.color;

            const metrics = ctx.measureText(name);
            const actualWidth = metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft;
            const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

            return {
                fontSize,
                textDimensions: {
                    width: Math.ceil(actualWidth),
                    height: Math.ceil(actualHeight)
                },
                fitsInSafeZone: actualWidth <= safeZone.width && actualHeight <= safeZone.height,
                metrics: {
                    width: metrics.width,
                    actualBoundingBoxLeft: metrics.actualBoundingBoxLeft,
                    actualBoundingBoxRight: metrics.actualBoundingBoxRight,
                    actualBoundingBoxAscent: metrics.actualBoundingBoxAscent,
                    actualBoundingBoxDescent: metrics.actualBoundingBoxDescent
                }
            };
        } catch (error) {
            return {
                fontSize,
                error: error.message,
                fitsInSafeZone: false,
                textDimensions: { width: 0, height: 0 }
            };
        }
    }

    calculateClippingRisk(result, safeZone) {
        if (result.error) return 'unknown';

        const { textDimensions } = result;
        const widthRatio = textDimensions.width / safeZone.width;
        const heightRatio = textDimensions.height / safeZone.height;
        const maxRatio = Math.max(widthRatio, heightRatio);

        if (maxRatio <= 0.8) return 'low';
        if (maxRatio <= 0.95) return 'medium';
        return 'high';
    }

    calculateQualityScore(result, safeZone) {
        if (result.error) return 0;

        const { textDimensions } = result;
        const widthUtilization = Math.min(textDimensions.width / safeZone.width, 1);
        const heightUtilization = Math.min(textDimensions.height / safeZone.height, 1);

        let score = 0;

        // Size utilization (40 points max)
        score += (widthUtilization * 0.7 + heightUtilization * 0.3) * 40;

        // Clipping avoidance (30 points max)
        if (result.fitsInSafeZone) {
            score += 30;
        } else {
            const overage = Math.max(
                textDimensions.width / safeZone.width,
                textDimensions.height / safeZone.height
            ) - 1;
            score += Math.max(0, 30 - (overage * 100));
        }

        // Legibility factor (30 points max)
        const fontSizeScore = Math.min(result.fontSize / 60, 1) * 30;
        score += fontSizeScore;

        return Math.round(Math.max(0, Math.min(100, score)));
    }

    generateRecommendations(result, safeZone) {
        const recommendations = [];

        if (result.error) {
            recommendations.push({
                type: 'error',
                message: 'Font loading error - check font file availability',
                priority: 'high'
            });
            return recommendations;
        }

        const { textDimensions } = result;

        if (!result.fitsInSafeZone) {
            if (textDimensions.width > safeZone.width) {
                recommendations.push({
                    type: 'width',
                    message: 'Text too wide for safe zone - reduce font size or use narrower font',
                    priority: 'high'
                });
            }

            if (textDimensions.height > safeZone.height) {
                recommendations.push({
                    type: 'height',
                    message: 'Text too tall for safe zone - reduce font size or use shorter font',
                    priority: 'high'
                });
            }
        }

        if (result.fontSize < 36) {
            recommendations.push({
                type: 'legibility',
                message: 'Font size may be too small for good mobile visibility',
                priority: 'medium'
            });
        }

        const utilizationRatio = textDimensions.width / safeZone.width;
        if (utilizationRatio < 0.5) {
            recommendations.push({
                type: 'optimization',
                message: 'Font size could be increased for better space utilization',
                priority: 'low'
            });
        }

        return recommendations;
    }

    async analyzeClipping(req, res) {
        try {
            const { svgContent, containerDimensions } = req.body;

            if (!svgContent) {
                return res.status(400).json({
                    success: false,
                    error: 'SVG content is required'
                });
            }

            const analysis = await this.analyzeSVGClipping(svgContent, containerDimensions);

            res.json({
                success: true,
                analysis,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Clipping analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Analysis failed',
                details: error.message
            });
        }
    }

    async analyzeSVGClipping(svgContent, containerDimensions = null) {
        const dimensions = containerDimensions || {
            width: this.mobileConfig.targetWidth,
            height: this.mobileConfig.targetHeight
        };

        const safeZone = {
            width: dimensions.width - (this.mobileConfig.safeZonePadding * 2),
            height: dimensions.height - (this.mobileConfig.safeZonePadding * 2)
        };

        try {
            // Extract viewBox or width/height from SVG
            const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
            const widthMatch = svgContent.match(/width="([^"]+)"/);
            const heightMatch = svgContent.match(/height="([^"]+)"/);

            let svgDimensions = { width: 0, height: 0 };

            if (viewBoxMatch) {
                const viewBox = viewBoxMatch[1].split(' ').map(Number);
                svgDimensions = { width: viewBox[2], height: viewBox[3] };
            } else if (widthMatch && heightMatch) {
                svgDimensions = {
                    width: parseFloat(widthMatch[1]),
                    height: parseFloat(heightMatch[1])
                };
            }

            const clippingRisk = this.calculateSVGClippingRisk(svgDimensions, safeZone);
            const qualityScore = this.calculateSVGQualityScore(svgDimensions, safeZone);

            return {
                svgDimensions,
                containerDimensions: dimensions,
                safeZone,
                clippingRisk,
                qualityScore,
                fitsInContainer: svgDimensions.width <= dimensions.width && svgDimensions.height <= dimensions.height,
                fitsInSafeZone: svgDimensions.width <= safeZone.width && svgDimensions.height <= safeZone.height,
                recommendations: this.generateSVGRecommendations(svgDimensions, safeZone)
            };

        } catch (error) {
            return {
                error: error.message,
                svgDimensions: { width: 0, height: 0 },
                clippingRisk: 'unknown',
                qualityScore: 0
            };
        }
    }

    calculateSVGClippingRisk(svgDimensions, safeZone) {
        const widthRatio = svgDimensions.width / safeZone.width;
        const heightRatio = svgDimensions.height / safeZone.height;
        const maxRatio = Math.max(widthRatio, heightRatio);

        if (maxRatio <= 0.8) return 'low';
        if (maxRatio <= 0.95) return 'medium';
        return 'high';
    }

    calculateSVGQualityScore(svgDimensions, safeZone) {
        const widthUtilization = Math.min(svgDimensions.width / safeZone.width, 1);
        const heightUtilization = Math.min(svgDimensions.height / safeZone.height, 1);

        let score = 0;

        // Space utilization (50 points)
        score += (widthUtilization * 0.7 + heightUtilization * 0.3) * 50;

        // Clipping avoidance (50 points)
        if (svgDimensions.width <= safeZone.width && svgDimensions.height <= safeZone.height) {
            score += 50;
        } else {
            const overage = Math.max(
                svgDimensions.width / safeZone.width,
                svgDimensions.height / safeZone.height
            ) - 1;
            score += Math.max(0, 50 - (overage * 100));
        }

        return Math.round(Math.max(0, Math.min(100, score)));
    }

    generateSVGRecommendations(svgDimensions, safeZone) {
        const recommendations = [];

        if (svgDimensions.width > safeZone.width) {
            recommendations.push({
                type: 'width',
                message: `SVG width (${svgDimensions.width}) exceeds safe zone (${safeZone.width})`,
                priority: 'high'
            });
        }

        if (svgDimensions.height > safeZone.height) {
            recommendations.push({
                type: 'height',
                message: `SVG height (${svgDimensions.height}) exceeds safe zone (${safeZone.height})`,
                priority: 'high'
            });
        }

        const utilizationRatio = Math.min(
            svgDimensions.width / safeZone.width,
            svgDimensions.height / safeZone.height
        );

        if (utilizationRatio < 0.5) {
            recommendations.push({
                type: 'optimization',
                message: 'SVG could be scaled up for better space utilization',
                priority: 'low'
            });
        }

        return recommendations;
    }

    async bulkAnalyze(req, res) {
        try {
            const { signatures, targetDimensions } = req.body;

            if (!signatures || !Array.isArray(signatures)) {
                return res.status(400).json({
                    success: false,
                    error: 'Signatures array is required'
                });
            }

            const results = [];

            for (const signature of signatures) {
                const { name, fontStyle, svgContent } = signature;
                let analysis = {};

                if (svgContent) {
                    analysis = await this.analyzeSVGClipping(svgContent, targetDimensions);
                } else if (name && fontStyle) {
                    analysis = await this.performOptimization(name, fontStyle, targetDimensions || {
                        width: this.mobileConfig.targetWidth,
                        height: this.mobileConfig.targetHeight
                    });
                }

                results.push({
                    signature,
                    analysis,
                    timestamp: new Date().toISOString()
                });
            }

            const summary = this.generateBulkSummary(results);

            res.json({
                success: true,
                results,
                summary,
                totalAnalyzed: signatures.length
            });

        } catch (error) {
            console.error('Bulk analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Bulk analysis failed',
                details: error.message
            });
        }
    }

    generateBulkSummary(results) {
        const summary = {
            total: results.length,
            successful: 0,
            failed: 0,
            qualityDistribution: {
                excellent: 0,
                good: 0,
                acceptable: 0,
                poor: 0
            },
            clippingRiskDistribution: {
                low: 0,
                medium: 0,
                high: 0,
                unknown: 0
            },
            averageQualityScore: 0
        };

        let totalQualityScore = 0;

        results.forEach(result => {
            if (result.analysis.error) {
                summary.failed++;
            } else {
                summary.successful++;

                const qualityScore = result.analysis.qualityScore || 0;
                totalQualityScore += qualityScore;

                if (qualityScore >= this.mobileConfig.qualityThresholds.excellent) {
                    summary.qualityDistribution.excellent++;
                } else if (qualityScore >= this.mobileConfig.qualityThresholds.good) {
                    summary.qualityDistribution.good++;
                } else if (qualityScore >= this.mobileConfig.qualityThresholds.acceptable) {
                    summary.qualityDistribution.acceptable++;
                } else {
                    summary.qualityDistribution.poor++;
                }

                const clippingRisk = result.analysis.clippingRisk || 'unknown';
                summary.clippingRiskDistribution[clippingRisk]++;
            }
        });

        summary.averageQualityScore = summary.successful > 0 ?
            Math.round(totalQualityScore / summary.successful) : 0;

        return summary;
    }

    async getFontRecommendations(req, res) {
        try {
            const { name } = req.params;
            const { targetDimensions } = req.query;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Name parameter is required'
                });
            }

            const dimensions = targetDimensions ? JSON.parse(targetDimensions) : {
                width: this.mobileConfig.targetWidth,
                height: this.mobileConfig.targetHeight
            };

            const recommendations = await this.generateFontRecommendations(name, dimensions);

            res.json({
                success: true,
                name,
                targetDimensions: dimensions,
                recommendations,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Font recommendations error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate recommendations',
                details: error.message
            });
        }
    }

    async generateFontRecommendations(name, targetDimensions) {
        const signatureStyles = require('./config/signatureStyles');
        const recommendations = [];

        for (const style of signatureStyles) {
            try {
                const optimization = await this.performOptimization(name, style.id, targetDimensions);

                recommendations.push({
                    fontId: style.id,
                    fontName: style.name,
                    category: style.category,
                    isPro: style.isPro,
                    qualityScore: optimization.qualityScore,
                    clippingRisk: optimization.clippingRisk,
                    optimalFontSize: optimization.optimalFontSize,
                    scalingFactor: optimization.scalingFactor,
                    fitsInSafeZone: optimization.analysis.fitsInSafeZone,
                    recommended: optimization.qualityScore >= this.mobileConfig.qualityThresholds.good &&
                                optimization.clippingRisk === 'low'
                });

            } catch (error) {
                recommendations.push({
                    fontId: style.id,
                    fontName: style.name,
                    error: error.message,
                    qualityScore: 0,
                    recommended: false
                });
            }
        }

        // Sort by quality score descending
        recommendations.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));

        return {
            bestRecommendations: recommendations.filter(r => r.recommended).slice(0, 5),
            allResults: recommendations,
            summary: {
                totalFonts: recommendations.length,
                recommendedCount: recommendations.filter(r => r.recommended).length,
                averageQualityScore: Math.round(
                    recommendations.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / recommendations.length
                )
            }
        };
    }

    getRouter() {
        return this.router;
    }
}

module.exports = MobileOptimizationAPI;