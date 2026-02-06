# Configuration Guide

This application uses a `.env` file for configuration. All settings can be customized by editing this file.

## Setup

1. Copy the example configuration file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your preferred settings

3. Start the server:
   ```bash
   npm run server
   ```

## Configuration Options

### Server Configuration

**PORT** (default: `3000`)

- The port number where the server will run
- Example: `PORT=8080`

### Directory Paths

**GPX_DIR** (default: `./gpx`)

- Directory containing your GPX files
- Example: `GPX_DIR=/path/to/my/gpx/files`

**OUTPUT_DIR** (default: `./output`)

- Directory where generated SVG files will be saved
- Example: `OUTPUT_DIR=./generated-images`

### Activity Filter

**FILTER_TYPE** (default: `Running`)

- Filter activities by type (case-insensitive)
- Common values: `Running`, `Cycling`, `Walking`, `Hiking`
- Example: `FILTER_TYPE=Cycling`

### Draw Options - Image Dimensions

**IMAGE_SIZE** (default: `500`)

- Size of generated square SVG images in pixels (width and height)
- Example: `IMAGE_SIZE=800`

### Draw Options - Styling

**STROKE_WIDTH** (default: `5`)

- Width of the track lines in the SVG
- Example: `STROKE_WIDTH=3`

**ASPECT_RATIO** (default: `1.2`)

- Y-axis multiplier for track rendering
- Adjust this to stretch or compress tracks vertically
- Example: `ASPECT_RATIO=1.5`

### Draw Options - Colors

**TRACK_COLOR** (default: `#b7d05b`)

- Hexadecimal color code for normal tracks
- Example: `TRACK_COLOR=#2ab6e8`

**SPECIAL_COLOR** (default: `#e22`)

- Hexadecimal color code for special/highlighted tracks
- Example: `SPECIAL_COLOR=#ff0000`

### Draw Options - Offsets

**OFFSET_X** (default: `0`)

- Horizontal offset for positioning tracks
- Example: `OFFSET_X=10`

**OFFSET_Y** (default: `0`)

- Vertical offset for positioning tracks
- Example: `OFFSET_Y=10`

## Example Configurations

### High Resolution Output

```env
IMAGE_SIZE=1200
STROKE_WIDTH=8
```

### Cycling Activities with Blue Color

```env
FILTER_TYPE=Cycling
TRACK_COLOR=#2ab6e8
```

### Custom Directory Structure

```env
GPX_DIR=/Users/username/Documents/strava-exports
OUTPUT_DIR=/Users/username/Documents/strava-images
```

## Notes

- The `.env` file is ignored by git (see `.gitignore`)
- Never commit sensitive information in `.env.example`
- Restart the server after changing `.env` values
- Invalid values will fall back to defaults
