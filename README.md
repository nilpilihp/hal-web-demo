# HAL Web Demo

Industrial Hand Activity Level Analyzer - A modern React application for analyzing hand activity and ergonomic risk in industrial settings.

## Features

- 🎥 **Video Upload & Analysis**: Upload videos to AWS for HAL analysis
- 📊 **Real-time Metrics**: View Hand Activity Level (HAL) scores, frequency, and duty cycle
- 🔍 **Pose Visualization**: Real-time keypoint overlay on video playback
- 🏥 **Safety Assessment**: Immediate feedback on ACGIH TLV compliance
- 🔄 **Previous Run Visualization**: Load and visualize results from previous analyses by GUID
- 🎨 **Modern UI**: Clean, dark-themed interface with Tailwind CSS

## Tech Stack

- **React 19** with TypeScript
- **Vite** for blazing-fast development
- **Tailwind CSS** for modern styling
- **AWS API Integration** for video processing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- HAL API key

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deployment to GitHub Pages

```bash
# Deploy to GitHub Pages
npm run deploy
```

Make sure to update the `base` in `vite.config.ts` to match your repository name:

```typescript
export default defineConfig({
  base: '/your-repo-name/',
  // ...
});
```

## Project Structure

```
hal-web-demo/
├── src/
│   ├── components/
│   │   ├── MetricCard.tsx       # Metric display component
│   │   ├── ModelSelector.tsx    # Model version selector
│   │   ├── StatusBlock.tsx      # Status message display
│   │   └── Timeline.tsx         # Timeline placeholder
│   ├── services/
│   │   └── api.ts               # AWS API service layer
│   ├── App.tsx                  # Main application component
│   ├── main.tsx                 # Application entry point
│   ├── types.ts                 # TypeScript type definitions
│   └── index.css                # Global styles
├── index.html                   # HTML template
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Usage

1. **Enter API Key**: On first load, you'll be prompted to enter your HAL API key
2. **Select Video**: Click "Select Video" to choose a video file
3. **Choose Model**: Select from available model versions
4. **Upload**: Click "Upload to AWS" to start processing
5. **View Results**: Once complete, view HAL scores and pose visualizations
6. **Visualize Previous**: Use "Visualize Previous Run" with a GUID to load past results

## API Integration

The app integrates with the HAL AWS API:

- `GET /health` - Check available model endpoints
- `GET /upload/dev/{filename}` - Get presigned S3 upload URL
- `GET /status/dev/{guid}` - Check processing status
- `GET /download/dev/{guid}` - Download inference results

## Features Reserved for Future

- **Temporal Exertion Timeline**: Event timeline visualization (waiting for AWS response data)

## License

Proprietary - All rights reserved

## Legacy Version

The previous vanilla JavaScript implementation is preserved in `index-legacy.html` for reference.
