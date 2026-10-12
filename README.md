# OurPhotobooth

A web photobooth built with Next.js. Pick a strip layout, capture a countdown burst from your camera, decorate the strip, and download it as a PNG, JPG, or animated GIF.

## Highlights

- Strip layouts: 4-cut diagonal, 3-cut diagonal, 4-cut square, and 6-cut grid
- Countdown capture that records a short burst for each frame
- Live filters: Normal, B/W, Soft, and Vintage
- Sticker placement, resizing, and border colors in the editor
- Downloads: PNG, JPG, and animated GIF

## Tech Stack

- Next.js 16 (App Router) and React 19
- TypeScript
- `react-webcam` for capture
- `html2canvas`, `file-saver`, and `gif.js` for export
- CSS Modules and `lucide-react`

## Getting Started

Node.js 24 is required. Next.js 16 needs Node.js 20.9 or newer, and Vercel only accepts Node.js 22 or 24 for new deployments.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Allow camera access when you start a booth.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run start` — run the production server
- `npm run lint` — run ESLint

## How It Works

1. Start the booth from the home page.
2. Choose a strip layout.
3. Capture each photo. A countdown records a burst, and the last frame is the still.
4. Add stickers and a border color.
5. Export PNG, JPG, or GIF. GIF export replays the burst and can take a few seconds.

## Project Structure

```text
src/
  app/
    page.tsx            # Landing page
    booth/page.tsx      # Layout, camera, and editor flow
    layout.tsx          # Shared navbar and footer
  components/
    Camera.tsx          # Webcam capture
    LayoutSelector.tsx  # Strip layout picker
    PhotoEditor.tsx     # Stickers, borders, and export
  context/
    NavbarContext.tsx   # Booth step indicator in the navbar
public/
  gif.worker.js         # Worker used by GIF export
```

## Deploying to Vercel

This app deploys as a Next.js project. `package.json` sets `engines.node` to `24.x`, which overrides the Node.js version in the Vercel project settings.

That pin matters because this project was created while Node.js 20 was a valid Vercel runtime. On October 1, 2026 Vercel disabled Node.js 20 for new deployments. Existing production deployments keep serving, but a new build fails until the project requests Node.js 22 or 24. `24.x` is the current default.

Pushing to the connected GitHub repository creates the deployment. Production is [https://ourphotobooth.vercel.app](https://ourphotobooth.vercel.app).

GIF export loads `/gif.worker.js` from `public/`. Keep that file in place when deploying.
