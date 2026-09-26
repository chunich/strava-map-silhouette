# Configuration System Summary

## What Was Created

### 1. Configuration Files

- **`.env.example`** - Example configuration file with all available options and defaults
- **`.env`** - Your local configuration (git-ignored, created from .env.example)
- **`config.js`** - Centralized configuration module that loads and parses environment variables

### 2. Configuration Categories

#### Server Settings

- `PORT` - Server port (default: 3000)

#### Directory Paths

- `SOURCE_DIR` - Source directory for GPX/TCX files (default: ./source)
- `OUTPUT_DIR` - Output directory for generated SVG files (default: ./output)

#### Activity Filtering

- `FILTER_TYPE` - Activity type to process (default: Running)

#### Strava

- `ACTIVITY_LOOKUP_DAYS` - Number of recent days fetched by `GET /strava/activities` (default: 30)

#### Draw Options - Dimensions

- `IMAGE_WIDTH` - SVG width in pixels (default: 500)
- `IMAGE_HEIGHT` - SVG height in pixels (default: 500)

#### Draw Options - Styling

- `STROKE_WIDTH` - Track line width (default: 5)
- `ASPECT_RATIO` - Y-axis multiplier (default: 1.2)
- `OFFSET_X` - Horizontal offset (default: 0)
- `OFFSET_Y` - Vertical offset (default: 0)

#### Draw Options - Colors

- `SPECIAL_COLOR` - Special track color (default: #e22)

### 3. Files Modified

- **`config.js`** - Centralized loading and parsing of environment variables
- **`src/tracksDrawer.js`** - Exports `DEFAULT_DRAW_OPTIONS` for reuse
- **`src/processFileActivities.js`** - Accepts custom draw options
- **`.gitignore`** - Added `.env` files to prevent committing secrets

### 4. Documentation

- **`CONFIG.md`** - Complete configuration guide with examples

## Quick Start

1. **Copy the example config:**

   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your settings** (optional - defaults work fine)

3. **Start the app:**
   ```bash
   npm run dev
   ```

## Example: Change Track Color

Edit `.env`:

```env
TRACK_COLOR=#2ab6e8
```

Restart the app and regenerate images to see the new color.

## Example: High Resolution Output

Edit `.env`:

```env
IMAGE_WIDTH=1200
IMAGE_HEIGHT=1200
STROKE_WIDTH=8
```

## Benefits

- ✅ **Single source of truth** - All configuration in one place
- ✅ **Environment-specific** - Different settings for dev/prod
- ✅ **Type-safe** - Config module handles parsing (integers, floats, strings)
- ✅ **Documented** - All options documented with defaults
- ✅ **Git-safe** - `.env` is ignored, `.env.example` is committed
- ✅ **Easy customization** - No code changes needed to adjust settings

## Configuration Loading Order

1. `dotenv` loads `.env` file
2. `config.js` reads environment variables
3. Falls back to defaults if not specified
4. App and API handlers use the config object

## Accessing Configuration in Code

```javascript
const config = require("./config");

// Server config
config.server.port;

// Paths
config.paths.sourceDir;
config.paths.outputDir;

// Filter
config.filter.type;

// Strava
config.strava.activityLookupDays;

// Draw options
config.draw.width;
config.draw.height;
config.draw.colors.track;
config.draw.colors.special;
config.draw.strokeWidth;
config.draw.aspectRatio;
```
