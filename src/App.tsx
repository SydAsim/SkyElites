import { useState, FormEvent, useRef, useEffect } from 'react';
import { Menu, X, ArrowRight, ArrowDownRight, Shield, Clock, Users, Calendar, MapPin, Volume2, VolumeX, Sparkles, CheckCircle, ChevronDown, Check, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavItem {
  name: string;
  id: string;
}

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  const activeSourcesRef = useRef<any[]>([]);

  const [bookingForm, setBookingForm] = useState({
    departure: '',
    destination: '',
    date: '',
    passengers: '1-3',
    jetType: 'Light Cabin Jet'
  });

  const navItems: NavItem[] = [
    { name: 'Start', id: 'hero-section' },
    { name: 'Story', id: 'story-section' },
    { name: 'Rates', id: 'rates-section' },
    { name: 'Benefits', id: 'benefits-section' },
    { name: 'FAQ', id: 'faq-section' }
  ];

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const stopJetEngineSound = () => {
    const ctx = audioCtxRef.current;
    const mainGain = mainGainRef.current;
    
    // Smoothly fade out sound first
    if (ctx && mainGain) {
      try {
        mainGain.gain.cancelScheduledValues(ctx.currentTime);
        mainGain.gain.setValueAtTime(mainGain.gain.value, ctx.currentTime);
        mainGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      } catch (err) {}
    }

    // Stop and discharge all running oscillators and noise generators after the fade
    setTimeout(() => {
      activeSourcesRef.current.forEach(source => {
        try {
          source.stop();
        } catch (e) {}
        try {
          source.disconnect();
        } catch (e) {}
      });
      activeSourcesRef.current = [];
    }, 380);
  };

  const initJetEngineSound = () => {
    try {
      // Create context if not exists or closed
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }

      const ctx = audioCtxRef.current;
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Safeguard: Stop and clear any existing nodes first
      activeSourcesRef.current.forEach(src => {
        try { src.stop(); } catch (e) {}
        try { src.disconnect(); } catch (e) {}
      });
      activeSourcesRef.current = [];

      // Create main output master gain
      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.001, ctx.currentTime);
      mainGain.connect(ctx.destination);
      mainGainRef.current = mainGain;

      // 1. DENSE CABIN NOISE (Pinkish brown noise for deep air friction)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brownian noise integration representing realistic heavy cabin air pressure
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 4.5; // Amplified
      }

      const airSource = ctx.createBufferSource();
      airSource.buffer = noiseBuffer;
      airSource.loop = true;

      const airFilter = ctx.createBiquadFilter();
      airFilter.type = 'lowpass';
      airFilter.frequency.setValueAtTime(140, ctx.currentTime);
      airFilter.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 3.0); // Spools air velocity up

      const airGain = ctx.createGain();
      airGain.gain.setValueAtTime(0.75, ctx.currentTime);

      airSource.connect(airFilter);
      airFilter.connect(airGain);
      airGain.connect(mainGain);
      activeSourcesRef.current.push(airSource);

      // 2. HIGH PRESSURIZED CABIN WIND (White noise bandpass filtered for wind currents)
      const windBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const windOutput = windBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        windOutput[i] = Math.random() * 2 - 1;
      }

      const windSource = ctx.createBufferSource();
      windSource.buffer = windBuffer;
      windSource.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(280, ctx.currentTime);
      windFilter.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 3.0); // sweep up
      windFilter.Q.setValueAtTime(1.5, ctx.currentTime);

      const windGainNode = ctx.createGain();
      windGainNode.gain.setValueAtTime(0.28, ctx.currentTime);

      windSource.connect(windFilter);
      windFilter.connect(windGainNode);
      windGainNode.connect(mainGain);
      activeSourcesRef.current.push(windSource);

      // 3. LOW THROATY COMBUSTION FLAME RUMBLE
      const lowRumble = ctx.createOscillator();
      lowRumble.type = 'triangle';
      lowRumble.frequency.setValueAtTime(35, ctx.currentTime);
      lowRumble.frequency.exponentialRampToValueAtTime(82, ctx.currentTime + 3.2);

      const rumbleGain = ctx.createGain();
      rumbleGain.gain.setValueAtTime(0.6, ctx.currentTime);

      lowRumble.connect(rumbleGain);
      rumbleGain.connect(mainGain);
      activeSourcesRef.current.push(lowRumble);

      // 4. TWIN TURBOFAN JET ENGINES (Slightly de-tuned dual sines for heavy stereo flanging)
      const turbine1 = ctx.createOscillator();
      turbine1.type = 'sine';
      turbine1.frequency.setValueAtTime(105, ctx.currentTime);
      turbine1.frequency.exponentialRampToValueAtTime(312, ctx.currentTime + 3.2); // Spools to engine cruising speed

      const turbine2 = ctx.createOscillator();
      turbine2.type = 'sine';
      turbine2.frequency.setValueAtTime(106.5, ctx.currentTime);
      turbine2.frequency.exponentialRampToValueAtTime(316.5, ctx.currentTime + 3.2); // Harmonically beats against turbine 1

      const turbineGain = ctx.createGain();
      turbineGain.gain.setValueAtTime(0.48, ctx.currentTime);

      turbine1.connect(turbineGain);
      turbine2.connect(turbineGain);
      turbineGain.connect(mainGain);
      activeSourcesRef.current.push(turbine1);
      activeSourcesRef.current.push(turbine2);

      // 5. HIGH-STAGE TURBINE WHISTLE (The sharp realistic metallic blade whine)
      const sharpWhistle = ctx.createOscillator();
      sharpWhistle.type = 'sine';
      sharpWhistle.frequency.setValueAtTime(260, ctx.currentTime);
      sharpWhistle.frequency.exponentialRampToValueAtTime(740, ctx.currentTime + 3.5); // Ramps up to that premium real whistling tone!

      const whistleGain = ctx.createGain();
      whistleGain.gain.setValueAtTime(0.18, ctx.currentTime);

      sharpWhistle.connect(whistleGain);
      whistleGain.connect(mainGain);
      activeSourcesRef.current.push(sharpWhistle);

      // Start all synthesizers
      airSource.start(0);
      windSource.start(0);
      lowRumble.start(0);
      turbine1.start(0);
      turbine2.start(0);
      sharpWhistle.start(0);

      // Gracefully glide the master volume up as the jet spools up
      mainGain.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 2.5);
    } catch (err) {
      console.error("Failed to synthesize premium jet engine acoustics:", err);
    }
  };

  const toggleMuted = () => {
    const nextMuted = !isMuted;
    
    // Manage video mute
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted) {
        videoRef.current.play().catch(() => {});
      }
    }

    // Manage Web Audio API private jet engine sound
    if (!nextMuted) {
      // Unmuting: start synthesis spool up
      initJetEngineSound();
    } else {
      // Muting: ramp down volume and silence immediately
      stopJetEngineSound();
    }

    setIsMuted(nextMuted);
  };

  // Sound Cleanup Effect hook
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleBookingSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setBookingSubmitted(true);
    }, 1200);
  };

  const handleResetBooking = () => {
    setBookingForm({
      departure: '',
      destination: '',
      date: '',
      passengers: '1-3',
      jetType: 'Light Cabin Jet'
    });
    setBookingSubmitted(false);
  };

  return (
    <div id="skyelite-root" className="min-h-screen bg-gray-50 text-gray-900 overflow-x-hidden font-sans select-none selection:bg-gray-800 selection:text-white scroll-smooth pb-12">
      
      {/* Absolute Navbar Fixed at the Top */}
      <header id="navigation-bar" className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-100/50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          
          {/* Brand Logo */}
          <button 
            id="brand-logo"
            onClick={() => handleNavClick('hero-section')} 
            className="text-2xl font-semibold text-gray-900 tracking-tight transition-transform hover:scale-[1.02] cursor-pointer"
          >
            SkyElite
          </button>

          {/* Desktop Navigation Link Array */}
          <nav id="desktop-menu" className="hidden md:flex items-center space-x-12">
            {navItems.map((item) => (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                className="text-gray-900 transition-colors font-medium relative py-1 hover:text-gray-600 cursor-pointer text-sm tracking-wide"
              >
                {item.name}
              </button>
            ))}
          </nav>

          {/* Action side triggers (Audio playback toggle) */}
          <div id="nav-actions" className="flex items-center space-x-4">
            {/* Real Audio controller toggle (plays high pressure jet sound from stream) */}
            <button
              id="audio-toggle-controller"
              onClick={toggleMuted}
              className="p-3 rounded-full bg-white/80 hover:bg-gray-100 text-gray-800 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-semibold"
              title={isMuted ? 'Turn on Private Jet engine audio' : 'Mute Private Jet engine audio'}
            >
              <AnimatePresence mode="wait">
                {isMuted ? (
                  <motion.div key="muted" className="flex items-center gap-1.5">
                    <VolumeX className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-500 font-mono text-[10px] tracking-wider uppercase">Unmute Engine</span>
                  </motion.div>
                ) : (
                  <motion.div key="sound-on" className="flex items-center gap-1.5 text-[#202A36]">
                    <Volume2 className="w-4 h-4 text-emerald-600 animate-bounce" />
                    <span className="font-mono text-[10px] tracking-wider uppercase animate-pulse">Jet Active sound</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Mobile Menu trigger button */}
            <button
              id="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-900 hover:bg-white/90 transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Mobile Menu Slide out Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-dropdown-panel"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-18 left-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 z-50 p-6 md:hidden"
            >
              <div className="flex flex-col space-y-3">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    id={`mobile-nav-link-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className="text-left text-gray-900 text-base font-medium py-2 px-3 rounded-xl hover:bg-gray-100/60 transition-colors"
                  >
                    {item.name}
                  </button>
                ))}
                <div className="h-px bg-gray-100 my-2" />
                <button
                  id="mobile-book-now-shortcut"
                  onClick={() => handleNavClick('booking-section')}
                  className="w-full py-3 px-4 rounded-full bg-[#202A36] text-white text-center font-medium shadow-md transition-colors hover:bg-[#1a2229]"
                >
                  Book Private Charter
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section Container (100vh / Full Viewport) */}
      <section 
        id="hero-section" 
        className="relative h-screen overflow-hidden flex flex-col justify-center"
      >
        {/* Background Video Layer */}
        <div id="video-container" className="absolute inset-0 z-0 select-none">
          {/* Subtle Scrim for elegant visual look with excellent jet video visibility */}
          <div id="overlay-scrim" className="absolute inset-0 bg-white/20 z-10" />
          
          <video
            ref={videoRef}
            id="bg-video"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_091828_e240eb17-6edc-4129-ad9d-98678e3fd238.mp4"
            autoPlay
            muted={isMuted}
            loop
            playsInline
            className="w-full h-full object-cover select-none"
          />
        </div>

        {/* Hero Content Banner centered */}
        <div id="hero-content" className="relative z-20 flex flex-col items-center text-center px-4 max-w-4xl mx-auto -mt-12">
          {/* Uppercase premium tag styled for Bold Typography */}
          <motion.span 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block text-xs font-bold text-gray-600 tracking-[0.2em] uppercase mb-6"
          >
            PRIVATE JETS
          </motion.span>

          {/* Overlapping premium dynamic font titles */}
          <div id="hero-headline" className="relative mb-8 select-none flex flex-col items-center">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-6xl sm:text-7xl md:text-[110px] leading-[0.85] font-light text-gray-400 tracking-tighter"
            >
              Premium.
            </motion.h1>
            <motion.h1 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-6xl sm:text-7xl md:text-[110px] leading-[0.85] font-extrabold tracking-tighter -mt-[12px] block"
              style={{ color: '#202A36' }}
            >
              Accessible.
            </motion.h1>
          </div>

          {/* Premium Subtitle text line */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-xl text-gray-600 mb-10 max-w-xl mx-auto leading-relaxed font-light"
          >
            Your dedication deserves recognition. Experience the pinnacle of aviation tailored to your journey.
          </motion.p>

          {/* Action Call to buttons with premium scales */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-row items-center justify-center gap-5 flex-wrap"
          >
            <button
              onClick={() => handleNavClick('story-section')}
              className="px-10 py-3.5 rounded-full bg-gray-200/90 text-gray-800 font-semibold text-sm hover:bg-gray-300 transition-all cursor-pointer shadow-sm hover:shadow-md"
            >
              Discover
            </button>
            <button
              onClick={() => handleNavClick('booking-section')}
              className="px-10 py-3.5 rounded-full text-white font-semibold text-sm hover:bg-[#1a2229] transition-all cursor-pointer shadow-lg hover:shadow-xl"
              style={{ backgroundColor: '#202A36' }}
            >
              Book Now
            </button>
          </motion.div>
        </div>

        {/* Decorative corner statistics or metadata */}
        <div className="absolute bottom-10 left-8 z-20 hidden lg:flex items-center space-x-4">
          <div className="w-12 h-[1px] bg-gray-400"></div>
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Est. 2024</span>
        </div>

        <div className="absolute bottom-10 right-8 z-20 hidden lg:flex space-x-6">
          <span onClick={() => alert("SkyElite Premium Instagram link")} className="text-[10px] uppercase tracking-widest text-gray-500 font-bold cursor-pointer hover:text-gray-900 transition-colors">Instagram</span>
          <span onClick={() => alert("SkyElite Premium Twitter link")} className="text-[10px] uppercase tracking-widest text-gray-500 font-bold cursor-pointer hover:text-gray-900 transition-colors">Twitter</span>
        </div>

        {/* Indicator to drag attention downward */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center select-none text-[10px] text-gray-400 gap-1 opacity-70 cursor-pointer" onClick={() => handleNavClick('story-section')}>
          <span className="tracking-widest uppercase">SCROLL DOWN TO DISCOVER MORE</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-1.5 h-1.5 bg-gray-500 rounded-full"
          />
        </div>
      </section>

      {/* Main scrolling wrapper */}
      <main className="max-w-7xl mx-auto px-6 space-y-28 md:space-y-40 pt-16">
        
        {/* SECTION 1: OUR MISSION AND STORY */}
        <section id="story-section" className="scroll-mt-24 pt-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                01 / THE LEGACY
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold text-[#202A36] tracking-tight leading-tight">
                Redefining Flight, One Journey at a Time
              </h2>
              <p className="text-gray-600 leading-relaxed font-light text-base md:text-lg">
                Founded on the core philosophy of extreme simplicity matched with ultimate comfort, SkyElite challenges traditional private jet charters. We offer meticulously maintained aircraft and elite customized service, bringing you premium luxury without operational friction.
              </p>
              <p className="text-gray-600 leading-relaxed font-light text-base">
                Whether traveling to coordinate global ventures or escaping for an off-grid sanctuary, we optimize your schedule so you never lose a single minute. Welcome to elevated performance.
              </p>
              <div className="pt-4">
                <button 
                  onClick={() => handleNavClick('rates-section')}
                  className="px-6 py-3 rounded-full border border-gray-300 text-sm font-semibold text-[#202A36] hover:bg-gray-100 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  View Live Rates <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                </button>
              </div>
            </div>

            <div className="relative rounded-3xl overflow-hidden aspect-video md:aspect-square max-h-[500px] bg-gray-100 border border-gray-200 shadow-md group">
              {/* Immersive high resolution image info block overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#202A36]/60 via-transparent to-transparent z-10 flex items-end p-6">
                <div className="text-white space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#9ed3ff]">Ultra High Performance</span>
                  <p className="font-semibold text-lg">Elite Gulfstream G650 - Active Fleet</p>
                </div>
              </div>
              <img 
                src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&q=80&w=850" 
                alt="SkyElite Ultimate Private Jet Cruiser"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: CHARTER RATES AND MEMBERSHIP TIERS */}
        <section id="rates-section" className="scroll-mt-24 pt-12">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
              02 / CLEAR VALUE
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-[#202A36] tracking-tight">
              Simple, Uncompromising Pricing
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto font-light text-base md:text-lg">
              Select an option that aligns with your annual flight profile. No hidden capital costs, upfront purchase taxes, or long-term operational overhead.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch pt-4">
            {/* Tier Card 1 */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200/85 flex flex-col justify-between hover:border-[#202A36]/40 transition-all hover:shadow-xl duration-300">
              <div>
                <span className="text-[10px] font-bold text-gray-500 tracking-wider block uppercase mb-1">On-Demand Charter</span>
                <h3 className="text-2xl font-bold text-[#202A36] mb-4">SkyElite Solo</h3>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">$5,800</span>
                  <span className="text-gray-500 font-light text-sm"> / operational hour</span>
                </div>
                <div className="w-full h-px bg-gray-100 my-4" />
                <ul className="text-sm text-gray-600 space-y-3 font-light">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Guaranteed 48hr booking banner</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Complimentary culinary cold catering</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Standard pet and luggage allowance</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Global Ka-Band Wi-Fi included</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setBookingForm({ ...bookingForm, jetType: 'Light Cabin Jet' });
                  handleNavClick('booking-section');
                }}
                className="mt-8 w-full py-3.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-800 hover:bg-[#202A36] hover:text-white transition-all cursor-pointer"
              >
                Inquire Solo Jet
              </button>
            </div>

            {/* Tier Card 2 (Highlight Premium Selected) */}
            <div className="bg-white rounded-3xl p-8 border-2 border-[#202A36] flex flex-col justify-between shadow-xl relative transform scale-100 md:scale-[1.03] transition-all duration-300">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-[#202A36] text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                Most Pre-Approved
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 tracking-wider block uppercase mb-1">Corporate & High Flight</span>
                <h3 className="text-2xl font-bold text-[#202A36] mb-4">SkyElite Executive</h3>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">$8,500</span>
                  <span className="text-gray-500 font-light text-sm"> / operational hour</span>
                </div>
                <div className="w-full h-px bg-gray-100 my-4" />
                <ul className="text-sm text-gray-600 space-y-3 font-light">
                  <li className="flex items-center gap-2 font-medium text-gray-900"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Guaranteed 12hr booking speed</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> High-tier hot chef-curated dinner</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Dedicated terminal VIP suite</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Elite luxury airport transfer limousine</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Fully soundproof workspace cabin</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setBookingForm({ ...bookingForm, jetType: 'Midsize Cabin Jet' });
                  handleNavClick('booking-section');
                }}
                className="mt-8 w-full py-3.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#202A36] text-white hover:bg-[#1a2229] transition-all cursor-pointer shadow-md"
              >
                Activate Executive Access
              </button>
            </div>

            {/* Tier Card 3 */}
            <div className="bg-white rounded-3xl p-8 border border-gray-200/85 flex flex-col justify-between hover:border-[#202A36]/40 transition-all hover:shadow-xl duration-300">
              <div>
                <span className="text-[10px] font-bold text-gray-500 tracking-wider block uppercase mb-1">Intercontinental Flagship</span>
                <h3 className="text-2xl font-bold text-[#202A36] mb-4">SkyElite Sovereign</h3>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">$14,200</span>
                  <span className="text-gray-500 font-light text-sm"> / operational hour</span>
                </div>
                <div className="w-full h-px bg-gray-100 my-4" />
                <ul className="text-sm text-gray-600 space-y-3 font-light">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Guaranteed instant-launch standby jet</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Worldwide intercontinental distance</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Bespoke fully custom seating configuration</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /> Attendant butler cabin crew team</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  setBookingForm({ ...bookingForm, jetType: 'Large Heavy Jet' });
                  handleNavClick('booking-section');
                }}
                className="mt-8 w-full py-3.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gray-100 text-gray-800 hover:bg-[#202A36] hover:text-white transition-all cursor-pointer"
              >
                Inquire Sovereign Fleet
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 3: CURATED BENEFITS AND ONBOARD LUXURY */}
        <section id="benefits-section" className="scroll-mt-24 pt-12">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
              03 / VIP EXPERIENCE
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-[#202A36] tracking-tight">
              Curated High Performance Benefits
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto font-light text-base md:text-lg">
              The flight is simply the initiation. We harmonize and support your entire destination itinerary beautifully.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {[
              {
                icon: <Clock className="w-7 h-7 text-[#202A36]" />,
                title: "Time Recovery",
                desc: "Arrive at our private terminal just 15 minutes before the flight and walk straight onboard. Speed through borders with zero commercial friction."
              },
              {
                icon: <Shield className="w-7 h-7 text-[#202A36]" />,
                title: "Absolute Discretion",
                desc: "Conduct confidential negotiations, hold meetings, or meditate in entirely soundproof, heavily insulated passenger cabins built for your tranquility."
              },
              {
                icon: <Sparkles className="w-7 h-7 text-[#202A36]" />,
                title: "Five-Star Dining",
                desc: "Bespoke culinary menus created by elite regional master chefs. Fresh organic ingredients matching any medical diet or food choice."
              },
              {
                icon: <Users className="w-7 h-7 text-[#202A36]" />,
                title: "Guaranteed Fleet Backup",
                desc: "Never grounded due to technical hurdles or crew challenges. We hold replacement models fully prepped and on standby in our global base network."
              }
            ].map((benefit, idx) => (
              <div key={idx} className="flex gap-5 p-6 bg-white rounded-3xl hover:shadow-lg hover:border-gray-200 border border-transparent transition-all duration-300">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                  {benefit.icon}
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-xl text-gray-900">{benefit.title}</h3>
                  <p className="text-sm text-gray-600 font-light leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: DETAILED PRIVATE JET GALLERY DISCOVERY */}
        <section id="discover-section" className="scroll-mt-24 pt-12">
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
              04 / STEWARDSHIP
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-[#202A36] tracking-tight animate-pulse-slow">
              Step Inside The Sanctuary
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto font-light text-base">
              Explore our custom layout modifications and state-of-the-art onboard facilities designed to elevate performance and restore energy.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-3xl overflow-hidden border border-gray-100 bg-white shadow-md hover:shadow-xl transition-all duration-300">
              <div className="h-56 relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&q=80&w=600" 
                  alt="Executive suite chairs"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-6 space-y-2">
                <h3 className="font-bold text-lg text-[#202A36]">Executive Suite Chairs</h3>
                <p className="text-sm text-gray-600 font-light">Fine-stitched, full-grain aniline leather armchairs. Offers 180° complete lie-flat utility, designed for sound sleep in transoceanic routes.</p>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden border border-gray-100 bg-white shadow-md hover:shadow-xl transition-all duration-300">
              <div className="h-56 relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=600" 
                  alt="Avionics dashboard cockpit"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-6 space-y-2">
                <h3 className="font-bold text-lg text-[#202A36]">Precision Flight Deck</h3>
                <p className="text-sm text-gray-600 font-light">Piloted by two heavily certified captains in an advanced Honeywell Primus Epic 2.0 flight deck with HUD.</p>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden border border-gray-100 bg-white shadow-md hover:shadow-xl transition-all duration-300">
              <div className="h-56 relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&q=80&w=600" 
                  alt="High speed terminal connections"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-6 space-y-2">
                <h3 className="font-bold text-lg text-[#202A36]">Interactive Workplace</h3>
                <p className="text-sm text-gray-600 font-light">Equipped with lightning-fast satellite Wi-Fi streams, HDMI projector links, and direct video conferencing systems.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: FREQUENTLY ASKED QUESTIONS */}
        <section id="faq-section" className="scroll-mt-24 pt-12">
          <div className="text-center space-y-3 mb-12">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
              05 / INSIGHTS
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-[#202A36] tracking-tight text-center">
              Frequently Answered Queries
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto font-light text-base text-center">
              Clear, honest responses outlining baggage parameters, custom in-flight route flexibility, and onboarding pet guidelines.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              {
                q: "What is the luggage capacity on typical flights?",
                a: "Depending on the jet size, luggage capacity ranges from 8 large suitcases on our light cabin models to more than 20 on our large intercontinental jets. Our specialized dispatch handles all weight and balance routing perfectly."
              },
              {
                q: "Can I bring pets along in the cabin?",
                a: "Yes, indeed. SkyElite pets are highly respected guests. Your companions can relax side-by-side with you in the cabin on all routes, needing no cage confining as long as basic safety parameters are followed."
              },
              {
                q: "Am I allowed to alter destination coordinates mid-flight?",
                a: "Absolutely. Flight dynamic rerouting is one of our key benefits. If your business agenda requires a detour, our elite pilots coordinate updated airways directly and safely with ATC."
              },
              {
                q: "What catering options are available?",
                a: "You can fully custom-order from premium cold platters, champagne packages, or request meals from five-star municipal partner restaurants. All meals are warm, styled, and safely served by flight attendants."
              }
            ].map((faq, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold text-[#202A36] hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-start gap-3">
                    <span className="text-xs text-gray-400 font-mono mt-1">0{idx + 1}</span>
                    {faq.q}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {activeFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="p-6 pt-0 text-sm text-gray-600 font-light border-t border-gray-100 bg-gray-50/50 leading-relaxed pl-10">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 6: CONCIERGE FLIGHT BOOKING PLANNER */}
        <section id="booking-section" className="scroll-mt-24 pt-12">
          <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-gray-400 via-[#202A36] to-gray-400" />
            
            <div className="text-center space-y-3 mb-10">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                06 / CHARTER DESK
              </span>
              <h2 className="text-3xl font-extrabold text-[#202A36] tracking-tight">
                Begin Your Ascent
              </h2>
              <p className="text-gray-600 max-w-sm mx-auto font-light text-sm">
                Submit origin and landing airports below to immediately run automated flight path arrays.
              </p>
            </div>

            {bookingSubmitted ? (
              <div className="text-center py-8 px-6 bg-emerald-50/60 rounded-3xl border border-emerald-100">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 scale-105">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Flight Request Registered</h3>
                <p className="text-gray-600 font-light text-sm max-w-md mx-auto mb-6">
                  An elite SkyElite flight coordinator has received your journey blueprint. We will contact you at <span className="font-semibold text-[#202A36]">syedasim2021@gmail.com</span> within 15 minutes to organize precise ground support and layout details.
                </p>
                <button
                  onClick={handleResetBooking}
                  className="px-8 py-3 rounded-full bg-[#202A36] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1a2229] transition-all cursor-pointer"
                >
                  Create New Blueprint
                </button>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> Origin Airport
                    </label>
                    <input
                      type="text"
                      required
                      value={bookingForm.departure}
                      onChange={(e) => setBookingForm({ ...bookingForm, departure: e.target.value })}
                      placeholder="e.g., JFK, New York"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-255 rounded-2xl text-sm focus:outline-none focus:border-[#202A36] focus:bg-white focus:ring-1 focus:ring-[#202A36] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" /> Destination Airport
                    </label>
                    <input
                      type="text"
                      required
                      value={bookingForm.destination}
                      onChange={(e) => setBookingForm({ ...bookingForm, destination: e.target.value })}
                      placeholder="e.g., LHR, London"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-255 rounded-2xl text-sm focus:outline-none focus:border-[#202A36] focus:bg-white focus:ring-1 focus:ring-[#202A36] transition-all"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" /> Target Date
                    </label>
                    <input
                      type="date"
                      required
                      min="2026-05-23"
                      value={bookingForm.date}
                      onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-255 rounded-2xl text-sm focus:outline-none focus:border-[#202A36] focus:bg-white focus:ring-1 focus:ring-[#202A36] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" /> Passenger Size
                    </label>
                    <select
                      value={bookingForm.passengers}
                      onChange={(e) => setBookingForm({ ...bookingForm, passengers: e.target.value })}
                      className="w-full px-3 py-3 bg-gray-50 border border-gray-255 rounded-2xl text-sm focus:outline-none focus:border-[#202A36] focus:bg-white focus:ring-1 focus:ring-[#202A36] transition-all"
                    >
                      <option value="1-3">1 - 3 passengers</option>
                      <option value="4-8">4 - 8 passengers</option>
                      <option value="9-14">9 - 14 passengers</option>
                      <option value="15+">15+ passengers</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                      Preferred Cabin Class
                    </label>
                    <select
                      value={bookingForm.jetType}
                      onChange={(e) => setBookingForm({ ...bookingForm, jetType: e.target.value })}
                      className="w-full px-3 py-3 bg-gray-50 border border-gray-255 rounded-2xl text-sm focus:outline-none focus:border-[#202A36] focus:bg-white focus:ring-1 focus:ring-[#202A36] transition-all"
                    >
                      <option value="Light Cabin Jet">SkyElite Solo (Light Jet)</option>
                      <option value="Midsize Cabin Jet">SkyElite Executive (Midsize)</option>
                      <option value="Large Heavy Jet">SkyElite Sovereign (Heavy Jet)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-full text-white bg-[#202A36] font-bold text-xs uppercase tracking-widest hover:bg-[#141b23] hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ROUTING SKYWAYS AND PRE-APPROVALS...
                      </>
                    ) : (
                      <>
                        Calculate Flight Path Array
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

      </main>

      {/* Structured elegant Footer area */}
      <footer className="mt-28 border-t border-gray-200 pt-12 pb-6 text-center max-w-7xl mx-auto px-8">
        <h3 className="text-xl font-bold text-[#202A36] tracking-tight mb-2">SkyElite</h3>
        <p className="text-xs text-gray-500 font-light mb-8 max-w-md mx-auto">
          Providing high caliber aviation across key centers of wealth, business, and natural sanctuaries globally. 
        </p>
        <div className="h-px bg-gray-250 w-24 mx-auto mb-6" />
        <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">
          © 2026 SKYELITE AVIATION. ALL RIGHTS RESERVED. SECURED WITH MAXIMUM COMPLIANCE.
        </p>
      </footer>

    </div>
  );
}
