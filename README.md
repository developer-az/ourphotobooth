# OurPhotobooth

A modern web-based photobooth built with Next.js that lets users capture multi-shot photo strips, apply live filters, decorate with stickers, and export results as PNG, JPG, or animated GIF.

## Highlights

- Multiple photo strip layouts:
  - 4-Cut Diagonal
  - 3-Cut Diagonal
  - 4-Cut Square
  - 6-Cut Grid
- Live camera capture with countdown and burst-frame support
- Camera device selection for multi-camera setups
- Real-time visual filters (Normal, B/W, Soft, Vintage)
- Interactive sticker placement and resizing in the editor
- Border color customization for the final strip
- Export options:
  - PNG
  - JPG
  - Animated GIF

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript + React 19
- **Camera:** `react-webcam`
- **Exporting:** `html2canvas`, `file-saver`, `gif.js`
- **UI/Icons:** CSS Modules, `lucide-react`
- **Drag interactions:** `react-draggable`

## Getting Started

### Prerequisites

- Node.js 20+ (recommended)
- npm
- A browser with camera permissions enabled

### Installation

```bash
npm install
```

### Run in Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run start` — Run production server
- `npm run lint` — Run ESLint checks

## How It Works

1. Start the booth from the home page.
2. Choose a strip layout.
3. Capture photos with countdown and burst support.
4. Edit your strip with stickers and border colors.
5. Export the final result as PNG, JPG, or GIF.

## Project Structure

```text
src/
  app/
    page.tsx           # Landing page
    booth/page.tsx     # Booth flow (layout -> camera -> editor)
  components/
    Camera.tsx         # Capture workflow
    LayoutSelector.tsx # Layout selection UI
    PhotoEditor.tsx    # Strip editing + export
  context/
    NavbarContext.tsx  # Shared navbar state
```

## Notes

- For best results, use good lighting and allow camera access.
- GIF export may take a few seconds depending on burst size and device performance.

## License

This repository currently does not define a license. Add one before public distribution if needed.
