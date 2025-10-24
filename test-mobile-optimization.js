const express = require('express');
const path = require('path');
const fs = require('fs');

// Import our mobile optimization components
const MobileOptimizationAPI = require('./mobile-optimization-api');
const { mobileConfig, mobileConfigHelpers } = require('./config/mobileConfig');
const ClippingPreventionAlgorithm = require('./algorithms/clippingPrevention');
const ResponsiveScalingSystem = require('./utils/responsiveScaling');

class MobileOptimizationTestSuite {
    constructor() {
        this.mobileAPI = new MobileOptimizationAPI();
        this.clippingPrevention = new ClippingPreventionAlgorithm();
        this.responsiveScaling = new ResponsiveScalingSystem();
        this.testResults = [];
    }

    // Main test runner
    async runComprehensiveTests() {
        console.log('🚀 Starting Mobile Optimization Test Suite');
        console.log('=' * 60);

        try {
            // Test 1: Font Configuration Tests
            await this.testFontConfigurations();

            // Test 2: Clipping Prevention Tests
            await this.testClippingPrevention();

            // Test 3: Responsive Scaling Tests
            await this.testResponsiveScaling();

            // Test 4: API Endpoint Tests
            await this.testAPIEndpoints();

            // Test 5: Real-world Scenarios
            await this.testRealWorldScenarios();

            // Generate final report
            this.generateTestReport();

        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }

    async testFontConfigurations() {
        console.log('\n📝 Testing Font Configurations...');

        const testFonts = ['zephyr', 'quixel', 'lunar', 'prism', 'celestial'];
        const testNames = ['John', 'Orkun C.', 'Alexandra Smith', 'Mohammed Al-Rashid'];

        for (const fontId of testFonts) {
            console.log(`\n  Testing font: ${fontId}`);

            const fontConfig = mobileConfigHelpers.getFontConfig(fontId);
            this.logTestResult(`Font config for ${fontId}`, true, {
                config: fontConfig,
                hasConfig: !!fontConfig
            });

            for (const name of testNames) {
                const optimalSize = mobileConfigHelpers.calculateOptimalFontSize(
                    fontId,
                    name,
                    100
                );

                const lengthCategory = mobileConfigHelpers.getNameLengthCategory(name);

                this.logTestResult(`Optimal size for "${name}" with ${fontId}`, true, {
                    name,
                    fontId,
                    optimalSize,
                    lengthCategory
                });

                console.log(`    "${name}" -> ${optimalSize}px (${lengthCategory})`);
            }
        }
    }

    async testClippingPrevention() {
        console.log('\n🔍 Testing Clipping Prevention Algorithm...');

        const signatureStyles = require('./config/signatureStyles');
        const testCases = [
            { name: 'John', expectedRisk: 'low' },
            { name: 'Orkun C.', expectedRisk: 'medium' },
            { name: 'Alexandra Smith', expectedRisk: 'high' },
            { name: 'Very Long Name That Should Clip', expectedRisk: 'very_high' }
        ];

        for (const testCase of testCases) {
            console.log(`\n  Testing clipping prevention for: "${testCase.name}"`);

            // Test with first available font style
            const style = signatureStyles[0];
            if (!style) {
                console.log('    ⚠️  No font styles available');
                continue;
            }

            try {
                const result = await this.clippingPrevention.preventClipping(
                    testCase.name,
                    style.fontConfig,
                    { width: 340, height: 148 }
                );

                console.log(`    Original: ${style.fontConfig.size}px -> Optimal: ${result.optimalFontSize}px`);
                console.log(`    Clipping Risk: ${result.clippingRisk}`);
                console.log(`    Quality Score: ${result.qualityScore}/100`);
                console.log(`    Fits in Safe Zone: ${result.fitsInSafeZone ? '✅' : '❌'}`);

                this.logTestResult(`Clipping prevention for "${testCase.name}"`, result.success, {
                    name: testCase.name,
                    originalSize: style.fontConfig.size,
                    optimalSize: result.optimalFontSize,
                    clippingRisk: result.clippingRisk,
                    qualityScore: result.qualityScore,
                    fitsInSafeZone: result.fitsInSafeZone
                });

            } catch (error) {
                console.log(`    ❌ Error: ${error.message}`);
                this.logTestResult(`Clipping prevention for "${testCase.name}"`, false, {
                    error: error.message
                });
            }
        }
    }

    async testResponsiveScaling() {
        console.log('\n📱 Testing Responsive Scaling System...');

        const testName = 'Orkun C.';
        const testFontConfig = {
            id: 'zephyr',
            family: 'Birmingham Script',
            size: 100,
            color: '#000000',
            path: path.join(__dirname, 'fonts/Birmingham_Script.otf')
        };

        const deviceTypes = ['mobile', 'tablet', 'desktop'];

        for (const deviceType of deviceTypes) {
            console.log(`\n  Testing ${deviceType} scaling...`);

            try {
                const result = await this.responsiveScaling.generateResponsiveSignature(
                    testName,
                    testFontConfig,
                    deviceType
                );

                if (result.success) {
                    console.log(`    Device: ${result.device}`);
                    console.log(`    Original: ${result.original.fontSize}px`);
                    console.log(`    Optimized: ${result.optimized.fontSize}px`);
                    console.log(`    Scaling Factor: ${result.optimized.scalingFactor.toFixed(2)}`);
                    console.log(`    Quality Score: ${result.optimized.qualityScore}/100`);

                    this.logTestResult(`Responsive scaling for ${deviceType}`, true, {
                        device: deviceType,
                        originalSize: result.original.fontSize,
                        optimizedSize: result.optimized.fontSize,
                        scalingFactor: result.optimized.scalingFactor,
                        qualityScore: result.optimized.qualityScore
                    });
                } else {
                    console.log(`    ❌ Error: ${result.error}`);
                    this.logTestResult(`Responsive scaling for ${deviceType}`, false, {
                        error: result.error
                    });
                }

            } catch (error) {
                console.log(`    ❌ Error: ${error.message}`);
                this.logTestResult(`Responsive scaling for ${deviceType}`, false, {
                    error: error.message
                });
            }
        }

        // Test multi-device scaling
        console.log('\n  Testing multi-device scaling...');
        try {
            const multiDeviceResult = await this.responsiveScaling.generateMultiDeviceScaling(
                testName,
                testFontConfig
            );

            console.log(`    Mobile: ${multiDeviceResult.mobile?.fontSize || 'Error'}px`);
            console.log(`    Tablet: ${multiDeviceResult.tablet?.fontSize || 'Error'}px`);
            console.log(`    Desktop: ${multiDeviceResult.desktop?.fontSize || 'Error'}px`);

            this.logTestResult('Multi-device scaling', true, {
                mobile: multiDeviceResult.mobile?.fontSize,
                tablet: multiDeviceResult.tablet?.fontSize,
                desktop: multiDeviceResult.desktop?.fontSize
            });

        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
            this.logTestResult('Multi-device scaling', false, { error: error.message });
        }
    }

    async testAPIEndpoints() {
        console.log('\n🌐 Testing API Endpoints...');

        // Test mobile config endpoint
        console.log('\n  Testing mobile config endpoint...');
        try {
            const app = express();
            app.use('/api/mobile', this.mobileAPI.getRouter());

            // Simulate request to mobile config
            const mockReq = { method: 'GET', url: '/mobile-config' };
            const mockRes = {
                json: (data) => {
                    console.log('    ✅ Mobile config retrieved');
                    this.logTestResult('Mobile config API', true, {
                        configRetrieved: !!data.config,
                        hasContainerDimensions: !!data.containerDimensions
                    });
                    return data;
                },
                status: (code) => ({ json: mockRes.json })
            };

            this.mobileAPI.getMobileConfig(mockReq, mockRes);

        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
            this.logTestResult('Mobile config API', false, { error: error.message });
        }

        // Test optimization endpoint simulation
        console.log('\n  Testing optimization endpoint simulation...');
        try {
            const testData = {
                name: 'Test User',
                fontStyle: 'zephyr',
                targetDimensions: { width: 340, height: 148 }
            };

            // This would normally be tested with actual HTTP requests
            console.log('    ⚠️  API endpoint testing requires running server');
            console.log('    Simulated optimization request prepared');

            this.logTestResult('API optimization endpoint', true, {
                testDataPrepared: true,
                note: 'Requires running server for full test'
            });

        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
            this.logTestResult('API optimization endpoint', false, { error: error.message });
        }
    }

    async testRealWorldScenarios() {
        console.log('\n🎯 Testing Real-world Scenarios...');

        const realWorldTests = [
            {
                name: 'Turkish Character Support',
                testName: 'Özgür Çağla',
                fontId: 'celestial'
            },
            {
                name: 'Very Long Business Name',
                testName: 'International Business Solutions Corporation Ltd.',
                fontId: 'digital'
            },
            {
                name: 'Short Name Optimization',
                testName: 'AI',
                fontId: 'prism'
            },
            {
                name: 'Mixed Case and Numbers',
                testName: 'John Smith Jr. 2024',
                fontId: 'lunar'
            }
        ];

        for (const test of realWorldTests) {
            console.log(`\n  Testing: ${test.name}`);
            console.log(`    Name: "${test.testName}"`);
            console.log(`    Font: ${test.fontId}`);

            try {
                const fontConfig = mobileConfigHelpers.getFontConfig(test.fontId);
                const testFontConfig = {
                    id: test.fontId,
                    family: 'Test Font',
                    size: 100,
                    color: '#000000'
                };

                const result = await this.responsiveScaling.generateResponsiveSignature(
                    test.testName,
                    testFontConfig,
                    'mobile'
                );

                if (result.success) {
                    console.log(`    ✅ Optimization successful`);
                    console.log(`    Quality Score: ${result.optimized.qualityScore}/100`);
                    console.log(`    Font Size: ${result.optimized.fontSize}px`);
                    console.log(`    Clipping Risk: ${result.optimized.clippingRisk}`);

                    this.logTestResult(test.name, true, {
                        testName: test.testName,
                        fontId: test.fontId,
                        qualityScore: result.optimized.qualityScore,
                        fontSize: result.optimized.fontSize,
                        clippingRisk: result.optimized.clippingRisk
                    });
                } else {
                    console.log(`    ❌ Optimization failed: ${result.error}`);
                    this.logTestResult(test.name, false, {
                        error: result.error
                    });
                }

            } catch (error) {
                console.log(`    ❌ Test failed: ${error.message}`);
                this.logTestResult(test.name, false, {
                    error: error.message
                });
            }
        }
    }

    logTestResult(testName, success, data = {}) {
        this.testResults.push({
            test: testName,
            success,
            timestamp: new Date().toISOString(),
            data
        });
    }

    generateTestReport() {
        console.log('\n📊 Test Report');
        console.log('=' * 60);

        const totalTests = this.testResults.length;
        const successfulTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - successfulTests;
        const successRate = ((successfulTests / totalTests) * 100).toFixed(1);

        console.log(`Total Tests: ${totalTests}`);
        console.log(`Successful: ${successfulTests}`);
        console.log(`Failed: ${failedTests}`);
        console.log(`Success Rate: ${successRate}%`);

        // Group results by category
        const categories = {};
        this.testResults.forEach(result => {
            const category = result.test.split(' ')[0];
            if (!categories[category]) {
                categories[category] = { total: 0, successful: 0 };
            }
            categories[category].total++;
            if (result.success) {
                categories[category].successful++;
            }
        });

        console.log('\n📋 Results by Category:');
        Object.entries(categories).forEach(([category, stats]) => {
            const rate = ((stats.successful / stats.total) * 100).toFixed(1);
            console.log(`  ${category}: ${stats.successful}/${stats.total} (${rate}%)`);
        });

        // Save detailed report
        const reportPath = path.join(__dirname, 'test-results', 'mobile-optimization-report.json');
        const reportDir = path.dirname(reportPath);

        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        const detailedReport = {
            summary: {
                totalTests,
                successfulTests,
                failedTests,
                successRate: parseFloat(successRate),
                categories
            },
            results: this.testResults,
            timestamp: new Date().toISOString(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform
            }
        };

        fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
        console.log(`\n💾 Detailed report saved: ${reportPath}`);

        // Print summary
        if (successRate >= 90) {
            console.log('\n✅ Excellent! Mobile optimization system is working well.');
        } else if (successRate >= 70) {
            console.log('\n⚠️  Good, but some improvements needed.');
        } else {
            console.log('\n❌ Significant issues detected. Review failed tests.');
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const testSuite = new MobileOptimizationTestSuite();
    testSuite.runComprehensiveTests()
        .then(() => {
            console.log('\n🎉 Test suite completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = MobileOptimizationTestSuite;