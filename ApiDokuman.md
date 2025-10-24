# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Server
- `npm start` - Start the production server (runs on port 3001 by default)
- `npm run dev` - Start development server with nodemon for auto-restart

### Testing API Endpoints
```bash
# Health check
curl http://localhost:3001/api/miniHealth

# Get app configuration
curl http://localhost:3001/api/miniConfig

# Get all signature styles
curl http://localhost:3001/api/miniStyles

# Test signature generation
curl -X POST http://localhost:3001/api/miniGenerate-signature \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Name", "fontStyle": "elegant"}'
```

## Architecture Overview

This is a Node.js Express API server for generating digital signatures using font-based rendering. The application operates in font-only mode and serves as the backend for a signature maker application.

### Core Components

**Server Entry Point** (`server.js`):
- Main Express application with CORS, body-parser middleware
- Canvas-based signature generation using node-canvas
- Font registration and management system
- Serves static assets from `/assets` directory

**Signature Styles** (`config/signatureStyles.js`):
- Centralized configuration for signature styles (elegant, bold, modern, etc.)
- Maps style IDs to font configurations (path, family, color, size)
- Categorizes fonts and determines premium status
- Supports both static and dynamic font discovery

**API Routes** (`routes/styles.js`):
- RESTful endpoints for signature style management
- Font configuration excluded from client responses for security
- Dynamic style generation from available fonts in `/fonts` directory

### Key Features

- **Font-Based Rendering**: Uses Canvas API with TTF/OTF fonts for signature generation
- **Dynamic Font Discovery**: Automatically generates styles from fonts in `/fonts` directory
- **Style Categories**: Free vs Premium styles, with categorization (elegant, bold, artistic, etc.)
- **Security**: Font paths and configurations are never exposed to clients
- **Asset Serving**: Static middleware serves style preview images

### Directory Structure
- `/fonts/` - Contains all TTF/OTF font files used for signature generation
- `/assets/styles/` - Style preview images (PNG format)
- `/config/` - Configuration files for signature styles
- `/routes/` - Express route handlers

### Environment Variables
- `PORT` - Server port (default: 3001)
- `APP_MODE` - Application mode (currently hardcoded to 'font_only')

### Font Management
- Fonts are automatically registered at startup from `/fonts` directory
- Font family names are derived from filename (spaces replace underscores)
- Fallback to system fonts when custom fonts are unavailable
- Style-to-font mapping supports both static configuration and dynamic discovery

### API Endpoints
- `GET /api/miniHealth` - Server health check
- `GET /api/miniConfig` - Get application configuration (limits, premium settings, etc.)
- `GET /api/miniStyles` - Get all signature styles
- `GET /api/miniStyles/:id` - Get specific style by ID
- `GET /api/miniStyles/category/:type` - Get styles by category (free/pro)
- `POST /api/miniGenerate-signature` - Generate signature image (returns base64 PNG)
- `GET /api/miniAssets/styles/:filename` - Serve style preview images

The application is designed to scale with additional fonts and supports both predefined styles and dynamic font-based style generation.