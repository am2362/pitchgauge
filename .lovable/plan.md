

# Update Favicon with Transparent Background Logo

## Current State
- Logo at `src/assets/logo.png` has a white/light gray background
- `index.html` has no favicon link tag (using default `public/favicon.ico`)
- The uploaded gauge icon is currently used for in-app branding but not as favicon

## Challenge
The current logo has a white background. To create a favicon with transparent background, I need a version of the gauge icon with transparency.

## Two Options

### Option 1: User provides transparent version (Recommended)
If you have or can provide a PNG version of the gauge icon with transparent background:
1. Upload the transparent version
2. Copy to `public/favicon.png`
3. Add favicon link to `index.html`:
   ```html
   <link rel="icon" href="/favicon.png" type="image/png">
   ```

### Option 2: Use current image as-is
Use the existing logo (with white background) as favicon:
1. Copy `src/assets/logo.png` to `public/favicon.png`
2. Add favicon link to `index.html`

**Note**: Browsers don't support CSS transparency for favicons, so the background will remain white unless you provide a transparent PNG.

## Question
Do you have a transparent background version of the gauge icon you can upload? Or would you like me to proceed with the current white-background version?

