const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const NAME_TO_GENERATE = 'Orkun Çaylar';
const OUTPUT_DIR = path.join(__dirname, '@data', 'signatures-1280x800');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Function to get current timestamp for filenames
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// Function to convert base64 to PNG file
function saveBase64AsPNG(base64Data, filename) {
    try {
        // Remove data URL prefix if present
        const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
        
        // Convert base64 to buffer
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        // Write to file
        const filepath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(filepath, imageBuffer);
        
        return filepath;
    } catch (error) {
        console.error(`Error saving PNG file ${filename}:`, error.message);
        return null;
    }
}

// Function to verify PNG dimensions
function verifyPNGDimensions(filepath) {
    try {
        const sharp = require('sharp');
        return new Promise((resolve) => {
            sharp(filepath).metadata().then(metadata => {
                resolve({
                    width: metadata.width,
                    height: metadata.height,
                    format: metadata.format
                });
            }).catch(() => {
                resolve(null);
            });
        });
    } catch (error) {
        return null;
    }
}

// Function to generate signature for a specific style
async function generateSignature(styleId) {
    try {
        console.log(`🎨 Generating 1280x800 signature for style: ${styleId}`);
        
        const response = await axios.post(`${API_BASE_URL}/api/miniGenerate-signature`, {
            name: NAME_TO_GENERATE,
            fontStyle: styleId
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });

        if (response.data.success && response.data.data && response.data.data[0] && response.data.data[0].b64_json) {
            const base64Data = response.data.data[0].b64_json;
            const timestamp = getTimestamp();
            const filename = `orkun_caylar_${styleId}_1280x800_${timestamp}.png`;
            
            const savedPath = saveBase64AsPNG(base64Data, filename);
            
            if (savedPath) {
                // Verify dimensions
                const dimensions = await verifyPNGDimensions(savedPath);
                
                if (dimensions && dimensions.width === 1280 && dimensions.height === 800) {
                    console.log(`✅ Successfully saved 1280x800: ${filename}`);
                    return {
                        success: true,
                        styleId,
                        filename,
                        path: savedPath,
                        timestamp,
                        dimensions: dimensions
                    };
                } else {
                    console.log(`⚠️  Warning: Incorrect dimensions for ${styleId}: ${dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown'}`);
                    return {
                        success: false,
                        styleId,
                        error: `Incorrect dimensions: expected 1280x800, got ${dimensions ? `${dimensions.width}x${dimensions.height}` : 'unknown'}`,
                        filename,
                        path: savedPath
                    };
                }
            } else {
                console.log(`❌ Failed to save PNG for style: ${styleId}`);
                return {
                    success: false,
                    styleId,
                    error: 'Failed to save PNG file'
                };
            }
        } else {
            console.log(`❌ API error for style ${styleId}:`, response.data);
            return {
                success: false,
                styleId,
                error: 'Invalid API response'
            };
        }
    } catch (error) {
        console.log(`❌ Request failed for style ${styleId}:`, error.message);
        return {
            success: false,
            styleId,
            error: error.message
        };
    }
}

// Function to get all available styles (excluding customize)
async function getAllStyles() {
    try {
        console.log('📋 Fetching all available styles...');
        const response = await axios.get(`${API_BASE_URL}/api/miniStyles`);
        
        if (response.data.success && response.data.data) {
            // Filter out customize style since it doesn't have a real font
            const fontStyles = response.data.data.filter(style => !style.isCustomize);
            console.log(`Found ${fontStyles.length} font styles (excluding customize)`);
            return fontStyles.map(style => style.id);
        } else {
            throw new Error('Failed to fetch styles');
        }
    } catch (error) {
        console.error('Error fetching styles:', error.message);
        throw error;
    }
}

// Function to categorize styles
function categorizeStyle(styleId) {
    const signatureKeywords = ['signature', 'script'];
    return signatureKeywords.some(keyword => styleId.toLowerCase().includes(keyword)) ? 'signature' : 'general';
}

// Main function to generate all signatures
async function generateAllSignatures() {
    console.log('🚀 Starting 1280x800 signature generation...');
    console.log(`Name: ${NAME_TO_GENERATE}`);
    console.log(`Canvas size: 1280x800 (optimized for previews)`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
    console.log('='.repeat(60));

    try {
        // Get all available styles
        const styleIds = await getAllStyles();
        
        console.log(`\nGenerating signatures for ${styleIds.length} font styles...\n`);

        const results = [];
        let successCount = 0;
        let failCount = 0;
        const categoryStats = { signature: 0, general: 0 };

        // Generate signatures one by one to avoid overwhelming the server
        for (let i = 0; i < styleIds.length; i++) {
            const styleId = styleIds[i];
            const category = categorizeStyle(styleId);
            
            console.log(`\n[${i + 1}/${styleIds.length}] Processing ${category} style: ${styleId}`);
            
            const result = await generateSignature(styleId);
            results.push(result);
            
            if (result.success) {
                successCount++;
                categoryStats[category]++;
            } else {
                failCount++;
            }
            
            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        // Generate summary report
        const timestamp = getTimestamp();
        const reportPath = path.join(OUTPUT_DIR, `batch_generation_1280x800_report_${timestamp}.json`);
        
        const report = {
            generated_at: new Date().toISOString(),
            canvas_size: "1280x800",
            name_used: NAME_TO_GENERATE,
            total_styles: styleIds.length,
            successful_generations: successCount,
            failed_generations: failCount,
            success_rate: `${((successCount / styleIds.length) * 100).toFixed(1)}%`,
            category_breakdown: {
                signature_fonts: categoryStats.signature,
                general_fonts: categoryStats.general
            },
            results: results
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 1280x800 SIGNATURE GENERATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Canvas size: 1280x800 pixels`);
        console.log(`Total styles processed: ${styleIds.length}`);
        console.log(`Successful generations: ${successCount}`);
        console.log(`Failed generations: ${failCount}`);
        console.log(`Success rate: ${report.success_rate}`);
        console.log(`Signature fonts: ${categoryStats.signature}`);
        console.log(`General fonts: ${categoryStats.general}`);
        console.log(`Output directory: ${OUTPUT_DIR}`);
        console.log(`Report saved: ${reportPath}`);

        if (failCount > 0) {
            console.log('\n❌ Failed styles:');
            results.filter(r => !r.success).forEach(r => {
                console.log(`  - ${r.styleId}: ${r.error}`);
            });
        }

        // Show sample files
        const sampleFiles = results.filter(r => r.success).slice(0, 5);
        if (sampleFiles.length > 0) {
            console.log('\n📁 Sample generated files:');
            sampleFiles.forEach(r => {
                console.log(`  - ${r.filename}`);
            });
        }

        console.log('\n✅ 1280x800 signature generation completed!');
        
        return report;

    } catch (error) {
        console.error('\n💥 Batch generation failed:', error.message);
        throw error;
    }
}

// Run the batch generation if this script is executed directly
if (require.main === module) {
    generateAllSignatures()
        .then(report => {
            console.log('\n🎉 All 1280x800 signatures generated! Check the @data/signatures-1280x800 directory.');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Generation failed:', error.message);
            process.exit(1);
        });
}

module.exports = {
    generateAllSignatures,
    generateSignature,
    getAllStyles
};