# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Server
- `npm start` - Start production server (runs on port 3001 by default)
- `npm run dev` - Start development server with nodemon for auto-restart

### Documentation
Interactive HTML documentation available at:
- `http://localhost:3001/docs` - Interactive API documentation with test interface
- `http://localhost:3001/` - Root URL redirects to docs

### Testing API Endpoints
```bash
# Health check
curl http://localhost:3001/api/miniHealth

# Get app configuration
curl http://localhost:3001/api/miniConfig

# Get signature styles
curl http://localhost:3001/api/miniStyles

# Generate signature (returns PNG base64 + SVG)
curl -X POST http://localhost:3001/api/miniGenerate-signature \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Name", "fontStyle": "elegant"}'

# Clean signature photo background
curl -X POST http://localhost:3001/api/miniClean-signature-photo \
  -H "Content-Type: application/json" \
  -d '{"imageData": "data:image/jpeg;base64,...", "options": {"cleaningMode": "auto"}}'

# Upload PDF document
curl -X POST http://localhost:3001/api/miniUpload-pdf \
  -H "Content-Type: application/json" \
  -d '{"pdfData": "base64_data", "fileName": "doc.pdf", "metadata": {}}'
```

## Architecture Overview

This is a Node.js Express API server for generating digital signatures using font-based rendering. The application operates in **font-only mode** and serves as the backend for a signature maker mobile application.

### Core Technology Stack
- **Node.js + Express** - Web server framework
- **node-canvas** - Canvas-based signature rendering with TTF/OTF fonts
- **Sharp** - Image optimization, trimming, and format conversion
- **@resvg/resvg-js** - SVG rendering and conversion
- **fontkit + opentype.js** - Font file parsing and metrics extraction

### Key Design Principles

**1. Dual Output Format**
Every signature generation creates both PNG (base64) and SVG formats:
- PNG: Rasterized with optimal trimming and compression
- SVG: Vector format for scalability and PDF embedding
- Both formats saved to `generated-signatures/` directory

**2. Font Problem Management**
The system handles problematic fonts with special rendering adjustments:
- **Clipping Problems** (ember, storm, wave): Reduced font size + position adjustment
- **Spacing Problems** (tidal, pearl, crystal, blade, blossom, inferno): Letter-spacing adjustment + extra padding
- **Extreme Problems** (drift): Maximum padding + minimal trimming
- See `generateFontSignature()` in server.js:580

**3. Turkish Character Support**
Automatic conversion of Turkish characters to English equivalents before rendering:
- ğ→g, ç→c, ı→i, ö→o, ş→s, ü→u (both upper and lowercase)
- Original name preserved in file naming and logs
- Conversion function: `convertTurkishToEnglish()` in server.js:317

**4. Organized File Storage**
Signatures are saved with organized structure:
- Format: `{sanitized_name}_{timestamp}_{fontStyle}.{png|svg}`
- Dual storage: New organized system + legacy `generated-signatures/` for backwards compatibility
- SignatureOrganizer manages structured storage by user and date

**5. Request Logging System**
Comprehensive logging with dual tracking:
- Traditional log file: `@data/signatures/signature_requests.log`
- Organized system via `SignatureOrganizer` utility
- Logs include: timestamp, name, style, success status, client IP, processing time

### Directory Structure
```
/api
├── server.js                 # Main Express app with signature generation
├── package.json              # Dependencies and scripts
├── config/
│   ├── signatureStyles.js    # 50+ signature style configurations with font mappings
│   ├── appConfig.js          # App limits, premium features, background cleaner config
│   ├── fontIdMapping.js      # Font ID to display name mappings
│   ├── renderConfig.js       # SVG rendering configuration
│   └── mobileConfig.js       # Mobile-specific optimizations
├── routes/
│   ├── styles.js             # Style management endpoints (GET styles)
│   └── render.js             # SVG rendering endpoints
├── lib/
│   ├── signature-service.js  # Core SVG signature generation service
│   └── background-cleaner.js # Photo signature background removal
├── utils/
│   └── signatureOrganizer.js # Organized file storage system
├── fonts/                    # TTF/OTF font files (50+ fonts)
├── assets/styles/            # Style preview images (PNG, enhanced sizes 480-560px)
├── generated-signatures/     # Output directory for PNG and SVG signatures
├── pdf-uploads/              # PDF uploads organized by date (YYYY-MM-DD)
├── signature-requests/       # Organized signature request logs
├── docs/                     # Interactive HTML API documentation
└── mobile-optimization-api.js # Mobile-specific API optimizations
```

### Signature Generation Pipeline

**Main Endpoint:** `POST /api/miniGenerate-signature`

**Flow:**
1. **Input Validation** - Check name parameter and type
2. **Turkish Conversion** - Convert Turkish characters to English (`convertTurkishToEnglish`)
3. **Font Selection** - Load font config from `signatureStyles.js` based on style ID
4. **PNG Generation** - `generateFontSignature()` creates rasterized signature:
   - Creates temporary canvas for text measurement
   - Applies font-specific size and padding adjustments
   - Renders text with optimal positioning
   - Trims whitespace with Sharp (varying threshold per font)
   - Returns base64-encoded PNG
5. **SVG Generation** - `SignatureService.generateSVGSignature()` creates vector version:
   - Uses fontkit to parse font file
   - Applies font-specific size adjustments (some fonts need smaller SVG sizes)
   - Handles kerning and ligatures
   - Generates clean SVG with proper viewBox
6. **File Saving** - Both formats saved to disk:
   - `saveSignatureToFile()` - Saves PNG to organized structure + legacy directory
   - `saveSVGSignatureToFile()` - Saves SVG to both locations
7. **Response** - Returns JSON with:
   - `data[0].b64_json` - Base64 PNG data
   - `svgUrl` - Static URL to SVG file
   - `pngFile` / `svgFile` - Saved filenames
   - `processing_time_ms` - Performance metric

### Configuration System

**signatureStyles.js** (config/signatureStyles.js)
- Array of 50+ style objects with:
  - `id`: Style identifier (e.g., 'zephyr', 'quixel')
  - `name`: Display name (e.g., 'Phoenix', 'Raven')
  - `imageUrl`: Preview image path
  - `isPro`: Premium status (boolean)
  - `category`: Style category ('elegant', 'artistic', 'modern', 'classic')
  - `fontConfig`: Font file path, family name, color (#000000), size (280-560px), weight, italic
  - `fontMetrics`: Font metrics including kerning/ligature support and baseline ratio

**Font Configuration Structure:**
```javascript
{
  path: path.join(__dirname, '../fonts/Birmingham_Script.otf'),
  family: 'Birmingham Script',
  color: '#000000',  // All signatures forced to black
  size: 520,         // Base font size (adjusted per rendering needs)
  italic: false,
  weight: 'normal'
}
```

**Important:** Font configurations are NEVER exposed to clients for security. The `routes/styles.js` explicitly removes `fontConfig` from all API responses.

### Background Cleaner Feature

**Purpose:** Remove background from uploaded signature photos (hand-drawn signatures captured by camera)

**Endpoint:** `POST /api/miniClean-signature-photo`

**Capabilities:**
- Automatic background detection and removal
- Support for multiple image formats (JPEG, PNG, WebP, HEIC, TIFF, BMP)
- Multiple cleaning modes: auto, aggressive, gentle, precise
- Enhancement levels 1-5
- Quality scoring
- Dual output: PNG + JPEG

**Algorithm Selection:**
- White backgrounds: Threshold-based removal
- Colored backgrounds: Color distance calculation
- Complex backgrounds: Multi-stage precise cleaning

**Implementation:** `lib/background-cleaner.js`

### PDF Upload System

**Endpoint:** `POST /api/miniUpload-pdf`

**Features:**
- PDF validation via magic bytes (%PDF)
- Size limit: 50MB
- Daily organized storage: `pdf-uploads/YYYY-MM-DD/`
- Dual file creation: PDF + JSON metadata
- Daily statistics tracking: `_daily_stats.json`
- Client IP and metadata logging

**Retrieval:**
- `GET /api/miniPDF-list` - List uploads with statistics
- `GET /api/miniPDF-get/:date/:filename` - Download specific PDF or view metadata

### Mobile Optimization API

**Purpose:** Provide mobile-specific optimized endpoints

**Location:** `mobile-optimization-api.js`

**Features:**
- Lightweight responses
- Mobile-friendly error messages
- Optimized image sizes
- Bandwidth-conscious implementations

### Utility Scripts

The repository includes several utility scripts for maintenance:
- `generate-previews.js` - Regenerate all style preview images
- `batch-signature-generator.js` - Batch generate test signatures
- `organize-signatures.js` - Reorganize signature files
- `update-font-metadata.js` - Update font configuration metadata
- `rename-font-ids.js` - Batch rename font IDs in config

### Security Measures

1. **Font Path Protection** - Font file paths never sent to client
2. **Input Validation** - All text inputs validated before processing
3. **File Size Limits** - PDF (50MB), Images (25MB)
4. **CORS Configuration** - Controlled cross-origin access
5. **IP Logging** - All requests logged with client IP

### Performance Optimizations

1. **Image Trimming** - Sharp aggressive trimming removes excess whitespace
2. **PNG Compression** - Level 9 compression with 95% quality
3. **SVG Optimization** - Minimal SVG generation with proper viewBox
4. **Font Caching** - Fonts registered once at startup
5. **Static Serving** - Express static middleware for assets

### Environment Variables
- `PORT` - Server port (default: 3001)
- `APP_MODE` - Hardcoded to 'font_only'
- Server listens on `0.0.0.0` for network access

### Common Development Tasks

**Adding a New Font Style:**
1. Add font file (.ttf/.otf) to `fonts/` directory
2. Add style configuration to `config/signatureStyles.js` array
3. Generate preview image: `node generate-previews.js`
4. Test problematic fonts - if rendering issues occur:
   - Add font ID to appropriate problem array in `generateFontSignature()`
   - Adjust size, padding, or trim threshold as needed
   - Re-test with various names to ensure no clipping

**Debugging Signature Generation:**
- Check console logs for font registration errors
- Verify font file exists at specified path
- Test with simple names first (e.g., "Test")
- Check for Turkish characters if issues arise
- Review `generated-signatures/` directory for output files
- Use `/docs` endpoint to test API visually

**Handling Font Rendering Problems:**
1. Identify issue type: clipping, spacing, or extreme trimming
2. Add font ID to appropriate array in server.js
3. Adjust parameters:
   - Clipping: Reduce max font size, increase padding, add vertical offset
   - Spacing: Reduce font size, add negative letter-spacing
   - Extreme: Increase padding multiplier, increase trim threshold
4. Test thoroughly with long names and special characters

### API Endpoint Naming Convention
All API endpoints use `mini` prefix for mobile compatibility:
- `/api/miniHealth` - Health check
- `/api/miniConfig` - App configuration
- `/api/miniStyles` - Style management
- `/api/miniGenerate-signature` - Signature generation
- `/api/miniClean-signature-photo` - Background cleaning
- `/api/miniUpload-pdf` - PDF upload
- `/api/miniFonts/list` - Font listing

### Request/Response Patterns

**Success Response:**
```json
{
  "success": true,
  "data": { /* payload */ },
  "timestamp": "ISO-8601 timestamp"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error",
    "type": "error_type_identifier"
  }
}
```

### Important Implementation Details

1. **All signatures are black (#000000)** - Color parameter exists but is overridden in generation
2. **Font sizes in config are base sizes** - Actual rendering uses scaled/adjusted sizes
3. **SVG fonts may use different sizes than PNG** - Some problematic fonts need smaller SVG sizes
4. **Turkish character conversion is one-way** - Converted for rendering only, originals preserved in metadata
5. **File saving is dual-tracked** - New organized system + legacy flat directory for compatibility
6. **Preview images use "Sign AI" branding** - Generated via `generateSignAIPreview()` function
7. **Server listens on 0.0.0.0:3001** - Allows network access for mobile testing

### Known Font Constraints

**Fonts requiring special handling:**
- **drift** (Sage) - Extreme padding required, minimal trimming
- **magic** (Gold) - Regular problem padding
- **ember, storm, wave** (Echo, Void, Dawn) - Clipping prevention, smaller sizes
- **tidal** (Star) - Extreme spacing adjustment, smallest SVG size
- **pearl, crystal, blade, blossom, inferno** (Sand, Kosakatta, Fire, Madeleine, Tottenham) - Spacing adjustments

These constraints are hardcoded in `generateFontSignature()` and should not be modified without extensive testing.

### Production Deployment Considerations

1. Set up process manager (PM2 recommended)
2. Configure reverse proxy (Nginx)
3. Enable HTTPS with SSL certificates
4. Set up log monitoring and rotation
5. Configure rate limiting for production traffic
6. Backup fonts and generated signatures regularly
7. Monitor disk space in `pdf-uploads/` and `generated-signatures/` directories

### Related Documentation

- `README.md` - General project overview (Turkish)
- `API_DOCUMENTATION.md` - Comprehensive API documentation with examples
- `/docs/index.html` - Interactive API documentation
- `package.json` - Dependencies and scripts
