const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const NAME_TO_GENERATE = 'Orkun Çaylar';
const OUTPUT_DIR = path.join(__dirname, '@data', 'signatures');

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

// Function to generate signature for a specific style
async function generateSignature(styleId) {
    try {
        console.log(`Generating signature for style: ${styleId}`);
        
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
            const filename = `orkun_caylar_${styleId}_${timestamp}.png`;
            
            const savedPath = saveBase64AsPNG(base64Data, filename);
            
            if (savedPath) {
                console.log(`✅ Successfully saved: ${filename}`);
                return {
                    success: true,
                    styleId,
                    filename,
                    path: savedPath,
                    timestamp
                };
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

// Function to get all available styles
async function getAllStyles() {
    try {
        console.log('Fetching all available styles...');
        const response = await axios.get(`${API_BASE_URL}/api/miniStyles`);
        
        if (response.data.success && response.data.data) {
            console.log(`Found ${response.data.data.length} styles`);
            return response.data.data.map(style => style.id);
        } else {
            throw new Error('Failed to fetch styles');
        }
    } catch (error) {
        console.error('Error fetching styles:', error.message);
        throw error;
    }
}

// Main function to generate all signatures
async function generateAllSignatures() {
    console.log('🚀 Starting batch signature generation...');
    console.log(`Name: ${NAME_TO_GENERATE}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
    console.log('=' * 50);

    try {
        // Get all available styles
        const styleIds = await getAllStyles();
        
        console.log(`\nGenerating signatures for ${styleIds.length} styles...\n`);

        const results = [];
        let successCount = 0;
        let failCount = 0;

        // Generate signatures one by one to avoid overwhelming the server
        for (let i = 0; i < styleIds.length; i++) {
            const styleId = styleIds[i];
            console.log(`\n[${i + 1}/${styleIds.length}] Processing style: ${styleId}`);
            
            const result = await generateSignature(styleId);
            results.push(result);
            
            if (result.success) {
                successCount++;
            } else {
                failCount++;
            }
            
            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Generate summary report
        const timestamp = getTimestamp();
        const reportPath = path.join(OUTPUT_DIR, `batch_generation_report_${timestamp}.json`);
        
        const report = {
            generated_at: new Date().toISOString(),
            name_used: NAME_TO_GENERATE,
            total_styles: styleIds.length,
            successful_generations: successCount,
            failed_generations: failCount,
            success_rate: `${((successCount / styleIds.length) * 100).toFixed(1)}%`,
            results: results
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Print summary
        console.log('\n' + '=' * 50);
        console.log('📊 BATCH GENERATION SUMMARY');
        console.log('=' * 50);
        console.log(`Total styles processed: ${styleIds.length}`);
        console.log(`Successful generations: ${successCount}`);
        console.log(`Failed generations: ${failCount}`);
        console.log(`Success rate: ${report.success_rate}`);
        console.log(`Output directory: ${OUTPUT_DIR}`);
        console.log(`Report saved: ${reportPath}`);

        if (failCount > 0) {
            console.log('\n❌ Failed styles:');
            results.filter(r => !r.success).forEach(r => {
                console.log(`  - ${r.styleId}: ${r.error}`);
            });
        }

        console.log('\n✅ Batch generation completed!');
        
        return report;

    } catch (error) {
        console.error('\n💥 Batch generation failed:', error.message);
        throw error;
    }
}

// Enhanced request logging function
function logSignatureRequest(styleId, name, success, error = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        type: 'signature_generation',
        style_id: styleId,
        name_requested: name,
        success,
        error: error || null
    };
    
    const logPath = path.join(OUTPUT_DIR, 'signature_requests.log');
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
        fs.appendFileSync(logPath, logLine);
    } catch (err) {
        console.error('Failed to write to log file:', err.message);
    }
}

// Run the batch generation if this script is executed directly
if (require.main === module) {
    generateAllSignatures()
        .then(report => {
            console.log('\n🎉 All done! Check the @data/signatures directory for your signature files.');
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
    getAllStyles,
    logSignatureRequest
};