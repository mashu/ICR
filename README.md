# Voice ICR Practice

A TypeScript-powered Morse code trainer with voice recognition for progressive character learning using the Koch method.

## 🚀 Try It Live

**[Open Voice ICR Practice](https://mashu.github.io/ICR/)** on GitHub Pages

## ✨ Features

- 🎤 Voice recognition for hands-free input
- 📚 Koch method progressive lessons (1-10)
- 📊 Real-time timing analysis with color-coded progress
- 🔧 Automatic microphone gain control
- 📱 Works on desktop and mobile (Chrome/Edge recommended)

## 🎯 Quick Start

### Use Online (Recommended)
1. Fork this repository
2. Enable GitHub Pages in Settings → Pages → Source: "GitHub Actions"
3. Visit `https://mashu.github.io/ICR/`

### Run Locally
```bash
git clone https://github.com/mashu/ICR.git
cd ICR
npm install
npm run build
npm run serve
```
Open https://localhost:8443 (HTTPS required for microphone access)

## 🎮 How to Use

1. **Start Training** - grants microphone permission
2. **Listen** to the Morse code character
3. **Speak** the letter (e.g., "A", "Alpha", "Ay")
4. **Repeat** the same letter to confirm recognition
5. **Progress** through characters until all are under 2 seconds (green)

### Koch Method Lessons
- **Lesson 1**: K, M
- **Lesson 2**: K, M, U, R  
- **Lesson 3**: K, M, U, R, S, N
- ...continues through Lesson 10

Auto-advances to next lesson when all characters achieve green timing.

## 🛠️ Development

```bash
npm run build    # Build TypeScript
npm run serve    # Serve with HTTPS
```

## 📝 License

MIT License - Free for educational and personal use.