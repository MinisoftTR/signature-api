#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';
const SAMPLES_DIR = './docs/svg-test/samples/orkun_c_samples';
const TEST_NAME = 'Orkun C.';

class OrkuncSampleGenerator {
    constructor() {
        this.fonts = [];
        this.results = [];
        this.mobileConfig = {
            targetWidth: 340,
            targetHeight: 148,
            safeZoneWidth: 320,
            safeZoneHeight: 128
        };
    }

    async init() {
        console.log('🚀 Orkun C. Sample Generator Started');
        console.log('📝 Generating samples for mobile optimization (340x148)');

        try {
            await this.ensureDirectories();
            await this.loadFonts();
            await this.generateSamples();
            await this.analyzeResults();
            await this.generateReport();

            console.log('✅ Sample generation completed successfully!');
        } catch (error) {
            console.error('❌ Error during generation:', error.message);
            process.exit(1);
        }
    }

    async ensureDirectories() {
        if (!fs.existsSync(SAMPLES_DIR)) {
            fs.mkdirSync(SAMPLES_DIR, { recursive: true });
            console.log(`📁 Created directory: ${SAMPLES_DIR}`);
        }
    }

    async loadFonts() {
        console.log('📚 Loading available fonts...');

        try {
            const response = await axios.get(`${BASE_URL}/miniStyles`);

            if (response.data.success) {
                this.fonts = response.data.data;
                console.log(`✅ Loaded ${this.fonts.length} fonts`);
            } else {
                throw new Error('Failed to load fonts from API');
            }
        } catch (error) {
            throw new Error(`Font loading failed: ${error.message}`);
        }
    }

    async generateSamples() {
        console.log(`🎨 Generating "${TEST_NAME}" samples for ${this.fonts.length} fonts...`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < this.fonts.length; i++) {
            const font = this.fonts[i];

            try {
                console.log(`\n[${i + 1}/${this.fonts.length}] Generating: ${font.name} (${font.fontStyle})`);

                const result = await this.generateSignature(TEST_NAME, font.fontStyle);

                if (result.success && result.data && result.data.length > 0) {
                    const signatureData = result.data[0];

                    // Analyze the generated signature
                    const analysis = this.analyzeSignature(signatureData, font);

                    // Save files
                    await this.saveSampleFiles(signatureData, font, analysis);

                    this.results.push({
                        font: font,
                        analysis: analysis,
                        success: true,
                        error: null
                    });

                    successCount++;
                    console.log(`   ✅ Success - Dimensions: ${analysis.estimatedWidth}×${analysis.estimatedHeight}, Risk: ${analysis.clippingRisk}`);
                } else {
                    throw new Error('No signature data returned');
                }

            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);

                this.results.push({
                    font: font,
                    analysis: null,
                    success: false,
                    error: error.message
                });

                errorCount++;
            }

            // Brief pause to avoid overwhelming the server
            await this.sleep(100);
        }

        console.log(`\n📊 Generation Summary:`);
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📈 Success Rate: ${((successCount / this.fonts.length) * 100).toFixed(1)}%`);
    }

    async generateSignature(name, fontStyle) {
        const response = await axios.post(`${BASE_URL}/miniGenerate-signature`, {
            name: name,
            fontStyle: fontStyle
        });

        return response.data;
    }

    analyzeSignature(signatureData, font) {
        const analysis = {
            fontName: font.name,
            fontStyle: font.fontStyle,
            fontCategory: font.category,
            isPro: font.isPro,
            hasBase64: !!signatureData.b64_json,
            hasSVG: !!signatureData.svg_content,
            estimatedWidth: 0,
            estimatedHeight: 0,
            clippingRisk: 'Unknown',
            riskLevel: 'unknown',
            qualityScore: 0,
            mobileOptimized: false
        };

        if (signatureData.svg_content) {
            // Extract dimensions from SVG
            const dimensionMatch = this.extractSVGDimensions(signatureData.svg_content);
            if (dimensionMatch) {
                analysis.estimatedWidth = dimensionMatch.width;
                analysis.estimatedHeight = dimensionMatch.height;
            }

            // Assess clipping risk
            analysis.clippingRisk = this.assessClippingRisk(analysis.estimatedWidth, analysis.estimatedHeight);
            analysis.riskLevel = this.getRiskLevel(analysis.clippingRisk);

            // Calculate quality score
            analysis.qualityScore = this.calculateQualityScore(analysis);

            // Check if mobile optimized
            analysis.mobileOptimized = this.isMobileOptimized(analysis);
        }

        return analysis;
    }

    extractSVGDimensions(svgContent) {
        // Try to extract viewBox dimensions
        const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
        if (viewBoxMatch) {
            const values = viewBoxMatch[1].split(/\s+/);
            if (values.length === 4) {
                return {
                    width: parseFloat(values[2]),
                    height: parseFloat(values[3])
                };
            }
        }

        // Try to extract width/height attributes
        const widthMatch = svgContent.match(/width="([^"]+)"/);
        const heightMatch = svgContent.match(/height="([^"]+)"/);

        if (widthMatch && heightMatch) {
            return {
                width: parseFloat(widthMatch[1]),
                height: parseFloat(heightMatch[1])
            };
        }

        // Default estimation
        return {
            width: 200,
            height: 80
        };
    }

    assessClippingRisk(width, height) {
        const { safeZoneWidth, safeZoneHeight } = this.mobileConfig;

        if (width > safeZoneWidth || height > safeZoneHeight) {
            return 'High';
        } else if (width > safeZoneWidth * 0.9 || height > safeZoneHeight * 0.9) {
            return 'Medium';
        } else {
            return 'Low';
        }
    }

    getRiskLevel(clippingRisk) {
        const riskMap = {
            'High': 'danger',
            'Medium': 'warning',
            'Low': 'safe'
        };
        return riskMap[clippingRisk] || 'unknown';
    }

    calculateQualityScore(analysis) {
        let score = 100;

        // Penalize clipping risk
        if (analysis.clippingRisk === 'High') score -= 40;
        else if (analysis.clippingRisk === 'Medium') score -= 20;

        // Penalize missing SVG content
        if (!analysis.hasSVG) score -= 30;

        // Bonus for mobile optimization
        if (analysis.mobileOptimized) score += 10;

        return Math.max(0, Math.min(100, score));
    }

    isMobileOptimized(analysis) {
        const { targetWidth, targetHeight } = this.mobileConfig;

        return analysis.estimatedWidth <= targetWidth &&
               analysis.estimatedHeight <= targetHeight &&
               analysis.clippingRisk === 'Low';
    }

    async saveSampleFiles(signatureData, font, analysis) {
        const baseFileName = `orkun_c_${font.fontStyle}`;

        // Save SVG file
        if (signatureData.svg_content) {
            const svgPath = path.join(SAMPLES_DIR, `${baseFileName}.svg`);
            fs.writeFileSync(svgPath, signatureData.svg_content, 'utf8');
        }

        // Save PNG file (from base64)
        if (signatureData.b64_json) {
            const pngPath = path.join(SAMPLES_DIR, `${baseFileName}.png`);
            const buffer = Buffer.from(signatureData.b64_json, 'base64');
            fs.writeFileSync(pngPath, buffer);
        }

        // Save analysis metadata
        const metadataPath = path.join(SAMPLES_DIR, `${baseFileName}_metadata.json`);
        const metadata = {
            timestamp: new Date().toISOString(),
            testName: TEST_NAME,
            font: {
                name: font.name,
                style: font.fontStyle,
                category: font.category,
                isPro: font.isPro
            },
            mobileConfig: this.mobileConfig,
            analysis: analysis,
            files: {
                svg: signatureData.svg_content ? `${baseFileName}.svg` : null,
                png: signatureData.b64_json ? `${baseFileName}.png` : null
            }
        };

        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    async analyzeResults() {
        console.log('\n📊 Analyzing Results...');

        const stats = {
            total: this.results.length,
            successful: this.results.filter(r => r.success).length,
            errors: this.results.filter(r => !r.success).length,
            clippingRisks: {
                low: 0,
                medium: 0,
                high: 0
            },
            categories: {},
            mobileOptimized: 0,
            averageQuality: 0
        };

        let totalQuality = 0;

        this.results.forEach(result => {
            if (result.success && result.analysis) {
                const analysis = result.analysis;

                // Count clipping risks
                if (analysis.clippingRisk === 'Low') stats.clippingRisks.low++;
                else if (analysis.clippingRisk === 'Medium') stats.clippingRisks.medium++;
                else if (analysis.clippingRisk === 'High') stats.clippingRisks.high++;

                // Count categories
                const category = analysis.fontCategory || 'unknown';
                stats.categories[category] = (stats.categories[category] || 0) + 1;

                // Count mobile optimized
                if (analysis.mobileOptimized) stats.mobileOptimized++;

                // Sum quality scores
                totalQuality += analysis.qualityScore;
            }
        });

        stats.averageQuality = stats.successful > 0 ? Math.round(totalQuality / stats.successful) : 0;

        console.log(`\n📈 Analysis Results:`);
        console.log(`   Total Fonts: ${stats.total}`);
        console.log(`   Successful: ${stats.successful}`);
        console.log(`   Errors: ${stats.errors}`);
        console.log(`   Success Rate: ${((stats.successful / stats.total) * 100).toFixed(1)}%`);
        console.log(`\n🎯 Clipping Risk Distribution:`);
        console.log(`   Low Risk: ${stats.clippingRisks.low} (${((stats.clippingRisks.low / stats.successful) * 100).toFixed(1)}%)`);
        console.log(`   Medium Risk: ${stats.clippingRisks.medium} (${((stats.clippingRisks.medium / stats.successful) * 100).toFixed(1)}%)`);
        console.log(`   High Risk: ${stats.clippingRisks.high} (${((stats.clippingRisks.high / stats.successful) * 100).toFixed(1)}%)`);
        console.log(`\n📱 Mobile Optimization:`);
        console.log(`   Mobile Optimized: ${stats.mobileOptimized} (${((stats.mobileOptimized / stats.successful) * 100).toFixed(1)}%)`);
        console.log(`   Average Quality Score: ${stats.averageQuality}/100`);

        return stats;
    }

    async generateReport() {
        console.log('\n📄 Generating Comprehensive Report...');

        const reportData = {
            metadata: {
                generatedAt: new Date().toISOString(),
                testName: TEST_NAME,
                mobileConfig: this.mobileConfig,
                totalFonts: this.fonts.length
            },
            summary: await this.analyzeResults(),
            results: this.results.map(result => ({
                font: result.font ? {
                    name: result.font.name,
                    style: result.font.fontStyle,
                    category: result.font.category,
                    isPro: result.font.isPro
                } : null,
                success: result.success,
                error: result.error,
                analysis: result.analysis
            })),
            recommendations: this.generateRecommendations()
        };

        // Save comprehensive report
        const reportPath = path.join(SAMPLES_DIR, 'orkun_c_analysis_report.json');
        fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

        // Generate HTML summary
        await this.generateHTMLSummary(reportData);

        console.log(`   ✅ Report saved: ${reportPath}`);
        console.log(`   ✅ HTML summary: ${path.join(SAMPLES_DIR, 'summary.html')}`);
    }

    generateRecommendations() {
        const highRiskFonts = this.results
            .filter(r => r.success && r.analysis && r.analysis.clippingRisk === 'High')
            .map(r => r.font.fontStyle);

        const recommendations = [];

        if (highRiskFonts.length > 0) {
            recommendations.push({
                type: 'critical',
                title: 'High Clipping Risk Fonts',
                description: `${highRiskFonts.length} fonts have high clipping risk and need mobile optimization`,
                fonts: highRiskFonts,
                action: 'Implement font-specific size adjustments for mobile containers'
            });
        }

        const lowQualityFonts = this.results
            .filter(r => r.success && r.analysis && r.analysis.qualityScore < 60)
            .map(r => r.font.fontStyle);

        if (lowQualityFonts.length > 0) {
            recommendations.push({
                type: 'warning',
                title: 'Low Quality Fonts',
                description: `${lowQualityFonts.length} fonts have quality scores below 60`,
                fonts: lowQualityFonts,
                action: 'Review font sizing and container optimization'
            });
        }

        const mobileOptimizedCount = this.results.filter(r =>
            r.success && r.analysis && r.analysis.mobileOptimized
        ).length;

        if (mobileOptimizedCount < this.results.length * 0.8) {
            recommendations.push({
                type: 'improvement',
                title: 'Mobile Optimization Needed',
                description: `Only ${mobileOptimizedCount} out of ${this.results.length} fonts are fully mobile optimized`,
                action: 'Implement mobile-specific font sizing algorithm'
            });
        }

        return recommendations;
    }

    async generateHTMLSummary(reportData) {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orkun C. Sample Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .stat-label { color: #7f8c8d; }
        .risk-low { color: #27ae60; }
        .risk-medium { color: #f39c12; }
        .risk-high { color: #e74c3c; }
        .font-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; }
        .font-item { border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
        .font-item.success { border-color: #27ae60; }
        .font-item.error { border-color: #e74c3c; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 Orkun C. Mobile SVG Analysis Report</h1>
            <p>Generated: ${new Date(reportData.metadata.generatedAt).toLocaleString()}</p>
            <p>Target Container: ${reportData.metadata.mobileConfig.targetWidth}×${reportData.metadata.mobileConfig.targetHeight}</p>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-value">${reportData.summary.total}</div>
                <div class="stat-label">Total Fonts</div>
            </div>
            <div class="stat">
                <div class="stat-value">${reportData.summary.successful}</div>
                <div class="stat-label">Successful</div>
            </div>
            <div class="stat">
                <div class="stat-value risk-low">${reportData.summary.clippingRisks.low}</div>
                <div class="stat-label">Low Risk</div>
            </div>
            <div class="stat">
                <div class="stat-value risk-medium">${reportData.summary.clippingRisks.medium}</div>
                <div class="stat-label">Medium Risk</div>
            </div>
            <div class="stat">
                <div class="stat-value risk-high">${reportData.summary.clippingRisks.high}</div>
                <div class="stat-label">High Risk</div>
            </div>
            <div class="stat">
                <div class="stat-value">${reportData.summary.averageQuality}/100</div>
                <div class="stat-label">Avg Quality</div>
            </div>
        </div>

        ${reportData.recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>🎯 Recommendations</h3>
            ${reportData.recommendations.map(rec => `
                <div>
                    <strong>${rec.title}:</strong> ${rec.description}<br>
                    <em>Action: ${rec.action}</em>
                </div>
            `).join('<br>')}
        </div>
        ` : ''}

        <h3>📊 Font Analysis Results</h3>
        <div class="font-grid">
            ${reportData.results.map(result => `
                <div class="font-item ${result.success ? 'success' : 'error'}">
                    <h4>${result.font ? result.font.name : 'Unknown'}</h4>
                    <p><strong>Style:</strong> ${result.font ? result.font.style : 'N/A'}</p>
                    ${result.success && result.analysis ? `
                        <p><strong>Dimensions:</strong> ${result.analysis.estimatedWidth}×${result.analysis.estimatedHeight}</p>
                        <p><strong>Clipping Risk:</strong> <span class="risk-${result.analysis.riskLevel}">${result.analysis.clippingRisk}</span></p>
                        <p><strong>Quality Score:</strong> ${result.analysis.qualityScore}/100</p>
                        <p><strong>Mobile Optimized:</strong> ${result.analysis.mobileOptimized ? '✅' : '❌'}</p>
                    ` : `
                        <p style="color: #e74c3c;"><strong>Error:</strong> ${result.error}</p>
                    `}
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

        const htmlPath = path.join(SAMPLES_DIR, 'summary.html');
        fs.writeFileSync(htmlPath, html);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the generator
const generator = new OrkuncSampleGenerator();
generator.init().catch(console.error);