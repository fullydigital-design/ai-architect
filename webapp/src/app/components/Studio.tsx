import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Sparkles, 
  Settings, 
  Download,
  Save,
  RotateCcw,
  Wand2,
  Lightbulb,
  MessageSquare,
  Edit3,
  Video,
  X,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Menu,
  MoreVertical,
  Sliders,
  Grid3x3,
  Workflow,
  AlertCircle,
  ExternalLink,
  Check
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { useStudio } from '@/contexts/StudioContext';
import { Spinner } from '@/app/components/Spinner';
import { MaskEditor } from '@/app/components/studio/MaskEditor';
import { ChatMessage } from '@/app/components/ChatMessage';
import { GOAL_LABELS, TONE_LABELS, PLATFORM_LABELS, PLACEHOLDERS } from '@/utils/conceptTemplates';
import { VideoTabControls } from '@/app/components/VideoTabControls';

export function Studio({ onBackToHome, onNavigate }: { onBackToHome?: () => void; onNavigate?: (page: string) => void }) {
  const studio = useStudio();
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileGalleryOpen, setMobileGalleryOpen] = useState(false);
  const [bottomSheetState, setBottomSheetState] = useState<'peek' | 'half' | 'full'>('peek');
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'concept' | 'image' | 'video'>('all');
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Track screen width for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close one panel if screen too small for both
  useEffect(() => {
    if (screenWidth < 1400 && leftPanelOpen && rightPanelOpen) {
      setRightPanelOpen(false); // Prioritize controls (left panel)
    }
  }, [screenWidth, leftPanelOpen, rightPanelOpen]);

  // Auto-open right panel for IMAGE and VIDEO modes (they have settings)
  useEffect(() => {
    if (studio.modelMode === 'image' || studio.modelMode === 'video') {
      setRightPanelOpen(true);
    } else {
      setRightPanelOpen(false);
    }
  }, [studio.modelMode]);

  // Pre-fill demo API key on mount (no modal needed)
  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key');
    if (!key) {
      // Auto-set demo key if none exists
      const demoKey = 'DEMO_KEY_gemini_xxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      localStorage.setItem('gemini_api_key', demoKey);
      window.dispatchEvent(new Event('storage'));
    }
  }, []);

  const modes = [
    { id: 'concept', label: 'CONCEPT', icon: Lightbulb, gradient: 'from-purple-500 to-indigo-500' },
    { id: 'image', label: 'IMAGE', icon: ImageIcon, gradient: 'from-blue-500 to-cyan-500' },
    { id: 'video', label: 'VIDEO', icon: Video, gradient: 'from-red-500 to-pink-500' },
  ];

  const currentMode = modes.find(m => m.id === studio.modelMode) || modes[0];
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1400;
  const isDesktop = screenWidth >= 1400;

  // Bottom sheet drag handlers
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    const height = bottomSheetRef.current?.offsetHeight || 0;
    dragStartHeight.current = height;
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (dragStartY.current === 0) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const diff = dragStartY.current - clientY;
    const newHeight = dragStartHeight.current + diff;
    const windowHeight = window.innerHeight;

    // Snap to states based on height
    if (newHeight < windowHeight * 0.25) {
      setBottomSheetState('peek');
    } else if (newHeight < windowHeight * 0.65) {
      setBottomSheetState('half');
    } else {
      setBottomSheetState('full');
    }
  };

  const handleDragEnd = () => {
    dragStartY.current = 0;
    dragStartHeight.current = 0;
  };

  const getBottomSheetHeight = () => {
    if (bottomSheetState === 'peek') return 'h-32';
    if (bottomSheetState === 'half') return 'h-[50vh]';
    return 'h-[85vh]';
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 flex flex-col overflow-hidden">
      {/* Responsive Top Bar */}
      <header className="flex-none bg-white/80 backdrop-blur-xl border-b border-gray-200 z-50">
        <div className="px-4 lg:px-6 py-3 grid grid-cols-3 items-center">
          {/* Logo */}
          <div 
            onClick={onBackToHome}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <span className="text-white font-bold text-sm">WB</span>
            </div>
            <span className="text-gray-900 font-bold text-base lg:text-lg tracking-tight hidden sm:inline">
              fullydigital.pictures
            </span>
          </div>

          {/* Desktop/Tablet: Mode Pills - Center */}
          {!isMobile && (
            <div className="flex items-center justify-center gap-1.5 lg:gap-2">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isActive = studio.modelMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => studio.setModelMode(mode.id as any)}
                    disabled={studio.isLoading}
                    className={`px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-full font-medium text-xs lg:text-sm uppercase tracking-wide transition-all disabled:opacity-50 ${
                      isActive
                        ? `bg-gradient-to-r ${mode.gradient} text-white shadow-lg`
                        : 'bg-white text-content-faint hover:text-gray-900 border-2 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-3 h-3 lg:w-4 lg:h-4 inline mr-1" />
                    <span className="hidden md:inline">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Mobile: Current Mode + Menu */}
          {isMobile && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-5 h-5 text-content-faint" />
              </button>
              <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${currentMode.gradient} text-white text-xs font-bold uppercase flex items-center gap-1.5`}>
                {React.createElement(currentMode.icon, { className: "w-3 h-3" })}
                {currentMode.label}
              </div>
            </div>
          )}

          {/* Right Actions - Right Aligned */}
          <div className="flex items-center justify-end gap-1.5 lg:gap-2">
            {!isMobile && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate?.('workflow-selection')}
                  className="border-cyan-300 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-400 text-xs lg:text-sm font-bold"
                >
                  <Workflow className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1.5" />
                  <span className="hidden lg:inline">Workflows</span>
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={studio.handleSaveImage}
              disabled={!studio.currentScene || studio.isLoading}
              className="border-gray-300 text-content-faint hover:bg-gray-50 disabled:opacity-30 text-xs lg:text-sm"
            >
              <Download className="w-3 h-3 lg:w-4 lg:h-4 lg:mr-1.5" />
              <span className="hidden lg:inline">Export</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && isMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-2xl z-50 flex flex-col"
            >
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold">WB</span>
                  </div>
                  <span className="text-gray-900 font-bold text-lg">fullydigital.pictures</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 mobile-menu-scroll">
                <div className="space-y-1">
                  {modes.map((mode) => {
                    const Icon = mode.icon;
                    const isActive = studio.modelMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => {
                          studio.setModelMode(mode.id as any);
                          setMobileMenuOpen(false);
                        }}
                        disabled={studio.isLoading}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                          isActive
                            ? `bg-gradient-to-r ${mode.gradient} text-white shadow-lg`
                            : 'text-content-faint hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 space-y-2">
                {studio.sceneHistory.length > 0 && (
                  <button
                    onClick={() => {
                      setMobileGalleryOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-content-faint hover:bg-gray-100 font-medium text-sm"
                  >
                    <Grid3x3 className="w-5 h-5" />
                    Gallery ({studio.sceneHistory.length})
                  </button>
                )}
                <button
                  onClick={() => {
                    onNavigate?.('workflow-selection');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 hover:from-cyan-100 hover:to-blue-100 font-bold text-sm border-2 border-cyan-200"
                >
                  <Workflow className="w-5 h-5" />
                  Switch Workflow
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Desktop/Tablet: Left Floating Panel */}
        {!isMobile && (
          <AnimatePresence>
            {leftPanelOpen && (
              <FloatingPanel
                side="left"
                onClose={() => setLeftPanelOpen(false)}
                gradient={currentMode.gradient}
                isTablet={isTablet}
              >
                <LeftPanelContent studio={studio} currentMode={currentMode} />
              </FloatingPanel>
            )}
          </AnimatePresence>
        )}

        {/* Desktop/Tablet: Right Floating Panel */}
        {!isMobile && (
          <AnimatePresence>
            {rightPanelOpen && (
              <FloatingPanel
                side="right"
                onClose={() => setRightPanelOpen(false)}
                gradient={currentMode.gradient}
                isTablet={isTablet}
              >
                <RightPanelContent studio={studio} currentMode={currentMode} />
              </FloatingPanel>
            )}
          </AnimatePresence>
        )}

        {/* Canvas Preview Area */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center p-4 lg:p-6 transition-all"
          style={{
            paddingLeft: !isMobile && leftPanelOpen ? (isTablet ? '340px' : '420px') : undefined,
            paddingRight: !isMobile && rightPanelOpen ? (isTablet ? '320px' : '340px') : undefined,
            paddingBottom: isMobile ? '140px' : undefined,
          }}
        >
          {/* Canvas Controls (Floating) */}
          {studio.currentScene && !isMobile && (
            <div className="absolute top-4 lg:top-6 right-4 lg:right-6 flex items-center gap-2 bg-white/90 backdrop-blur-xl rounded-full px-3 py-2 shadow-lg border border-gray-200">
              <button
                onClick={() => setCanvasZoom(Math.max(25, canvasZoom - 25))}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ZoomOut className="w-4 h-4 text-content-faint" />
              </button>
              <span className="text-sm font-medium text-content-faint min-w-[3rem] text-center">
                {canvasZoom}%
              </span>
              <button
                onClick={() => setCanvasZoom(Math.min(200, canvasZoom + 25))}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ZoomIn className="w-4 h-4 text-content-faint" />
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button
                onClick={() => setCanvasZoom(100)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-content-faint" />
              </button>
            </div>
          )}

          {/* Toggle Panel Buttons (Desktop/Tablet) */}
          {!isMobile && !leftPanelOpen && (
            <button
              onClick={() => setLeftPanelOpen(true)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-xl rounded-full p-2 shadow-lg border border-gray-200 hover:bg-white transition-all z-30"
            >
              <ChevronRight className="w-5 h-5 text-content-faint" />
            </button>
          )}
          {!isMobile && !rightPanelOpen && isDesktop && (
            <button
              onClick={() => setRightPanelOpen(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-xl rounded-full p-2 shadow-lg border border-gray-200 hover:bg-white transition-all z-30"
            >
              <ChevronLeft className="w-5 h-5 text-content-faint" />
            </button>
          )}

          {/* Tablet: FAB for Settings (when left panel is open) */}
          {isTablet && leftPanelOpen && !rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              className="fixed right-6 bottom-6 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-full p-4 shadow-2xl hover:shadow-blue-500/50 transition-all z-30"
            >
              <Sliders className="w-6 h-6" />
            </button>
          )}

          {/* Main Preview */}
          <div 
            className="w-full h-full flex items-center justify-center transition-transform"
            style={{ transform: `scale(${canvasZoom / 100})` }}
          >
            <PreviewDisplay 
              scene={studio.currentScene} 
              isLoading={studio.isLoading} 
              modelMode={studio.modelMode}
              error={studio.error}
              isMobile={isMobile}
            />
          </div>
        </div>

        {/* Desktop: Right Gallery Panel (shows in all modes) */}
        {isDesktop && studio.sceneHistory.length > 0 && (
          <AnimatePresence>
            <FloatingPanel
              side="right"
              onClose={() => {}}
              gradient={currentMode.gradient}
              isGallery={true}
            >
              <GalleryContent 
                sceneHistory={studio.sceneHistory}
                currentScene={studio.currentScene}
                galleryFilter={galleryFilter}
                setGalleryFilter={setGalleryFilter}
                onSelectScene={studio.handleSelectSceneFromHistory}
              />
            </FloatingPanel>
          </AnimatePresence>
        )}

        {/* Tablet: Bottom Thumbnail Strip */}
        {isTablet && studio.sceneHistory.length > 0 && studio.modelMode !== 'text' && studio.modelMode !== 'concept' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-4xl w-full px-6">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-gray-200">
              <div className="flex items-center gap-3 overflow-x-auto pb-2 thumbnail-scroll">
                {studio.sceneHistory.slice(0, 8).map((scene, idx) => (
                  <button
                    key={scene.id}
                    onClick={() => studio.handleSelectSceneFromHistory(scene)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                      studio.currentScene?.id === scene.id
                        ? 'ring-4 ring-blue-500 shadow-lg scale-105'
                        : 'ring-2 ring-gray-200 hover:ring-gray-300 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {scene.type === 'image' && scene.imageUrl && (
                      <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    {scene.type === 'video' && (
                      <div className="w-full h-full bg-gradient-to-br from-red-100 to-pink-100 flex items-center justify-center">
                        <Video className="w-8 h-8 text-red-500" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile: Bottom Sheet */}
        {isMobile && (
          <motion.div
            ref={bottomSheetRef}
            initial={false}
            animate={{ height: bottomSheetState === 'peek' ? '8rem' : bottomSheetState === 'half' ? '50vh' : '85vh' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl rounded-t-3xl shadow-2xl border-t-2 border-gray-200 z-40 flex flex-col"
          >
            {/* Drag Handle */}
            <div
              className="flex-none pt-3 pb-2 flex items-center justify-center cursor-grab active:cursor-grabbing"
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Bottom Sheet Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6 bottom-sheet-scroll">
              {bottomSheetState === 'peek' ? (
                <MobileBottomSheetPeek
                  studio={studio}
                  currentMode={currentMode}
                  onExpand={() => setBottomSheetState('full')}
                />
              ) : (
                <div className="space-y-4 pt-2">
                  {/* Collapse Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-gray-900 font-bold text-sm uppercase tracking-wider">Controls</h3>
                    <button
                      onClick={() => setBottomSheetState('peek')}
                      className="text-xs text-content-faint hover:text-gray-900 font-medium transition-colors"
                    >
                      Collapse ↓
                    </button>
                  </div>

                  <LeftPanelContent studio={studio} currentMode={currentMode} isMobile={true} />
                  {(studio.modelMode === 'image' || studio.modelMode === 'video') && (
                    <div className="pt-4 border-t-2 border-gray-200">
                      <h3 className="text-gray-900 font-bold text-sm uppercase tracking-wider mb-3">Settings</h3>
                      <RightPanelContent studio={studio} currentMode={currentMode} isMobile={true} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Mobile Gallery Modal */}
      <AnimatePresence>
        {mobileGalleryOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setMobileGalleryOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Gallery</h3>
                <button
                  onClick={() => setMobileGalleryOpen(false)}
                  className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
                >
                  <X className="w-5 h-5 text-content-faint" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <GalleryContent 
                  sceneHistory={studio.sceneHistory}
                  currentScene={studio.currentScene}
                  galleryFilter={galleryFilter}
                  setGalleryFilter={setGalleryFilter}
                  onSelectScene={(scene) => {
                    studio.handleSelectSceneFromHistory(scene);
                    setMobileGalleryOpen(false);
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mobile Bottom Sheet Peek View
function MobileBottomSheetPeek({ studio, currentMode, onExpand }: any) {
  const canGenerate = studio.modelMode === 'text' 
    ? !!studio.characterImage 
    : studio.modelMode === 'image' && studio.imageSubMode === 'edit'
    ? !!(studio.characterImage && studio.maskImage && studio.prompt.trim())
    : !!studio.prompt.trim();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-gray-900 font-bold text-sm uppercase tracking-wider">Quick Actions</h3>
        <button
          onClick={onExpand}
          className="text-xs text-content-faint hover:text-gray-900 font-medium"
        >
          Expand ↑
        </button>
      </div>
      <div className="flex gap-2">
        <Button 
          onClick={studio.handleGenerateScene}
          disabled={!canGenerate || studio.isLoading}
          className={`flex-1 bg-gradient-to-r ${currentMode.gradient} text-white border-0 py-6 shadow-lg disabled:opacity-50`}
        >
          {studio.isLoading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              PROCESSING...
            </>
          ) : (
            <>
              {React.createElement(currentMode.icon, { className: "w-5 h-5 mr-2" })}
              GENERATE
            </>
          )}
        </Button>
        <Button
          onClick={onExpand}
          variant="outline"
          className="px-6 border-gray-300 text-content-faint hover:bg-gray-50"
        >
          <Sliders className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

// Floating Panel Component
function FloatingPanel({ 
  children, 
  side, 
  onClose,
  gradient,
  isTablet,
  isGallery = false
}: { 
  children: React.ReactNode; 
  side: 'left' | 'right';
  onClose: () => void;
  gradient: string;
  isTablet?: boolean;
  isGallery?: boolean;
}) {
  const width = isTablet ? (side === 'left' ? 'w-80' : 'w-72') : (side === 'left' ? 'w-96' : 'w-80');

  return (
    <motion.div
      initial={{ x: side === 'left' ? -400 : 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: side === 'left' ? -400 : 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`absolute ${side === 'left' ? 'left-4 lg:left-6' : 'right-4 lg:right-6'} top-4 lg:top-6 bottom-4 lg:bottom-6 ${width} bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-gray-200 flex flex-col z-40`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 lg:px-5 py-3 lg:py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 lg:w-5 h-4 lg:h-5 text-content-secondary" />
          <h3 className="font-bold text-gray-900 uppercase text-xs lg:text-sm tracking-wider">
            {isGallery ? 'Gallery' : side === 'left' ? 'Controls' : 'Settings'}
          </h3>
        </div>
        {!isGallery && (
          <button
            onClick={onClose}
            className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4 text-content-faint" />
          </button>
        )}
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-3 lg:space-y-4 panel-scroll">
        {children}
      </div>
    </motion.div>
  );
}

// Left Panel Content (Mode-specific controls)
function LeftPanelContent({ studio, currentMode, isMobile = false }: any) {
  const gradient = currentMode.gradient;

  if (studio.modelMode === 'concept') {
    return (
      <>
        {/* Model Selection */}
        <PanelCard title="Model" isMobile={isMobile}>
          <select
            value={studio.conceptModel}
            onChange={(e) => studio.setConceptModel(e.target.value as any)}
            disabled={studio.isLoading}
            className="w-full py-2.5 px-3 rounded-xl bg-white text-gray-900 border-2 border-gray-200 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50 text-sm font-medium"
          >
            <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</option>
            <option value="gemini-3-pro-preview">Gemini 3 Pro (Best)</option>
          </select>
        </PanelCard>

        {/* Goal Selection */}
        <PanelCard title="Goal" isMobile={isMobile}>
          <select
            value={studio.conceptGoal}
            onChange={(e) => studio.setConceptGoal(e.target.value as any)}
            disabled={studio.isLoading}
            className="w-full py-2.5 px-3 rounded-xl bg-white text-gray-900 border-2 border-gray-200 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50 text-sm font-medium"
          >
            {Object.entries(GOAL_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </PanelCard>

        {/* Tone Selection */}
        <PanelCard title="Tone" isMobile={isMobile}>
          <select
            value={studio.conceptTone}
            onChange={(e) => studio.setConceptTone(e.target.value as any)}
            disabled={studio.isLoading}
            className="w-full py-2.5 px-3 rounded-xl bg-white text-gray-900 border-2 border-gray-200 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50 text-sm font-medium"
          >
            {Object.entries(TONE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </PanelCard>

        {/* Platform + Language (compact 2-column) */}
        <div className="grid grid-cols-2 gap-2">
          <PanelCard title="Platform" isMobile={isMobile}>
            <select
              value={studio.conceptPlatform}
              onChange={(e) => studio.setConceptPlatform(e.target.value as any)}
              disabled={studio.isLoading}
              className="w-full py-2.5 px-3 rounded-xl bg-white text-gray-900 border-2 border-gray-200 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50 text-xs font-medium"
            >
              {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </PanelCard>

          <PanelCard title="Language" isMobile={isMobile}>
            <select
              value={studio.conceptLanguage}
              onChange={(e) => studio.setConceptLanguage(e.target.value as any)}
              disabled={studio.isLoading}
              className="w-full py-2.5 px-3 rounded-xl bg-white text-gray-900 border-2 border-gray-200 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50 text-xs font-medium"
            >
              <option value="English">English</option>
              <option value="German">German</option>
              <option value="Russian">Russian</option>
            </select>
          </PanelCard>
        </div>

        <PanelCard title="Input Image (Optional)" isMobile={isMobile}>
          <UploadZone 
            text="Attach Image" 
            subtext="Optional Reference" 
            onFileSelect={studio.handleCharacterImageChange}
            currentImage={studio.characterImage?.dataUrl}
            onRemove={studio.handleRemoveCharacterImage}
            disabled={studio.isLoading}
          />
        </PanelCard>

        {/* Web Search Toggle */}
        <PanelCard title="Web Search" isMobile={isMobile}>
          <div className="flex items-center justify-between">
            <label 
              htmlFor="concept-web-search-toggle" 
              className="text-sm font-medium text-content-faint"
            >
              Use real-time grounding
            </label>
            <button
              id="concept-web-search-toggle"
              onClick={() => studio.setConceptWebSearchEnabled(!studio.conceptWebSearchEnabled)}
              disabled={studio.isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                studio.conceptWebSearchEnabled 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600' 
                  : 'bg-gray-300'
              } ${studio.isLoading ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  studio.conceptWebSearchEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-xs text-content-muted mt-2">
            May use external sources to improve accuracy.
          </p>
        </PanelCard>

        <PanelCard title="Concept Prompt" isMobile={isMobile}>
          <textarea
            value={studio.prompt}
            onChange={(e) => studio.setPrompt(e.target.value)}
            placeholder={PLACEHOLDERS[studio.conceptGoal] || "Describe your product, audience, and goal..."}
            disabled={studio.isLoading}
            className="w-full h-32 lg:h-40 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50 text-sm"
          />
        </PanelCard>

        <Button 
          onClick={studio.handleGenerateScene}
          disabled={(!studio.prompt.trim() && !studio.characterImage) || studio.isLoading}
          className={`w-full bg-gradient-to-r ${gradient} text-white border-0 py-5 lg:py-6 shadow-lg hover:shadow-xl transition-all disabled:opacity-50`}
        >
          {studio.isLoading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              THINKING...
            </>
          ) : (
            <>
              <MessageSquare className="w-5 h-5 mr-2" />
              Generate
            </>
          )}
        </Button>

        <div className="flex gap-2">
          <Button 
            onClick={studio.handleSaveImage}
            disabled={!studio.currentScene || studio.isLoading}
            variant="outline" 
            className="flex-1 border-gray-300 text-content-faint hover:bg-gray-50 disabled:opacity-30 text-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button 
            onClick={studio.handleStartOver}
            disabled={studio.isLoading}
            variant="outline" 
            className="flex-1 border-gray-300 text-content-faint hover:bg-gray-50 disabled:opacity-30 text-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </>
    );
  }

  if (studio.modelMode === 'image') {
    return (
      <>
        {/* Model Selection */}
        <PanelCard title="Model" isMobile={isMobile}>
          <select
            value={studio.selectedModel}
            onChange={(e) => studio.setSelectedModel(e.target.value as any)}
            disabled={studio.isLoading}
            className="w-full py-2.5 px-3 rounded-xl bg-white text-gray-900 border-2 border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 text-sm font-medium"
          >
            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fast)</option>
            <option value="gemini-3-pro-image-preview">Gemini 3 Pro (High Quality)</option>
          </select>
        </PanelCard>

        {/* Sub-mode Toggle */}
        <PanelCard title="Mode" isMobile={isMobile}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => studio.setImageSubMode('generate')}
              disabled={studio.isLoading}
              className={`py-2.5 lg:py-3 rounded-lg font-medium transition-all text-xs lg:text-sm ${
                studio.imageSubMode === 'generate'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg'
                  : 'bg-white text-content-faint hover:bg-gray-50 border-2 border-gray-200'
              } disabled:opacity-50`}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Generate
            </button>
            <button
              onClick={() => studio.setImageSubMode('edit')}
              disabled={studio.isLoading}
              className={`py-2.5 lg:py-3 rounded-lg font-medium transition-all text-xs lg:text-sm ${
                studio.imageSubMode === 'edit'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                  : 'bg-white text-content-faint hover:bg-gray-50 border-2 border-gray-200'
              } disabled:opacity-50`}
            >
              <Edit3 className="w-4 h-4 inline mr-2" />
              Edit
            </button>
          </div>
        </PanelCard>

        {studio.imageSubMode === 'generate' ? (
          <>
            <PanelCard title="Subject Image (Optional)" isMobile={isMobile}>
              <UploadZone 
                text="Upload Subject" 
                subtext="Optional Reference" 
                onFileSelect={studio.handleCharacterImageChange}
                currentImage={studio.characterImage?.dataUrl}
                onRemove={studio.handleRemoveCharacterImage}
                disabled={studio.isLoading}
              />
            </PanelCard>

            <PanelCard title="Style Images (Up to 14)" isMobile={isMobile}>
              {studio.styleImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {studio.styleImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group">
                      <img src={img.dataUrl} alt={`Style ${idx}`} className="w-full h-full object-cover" />
                      <button 
                        onClick={() => studio.handleRemoveStyleImage(idx)}
                        disabled={studio.isLoading}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {studio.styleImages.length < 14 && (
                <>
                  <UploadZone 
                    text={studio.styleImages.length === 0 ? "Add Style" : "Add Another"}
                    subtext={`${studio.styleImages.length} / 14`}
                    onFileSelect={studio.handleStyleImageUpload}
                    disabled={studio.isLoading}
                    compact={studio.styleImages.length > 0}
                  />
                  <p className="text-xs text-content-muted mt-2">
                    📸 Up to 6 objects / 5 people recommended
                  </p>
                </>
              )}
            </PanelCard>

            <PanelCard title="Scene Description" isMobile={isMobile}>
              <textarea
                value={studio.prompt}
                onChange={(e) => studio.setPrompt(e.target.value)}
                placeholder="e.g., 'A futuristic cityscape at sunset...'"
                disabled={studio.isLoading}
                className="w-full h-28 lg:h-32 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 text-sm"
              />
            </PanelCard>

            <PanelCard title="Resolution" isMobile={isMobile}>
              <div className="grid grid-cols-3 gap-2">
                {['1K', '2K', '4K'].map((res) => {
                  const isFastModel = studio.selectedModel === 'gemini-2.5-flash-image';
                  const isDisabled = studio.isLoading || (isFastModel && res !== '1K');
                  return (
                    <button
                      key={res}
                      onClick={() => studio.setImageResolution(res as any)}
                      disabled={isDisabled}
                      title={isFastModel && res !== '1K' ? 'Fast model limited to 1K' : ''}
                      className={`py-2.5 rounded-xl font-bold transition-all text-sm ${
                        studio.imageResolution === res
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg'
                          : 'bg-white text-content-faint hover:bg-gray-50 border-2 border-gray-200'
                      } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      {res}
                    </button>
                  );
                })}
              </div>
            </PanelCard>

            <PanelCard title="Aspect Ratio" isMobile={isMobile}>
              <select
                value={studio.aspectRatio}
                onChange={(e) => studio.setAspectRatio(e.target.value)}
                disabled={studio.isLoading}
                className="w-full py-2.5 px-3 rounded-xl bg-white text-gray-900 border-2 border-gray-200 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50 text-sm font-medium"
              >
                {['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </PanelCard>

            {/* Web Search Toggle */}
            <PanelCard title="Web Search" isMobile={isMobile}>
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="web-search-toggle" 
                  className={`text-sm font-medium ${
                    studio.selectedModel === 'gemini-2.5-flash-image' 
                      ? 'text-content-secondary' 
                      : 'text-content-faint'
                  }`}
                >
                  Use real-time grounding
                </label>
                <button
                  id="web-search-toggle"
                  onClick={() => {
                    if (studio.selectedModel === 'gemini-3-pro-image-preview') {
                      studio.setWebSearchEnabled(!studio.webSearchEnabled);
                    }
                  }}
                  disabled={studio.isLoading || studio.selectedModel === 'gemini-2.5-flash-image'}
                  title={studio.selectedModel === 'gemini-2.5-flash-image' ? 'Available in Pro model' : ''}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    studio.webSearchEnabled 
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-600' 
                      : 'bg-gray-300'
                  } ${
                    studio.selectedModel === 'gemini-2.5-flash-image' 
                      ? 'opacity-30 cursor-not-allowed' 
                      : 'cursor-pointer'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      studio.webSearchEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {studio.selectedModel === 'gemini-2.5-flash-image' && (
                <p className="text-xs text-content-secondary mt-2">
                  ⓘ Available in Pro model
                </p>
              )}
            </PanelCard>

            <Button 
              onClick={studio.handleGenerateScene}
              disabled={!studio.prompt.trim() || studio.isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white border-0 py-5 lg:py-6 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {studio.isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  GENERATING...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  GENERATE IMAGE
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <PanelCard title="Image to Edit" isMobile={isMobile}>
              {studio.characterImage ? (
                <>
                  <MaskEditor
                    imageUrl={studio.characterImage.dataUrl}
                    onMaskChange={(base64, mimeType) => {
                      if (base64) {
                        studio.setMaskImage({
                          base64,
                          dataUrl: `data:${mimeType};base64,${base64}`,
                          mimeType
                        });
                      } else {
                        studio.setMaskImage(null);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={studio.handleRemoveCharacterImage}
                    variant="outline"
                    className="w-full mt-3 border-gray-300 text-content-faint hover:text-red-600 hover:bg-red-50 text-xs"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove Image
                  </Button>
                </>
              ) : (
                <UploadZone 
                  text="Upload Image" 
                  subtext="Image to Modify" 
                  onFileSelect={studio.handleCharacterImageChange}
                  currentImage={studio.characterImage?.dataUrl}
                  onRemove={studio.handleRemoveCharacterImage}
                  disabled={studio.isLoading}
                />
              )}
            </PanelCard>

            <PanelCard title="Edit Instructions" isMobile={isMobile}>
              <textarea
                value={studio.prompt}
                onChange={(e) => studio.setPrompt(e.target.value)}
                placeholder="e.g., 'Change the red car to blue'"
                disabled={studio.isLoading}
                className="w-full h-28 lg:h-32 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all disabled:opacity-50 text-sm"
              />
            </PanelCard>

            <Button 
              onClick={studio.handleGenerateScene}
              disabled={!studio.characterImage || !studio.maskImage || !studio.prompt.trim() || studio.isLoading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white border-0 py-5 lg:py-6 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {studio.isLoading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  EDITING...
                </>
              ) : (
                <>
                  <Edit3 className="w-5 h-5 mr-2" />
                  RUN EDIT
                </>
              )}
            </Button>
          </>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={studio.handleSaveImage}
            disabled={!studio.currentScene || studio.isLoading}
            variant="outline" 
            className="flex-1 border-gray-300 text-content-faint hover:bg-gray-50 disabled:opacity-30 text-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button 
            onClick={studio.handleStartOver}
            disabled={studio.isLoading}
            variant="outline" 
            className="flex-1 border-gray-300 text-content-faint hover:bg-gray-50 disabled:opacity-30 text-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </>
    );
  }

  if (studio.modelMode === 'video') {
    return <VideoTabControls studio={studio} gradient={gradient} isMobile={isMobile} />;
  }

  // Fallback for old VIDEO UI (delete this later)
  if (false && studio.modelMode === 'video') {
    return (
      <>
        <PanelCard title="Input Image (Optional)" isMobile={isMobile}>
          <UploadZone 
            text="Upload Image" 
            subtext="Optional Starting Frame" 
            onFileSelect={studio.handleCharacterImageChange}
            currentImage={studio.characterImage?.dataUrl}
            onRemove={studio.handleRemoveCharacterImage}
            disabled={studio.isLoading}
          />
        </PanelCard>

        <PanelCard title="Describe the Video" isMobile={isMobile}>
          <textarea
            value={studio.prompt}
            onChange={(e) => studio.setPrompt(e.target.value)}
            placeholder="e.g., 'A cinematic shot of the car driving through rain...'"
            disabled={studio.isLoading}
            className="w-full h-28 lg:h-32 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-50 text-sm"
          />
        </PanelCard>

        <PanelCard title="Resolution" isMobile={isMobile}>
          <div className="grid grid-cols-2 gap-2">
            {['720p', '1080p'].map((res) => (
              <button
                key={res}
                onClick={() => studio.setImageResolution(res as any)}
                disabled={studio.isLoading}
                className={`py-2.5 rounded-xl font-bold transition-all text-sm ${
                  studio.imageResolution === res
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                    : 'bg-white text-content-faint hover:bg-gray-50 border-2 border-gray-200'
                } disabled:opacity-50`}
              >
                {res}
              </button>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="Ratio" isMobile={isMobile}>
          <select
            value={studio.aspectRatio}
            onChange={(e) => studio.setAspectRatio(e.target.value)}
            disabled={studio.isLoading}
            className="w-full py-2.5 px-3 rounded-xl bg-white text-gray-900 border-2 border-gray-200 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all disabled:opacity-50 text-sm font-medium"
          >
            {['16:9', '9:16'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </PanelCard>

        <Button 
          onClick={studio.handleGenerateScene}
          disabled={!studio.prompt.trim() || studio.isLoading}
          className={`w-full bg-gradient-to-r ${gradient} text-white border-0 py-5 lg:py-6 shadow-lg hover:shadow-xl transition-all disabled:opacity-50`}
        >
          {studio.isLoading ? (
            <>
              <Spinner size="sm" className="mr-2" />
              GENERATING VIDEO...
            </>
          ) : (
            <>
              <Video className="w-5 h-5 mr-2" />
              GENERATE VIDEO
            </>
          )}
        </Button>

        <div className="flex gap-2">
          <Button 
            onClick={studio.handleSaveImage}
            disabled={!studio.currentScene || studio.isLoading}
            variant="outline" 
            className="flex-1 border-gray-300 text-content-faint hover:bg-gray-50 disabled:opacity-30 text-sm"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button 
            onClick={studio.handleStartOver}
            disabled={studio.isLoading}
            variant="outline" 
            className="flex-1 border-gray-300 text-content-faint hover:bg-gray-50 disabled:opacity-30 text-sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        <div className="p-3 lg:p-4 rounded-xl bg-yellow-50 border-2 border-yellow-200">
          <p className="text-yellow-800 text-xs font-medium">
            ⚠️ Video generation requires a paid API key and may take several minutes
          </p>
        </div>
      </>
    );
  }

  return null;
}

// Right Panel Content (Gallery)
function RightPanelContent({ studio, currentMode, isMobile = false }: any) {
  const [galleryFilter, setGalleryFilter] = React.useState<'all' | 'concept' | 'image' | 'video'>('all');
  
  return (
    <GalleryContent 
      sceneHistory={studio.sceneHistory}
      currentScene={studio.currentScene}
      galleryFilter={galleryFilter}
      setGalleryFilter={setGalleryFilter}
      onSelectScene={studio.handleSelectSceneFromHistory}
    />
  );
}

// Gallery Content Component with Filters and Grouping  
function GalleryContent({ 
  sceneHistory, 
  currentScene, 
  galleryFilter, 
  setGalleryFilter,
  onSelectScene 
}: {
  sceneHistory: any[];
  currentScene: any;
  galleryFilter: 'all' | 'concept' | 'image' | 'video';
  setGalleryFilter: (filter: 'all' | 'concept' | 'image' | 'video') => void;
  onSelectScene: (scene: any) => void;
}) {
  // Group scenes by type
  const groupedScenes = {
    concept: sceneHistory.filter(s => s.type === 'concept'),
    image: sceneHistory.filter(s => s.type === 'image'),
    video: sceneHistory.filter(s => s.type === 'video'),
  };

  // Filter buttons config
  const filters = [
    { id: 'all' as const, label: 'All', count: sceneHistory.length },
    { id: 'concept' as const, label: 'Concept', icon: Lightbulb, count: groupedScenes.concept.length },
    { id: 'image' as const, label: 'Image', icon: ImageIcon, count: groupedScenes.image.length },
    { id: 'video' as const, label: 'Video', icon: Video, count: groupedScenes.video.length },
  ];

  // Render thumbnail
  const renderThumbnail = (scene: any) => {
    const isActive = currentScene?.id === scene.id;
    
    return (
      <button
        key={scene.id}
        onClick={() => onSelectScene(scene)}
        className={`group relative aspect-square rounded-lg overflow-hidden transition-all hover:shadow-xl hover:-translate-y-0.5 ${
          isActive
            ? 'ring-4 ring-blue-500 shadow-lg scale-105'
            : 'ring-2 ring-gray-200 hover:ring-gray-300 opacity-80 hover:opacity-100'
        }`}
      >
        {scene.type === 'image' && scene.imageUrl && (
          <>
            <img src={scene.imageUrl} alt="Generated" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-blue-500/60 to-transparent" />
            <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
              <ImageIcon className="w-4 h-4 text-white" />
            </div>
          </>
        )}

        {scene.type === 'text' && (
          <>
            {scene.imageUrl ? (
              <>
                <img src={scene.imageUrl} alt="Analyzed" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-pink-500/60 to-transparent" />
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center shadow-lg">
                  <Wand2 className="w-4 h-4 text-white" />
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                <Wand2 className="w-8 h-8 text-pink-500" />
              </div>
            )}
            {scene.analysis?.description && (
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                <p className="text-white text-xs leading-tight line-clamp-4 text-center">
                  {scene.analysis.description.slice(0, 100)}...
                </p>
              </div>
            )}
          </>
        )}

        {scene.type === 'concept' && (
          <>
            {scene.chatHistory && scene.chatHistory.find((msg: any) => msg.imageUrl) ? (
              <>
                <img 
                  src={scene.chatHistory.find((msg: any) => msg.imageUrl)?.imageUrl} 
                  alt="Chat" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-purple-500/60 to-transparent" />
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-purple-500 text-white text-xs font-bold shadow-lg">
                  {scene.chatHistory.length} msgs
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-100 via-purple-50 to-indigo-100 flex flex-col items-center justify-center p-3">
                <MessageSquare className="w-6 h-6 text-purple-500 mb-2" />
                {scene.chatHistory && scene.chatHistory.length > 0 && (
                  <>
                    <p className="text-purple-900 text-xs font-medium line-clamp-2 text-center mb-1">
                      {scene.chatHistory[scene.chatHistory.length - 1].text.slice(0, 40)}...
                    </p>
                    <div className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs font-bold">
                      {scene.chatHistory.length} msgs
                    </div>
                  </>
                )}
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
              </div>
            )}
          </>
        )}

        {scene.type === 'video' && (
          <>
            <div className="w-full h-full bg-gradient-to-br from-red-400 via-pink-400 to-rose-400 flex items-center justify-center relative">
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 shadow-xl group-hover:scale-110 transition-transform">
                  <div className="w-0 h-0 border-l-[14px] border-l-white border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-red-500/60 to-transparent" />
              <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                <Video className="w-4 h-4 text-white" />
              </div>
            </div>
            {scene.prompt && (
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                <p className="text-white text-xs leading-tight line-clamp-3 text-center">
                  {scene.prompt.slice(0, 80)}...
                </p>
              </div>
            )}
          </>
        )}
      </button>
    );
  };

  // Section header
  const renderSectionHeader = (label: string, count: number, gradient: string) => {
    if (count === 0) return null;
    return (
      <div className="flex items-center gap-2 my-4 first:mt-0">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
        <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${gradient} text-white text-xs font-bold uppercase tracking-wider shadow-sm`}>
          {label} ({count})
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-gray-200">
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = galleryFilter === filter.id;
          if (filter.count === 0 && filter.id !== 'all') return null;
          
          return (
            <button
              key={filter.id}
              onClick={() => setGalleryFilter(filter.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                  : 'bg-gray-100 text-content-faint hover:bg-gray-200'
              }`}
            >
              {Icon && <Icon className="w-3 h-3 inline mr-1" />}
              {filter.label}
              <span className={`ml-1 ${isActive ? 'opacity-90' : 'opacity-60'}`}>({filter.count})</span>
            </button>
          );
        })}
      </div>

      {/* Grouped Content */}
      <div className="space-y-2">
        {galleryFilter === 'all' ? (
          <>
            {/* CONCEPT Section */}
            {groupedScenes.concept.length > 0 && (
              <>
                {renderSectionHeader('CONCEPT', groupedScenes.concept.length, 'from-purple-500 to-indigo-500')}
                <div className="grid grid-cols-2 gap-4">
                  {groupedScenes.concept.map(renderThumbnail)}
                </div>
              </>
            )}

            {/* IMAGE Section */}
            {groupedScenes.image.length > 0 && (
              <>
                {renderSectionHeader('IMAGE', groupedScenes.image.length, 'from-blue-500 to-cyan-500')}
                <div className="grid grid-cols-2 gap-4">
                  {groupedScenes.image.map(renderThumbnail)}
                </div>
              </>
            )}

            {/* VIDEO Section */}
            {groupedScenes.video.length > 0 && (
              <>
                {renderSectionHeader('VIDEO', groupedScenes.video.length, 'from-red-500 to-pink-500')}
                <div className="grid grid-cols-2 gap-4">
                  {groupedScenes.video.map(renderThumbnail)}
                </div>
              </>
            )}
          </>
        ) : (
          // Filtered view - only show selected type
          <div className="grid grid-cols-2 gap-4">
            {groupedScenes[galleryFilter]?.map(renderThumbnail)}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function PanelCard({ title, children, isMobile = false }: { title: string; children: React.ReactNode; isMobile?: boolean }) {
  return (
    <div className={`rounded-xl border-2 border-gray-200 bg-white/50 backdrop-blur-sm ${isMobile ? 'p-3' : 'p-4'}`}>
      <h4 className="text-gray-900 font-bold mb-3 text-xs uppercase tracking-wider">{title}</h4>
      {children}
    </div>
  );
}

function UploadZone({ 
  text, 
  subtext, 
  onFileSelect, 
  currentImage, 
  onRemove, 
  disabled,
  compact = false 
}: { 
  text: string; 
  subtext: string; 
  onFileSelect: (file: File) => void; 
  currentImage?: string;
  onRemove?: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  if (currentImage && !compact) {
    return (
      <div className="relative group">
        <img src={currentImage} alt="Uploaded" className="w-full aspect-square object-cover rounded-lg border-2 border-gray-200" />
        {onRemove && (
          <button
            onClick={onRemove}
            disabled={disabled}
            className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 hover:bg-black/80"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`w-full ${compact ? 'py-3' : 'py-6 lg:py-8'} rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <Upload className={`${compact ? 'w-5 h-5' : 'w-6 h-6 lg:w-8 lg:h-8'} text-content-secondary mx-auto mb-2`} />
        <p className="text-gray-900 font-medium text-xs lg:text-sm">{text}</p>
        <p className="text-content-muted text-xs mt-1">{subtext}</p>
      </button>
    </>
  );
}

function PreviewDisplay({ scene, isLoading, modelMode, error, isMobile }: { scene: any; isLoading: boolean; modelMode: string; error: string | null; isMobile: boolean }) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <Spinner size="lg" />
        <p className="text-content-faint text-sm font-medium">Processing your request...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${isMobile ? 'max-w-full' : 'max-w-lg'} w-full bg-red-50 border-2 border-red-200 rounded-2xl p-6 lg:p-8`}>
        <p className="text-red-700 text-sm font-medium mb-4">{error}</p>
        {error.includes('billing') && (
          <a 
            href="https://console.cloud.google.com/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-xs underline font-medium"
          >
            Enable billing →
          </a>
        )}
        {error.includes('quota') && (
          <a 
            href="https://ai.google.dev/gemini-api/docs/rate-limits" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-xs underline font-medium"
          >
            Learn about quotas →
          </a>
        )}
      </div>
    );
  }

  // Check if scene exists AND matches the current mode
  if (!scene || scene.type !== modelMode) {
    // TEXT MODE - Empty State
    if (modelMode === 'text') {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-4 lg:p-8 text-center w-full">
          <div className="max-w-lg">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-2xl shadow-pink-500/30 mx-auto`}
            >
              <Wand2 className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} text-white`} />
            </motion.div>
            <div className="mt-6">
              <h3 className={`text-pink-600 font-bold ${isMobile ? 'text-xl' : 'text-2xl'} mb-2`}>AI Image Analysis</h3>
              <p className={`text-content-faint ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed`}>
                Upload an image and let AI describe what it sees
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <span className="px-3 py-1.5 bg-pink-50 text-pink-700 rounded-full text-xs font-medium border border-pink-200">
                💡 Product Photos
              </span>
              <span className="px-3 py-1.5 bg-pink-50 text-pink-700 rounded-full text-xs font-medium border border-pink-200">
                🎨 Artwork
              </span>
              <span className="px-3 py-1.5 bg-pink-50 text-pink-700 rounded-full text-xs font-medium border border-pink-200">
                📸 Screenshots
              </span>
            </div>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4 w-full max-w-3xl mt-4`}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border-2 border-pink-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center mb-4 mx-auto">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-pink-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 1</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Upload Image</p>
              <p className="text-content-faint text-xs leading-relaxed">Choose a photo you want AI to analyze</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 border-2 border-pink-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-pink-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 2</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">AI Analysis</p>
              <p className="text-content-faint text-xs leading-relaxed">AI describes what it sees in detail</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 border-2 border-pink-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center mb-4 mx-auto">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-pink-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 3</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Get Results</p>
              <p className="text-content-faint text-xs leading-relaxed">Review and export detailed description</p>
            </motion.div>
          </div>
        </div>
      );
    }

    // CONCEPT MODE - Empty State
    if (modelMode === 'concept') {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-4 lg:p-8 text-center w-full">
          <div className="max-w-lg">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/30 mx-auto`}
            >
              <Lightbulb className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} text-white`} />
            </motion.div>
            <div className="mt-6">
              <h3 className={`text-purple-600 font-bold ${isMobile ? 'text-xl' : 'text-2xl'} mb-2`}>Creative Brainstorming</h3>
              <p className={`text-content-faint ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed`}>
                Chat with AI to develop and visualize your creative ideas
              </p>
            </div>
            <div className="w-full space-y-2 mt-4">
              <p className="text-purple-600 text-xs font-semibold uppercase tracking-wide">🎯 Try asking:</p>
              <div className="space-y-1.5">
                <div className="px-4 py-2 bg-purple-50 text-purple-800 rounded-lg text-xs text-left border border-purple-200">
                  "Create a summer campaign for beachwear"
                </div>
                <div className="px-4 py-2 bg-purple-50 text-purple-800 rounded-lg text-xs text-left border border-purple-200">
                  "Design a product launch concept"
                </div>
                <div className="px-4 py-2 bg-purple-50 text-purple-800 rounded-lg text-xs text-left border border-purple-200">
                  "Brainstorm ad ideas for a cafe"
                </div>
              </div>
            </div>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4 w-full max-w-3xl mt-4`}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center mb-4 mx-auto">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-purple-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 1</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Start Chat</p>
              <p className="text-content-faint text-xs leading-relaxed">Describe your creative idea or goal</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-purple-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 2</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Refine Together</p>
              <p className="text-content-faint text-xs leading-relaxed">Collaborate with AI to develop concept</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center mb-4 mx-auto">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-purple-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 3</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Visualize</p>
              <p className="text-content-faint text-xs leading-relaxed">Generate visual representations</p>
            </motion.div>
          </div>
        </div>
      );
    }

    // IMAGE MODE - Empty State
    if (modelMode === 'image') {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-4 lg:p-8 text-center w-full">
          <div className="max-w-lg">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 mx-auto`}
            >
              <ImageIcon className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} text-white`} />
            </motion.div>
            <div className="mt-6">
              <h3 className={`text-blue-600 font-bold ${isMobile ? 'text-xl' : 'text-2xl'} mb-2`}>Professional Image Generation</h3>
              <p className={`text-content-faint ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed`}>
                Create stunning visuals from text descriptions
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                📦 Product Shots
              </span>
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                🏞️ Landscapes
              </span>
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                👤 Portraits
              </span>
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                🎨 Abstract Art
              </span>
            </div>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4 w-full max-w-3xl mt-4`}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4 mx-auto">
                <Edit3 className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-blue-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 1</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Write Prompt</p>
              <p className="text-content-faint text-xs leading-relaxed">Describe the image you want to create</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-blue-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 2</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">AI Generates</p>
              <p className="text-content-faint text-xs leading-relaxed">Advanced AI creates your visual</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-4 mx-auto">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-blue-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 3</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Download</p>
              <p className="text-content-faint text-xs leading-relaxed">Save your professional image</p>
            </motion.div>
          </div>
        </div>
      );
    }

    // EDIT MODE - Empty State
    if (modelMode === 'edit') {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-4 lg:p-8 text-center w-full">
          <div className="max-w-lg">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-2xl shadow-teal-500/30 mx-auto`}
            >
              <Edit3 className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} text-white`} />
            </motion.div>
            <div className="mt-6">
              <h3 className={`text-teal-600 font-bold ${isMobile ? 'text-xl' : 'text-2xl'} mb-2`}>AI Image Editing</h3>
              <p className={`text-content-faint ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed`}>
                Upload an image and edit it with AI-powered tools
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <span className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                🖌️ Remove Objects
              </span>
              <span className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                ✨ Enhance Quality
              </span>
              <span className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-200">
                🎭 Change Style
              </span>
            </div>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4 w-full max-w-3xl mt-4`}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border-2 border-teal-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center mb-4 mx-auto">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-teal-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 1</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Upload Image</p>
              <p className="text-content-faint text-xs leading-relaxed">Choose an image you want to edit</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 border-2 border-teal-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center mb-4 mx-auto">
                <Sliders className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-teal-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 2</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Make Changes</p>
              <p className="text-content-faint text-xs leading-relaxed">Use AI tools to modify your image</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 border-2 border-teal-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center mb-4 mx-auto">
                <Download className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-teal-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 3</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Export</p>
              <p className="text-content-faint text-xs leading-relaxed">Download your enhanced result</p>
            </motion.div>
          </div>
        </div>
      );
    }

    // VIDEO MODE - Empty State
    if (modelMode === 'video') {
      return (
        <div className="flex flex-col items-center justify-center gap-8 p-4 lg:p-8 text-center w-full">
          <div className="max-w-lg">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center shadow-2xl shadow-red-500/30 mx-auto`}
            >
              <Video className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16'} text-white`} />
            </motion.div>
            <div className="mt-6">
              <h3 className={`text-red-600 font-bold ${isMobile ? 'text-xl' : 'text-2xl'} mb-2`}>AI Video Creation</h3>
              <p className={`text-content-faint ${isMobile ? 'text-sm' : 'text-base'} leading-relaxed`}>
                Generate engaging videos from text or images
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
                📱 Social Media
              </span>
              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
                📦 Product Demos
              </span>
              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
                📺 Advertisements
              </span>
              <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
                📖 Stories
              </span>
            </div>
          </div>

          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4 w-full max-w-3xl mt-4`}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border-2 border-red-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center mb-4 mx-auto">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-red-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 1</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Input Content</p>
              <p className="text-content-faint text-xs leading-relaxed">Upload reference or start with text</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 border-2 border-red-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center mb-4 mx-auto">
                <Edit3 className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-red-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 2</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Write Prompt</p>
              <p className="text-content-faint text-xs leading-relaxed">Describe your video scene</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 border-2 border-red-200 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-red-600 font-bold text-sm mb-2 uppercase tracking-wider">Step 3</h4>
              <p className="text-gray-800 font-semibold text-sm mb-1">Generate</p>
              <p className="text-content-faint text-xs leading-relaxed">Receive high-quality video</p>
            </motion.div>
          </div>
        </div>
      );
    }

    // Default fallback
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className={`${isMobile ? 'w-16 h-16' : 'w-24 h-24'} rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
          <ImageIcon className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} text-content-secondary`} />
        </div>
        <div>
          <p className={`text-gray-900 font-semibold ${isMobile ? 'text-base' : 'text-lg'} mb-1`}>Ready to Create</p>
          <p className={`text-content-muted ${isMobile ? 'text-xs' : 'text-sm'}`}>Your generated content will appear here</p>
        </div>
      </div>
    );
  }

  // Text Mode - Show analysis
  if (scene.type === 'text' && scene.analysis) {
    return (
      <div className={`${isMobile ? 'max-w-full' : 'max-w-2xl'} w-full space-y-3 lg:space-y-4 ${isMobile ? 'px-2' : ''}`}>
        {scene.imageUrl && (
          <div className="flex justify-end">
            <div className="relative w-36 h-36 lg:w-48 lg:h-48 rounded-2xl overflow-hidden border-2 border-pink-200 shadow-lg group">
              <img src={scene.imageUrl} alt="Analyzed" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-pink-500/70 to-transparent" />
              <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center shadow-lg">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        )}
        <div className="bg-white rounded-2xl p-4 lg:p-6 border-2 border-pink-200 shadow-lg">
          <h4 className="text-pink-600 font-bold mb-2 lg:mb-3 uppercase text-xs tracking-wider flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Description
          </h4>
          <p className="text-gray-800 text-xs lg:text-sm leading-relaxed">{scene.analysis.description}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-6 border-2 border-purple-200 shadow-lg">
          <h4 className="text-purple-600 font-bold mb-2 lg:mb-3 uppercase text-xs tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Generated Prompt
          </h4>
          <p className="text-gray-800 text-xs lg:text-sm leading-relaxed font-mono bg-gray-50 p-3 lg:p-4 rounded-lg border border-gray-200">
            {scene.analysis.shortPrompt}
          </p>
        </div>
      </div>
    );
  }

  // Concept Mode - Show chat history with unified design
  if (scene.type === 'concept' && scene.chatHistory) {
    const attachedImage = scene.chatHistory.find((msg: any) => msg.imageUrl)?.imageUrl;
    
    return (
      <div className={`${isMobile ? 'max-w-full' : 'max-w-2xl'} w-full space-y-3 lg:space-y-4 ${isMobile ? 'px-2' : ''}`}>
        {attachedImage && (
          <div className="flex justify-end">
            <div className="relative w-36 h-36 lg:w-48 lg:h-48 rounded-2xl overflow-hidden border-2 border-purple-200 shadow-lg group">
              <img src={attachedImage} alt="Attached" className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-purple-500/70 to-transparent" />
              <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        )}
        <div className="space-y-3 lg:space-y-4 max-h-[600px] overflow-y-auto chat-scroll">
          {scene.chatHistory.map((msg: any, idx: number) => (
            <div key={idx} className="bg-white rounded-2xl p-4 lg:p-6 border-2 border-purple-200 shadow-lg">
              <h4 className="text-purple-600 font-bold mb-2 lg:mb-3 uppercase text-xs tracking-wider flex items-center gap-2">
                {msg.role === 'user' ? (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    You
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4" />
                    AI Response
                  </>
                )}
              </h4>
              <ChatMessage text={msg.text} role={msg.role} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Video Mode
  if (scene.type === 'video' && scene.videoUrl) {
    return (
      <div className={`${isMobile ? 'max-w-full' : 'max-w-4xl'} w-full`}>
        <video 
          src={scene.videoUrl} 
          controls 
          className="w-full rounded-xl lg:rounded-2xl shadow-2xl border-2 border-gray-200"
          autoPlay
          loop
        />
      </div>
    );
  }

  // Image Mode
  if (scene.imageUrl) {
    return (
      <div className={`${isMobile ? 'max-w-full' : 'max-w-5xl'} w-full`}>
        <img 
          src={scene.imageUrl} 
          alt="Generated" 
          className="w-full rounded-xl lg:rounded-2xl shadow-2xl border-2 border-gray-200"
        />
      </div>
    );
  }

  return null;
}