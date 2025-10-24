const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const NAME_TO_GENERATE = 'Orkun Çaylar';
const OUTPUT_DIR = path.join(__dirname, '@data', 'signatures-1280x800');

// Failed styles from previous run
const failedStyles = [
    'bresley', 'callifornia', 'castenivey', 'fallen_city_2', 'flavellya', 
    'gillfloys_2', 'gillfloys_alt_2', 'gillfloys_alt', 'hagia_signature', 
    'hamburg_signature', 'kristal', 'maritgode', 'marlies', 'milatones_signature', 
    'peter_jhons', 'ray_signature', 'richardson_script', 'rosemary_signature', 
    'saio', 'slender', 'splash_underline', 'thejacklyn', 'singletone'
];

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
        console.log(`🎨 Retrying 1280x800 signature for style: ${styleId}`);
        
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
                console.log(`✅ Successfully saved 1280x800: ${filename}`);
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

// Main function to retry failed signatures
async function retryFailedSignatures() {
    console.log('🔄 Retrying failed 1280x800 signature generation...');
    console.log(`Name: ${NAME_TO_GENERATE}`);
    console.log(`Failed styles to retry: ${failedStyles.length}`);
    console.log('='.repeat(50));

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Generate signatures one by one
    for (let i = 0; i < failedStyles.length; i++) {
        const styleId = failedStyles[i];
        
        console.log(`\n[${i + 1}/${failedStyles.length}] Retrying style: ${styleId}`);
        
        const result = await generateSignature(styleId);
        results.push(result);
        
        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 RETRY SUMMARY');
    console.log('='.repeat(50));
    console.log(`Retried styles: ${failedStyles.length}`);
    console.log(`Successful generations: ${successCount}`);
    console.log(`Still failed: ${failCount}`);
    console.log(`Retry success rate: ${((successCount / failedStyles.length) * 100).toFixed(1)}%`);

    if (failCount > 0) {
        console.log('\n❌ Still failing styles:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.styleId}: ${r.error}`);
        });
    }

    console.log('\n✅ Retry completed!');
    
    return { successCount, failCount, results };
}

// Run the retry
retryFailedSignatures()
    .then(result => {
        console.log(`\n🎉 Retry completed! ${result.successCount}/${failedStyles.length} styles now working.`);
        process.exit(0);
    })
    .catch(error => {
        console.error('\n💥 Retry failed:', error.message);
        process.exit(1);
    });