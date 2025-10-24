// Mobile SVG Optimization Test Suite

class MobileSVGTester {
    constructor() {
        this.baseUrl = '/api';
        this.fonts = [];
        this.currentSettings = {
            containerWidth: 340,
            containerHeight: 148,
            safeZonePadding: 10
        };
        this.testResults = [];

        this.init();
    }

    async init() {
        await this.loadFonts();
        this.setupEventListeners();
        this.updateMobileContainer();
        this.loadPreSamples();
    }

    async loadFonts() {
        try {
            const response = await fetch(`${this.baseUrl}/miniStyles`);
            const data = await response.json();

            if (data.success) {
                this.fonts = data.data;
                this.populateFontSelect();
            }
        } catch (error) {
            console.error('Error loading fonts:', error);
            this.showMessage('Error loading fonts', 'error');
        }
    }

    populateFontSelect() {
        const select = document.getElementById('fontSelect');
        select.innerHTML = '<option value="">Select a font...</option>';

        this.fonts.forEach(font => {
            const option = document.createElement('option');
            option.value = font.fontStyle;
            option.textContent = `${font.name} (${font.fontStyle})`;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        document.getElementById('generateBtn').addEventListener('click', () => this.generateSingle());
        document.getElementById('generateAllBtn').addEventListener('click', () => this.generateAllFonts());

        // Settings listeners
        document.getElementById('containerWidth').addEventListener('input', (e) => {
            this.currentSettings.containerWidth = parseInt(e.target.value);
            this.updateMobileContainer();
        });

        document.getElementById('containerHeight').addEventListener('input', (e) => {
            this.currentSettings.containerHeight = parseInt(e.target.value);
            this.updateMobileContainer();
        });

        document.getElementById('safeZone').addEventListener('input', (e) => {
            this.currentSettings.safeZonePadding = parseInt(e.target.value);
            this.updateMobileContainer();
        });

        // Batch testing
        document.getElementById('testAllFonts').addEventListener('click', () => this.testAllFonts());
        document.getElementById('testLongNames').addEventListener('click', () => this.testLongNames());
        document.getElementById('testTurkishChars').addEventListener('click', () => this.testTurkishChars());
        document.getElementById('exportResults').addEventListener('click', () => this.exportResults());
    }

    updateMobileContainer() {
        const container = document.getElementById('mobileContainer');
        const safeZone = document.getElementById('safeZone');
        const dimensionInfo = document.getElementById('dimensionInfo');

        container.style.width = this.currentSettings.containerWidth + 'px';
        container.style.height = this.currentSettings.containerHeight + 'px';

        const safeWidth = this.currentSettings.containerWidth - (this.currentSettings.safeZonePadding * 2);
        const safeHeight = this.currentSettings.containerHeight - (this.currentSettings.safeZonePadding * 2);

        safeZone.style.width = safeWidth + 'px';
        safeZone.style.height = safeHeight + 'px';
        safeZone.style.top = this.currentSettings.safeZonePadding + 'px';
        safeZone.style.left = this.currentSettings.safeZonePadding + 'px';

        dimensionInfo.textContent = `Container: ${this.currentSettings.containerWidth}×${this.currentSettings.containerHeight} | Safe Zone: ${safeWidth}×${safeHeight}`;
    }

    async generateSingle() {
        const name = document.getElementById('nameInput').value;
        const fontStyle = document.getElementById('fontSelect').value;

        if (!name || !fontStyle) {
            this.showMessage('Please enter name and select font', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const result = await this.generateSignature(name, fontStyle);
            if (result.success) {
                this.displayPreview(result.data[0], name, fontStyle);
                this.analyzeSignature(result.data[0], name, fontStyle);
            }
        } catch (error) {
            console.error('Generation error:', error);
            this.showMessage('Error generating signature', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async generateAllFonts() {
        const name = document.getElementById('nameInput').value || 'Orkun C.';

        this.showLoading(true);
        const samplesGrid = document.getElementById('samplesGrid');
        const totalFonts = this.fonts.length;
        samplesGrid.innerHTML = `<p>Generating samples for all ${totalFonts} fonts...</p>`;

        try {
            const samples = [];
            let completed = 0;
            let successful = 0;

            for (const font of this.fonts) { // Test all fonts
                try {
                    // Update progress
                    samplesGrid.innerHTML = `
                        <div style="text-align: center; padding: 20px;">
                            <h3>Generating Samples... ${completed + 1}/${totalFonts}</h3>
                            <p>Current: <strong>${font.name}</strong> (${font.fontStyle})</p>
                            <p>Successful: ${successful} | Failed: ${completed - successful}</p>
                            <div style="background: #ddd; height: 20px; border-radius: 10px; margin: 15px 0; overflow: hidden;">
                                <div style="background: #3498db; height: 100%; width: ${(completed / totalFonts) * 100}%; border-radius: 10px; transition: width 0.3s;"></div>
                            </div>
                            <p>${Math.round((completed / totalFonts) * 100)}% Complete</p>
                        </div>
                    `;

                    const result = await this.generateSignature(name, font.fontStyle);
                    if (result.success) {
                        samples.push({
                            font: font,
                            data: result.data[0],
                            name: name
                        });
                        successful++;
                    }
                } catch (error) {
                    console.error(`Error with font ${font.fontStyle}:`, error);
                }
                completed++;

                // Small delay to show progress and prevent overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 150));
            }

            this.displaySamples(samples);
        } finally {
            this.showLoading(false);
        }
    }

    async generateSignature(name, fontStyle) {
        const response = await fetch(`${this.baseUrl}/miniGenerate-signature`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                fontStyle: fontStyle
            })
        });

        const result = await response.json();

        // Fetch SVG content if svgUrl is available
        if (result.success && result.svgUrl) {
            try {
                const svgResponse = await fetch(result.svgUrl);
                if (svgResponse.ok) {
                    const svgContent = await svgResponse.text();
                    // Add svg_content to the first data item
                    if (result.data && result.data[0]) {
                        result.data[0].svg_content = svgContent;
                    }
                }
            } catch (error) {
                console.error('Error fetching SVG content:', error);
            }
        }

        return result;
    }

    displayPreview(signatureData, name, fontStyle) {
        const preview = document.getElementById('svgPreview');

        if (signatureData.svg_content) {
            preview.innerHTML = signatureData.svg_content;
            this.updateClippingStatus('safe');
        } else {
            preview.innerHTML = '<p>No SVG content available</p>';
            this.updateClippingStatus('unknown');
        }
    }

    analyzeSignature(signatureData, name, fontStyle) {
        const analysis = this.performAnalysis(signatureData, name, fontStyle);

        document.getElementById('svgDimensions').textContent =
            `${analysis.svgWidth}×${analysis.svgHeight}`;
        document.getElementById('clippingRisk').textContent = analysis.clippingRisk;
        document.getElementById('clippingRisk').className = `status-${analysis.riskLevel}`;
        document.getElementById('fontSize').textContent = analysis.fontSize + 'px';
        document.getElementById('textWidth').textContent = analysis.textWidth + 'px';
        document.getElementById('qualityScore').textContent = analysis.qualityScore + '/100';
    }

    performAnalysis(signatureData, name, fontStyle) {
        const svgElement = document.querySelector('#svgPreview svg');
        let analysis = {
            svgWidth: 0,
            svgHeight: 0,
            clippingRisk: 'Unknown',
            riskLevel: 'unknown',
            fontSize: 0,
            textWidth: 0,
            qualityScore: 0
        };

        if (svgElement) {
            const bbox = svgElement.getBBox();
            const viewBox = svgElement.viewBox.baseVal;

            analysis.svgWidth = Math.round(viewBox.width || bbox.width);
            analysis.svgHeight = Math.round(viewBox.height || bbox.height);

            // Check clipping risk
            const safeWidth = this.currentSettings.containerWidth - (this.currentSettings.safeZonePadding * 2);
            const safeHeight = this.currentSettings.containerHeight - (this.currentSettings.safeZonePadding * 2);

            const widthRisk = analysis.svgWidth > safeWidth;
            const heightRisk = analysis.svgHeight > safeHeight;

            if (widthRisk || heightRisk) {
                analysis.clippingRisk = 'High Risk';
                analysis.riskLevel = 'danger';
            } else if (analysis.svgWidth > safeWidth * 0.9 || analysis.svgHeight > safeHeight * 0.9) {
                analysis.clippingRisk = 'Medium Risk';
                analysis.riskLevel = 'warning';
            } else {
                analysis.clippingRisk = 'Low Risk';
                analysis.riskLevel = 'safe';
            }

            // Extract font size and text width from SVG
            const textElement = svgElement.querySelector('text');
            if (textElement) {
                const fontSize = textElement.getAttribute('font-size') ||
                               window.getComputedStyle(textElement)['font-size'];
                analysis.fontSize = parseInt(fontSize) || 0;

                const textBBox = textElement.getBBox();
                analysis.textWidth = Math.round(textBBox.width);
            }

            // Calculate quality score
            analysis.qualityScore = this.calculateQualityScore(analysis);
        }

        return analysis;
    }

    calculateQualityScore(analysis) {
        let score = 100;

        // Penalize clipping risk
        if (analysis.riskLevel === 'danger') score -= 40;
        else if (analysis.riskLevel === 'warning') score -= 20;

        // Penalize very small fonts (readability)
        if (analysis.fontSize < 18) score -= 20;
        else if (analysis.fontSize < 24) score -= 10;

        // Penalize very large fonts (not mobile optimized)
        if (analysis.fontSize > 50) score -= 15;

        // Ensure minimum score
        return Math.max(0, score);
    }

    displaySamples(samples) {
        const samplesGrid = document.getElementById('samplesGrid');
        samplesGrid.innerHTML = '';

        if (samples.length === 0) {
            samplesGrid.innerHTML = '<p>No samples generated</p>';
            return;
        }

        samples.forEach(sample => {
            const sampleDiv = document.createElement('div');
            sampleDiv.className = 'sample-item';

            const analysis = this.performAnalysisFromSVG(sample.data.svg_content);

            sampleDiv.innerHTML = `
                <div class="sample-title">${sample.font.name} (${sample.font.fontStyle})</div>
                <div class="sample-preview">
                    ${sample.data.svg_content || '<p>No SVG</p>'}
                </div>
                <div class="sample-info">
                    Dimensions: ${analysis.svgWidth}×${analysis.svgHeight}<br>
                    Risk: <span class="status-${analysis.riskLevel}">${analysis.clippingRisk}</span><br>
                    Quality: ${analysis.qualityScore}/100
                </div>
            `;

            samplesGrid.appendChild(sampleDiv);
        });
    }

    performAnalysisFromSVG(svgContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svgContent;
        const svgElement = tempDiv.querySelector('svg');

        if (!svgElement) {
            return {
                svgWidth: 0,
                svgHeight: 0,
                clippingRisk: 'No SVG',
                riskLevel: 'unknown',
                qualityScore: 0
            };
        }

        const viewBox = svgElement.viewBox.baseVal;
        const bbox = svgElement.getBBox();

        const svgWidth = Math.round(viewBox.width || bbox.width);
        const svgHeight = Math.round(viewBox.height || bbox.height);

        const safeWidth = this.currentSettings.containerWidth - (this.currentSettings.safeZonePadding * 2);
        const safeHeight = this.currentSettings.containerHeight - (this.currentSettings.safeZonePadding * 2);

        let clippingRisk, riskLevel;

        if (svgWidth > safeWidth || svgHeight > safeHeight) {
            clippingRisk = 'High Risk';
            riskLevel = 'danger';
        } else if (svgWidth > safeWidth * 0.9 || svgHeight > safeHeight * 0.9) {
            clippingRisk = 'Medium Risk';
            riskLevel = 'warning';
        } else {
            clippingRisk = 'Low Risk';
            riskLevel = 'safe';
        }

        const qualityScore = this.calculateQualityScore({
            riskLevel,
            fontSize: 32, // Default assumption
            svgWidth,
            svgHeight
        });

        return {
            svgWidth,
            svgHeight,
            clippingRisk,
            riskLevel,
            qualityScore
        };
    }

    async testAllFonts() {
        const name = 'Orkun C.';
        this.testResults = [];

        this.showLoading(true);
        this.updateResultsTable([]);

        for (const font of this.fonts) {
            try {
                const result = await this.generateSignature(name, font.fontStyle);
                if (result.success) {
                    const analysis = this.performAnalysisFromSVG(result.data[0].svg_content);

                    this.testResults.push({
                        font: font.name,
                        fontStyle: font.fontStyle,
                        name: name,
                        dimensions: `${analysis.svgWidth}×${analysis.svgHeight}`,
                        clipping: analysis.clippingRisk,
                        riskLevel: analysis.riskLevel,
                        quality: analysis.qualityScore,
                        svgContent: result.data[0].svg_content
                    });
                }
            } catch (error) {
                this.testResults.push({
                    font: font.name,
                    fontStyle: font.fontStyle,
                    name: name,
                    dimensions: 'Error',
                    clipping: 'Error',
                    riskLevel: 'danger',
                    quality: 0,
                    svgContent: null
                });
            }

            // Update table progressively
            this.updateResultsTable(this.testResults);
        }

        this.showLoading(false);
        this.showMessage('Batch testing completed', 'success');
    }

    async testLongNames() {
        const longNames = [
            'Mehmet Ali Çelik',
            'Dr. Mustafa Kemal Atatürk',
            'Profesör Doktor İsmail Hakkı Uzunköprülü'
        ];

        await this.runBatchTest(longNames, 'Long Names Test');
    }

    async testTurkishChars() {
        const turkishNames = [
            'Çağlar Şölen',
            'Gülşen Öztürk',
            'İbrahim Ünal',
            'Orkun Çaylar'
        ];

        await this.runBatchTest(turkishNames, 'Turkish Characters Test');
    }

    async runBatchTest(names, testName) {
        const fontStyle = 'quixel'; // Use default font for character tests
        this.testResults = [];

        this.showLoading(true);
        this.updateResultsTable([]);

        for (const name of names) {
            try {
                const result = await this.generateSignature(name, fontStyle);
                if (result.success) {
                    const analysis = this.performAnalysisFromSVG(result.data[0].svg_content);

                    this.testResults.push({
                        font: 'Quixel',
                        fontStyle: fontStyle,
                        name: name,
                        dimensions: `${analysis.svgWidth}×${analysis.svgHeight}`,
                        clipping: analysis.clippingRisk,
                        riskLevel: analysis.riskLevel,
                        quality: analysis.qualityScore,
                        svgContent: result.data[0].svg_content
                    });
                }
            } catch (error) {
                this.testResults.push({
                    font: 'Quixel',
                    fontStyle: fontStyle,
                    name: name,
                    dimensions: 'Error',
                    clipping: 'Error',
                    riskLevel: 'danger',
                    quality: 0,
                    svgContent: null
                });
            }

            this.updateResultsTable(this.testResults);
        }

        this.showLoading(false);
        this.showMessage(`${testName} completed`, 'success');
    }

    updateResultsTable(results) {
        const tbody = document.querySelector('#resultsTable tbody');
        tbody.innerHTML = '';

        results.forEach((result, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result.font}</td>
                <td>${result.name}</td>
                <td>${result.dimensions}</td>
                <td><span class="status-${result.riskLevel}">${result.clipping}</span></td>
                <td>${result.quality}/100</td>
                <td>
                    <button class="action-btn preview-btn" onclick="tester.previewResult(${index})">Preview</button>
                    <button class="action-btn download-btn" onclick="tester.downloadSVG(${index})">Download</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    previewResult(index) {
        const result = this.testResults[index];
        if (result && result.svgContent) {
            document.getElementById('svgPreview').innerHTML = result.svgContent;
            document.getElementById('nameInput').value = result.name;

            // Find and select the font
            const fontSelect = document.getElementById('fontSelect');
            for (let option of fontSelect.options) {
                if (option.value === result.fontStyle) {
                    option.selected = true;
                    break;
                }
            }

            this.analyzeSignature({ svg_content: result.svgContent }, result.name, result.fontStyle);
        }
    }

    downloadSVG(index) {
        const result = this.testResults[index];
        if (result && result.svgContent) {
            const blob = new Blob([result.svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${result.name}_${result.fontStyle}.svg`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    exportResults() {
        if (this.testResults.length === 0) {
            this.showMessage('No results to export', 'warning');
            return;
        }

        const exportData = {
            timestamp: new Date().toISOString(),
            settings: this.currentSettings,
            results: this.testResults.map(r => ({
                font: r.font,
                fontStyle: r.fontStyle,
                name: r.name,
                dimensions: r.dimensions,
                clipping: r.clipping,
                quality: r.quality
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `svg_test_results_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showMessage('Results exported successfully', 'success');
    }

    updateClippingStatus(status) {
        const statusElement = document.getElementById('clippingStatus');
        statusElement.className = `clipping-status status-${status}`;

        const statusText = {
            'safe': 'Safe - No Clipping',
            'warning': 'Warning - Potential Clipping',
            'danger': 'Danger - Clipping Detected',
            'unknown': 'Status: Ready'
        };

        statusElement.textContent = statusText[status] || statusText.unknown;
    }

    showLoading(show) {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = show;
            if (show && !btn.querySelector('.loading')) {
                const loader = document.createElement('span');
                loader.className = 'loading';
                btn.appendChild(loader);
            } else if (!show) {
                const loader = btn.querySelector('.loading');
                if (loader) loader.remove();
            }
        });
    }

    showMessage(text, type = 'info') {
        const container = document.querySelector('.container');
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;

        container.insertBefore(message, container.firstChild);

        setTimeout(() => {
            message.remove();
        }, 5000);
    }

    loadPreSamples() {
        // This would load pre-generated samples if available
        const samplesGrid = document.getElementById('samplesGrid');
        samplesGrid.innerHTML = '<p>Click "Generate All Fonts" to create samples</p>';
    }
}

// Initialize the tester when DOM is loaded
let tester;
document.addEventListener('DOMContentLoaded', () => {
    tester = new MobileSVGTester();
});

// Make tester globally accessible for onclick handlers
window.tester = tester;