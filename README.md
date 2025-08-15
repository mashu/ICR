# Voice ICR Practice

A TypeScript-powered Instant Character Recognition (ICR) practice application with voice-to-text capabilities, designed for Morse code and character recognition training.

## Features

- 🎤 **Voice Recognition**: Uses Web Speech API for hands-free input
- ⌨️ **Text Input**: Traditional keyboard input option
- 📊 **Real-time Scoring**: Tracks accuracy and performance
- 🎯 **Multiple Character Sets**: Alphabet, numbers, Morse code, prosigns, and custom sets
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🚀 **GitHub Pages Ready**: Easy deployment to GitHub Pages

## Browser Support

This application requires a modern browser with Web Speech API support:
- ✅ Chrome/Chromium (recommended)
- ✅ Microsoft Edge
- ✅ Safari (macOS/iOS)
- ❌ Firefox (limited speech recognition support)

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd voice-icr-practice
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Serve locally**
   ```bash
   npm run serve
   ```
   Open http://localhost:8000 in your browser

### GitHub Pages Deployment

1. **Create a new GitHub repository**

2. **Upload all files to your repository**
   - Copy all the files from this project to your repository
   - Ensure the `.github/workflows/deploy.yml` file is included

3. **Enable GitHub Pages**
   - Go to your repository Settings → Pages
   - Set Source to "GitHub Actions"

4. **Push to main branch**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

5. **Automatic Deployment**
   - GitHub Actions will automatically build and deploy your app
   - Your app will be available at: `https://<username>.github.io/<repository-name>/`

## File Structure

```
voice-icr-practice/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment
├── src/
│   ├── main.ts                 # Main TypeScript application
│   ├── index.html              # HTML interface
│   └── style.css               # Styling
├── dist/                       # Built files (generated)
├── package.json                # Node.js dependencies
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

## Usage Instructions

### Getting Started
1. Enter your name or call sign (optional)
2. Select a character set or create a custom one
3. Click "Start Voice Input" or use Ctrl+Space to activate voice recognition
4. Look at the displayed character and speak or type your answer

### Character Sets
- **Alphabet**: A-Z letters
- **Numbers**: 0-9 digits  
- **Alphanumeric**: A-Z and 0-9 combined
- **Morse Code**: Standard Morse code characters
- **Prosigns**: Special procedural signals (=, +, >)
- **Custom**: Define your own character set

### Voice Recognition Tips
- Speak clearly and at normal volume
- For prosigns, say:
  - "BT" or "Break" for =
  - "AR" or "Roger" for +
  - "SK" or "End" for >
- The app will show what it heard for verification

### Keyboard Shortcuts
- **Ctrl+Space**: Toggle voice recognition
- **Enter**: Submit text input

## Customization

### Adding New Character Sets
Edit the `characterSets` object in `src/main.ts`:

```typescript
private characterSets = {
  // ... existing sets
  myCustomSet: ['X', 'Y', 'Z'].split(''),
};
```

### Modifying Voice Recognition
Adjust speech recognition settings in the `initializeSpeechRecognition()` method:

```typescript
this.recognition.lang = 'en-US';        // Language
this.recognition.maxAlternatives = 3;   // Number of alternatives
```

### Styling Changes
Modify `src/style.css` to customize the appearance. The design uses:
- CSS Grid and Flexbox for layout
- CSS custom properties for theming
- Responsive design with media queries

## Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Watch for changes during development
npm run dev

# Serve built files locally
npm run serve
```

## Troubleshooting

### Voice Recognition Not Working
- Ensure you're using a supported browser (Chrome recommended)
- Check browser permissions for microphone access
- Verify you're on HTTPS (required for microphone access)
- GitHub Pages automatically provides HTTPS

### Build Errors
- Ensure TypeScript is installed: `npm install`
- Check that all source files are in the `src/` directory
- Verify `tsconfig.json` configuration

### Deployment Issues
- Check GitHub Actions tab for build logs
- Ensure GitHub Pages is enabled in repository settings
- Verify the `deploy.yml` workflow file is in `.github/workflows/`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test locally: `npm run build && npm run serve`
5. Commit changes: `git commit -m "Add feature"`
6. Push to branch: `git push origin feature-name`
7. Submit a pull request

## License

MIT License - feel free to use this project for educational or personal purposes.

## Technical Details

### Architecture
- **Frontend**: TypeScript with DOM manipulation
- **Speech Recognition**: Web Speech API (browser-native)
- **Build System**: TypeScript compiler with npm scripts
- **Deployment**: GitHub Actions with automatic Pages deployment

### Key Components
- `VoiceICRApp`: Main application class
- Speech recognition integration with error handling
- Character set management system
- Scoring and progress tracking
- Responsive UI with accessibility features

This application demonstrates modern web development practices with TypeScript, progressive enhancement, and automated deployment workflows.
