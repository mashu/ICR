interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: any;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

class VoiceICRApp {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private isRecognitionStarting: boolean = false;
  private currentCharacter: string = '';
  private score: number = 0;
  private totalAttempts: number = 0;
  private characterSet: string[] = [];
  private audioContext: AudioContext | null = null;
  private isMicrophonePermissionGranted: boolean = false;
  private currentMorseCode: string = '';
  private audioStartTime: number = 0;
  private audioEndTime: number = 0;
  private responseStartTime: number = 0;
  private firstResponseTime: number = 0;
  private hasReceivedFirstResult: boolean = false;
  private confirmationResults: string[] = [];
  private confirmationTimeout: number = 0;
  private characterTimings: { [char: string]: number[] } = {};
  private morseWPM: number = 20;
  private isPlayingMorse: boolean = false;
  private micStream: MediaStream | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micDataArray: Uint8Array | null = null;
  private micAnimationFrame: number = 0;
  private micGainNode: GainNode | null = null;
  private avgVolumeHistory: number[] = [];
  private autoGainEnabled: boolean = false;
  private lastGainAdjustment: number = 0;
  private gainAdjustmentCooldown: number = 2000; // 2 seconds between adjustments
  
  private elements = {
    currentChar: document.getElementById('current-character') as HTMLElement,
    voiceButton: document.getElementById('voice-button') as HTMLButtonElement,
    textInput: document.getElementById('text-input') as HTMLInputElement,
    submitButton: document.getElementById('submit-button') as HTMLButtonElement,
    transcription: document.getElementById('transcription') as HTMLElement,
    score: document.getElementById('score') as HTMLElement,
    status: document.getElementById('status') as HTMLElement,
    characterSetSelect: document.getElementById('character-set') as HTMLSelectElement,
    customCharacters: document.getElementById('custom-characters') as HTMLInputElement,
    studentName: document.getElementById('student-name') as HTMLInputElement,
    replayButton: document.getElementById('replay-button') as HTMLButtonElement,
    stopButton: document.getElementById('stop-button') as HTMLButtonElement,
    skipButton: document.getElementById('skip-button') as HTMLButtonElement,
    morseWpmSlider: document.getElementById('morse-wpm') as HTMLInputElement,
    wpmDisplay: document.getElementById('wpm-display') as HTMLElement,
    timingBars: document.getElementById('timing-bars') as HTMLElement,
    micActivity: document.getElementById('mic-activity') as HTMLElement,
    micLevelBar: document.getElementById('mic-level-bar') as HTMLElement,
    gainIndicator: document.getElementById('gain-indicator') as HTMLElement,
    autoGainToggle: document.getElementById('auto-gain-toggle') as HTMLInputElement,
    gainSpeedSlider: document.getElementById('gain-speed') as HTMLInputElement,
    gainSpeedDisplay: document.getElementById('gain-speed-display') as HTMLElement,
    startButton: document.getElementById('start-button') as HTMLButtonElement
  };

  private morseCode: { [key: string]: string } = {
    'K': '-.-',   'M': '--',    'U': '..-',   'R': '.-.',   'S': '...',   'N': '-.',
    'A': '.-',    'P': '.--.',  'T': '-',     'L': '.-..',  'O': '---',   'W': '.--',
    'I': '..',    'J': '.---',  'Z': '--..',  'F': '..-.',  'Y': '-.--',  'V': '...-',
    'H': '....',  'G': '--.',   'Q': '--.-',  'C': '-.-.',  'X': '-..-',  'B': '-...',
    'D': '-..',   'E': '.',     '1': '.----', '9': '----.', '8': '---..',  '7': '--...',
    '0': '-----', '6': '-....', '5': '.....', '4': '....-', '3': '...--',  '2': '..---',
    '/': '-..-.',  '+': '.-.-.',  '?': '..--.', '.': '.-.-.-', ',': '--..--',
    ':': '---...', ';': '-.-.-.', '=': '-...-', '-': '-....-', "'": '.----.',
    '"': '.-..-.', '(': '-.--.',  ')': '-.--.-'
  };

  private kochLessons = [
    ['K', 'M'],                           // Lesson 1
    ['K', 'M', 'U', 'R'],                 // Lesson 2  
    ['K', 'M', 'U', 'R', 'S', 'N'],       // Lesson 3
    ['K', 'M', 'U', 'R', 'S', 'N', 'A', 'P'], // Lesson 4
    ['K', 'M', 'U', 'R', 'S', 'N', 'A', 'P', 'T', 'L'], // Lesson 5
    ['K', 'M', 'U', 'R', 'S', 'N', 'A', 'P', 'T', 'L', 'O', 'W'], // Lesson 6
    ['K', 'M', 'U', 'R', 'S', 'N', 'A', 'P', 'T', 'L', 'O', 'W', 'I', 'J'], // Lesson 7
    ['K', 'M', 'U', 'R', 'S', 'N', 'A', 'P', 'T', 'L', 'O', 'W', 'I', 'J', 'Z', '='], // Lesson 8
    ['K', 'M', 'U', 'R', 'S', 'N', 'A', 'P', 'T', 'L', 'O', 'W', 'I', 'J', 'Z', '=', 'F', 'Y'], // Lesson 9
    ['K', 'M', 'U', 'R', 'S', 'N', 'A', 'P', 'T', 'L', 'O', 'W', 'I', 'J', 'Z', '=', 'F', 'Y', 'V', 'H'], // Lesson 10
  ];

  private characterSets = {
    koch1: this.kochLessons[0],
    koch2: this.kochLessons[1], 
    koch3: this.kochLessons[2],
    koch4: this.kochLessons[3],
    koch5: this.kochLessons[4],
    koch6: this.kochLessons[5],
    koch7: this.kochLessons[6],
    koch8: this.kochLessons[7],
    koch9: this.kochLessons[8],
    koch10: this.kochLessons[9],
    alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    numbers: '0123456789'.split(''),
    custom: ['A']
  };

  constructor() {
    this.initializeAudio();
    this.initializeSpeechRecognition();
    this.setupEventListeners();
    this.updateCharacterSet();
    this.updateScore();
    this.elements.status.textContent = 'Click "Start Training" to begin';
  }

  private initializeAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  private async checkMicrophonePermission(): Promise<void> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Request microphone permission with optimized audio settings
        this.micStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false, // We'll handle gain control manually for better control
            sampleRate: 44100,
            channelCount: 1 // Mono is sufficient for speech
          }
        });
        
        this.isMicrophonePermissionGranted = true;
        this.setupMicrophoneMonitoring();
        this.elements.status.textContent = 'Microphone access granted with auto-gain control. Ready to start!';
      } else {
        this.elements.status.textContent = 'Microphone not supported in this browser';
      }
    } catch (error) {
      this.isMicrophonePermissionGranted = false;
      this.elements.status.textContent = 'Microphone permission denied. Please allow microphone access and refresh the page.';
      this.elements.voiceButton.disabled = true;
      console.error('Microphone permission error:', error);
    }
  }

  private setupMicrophoneMonitoring(): void {
    if (!this.micStream || !this.audioContext) return;

    // Ensure audio context is running
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.createMicAnalyser();
      });
    } else {
      this.createMicAnalyser();
    }
  }

  private createMicAnalyser(): void {
    if (!this.micStream || !this.audioContext) return;

    // Create audio processing chain with gain control
    this.micAnalyser = this.audioContext.createAnalyser();
    this.micGainNode = this.audioContext.createGain();
    const source = this.audioContext.createMediaStreamSource(this.micStream);
    
    // Connect: source → gain → analyser
    source.connect(this.micGainNode);
    this.micGainNode.connect(this.micAnalyser);
    
    // Initial gain settings
    this.micGainNode.gain.value = 1.0;

    this.micAnalyser.fftSize = 512; // Higher resolution for better analysis
    this.micAnalyser.smoothingTimeConstant = 0.3; // Smoother readings
    const bufferLength = this.micAnalyser.frequencyBinCount;
    this.micDataArray = new Uint8Array(new ArrayBuffer(bufferLength));

    console.log('Microphone analyser created with automatic gain control');
    this.startMicMonitoring();
  }

  private startMicMonitoring(): void {
    if (!this.micAnalyser || !this.micDataArray) return;

    const updateMicLevel = () => {
      this.micAnalyser!.getByteFrequencyData(this.micDataArray! as any);
      
      // Calculate RMS (root mean square) for more accurate volume measurement
      let sum = 0;
      for (let i = 0; i < this.micDataArray!.length; i++) {
        const normalized = this.micDataArray![i] / 255;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / this.micDataArray!.length);
      const volume = Math.min(100, rms * 300); // Scale for display
      
      // Add to volume history for automatic gain control
      this.avgVolumeHistory.push(volume);
      if (this.avgVolumeHistory.length > 60) { // Keep last 60 readings (~1 second at 60fps)
        this.avgVolumeHistory.shift();
      }
      
      // Apply automatic gain control
      if (this.autoGainEnabled && this.avgVolumeHistory.length >= 30) {
        this.adjustMicrophoneGain();
      }
      
      // Update mic level bar with improved color coding
      this.elements.micLevelBar.style.width = `${Math.min(100, volume)}%`;
      
      // Color coding based on optimal speech levels
      if (volume > 80) {
        this.elements.micLevelBar.style.backgroundColor = '#dc3545'; // Red - too loud
      } else if (volume > 30) {
        this.elements.micLevelBar.style.backgroundColor = '#28a745'; // Green - optimal
      } else if (volume > 10) {
        this.elements.micLevelBar.style.backgroundColor = '#ffc107'; // Yellow - quiet
      } else {
        this.elements.micLevelBar.style.backgroundColor = '#6c757d'; // Gray - too quiet
      }
      
      this.micAnimationFrame = requestAnimationFrame(updateMicLevel);
    };

    updateMicLevel();
  }

  private adjustMicrophoneGain(): void {
    if (!this.micGainNode || this.avgVolumeHistory.length < 30) return;

    // Don't adjust gain during active speech recognition to avoid disrupting accuracy
    if (this.isListening) {
      console.log('Skipping auto-gain adjustment during speech recognition');
      return;
    }

    // Rate limiting - only adjust every few seconds
    const now = Date.now();
    if (now - this.lastGainAdjustment < this.gainAdjustmentCooldown) return;

    // Calculate average volume over recent history
    const avgVolume = this.avgVolumeHistory.reduce((sum, vol) => sum + vol, 0) / this.avgVolumeHistory.length;
    
    // Target volume range: 30-60 (optimal for speech recognition)
    const targetVolume = 45;
    const tolerance = 20; // Increased tolerance to reduce sensitivity and prevent speech recognition interference
    
    // Only adjust if significantly outside target range
    if (avgVolume < targetVolume - tolerance) {
      // Too quiet - increase gain very gradually
      const currentGain = this.micGainNode.gain.value;
      const adjustmentFactor = 1.02; // Even smaller adjustment (2% instead of 5%)
      const newGain = Math.min(2.0, currentGain * adjustmentFactor); // Lower max gain to prevent distortion
      
      // Only adjust if the change is meaningful
      if (newGain - currentGain > 0.01) {
        this.micGainNode.gain.exponentialRampToValueAtTime(newGain, this.audioContext!.currentTime + 2.0); // Slower ramp (2 seconds)
        console.log(`Auto-gain: Gradually increasing gain from ${currentGain.toFixed(2)} to ${newGain.toFixed(2)} (avg volume: ${avgVolume.toFixed(1)})`);
        this.lastGainAdjustment = now;
      }
    } else if (avgVolume > targetVolume + tolerance) {
      // Too loud - decrease gain very gradually
      const currentGain = this.micGainNode.gain.value;
      const adjustmentFactor = 0.98; // Even smaller adjustment (2% instead of 5%)
      const newGain = Math.max(0.2, currentGain * adjustmentFactor); // Higher min gain to maintain usability
      
      // Only adjust if the change is meaningful
      if (currentGain - newGain > 0.01) {
        this.micGainNode.gain.exponentialRampToValueAtTime(newGain, this.audioContext!.currentTime + 2.0); // Slower ramp (2 seconds)
        console.log(`Auto-gain: Gradually decreasing gain from ${currentGain.toFixed(2)} to ${newGain.toFixed(2)} (avg volume: ${avgVolume.toFixed(1)})`);
        this.lastGainAdjustment = now;
      }
    }
  }

  private playSound(frequency: number, duration: number): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  private playCorrectSound(): void {
    // Happy ascending tone
    this.playSound(600, 0.2);
    setTimeout(() => this.playSound(800, 0.2), 100);
  }

  private playIncorrectSound(): void {
    // Sad descending tone
    this.playSound(400, 0.3);
    setTimeout(() => this.playSound(300, 0.3), 150);
  }

  private playStartSound(): void {
    // Short beep to indicate listening started
    this.playSound(500, 0.1);
  }

  private async playMorseCode(character: string): Promise<void> {
    if (!this.audioContext || this.isPlayingMorse) return;
    
    const morsePattern = this.morseCode[character];
    if (!morsePattern) return;
    
    this.isPlayingMorse = true;
    this.audioStartTime = Date.now();
    
    const ditLength = 60000 / (50 * this.morseWPM); // Standard timing
    const dahLength = ditLength * 3;
    const elementGap = ditLength;
    const characterGap = ditLength * 3;
    
    let currentTime = this.audioContext.currentTime;
    const frequency = 600; // Standard CW tone
    
    for (let i = 0; i < morsePattern.length; i++) {
      const element = morsePattern[i];
      const duration = element === '.' ? ditLength / 1000 : dahLength / 1000;
      
      // Play the tone
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // Envelope to avoid clicks
      gainNode.gain.setValueAtTime(0, currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.005);
      gainNode.gain.setValueAtTime(0.3, currentTime + duration - 0.005);
      gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
      
      oscillator.start(currentTime);
      oscillator.stop(currentTime + duration);
      
      currentTime += duration + (elementGap / 1000);
    }
    
    // Set audio end time and automatically start voice recognition
    setTimeout(() => {
      this.audioEndTime = Date.now();
      this.responseStartTime = Date.now();
      this.isPlayingMorse = false;
      this.elements.status.textContent = 'Listening for your answer...';
      
      // Automatically start voice recognition
      this.startListening();
    }, (currentTime - this.audioContext.currentTime) * 1000);
  }

  private initializeSpeechRecognition(): void {
    console.log('Initializing speech recognition');
    console.log('webkitSpeechRecognition available:', 'webkitSpeechRecognition' in window);
    console.log('SpeechRecognition available:', 'SpeechRecognition' in window);
    console.log('User agent:', navigator.userAgent);
    console.log('Protocol:', window.location.protocol);
    
    // Warn about HTTP vs HTTPS issues
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      console.warn('HTTPS required for speech recognition in production. Using HTTP may cause issues.');
      this.elements.status.textContent = 'Warning: HTTPS required for reliable speech recognition';
    }
    
    if ('webkitSpeechRecognition' in window) {
      console.log('Using webkitSpeechRecognition');
      this.recognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      console.log('Using SpeechRecognition');
      this.recognition = new SpeechRecognition();
    } else {
      console.log('No speech recognition API available');
      this.elements.status.textContent = 'Speech recognition not supported in this browser';
      this.elements.voiceButton.disabled = true;
      return;
    }

    this.recognition.continuous = true; // Keep it continuous for persistent listening
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 10; // More alternatives for single letters
    
    // Add speech recognition hints for single letters if supported
    try {
      // Create grammar for single letters (if browser supports it)
      if ('webkitSpeechGrammarList' in window || 'SpeechGrammarList' in window) {
        const SpeechGrammarList = (window as any).webkitSpeechGrammarList || (window as any).SpeechGrammarList;
        const speechRecognitionList = new SpeechGrammarList();
        
        // Grammar for alphabet letters and common phonetic words
        const grammar = '#JSGF V1.0; grammar letters; public <letter> = ' +
          'a | alpha | ay | ace | ' +
          'b | bravo | bee | ' +
          'c | charlie | see | ' +
          'd | delta | dee | ' +
          'e | echo | ee | ' +
          'f | foxtrot | ef | ' +
          'g | golf | gee | ' +
          'h | hotel | aitch | ' +
          'i | india | ' +
          'j | juliet | jay | ' +
          'k | kilo | kay | okay | ' +
          'l | lima | el | ell | ' +
          'm | mike | em | emma | ' +
          'n | november | en | ' +
          'o | oscar | oh | owe | ' +
          'p | papa | pee | ' +
          'q | quebec | cue | queue | ' +
          'r | romeo | are | ' +
          's | sierra | ess | ' +
          't | tango | tee | ' +
          'u | uniform | you | ' +
          'v | victor | vee | ' +
          'w | whiskey | we | double you | ' +
          'x | xray | ex | ' +
          'y | yankee | why | ' +
          'z | zulu | zee | zed ;';
        
        speechRecognitionList.addFromString(grammar, 1);
        this.recognition.grammars = speechRecognitionList;
        console.log('- Grammar list set for single letters');
      }
    } catch (e) {
      console.log('- Grammar lists not supported, using default recognition');
    }
    
    console.log('Speech recognition settings:');
    console.log('- continuous:', this.recognition.continuous);
    console.log('- lang:', this.recognition.lang);
    console.log('- maxAlternatives:', this.recognition.maxAlternatives);
    
    // Enhanced settings for better accuracy and sensitivity
    if ('interimResults' in this.recognition) {
      (this.recognition as any).interimResults = true; // Enable to see if we get any partial results
      console.log('- interimResults set to true for debugging');
    }
    if ('serviceURI' in this.recognition) {
      (this.recognition as any).serviceURI = '';
      console.log('- serviceURI set to empty');
    }
    
    // Additional settings for better single letter recognition
    try {
      // Some browsers support these additional settings
      (this.recognition as any).soundStart = true;
      (this.recognition as any).soundEnd = true;
      // Reduce silence timeout to be more responsive to short utterances
      (this.recognition as any).speechTimeout = 3000; // 3 seconds
      (this.recognition as any).speechTimeoutEarly = 1000; // 1 second early timeout
      console.log('- Sound indicators and timeouts configured');
    } catch (e) {
      console.log('- Advanced settings not supported');
    }

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
      this.isListening = true;
      this.isRecognitionStarting = false;
      this.elements.voiceButton.textContent = 'Listening...';
      this.elements.voiceButton.classList.add('listening');
      this.elements.status.textContent = 'Listening for your answer...';
      this.playStartSound();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      console.log('Speech recognition result received:', event);
      console.log('Results array length:', event.results.length);
      console.log('Result index:', event.resultIndex);
      
      // Check if this is a final result
      const lastResult = event.results[event.results.length - 1];
      const isFinal = lastResult.isFinal;
      
      console.log('Is final result:', isFinal);
      console.log('First result alternatives:', lastResult.length);
      
      const result = lastResult[0];
      const transcript = result.transcript.trim().toUpperCase();
      const confidence = result.confidence;
      
      console.log('Transcript:', transcript, 'Confidence:', confidence, 'Final:', isFinal);
      
      if (isFinal) {
        // Process final results
        const normalizedAnswer = this.normalizeAnswer(transcript);
        const showConversion = normalizedAnswer !== transcript;
        
        if (!this.hasReceivedFirstResult) {
          // First result - record timing and process answer
          this.firstResponseTime = Date.now() - this.responseStartTime;
          this.hasReceivedFirstResult = true;
          
          if (showConversion) {
            this.elements.transcription.textContent = `First: "${transcript}" → "${normalizedAnswer}" (${Math.round(confidence * 100)}% confidence, ${(this.firstResponseTime/1000).toFixed(1)}s)`;
          } else {
            this.elements.transcription.textContent = `First: "${transcript}" (${Math.round(confidence * 100)}% confidence, ${(this.firstResponseTime/1000).toFixed(1)}s)`;
          }
          
          this.confirmationResults.push(normalizedAnswer);
          this.processAnswer(transcript, this.firstResponseTime);
          
          // Continue listening for confirmation in continuous mode
          this.elements.status.textContent = 'Say the letter again to confirm...';
          
          // Set timeout for confirmation (8 seconds)
          this.confirmationTimeout = window.setTimeout(() => {
            if (this.hasReceivedFirstResult && this.confirmationResults.length === 1) {
              this.elements.transcription.innerHTML += `<br><em>Timeout - using first result</em>`;
              this.stopListening();
            }
          }, 8000);
        } else {
          // Subsequent results - for confirmation only
          this.confirmationResults.push(normalizedAnswer);
          
          if (showConversion) {
            this.elements.transcription.textContent += `<br>Confirm: "${transcript}" → "${normalizedAnswer}" (${Math.round(confidence * 100)}% confidence)`;
          } else {
            this.elements.transcription.textContent += `<br>Confirm: "${transcript}" (${Math.round(confidence * 100)}% confidence)`;
          }
          
          // Check if we have consistent results
          if (this.confirmationResults.length >= 2) {
            const firstResult = this.confirmationResults[0];
            const confirmedResults = this.confirmationResults.filter(r => r === firstResult);
            
            if (confirmedResults.length >= 2) {
              this.elements.transcription.innerHTML += `<br><strong>✓ Confirmed: ${firstResult}</strong>`;
              clearTimeout(this.confirmationTimeout);
              this.stopListening();
            } else if (this.confirmationResults.length >= 3) {
              // Too many different results, stop and use first one
              this.elements.transcription.innerHTML += `<br><em>Using first result: ${firstResult}</em>`;
              clearTimeout(this.confirmationTimeout);
              this.stopListening();
            }
          }
        }
      } else {
        // Show interim results
        if (!this.hasReceivedFirstResult) {
          this.elements.transcription.textContent = `Hearing: "${transcript}" (interim)`;
        } else {
          this.elements.transcription.innerHTML += `<br>Hearing: "${transcript}" (interim)`;
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error, event.message);
      console.log('Error event details:', event);
      
      let errorMessage = 'Speech recognition error: ';
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage += 'Microphone permission denied. Please allow microphone access.';
          break;
        case 'no-speech':
          errorMessage += 'No speech detected. Try speaking louder or closer to the microphone.';
          break;
        case 'audio-capture':
          errorMessage += 'Microphone not found or not working.';
          break;
        case 'network':
          errorMessage += 'Network error. Please check your internet connection.';
          break;
        case 'service-not-allowed':
          errorMessage += 'Speech service not allowed. Check HTTPS requirements.';
          break;
        case 'bad-grammar':
          errorMessage += 'Grammar error in speech recognition.';
          break;
        case 'language-not-supported':
          errorMessage += 'Language not supported.';
          break;
        case 'aborted':
          errorMessage += 'Speech recognition was aborted.';
          break;
        default:
          errorMessage += event.error;
      }
      
      this.elements.status.textContent = errorMessage;
      this.playIncorrectSound();
      
      // Auto-restart recognition on errors instead of stopping
      if (event.error === 'no-speech' || event.error === 'aborted') {
        this.isListening = false;
        this.elements.voiceButton.textContent = 'Listening...';
        this.elements.voiceButton.classList.add('listening');
        
        // Auto-restart recognition after a short delay
        setTimeout(() => {
          if (this.recognition && !this.isListening && !this.isRecognitionStarting) {
            console.log('Auto-restarting speech recognition after error');
            this.startListening();
          }
        }, 2000);
        
        this.elements.status.textContent = 'Recognition restarted automatically...';
      } else {
        // For serious errors, show message but keep trying
        this.isListening = false;
        this.elements.voiceButton.textContent = 'Start Voice Input';
        this.elements.voiceButton.classList.remove('listening');
        
        setTimeout(() => {
          this.elements.status.textContent = 'Click voice button to restart or wait for auto-restart';
          // Auto-restart after 5 seconds for serious errors
          setTimeout(() => {
                      if (this.recognition && !this.isListening) {
            console.log('Auto-restarting speech recognition after serious error');
            this.startListening();
          }
          }, 3000);
        }, 2000);
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended, was listening:', this.isListening);
      const wasListening = this.isListening;
      
      // Auto-restart recognition instead of stopping
      if (wasListening) {
        this.isListening = false;
        this.elements.voiceButton.textContent = 'Restarting...';
        this.elements.voiceButton.classList.add('listening');
        
        this.elements.status.textContent = 'Recognition restarted automatically...';
        
        // Auto-restart after a longer delay to avoid conflicts
        setTimeout(() => {
          if (this.recognition && !this.isListening) {
            console.log('Auto-restarting speech recognition after unexpected end');
            this.startListening();
          }
        }, 3000);
      } else {
        // If we weren't listening, just reset state
        this.isListening = false;
        this.elements.voiceButton.textContent = 'Start Voice Input';
        this.elements.voiceButton.classList.remove('listening');
      }
    };
  }

  private setupEventListeners(): void {
    this.elements.voiceButton.addEventListener('click', () => {
      if (this.isListening) {
        this.stopListening();
      } else {
        this.startListening();
      }
    });

    this.elements.submitButton.addEventListener('click', () => {
      const answer = this.elements.textInput.value.trim().toUpperCase();
      if (answer) {
        this.processAnswer(answer);
        this.elements.textInput.value = '';
      }
    });

    this.elements.textInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.elements.submitButton.click();
      }
    });

    this.elements.characterSetSelect.addEventListener('change', () => {
      this.updateCharacterSet();
      this.nextCharacter();
    });

    this.elements.customCharacters.addEventListener('input', () => {
      if (this.elements.characterSetSelect.value === 'custom') {
        this.updateCharacterSet();
        this.nextCharacter();
      }
    });

    this.elements.replayButton.addEventListener('click', () => {
      if (this.currentCharacter) {
        this.playMorseCode(this.currentCharacter);
      }
    });

    this.elements.morseWpmSlider.addEventListener('input', () => {
      this.morseWPM = parseInt(this.elements.morseWpmSlider.value);
      this.elements.wpmDisplay.textContent = `${this.morseWPM} WPM`;
    });

    this.elements.startButton.addEventListener('click', () => {
      this.startTraining();
    });

    this.elements.stopButton.addEventListener('click', () => {
      this.stopTraining();
    });

    this.elements.skipButton.addEventListener('click', () => {
      this.skipCurrentCharacter();
    });

    // Auto-gain controls - initialize as disabled
    this.elements.autoGainToggle.checked = false;
    this.autoGainEnabled = false;
    this.elements.gainIndicator.textContent = 'Auto-Gain Disabled';
    
    this.elements.autoGainToggle.addEventListener('change', () => {
      this.autoGainEnabled = this.elements.autoGainToggle.checked;
      this.elements.gainIndicator.textContent = this.autoGainEnabled ? 'Auto-Gain Active' : 'Auto-Gain Disabled';
      console.log(`Auto-gain ${this.autoGainEnabled ? 'enabled' : 'disabled'}`);
      
      if (this.autoGainEnabled) {
        console.log('Warning: Auto-gain enabled - may affect speech recognition accuracy');
      }
    });

    this.elements.gainSpeedSlider.addEventListener('input', () => {
      this.gainAdjustmentCooldown = parseInt(this.elements.gainSpeedSlider.value);
      this.elements.gainSpeedDisplay.textContent = `${(this.gainAdjustmentCooldown/1000).toFixed(1)}s`;
      console.log(`Auto-gain speed set to ${this.gainAdjustmentCooldown}ms`);
    });

    // Keyboard shortcut for voice activation
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.ctrlKey) {
        e.preventDefault();
        if (this.isListening) {
          this.stopListening();
        } else {
          this.startListening();
        }
      }
    });
  }

  private updateCharacterSet(): void {
    const selected = this.elements.characterSetSelect.value;
    
    if (selected === 'custom') {
      const customChars = this.elements.customCharacters.value.trim();
      this.characterSet = customChars ? customChars.toUpperCase().split('') : ['A'];
    } else {
      this.characterSet = this.characterSets[selected as keyof typeof this.characterSets] || this.characterSets.alphabet;
    }
  }

  private startListening(): void {
    console.log('startListening called');
    console.log('Microphone permission granted:', this.isMicrophonePermissionGranted);
    console.log('Recognition object exists:', !!this.recognition);
    console.log('Currently listening:', this.isListening);
    
    if (!this.isMicrophonePermissionGranted) {
      this.elements.status.textContent = 'Please allow microphone access and refresh the page.';
      return;
    }

    if (!this.recognition) {
      this.elements.status.textContent = 'Speech recognition not initialized. Please refresh the page.';
      return;
    }

    // Check if recognition is already running
    if (this.isListening || this.isRecognitionStarting) {
      console.log('Recognition already running, skipping start');
      return;
    }

    // Reset state if recognition ended unexpectedly
    if (this.isListening) {
      console.log('Resetting listening state and restarting recognition');
      this.isListening = false;
    }

    try {
      // Ensure audio context is running (required for user interaction)
      if (this.audioContext && this.audioContext.state === 'suspended') {
        console.log('Resuming audio context');
        this.audioContext.resume();
      }
      
      // Reset confirmation state for new recognition session
      this.hasReceivedFirstResult = false;
      this.confirmationResults = [];
      this.responseStartTime = Date.now();
      
      console.log('Starting speech recognition');
      this.isRecognitionStarting = true;
      this.recognition.start();
      
      // Set up persistent listening - if recognition stops, restart automatically
      this.setupPersistentListening();
    } catch (error) {
      this.elements.status.textContent = 'Error starting speech recognition. Try refreshing the page.';
      console.error('Speech recognition start error:', error);
    }
  }

  private setupPersistentListening(): void {
    // Check every 3 seconds if recognition is still active
    const checkInterval = setInterval(() => {
      // Only restart if we're not currently listening AND recognition object exists
      if (!this.isListening && this.recognition) {
        console.log('Persistent listening: Recognition stopped, restarting...');
        clearInterval(checkInterval);
        this.startListening();
      }
    }, 3000);
    
    // Clear interval after 30 seconds to prevent infinite loops
    setTimeout(() => clearInterval(checkInterval), 30000);
  }

  private stopListening(): void {
    console.log('stopListening called, isListening:', this.isListening);
    
    // Clear confirmation timeout
    if (this.confirmationTimeout) {
      clearTimeout(this.confirmationTimeout);
      this.confirmationTimeout = 0;
    }
    
    if (this.recognition && this.isListening) {
      try {
        // Stop recognition
        this.recognition.stop();
        console.log('Recognition stop called');
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    this.isListening = false;
    this.elements.voiceButton.textContent = 'Start Voice Input';
    this.elements.voiceButton.classList.remove('listening');
  }

  private restartSpeechRecognition(): void {
    console.log('Restarting speech recognition');
    if (this.recognition) {
      try {
        // Small delay to ensure previous session is fully closed
        setTimeout(() => {
          this.isListening = false;
          this.startListening();
        }, 500);
      } catch (error) {
        console.error('Error restarting speech recognition:', error);
      }
    }
  }

  private processAnswer(answer: string, customResponseTime?: number): void {
    this.totalAttempts++;
    
    // Use custom response time if provided (for first result timing)
    const responseTime = customResponseTime || (Date.now() - this.responseStartTime);
    const isCorrect = this.checkAnswer(answer);
    
    // Initialize timing array for this character if needed
    if (!this.characterTimings[this.currentCharacter]) {
      this.characterTimings[this.currentCharacter] = [];
    }
    
    if (isCorrect) {
      this.score++;
      // Only add timing for correct answers
      this.characterTimings[this.currentCharacter].push(responseTime);
      this.elements.status.textContent = `✓ Correct! (${(responseTime/1000).toFixed(1)}s)`;
      this.elements.status.className = 'correct';
      this.playCorrectSound();
    } else {
      // Reset timing history for wrong answers
      this.characterTimings[this.currentCharacter] = [];
      this.elements.status.textContent = `✗ Incorrect. Expected: ${this.currentCharacter} - Progress reset!`;
      this.elements.status.className = 'incorrect';
      this.playIncorrectSound();
    }
    
    this.updateScore();
    this.updateTimingDisplay();
    
    // Check if lesson should end (average < 2s)
    if (this.shouldEndLesson()) {
      this.endLesson();
      return;
    }
    
    // Automatically move to next character after a shorter delay
    setTimeout(() => {
      this.nextCharacter();
    }, 1500);
  }

  private checkAnswer(answer: string): boolean {
    // Handle special prosigns
    const normalizedAnswer = this.normalizeAnswer(answer);
    const normalizedCurrent = this.normalizeAnswer(this.currentCharacter);
    
    return normalizedAnswer === normalizedCurrent;
  }

  private normalizeAnswer(text: string): string {
    // Convert common speech-to-text interpretations
    const conversions: { [key: string]: string } = {
      'EQUALS': '=',
      'EQUAL': '=',
      'PLUS': '+',
      'GREATER THAN': '>',
      'LESS THAN': '<',
      'BT': '=',
      'AR': '+',
      'SK': '>',
      'BREAK': '=',
      'ROGER': '+',
      'END': '>'
    };

    // Phonetic alphabet and common speech recognition interpretations for letters
    const phoneticToLetter: { [key: string]: string } = {
      // NATO phonetic alphabet
      'ALPHA': 'A', 'BRAVO': 'B', 'CHARLIE': 'C', 'DELTA': 'D', 'ECHO': 'E',
      'FOXTROT': 'F', 'GOLF': 'G', 'HOTEL': 'H', 'INDIA': 'I', 'JULIET': 'J',
      'KILO': 'K', 'LIMA': 'L', 'MIKE': 'M', 'NOVEMBER': 'N', 'OSCAR': 'O',
      'PAPA': 'P', 'QUEBEC': 'Q', 'ROMEO': 'R', 'SIERRA': 'S', 'TANGO': 'T',
      'UNIFORM': 'U', 'VICTOR': 'V', 'WHISKEY': 'W', 'XRAY': 'X', 'YANKEE': 'Y', 'ZULU': 'Z',
      
      // Common speech recognition interpretations for letters
      'EMMA': 'M', 'EM': 'M', 'EMM': 'M',
      'KAY': 'K', 'OKAY': 'K', 'OK': 'K',
      'YOU': 'U', 'ARE': 'R', 'SEE': 'C', 'BEE': 'B', 'DEE': 'D',
      'GEE': 'G', 'PEE': 'P', 'TEE': 'T', 'VEE': 'V', 'WE': 'W', 'EX': 'X',
      'WHY': 'Y', 'ZEE': 'Z', 'ZED': 'Z',
      'AY': 'A', 'ACE': 'A', 'EE': 'E', 'I': 'I', 'OH': 'O', 'OWE': 'O',
      'CUE': 'Q', 'QUEUE': 'Q', 'ESS': 'S', 'JAY': 'J', 'EL': 'L', 'ELL': 'L',
      'EF': 'F', 'AITCH': 'H', 'EN': 'N', 'DOUBLE YOU': 'W',
      
      // Handle variations and combinations
      'HIM': 'M', 'HIM HIM': 'M', 'M M': 'M', 'K K': 'K', 'EMMA EMMA': 'M',
      'OKAY OKAY': 'K', 'EM EM': 'M', 'KAY KAY': 'K',
      
      // Numbers
      'ZERO': '0', 'ONE': '1', 'TWO': '2', 'THREE': '3', 'FOUR': '4',
      'FIVE': '5', 'SIX': '6', 'SEVEN': '7', 'EIGHT': '8', 'NINE': '9',
      'TREE': '3', 'FOR': '4', 'FOWER': '4', 'FIFE': '5', 'NINER': '9'
    };

    let normalized = text.toUpperCase().trim();
    
    // Check for phonetic conversions first
    if (phoneticToLetter[normalized]) {
      console.log(`Converted phonetic "${normalized}" to letter "${phoneticToLetter[normalized]}"`);
      return phoneticToLetter[normalized];
    }
    
    // Check for direct conversions
    if (conversions[normalized]) {
      return conversions[normalized];
    }
    
    // Handle prosign patterns like "<AR>" or "AR"
    if (normalized.includes('AR')) return '+';
    if (normalized.includes('BT')) return '=';
    if (normalized.includes('SK')) return '>';
    
    // If it's already a single letter, return as-is
    if (normalized.length === 1 && /[A-Z0-9]/.test(normalized)) {
      return normalized;
    }
    
    // Try to extract single letters from mixed input
    const singleLetterMatch = normalized.match(/\b[A-Z]\b/);
    if (singleLetterMatch) {
      console.log(`Extracted single letter "${singleLetterMatch[0]}" from "${normalized}"`);
      return singleLetterMatch[0];
    }
    
    return normalized;
  }

  private nextCharacter(): void {
    if (this.characterSet.length === 0) return;
    
    // Reset UI and confirmation state
    this.elements.status.textContent = 'Get ready...';
    this.elements.status.className = '';
    this.elements.transcription.textContent = '';
    this.hasReceivedFirstResult = false;
    this.firstResponseTime = 0;
    this.confirmationResults = [];
    if (this.confirmationTimeout) {
      clearTimeout(this.confirmationTimeout);
      this.confirmationTimeout = 0;
    }
    
    this.currentCharacter = this.characterSet[Math.floor(Math.random() * this.characterSet.length)];
    this.currentMorseCode = this.morseCode[this.currentCharacter] || '';
    this.elements.currentChar.textContent = '?'; // Hide character during training
    
    // Small delay before playing to let user prepare
    setTimeout(() => {
      this.elements.status.textContent = 'Listen...';
      // Play Morse code and start timing (will auto-start voice recognition)
      this.playMorseCode(this.currentCharacter);
    }, 500);
    
    // Focus on text input for immediate typing
    this.elements.textInput.focus();
  }

  private calculateWeightedMedian(timings: number[]): number {
    if (timings.length === 0) return 0;
    if (timings.length === 1) return timings[0];
    
    // Create weighted values favoring recent answers
    const weightedValues: { value: number, weight: number }[] = [];
    
    for (let i = 0; i < timings.length; i++) {
      // Recent answers get higher weight (exponential decay)
      // Most recent answer has weight 1.0, older answers decay exponentially
      const recency = (i + 1) / timings.length; // 0 to 1, where 1 is most recent
      const weight = Math.exp(recency * 2 - 2); // Exponential curve favoring recent
      
      // Add multiple copies based on weight for median calculation
      const copies = Math.max(1, Math.round(weight * 10)); // 1-10 copies
      for (let j = 0; j < copies; j++) {
        weightedValues.push({ value: timings[i], weight });
      }
    }
    
    // Sort by value for median calculation
    weightedValues.sort((a, b) => a.value - b.value);
    
    // Calculate median from weighted values
    const midIndex = Math.floor(weightedValues.length / 2);
    if (weightedValues.length % 2 === 0) {
      return (weightedValues[midIndex - 1].value + weightedValues[midIndex].value) / 2;
    } else {
      return weightedValues[midIndex].value;
    }
  }

  private getTimingColor(avgTiming: number): { color: string, level: string } {
    if (avgTiming === 0) return { color: '#e9ecef', level: 'No Data' };
    if (avgTiming < 2000) return { color: '#28a745', level: 'Green' };      // Excellent
    if (avgTiming < 3000) return { color: '#ffc107', level: 'Yellow' };     // Good  
    if (avgTiming < 4000) return { color: '#fd7e14', level: 'Orange' };     // Fair
    return { color: '#dc3545', level: 'Red' };                             // Needs Work
  }

  private updateTimingDisplay(): void {
    // Calculate weighted median timing for each character in current lesson
    const timingBars = this.characterSet.map(char => {
      const timings = this.characterTimings[char] || [];
      const medianTiming = timings.length > 0 ? 
        this.calculateWeightedMedian(timings) : 0;
      return { char, avgTiming: medianTiming, count: timings.length };
    });
    
    // Create visual bar chart with color progression
    const maxTiming = Math.max(1000, ...timingBars.map(item => item.avgTiming));
    const barsHTML = timingBars.map(item => {
      const percentage = Math.max(10, (item.avgTiming / maxTiming) * 100);
      const { color, level } = this.getTimingColor(item.avgTiming);
      const hasData = item.count > 0;
      
      return `
        <div class="timing-bar-container">
          <div class="timing-bar" style="width: ${hasData ? percentage : 10}%; background-color: ${color};">
            <span class="timing-value">${hasData ? (item.avgTiming/1000).toFixed(1) : 0}s</span>
          </div>
          <div class="timing-label">
            <strong>${item.char}</strong> - ${level} (${item.count} tries, recent-weighted median)
          </div>
        </div>
      `;
    }).join('');
    
    this.elements.timingBars.innerHTML = barsHTML;
    
    // Check lesson completion and update status
    this.checkLessonCompletion(timingBars);
  }

  private checkLessonCompletion(timingBars: any[]): void {
    const minAttempts = 3;
    const charactersWithData = timingBars.filter(bar => bar.count >= minAttempts);
    const allGreen = charactersWithData.length === this.characterSet.length && 
                     charactersWithData.every(bar => bar.avgTiming < 2000);
    
    if (allGreen && charactersWithData.length > 0) {
      setTimeout(() => {
        this.elements.transcription.innerHTML = 
          `🎉 <strong>LESSON PASSED!</strong> All characters in Green range (&lt;2s)`;
        this.elements.transcription.style.color = '#28a745';
        this.elements.transcription.style.fontWeight = 'bold';
        
        // Auto-advance to next level after 3 seconds
        setTimeout(() => {
          this.autoAdvanceLevel();
        }, 3000);
      }, 1000);
    } else {
      // Calculate weighted median overall performance
      const allTimings: number[] = [];
      charactersWithData.forEach(bar => {
        const timings = this.characterTimings[bar.char] || [];
        allTimings.push(...timings);
      });
      const medianOverall = allTimings.length > 0 ? this.calculateWeightedMedian(allTimings) : 0;
      
      const greenCount = charactersWithData.filter(bar => bar.avgTiming < 2000).length;
      const yellowCount = charactersWithData.filter(bar => bar.avgTiming >= 2000 && bar.avgTiming < 3000).length;
      const orangeCount = charactersWithData.filter(bar => bar.avgTiming >= 3000 && bar.avgTiming < 4000).length;
      const redCount = charactersWithData.filter(bar => bar.avgTiming >= 4000).length;
      
      setTimeout(() => {
        this.elements.transcription.innerHTML = 
          `Progress: <span style="color:#28a745">${greenCount} Green</span> | ` +
          `<span style="color:#ffc107">${yellowCount} Yellow</span> | ` +
          `<span style="color:#fd7e14">${orangeCount} Orange</span> | ` +
          `<span style="color:#dc3545">${redCount} Red</span> | ` +
          `Median: ${(medianOverall/1000).toFixed(1)}s`;
        this.elements.transcription.style.color = '#495057';
        this.elements.transcription.style.fontWeight = 'normal';
      }, 1000);
    }
  }

  private autoAdvanceLevel(): void {
    const currentLesson = this.elements.characterSetSelect.value;
    
    // Check if current lesson is a Koch lesson
    if (currentLesson.startsWith('koch')) {
      const lessonNumber = parseInt(currentLesson.replace('koch', ''));
      const nextLessonKey = `koch${lessonNumber + 1}`;
      
      // Check if next lesson exists
      if (this.characterSets[nextLessonKey as keyof typeof this.characterSets]) {
        // Stop current training
        this.stopListening();
        
        // Advance to next lesson
        this.elements.characterSetSelect.value = nextLessonKey;
        
        // Reset all progress for new level
        this.characterTimings = {};
        this.score = 0;
        this.totalAttempts = 0;
        
        // Update character set and display
        this.updateCharacterSet();
        this.updateScore();
        this.updateTimingDisplay();
        
        // Show advancement message
        this.elements.status.textContent = `🚀 Advanced to Lesson ${lessonNumber + 1}! All progress reset for new challenge.`;
        this.elements.status.className = 'correct';
        this.elements.transcription.innerHTML = 
          `<strong>Level ${lessonNumber + 1} Started!</strong><br>New characters: ${this.characterSet.join(', ')}`;
        this.elements.transcription.style.color = '#007bff';
        this.elements.transcription.style.fontWeight = 'bold';
        
        this.playCorrectSound();
        
        // Auto-start new level after showing message
        setTimeout(() => {
          this.nextCharacter();
        }, 3000);
      } else {
        // All lessons completed
        this.elements.status.textContent = '🏆 Congratulations! All Koch method lessons completed!';
        this.elements.status.className = 'correct';
        this.elements.transcription.innerHTML = 
          `<strong>🎓 GRADUATION!</strong><br>You've mastered all Koch method lessons!`;
        this.elements.transcription.style.color = '#28a745';
        this.elements.transcription.style.fontWeight = 'bold';
        
        this.playCorrectSound();
        setTimeout(() => this.playCorrectSound(), 500);
        setTimeout(() => this.playCorrectSound(), 1000);
      }
    }
  }

  private shouldEndLesson(): boolean {
    // Check if all characters in current lesson have been practiced enough
    const minAttempts = 5; // Minimum attempts per character
    const targetMedian = 2000; // Target response time in ms (2 seconds for green)
    
    for (const char of this.characterSet) {
      const timings = this.characterTimings[char] || [];
      if (timings.length < minAttempts) return false;
      
      const medianTiming = this.calculateWeightedMedian(timings);
      if (medianTiming >= targetMedian) return false;
    }
    
    return true;
  }

  private endLesson(): void {
    // Calculate overall weighted median
    const allTimings: number[] = [];
    this.characterSet.forEach(char => {
      const timings = this.characterTimings[char] || [];
      allTimings.push(...timings);
    });
    
    const overallMedian = allTimings.length > 0 ? 
      this.calculateWeightedMedian(allTimings) : 0;
    
    this.elements.status.textContent = 
      `🎉 Lesson Complete! Median response time: ${(overallMedian/1000).toFixed(1)}s. Ready for next lesson!`;
    this.elements.status.className = 'correct';
    
    this.playCorrectSound();
    
    // Suggest next lesson
    setTimeout(() => {
      this.suggestNextLesson();
    }, 3000);
  }

  private suggestNextLesson(): void {
    const currentLesson = this.elements.characterSetSelect.value;
    const lessonNumber = parseInt(currentLesson.replace('koch', ''));
    const nextLessonKey = `koch${lessonNumber + 1}`;
    
    if (this.characterSets[nextLessonKey as keyof typeof this.characterSets]) {
      this.elements.status.textContent = 
        `Consider advancing to Lesson ${lessonNumber + 1}. Change the lesson in settings above.`;
    } else {
      this.elements.status.textContent = 
        'Congratulations! You have completed all Koch method lessons!';
    }
  }

  private updateScore(): void {
    const accuracy = this.totalAttempts > 0 ? Math.round((this.score / this.totalAttempts) * 100) : 0;
    this.elements.score.textContent = `Score: ${this.score}/${this.totalAttempts} (${accuracy}%)`;
  }

  public async startTraining(): Promise<void> {
    // Ensure audio context is running (requires user interaction)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Set up microphone after user interaction
    await this.checkMicrophonePermission();
    
    // Show training controls
    this.elements.startButton.style.display = 'none';
    this.elements.stopButton.style.display = 'inline-block';
    this.elements.replayButton.style.display = 'inline-block';
    this.elements.skipButton.style.display = 'inline-block';
    this.elements.status.textContent = 'Training started! Get ready...';
    
    // Start the first character
    setTimeout(() => {
      this.nextCharacter();
    }, 1000);
  }

  public stopTraining(): void {
    // Stop any ongoing recognition
    this.stopListening();
    
    // Clear any timeouts
    if (this.confirmationTimeout) {
      clearTimeout(this.confirmationTimeout);
      this.confirmationTimeout = 0;
    }
    
    // Reset UI to initial state
    this.elements.startButton.style.display = 'inline-block';
    this.elements.stopButton.style.display = 'none';
    this.elements.replayButton.style.display = 'none';
    this.elements.skipButton.style.display = 'none';
    this.elements.status.textContent = 'Training stopped. Click "Start Training" to begin again.';
    this.elements.status.className = '';
    this.elements.transcription.textContent = '';
    this.elements.currentChar.textContent = '?';
    
    // Reset confirmation state
    this.hasReceivedFirstResult = false;
    this.firstResponseTime = 0;
    this.confirmationResults = [];
    this.responseStartTime = 0;
    
    this.playCorrectSound(); // Gentle feedback that stopping worked
  }

  public skipCurrentCharacter(): void {
    if (this.elements.startButton.style.display === 'none') { // Only if training is active
      this.stopListening();
      
      // Clear any timeouts
      if (this.confirmationTimeout) {
        clearTimeout(this.confirmationTimeout);
        this.confirmationTimeout = 0;
      }
      
      this.elements.status.textContent = 'Character skipped due to microphone issues';
      this.elements.status.className = '';
      
      // Move to next character after short delay
      setTimeout(() => {
        this.nextCharacter();
      }, 1000);
    }
  }

  public reset(): void {
    this.score = 0;
    this.totalAttempts = 0;
    this.characterTimings = {};
    this.updateScore();
    this.updateTimingDisplay();
    this.elements.startButton.style.display = 'inline-block';
    this.elements.replayButton.style.display = 'none';
    this.elements.status.textContent = 'Click "Start Training" to begin';
    this.elements.transcription.textContent = '';
    this.elements.currentChar.textContent = '?';
  }

  public async testAudio(): Promise<void> {
    this.elements.status.textContent = 'Testing audio... You should hear 3 beeps.';
    
    // Ensure audio context is running
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    if (!this.audioContext) {
      this.elements.status.textContent = '❌ Audio context not available. Try refreshing the page.';
      return;
    }
    
    console.log('Audio Context State:', this.audioContext.state);
    
    // Play test sounds
    setTimeout(() => this.playSound(440, 0.3), 0);    // A note
    setTimeout(() => this.playSound(523, 0.3), 400);  // C note
    setTimeout(() => this.playSound(659, 0.3), 800);  // E note
    
    setTimeout(() => {
      this.elements.status.textContent = 'Audio test complete. Did you hear 3 beeps?';
    }, 1200);
  }

  public async testMicrophone(): Promise<void> {
    this.elements.status.textContent = 'Testing microphone access...';
    
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.elements.status.textContent = '✓ Microphone test successful! Permission granted.';
        this.isMicrophonePermissionGranted = true;
        this.elements.voiceButton.disabled = false;
        
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
        this.playCorrectSound();
      } else {
        this.elements.status.textContent = '✗ Microphone not supported in this browser.';
      }
    } catch (error) {
      this.elements.status.textContent = '✗ Microphone test failed. Please check permissions.';
      this.isMicrophonePermissionGranted = false;
      this.elements.voiceButton.disabled = true;
      this.playIncorrectSound();
      console.error('Microphone test error:', error);
    }
  }

  public async testSpeechRecognition(): Promise<void> {
    this.elements.status.textContent = 'Testing speech recognition... Please speak clearly.';
    console.log('Starting speech recognition test');
    
    if (!this.recognition) {
      this.elements.status.textContent = '✗ Speech recognition not available';
      return;
    }

    // Create a temporary test recognition instance to avoid conflicts
    let testRecognition: SpeechRecognition;
    
    if ('webkitSpeechRecognition' in window) {
      testRecognition = new webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      testRecognition = new SpeechRecognition();
    } else {
      this.elements.status.textContent = '✗ Speech recognition not supported';
      return;
    }

    testRecognition.continuous = false;
    testRecognition.lang = 'en-US';
    testRecognition.maxAlternatives = 3;
    (testRecognition as any).interimResults = true;

    testRecognition.onstart = () => {
      console.log('Test speech recognition started');
      this.elements.status.textContent = 'Listening... Say "test" or "hello"';
    };

    testRecognition.onresult = (event) => {
      console.log('Test speech recognition result:', event);
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      this.elements.status.textContent = `✓ Speech test successful! Heard: "${transcript}" (${Math.round(confidence * 100)}% confidence)`;
      this.elements.transcription.textContent = `Test result: "${transcript}"`;
      this.playCorrectSound();
    };

    testRecognition.onerror = (event) => {
      console.error('Test speech recognition error:', event);
      this.elements.status.textContent = `✗ Speech test failed: ${event.error}`;
      this.playIncorrectSound();
    };

    testRecognition.onend = () => {
      console.log('Test speech recognition ended');
    };

    try {
      testRecognition.start();
    } catch (error) {
      console.error('Error starting test speech recognition:', error);
      this.elements.status.textContent = '✗ Failed to start speech recognition test';
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new VoiceICRApp();
  
  // Expose functions globally for the buttons
  (window as any).resetApp = () => app.reset();
  (window as any).testAudio = () => app.testAudio();
  (window as any).testMicrophone = () => app.testMicrophone();
  (window as any).testSpeechRecognition = () => app.testSpeechRecognition();
});
