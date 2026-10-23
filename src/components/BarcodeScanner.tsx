// MedVerify Barcode Scanner Component
// Integrates camera-based barcode scanning with the existing scan flow

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  Result,
} from '@zxing/library';
import {
  SUPPORTED_FORMATS,
  FORMAT_LABELS,
  BarcodeScanResult,
  checkBarcodeSupport,
  requestCameraPermission,
  listCameras,
  decodeBarcodeFromImage,
  getBarcodeTranslations,
} from '../utils/barcode';
import {
  ScanLine, Camera, CameraOff, X, Copy, Check,
  Upload, Info, AlertTriangle, RefreshCw, SwitchCamera
} from 'lucide-react';

type Language = 'en' | 'hi';
type ScanMode = 'idle' | 'camera' | 'image-upload';

interface BarcodeScannerProps {
  language: Language;
  onBarcodeScanned: (result: BarcodeScanResult) => void;
  onClose?: () => void;
}

export function BarcodeScanner({ language, onBarcodeScanned, onClose }: BarcodeScannerProps) {
  const tr = getBarcodeTranslations(language);
  
  const [mode, setMode] = useState<ScanMode>('idle');
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<BarcodeScanResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [cameras, setCameras] = useState<{ deviceId: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [imageScanError, setImageScanError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup function to stop all camera tracks
  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    setIsScanning(false);
    
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start camera scanning
  const startCameraScanning = useCallback(async () => {
    setError(null);
    setScanResult(null);
    setMode('camera');

    // Check support
    const support = checkBarcodeSupport();
    if (!support.isSupported) {
      setError(tr.notSupported);
      return;
    }

    // Request permission
    const permission = await requestCameraPermission();
    if (!permission.granted) {
      setError(permission.error);
      return;
    }

    // List available cameras
    const availableCameras = await listCameras();
    setCameras(availableCameras);

    // Create reader
    const hints = new Map<DecodeHintType, any>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    // Determine which camera to use
    const deviceId = availableCameras.length > 0 
      ? availableCameras[currentCameraIndex]?.deviceId || undefined 
      : undefined;

    try {
      setIsScanning(true);
      scanningRef.current = true;

      // Decode handler callback
      const decodeHandler = (result: Result | null) => {
        if (result && scanningRef.current) {
          const barcodeResult: BarcodeScanResult = {
            value: result.getText(),
            format: BarcodeFormat[result.getBarcodeFormat()],
            formatLabel: FORMAT_LABELS[result.getBarcodeFormat()] || 'Unknown',
            timestamp: new Date().toISOString()
          };
          setScanResult(barcodeResult);
          onBarcodeScanned(barcodeResult);
          scanningRef.current = false;
          stopCamera();
        }
      };

      // Start decoding from video
      const deviceIdParam: string | null = deviceId || null;
      await reader.decodeFromVideoDevice(deviceIdParam, videoRef.current!, decodeHandler);

      // Store stream reference for cleanup
      if (videoRef.current?.srcObject) {
        streamRef.current = videoRef.current.srcObject as MediaStream;
      }
    } catch (err: any) {
      setError(err.message || (language === 'hi' ? 'कैमरा शुरू नहीं हो सका।' : 'Could not start camera.'));
      setIsScanning(false);
    }
  }, [language, tr, onBarcodeScanned, stopCamera, currentCameraIndex]);

  // Switch camera
  const switchCamera = useCallback(() => {
    if (cameras.length <= 1) return;
    stopCamera();
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    // Restart with new camera after state update
    setTimeout(() => startCameraScanning(), 100);
  }, [cameras, currentCameraIndex, stopCamera, startCameraScanning]);

  // Handle image upload for barcode scanning
  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      setImageScanError(language === 'hi' 
        ? 'केवल JPG, JPEG, या PNG फ़ाइलें समर्थित हैं।'
        : 'Only JPG, JPEG, or PNG files are supported.');
      return;
    }

    setIsProcessingImage(true);
    setImageScanError(null);

    try {
      const result = await decodeBarcodeFromImage(file);
      if (result) {
        setScanResult(result);
        onBarcodeScanned(result);
        setMode('idle');
      } else {
        setImageScanError(tr.noBarcode);
      }
    } catch (err: any) {
      setImageScanError(language === 'hi' 
        ? 'इमेज प्रोसेस करने में त्रुटि। कृपया पुनः प्रयास करें।'
        : 'Error processing image. Please try again.');
    } finally {
      setIsProcessingImage(false);
    }
  }, [language, tr, onBarcodeScanned]);

  // Copy barcode to clipboard
  const handleCopy = useCallback(async () => {
    if (!scanResult) return;
    try {
      await navigator.clipboard.writeText(scanResult.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = scanResult.value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [scanResult]);

  // Close scanner
  const handleClose = useCallback(() => {
    stopCamera();
    setMode('idle');
    setScanResult(null);
    setError(null);
    setImageScanError(null);
    onClose?.();
  }, [stopCamera, onClose]);

  // Reset to try again
  const handleReset = useCallback(() => {
    stopCamera();
    setScanResult(null);
    setError(null);
    setImageScanError(null);
    setMode('idle');
  }, [stopCamera]);

  return (
    <div className="bg-white dark:bg-[#1A211E] rounded-2xl border border-sage/20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-sage/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-emerald-deep" />
          <h3 className="font-semibold text-charcoal dark:text-[#E8ECE6]">
            {tr.title}
          </h3>
        </div>
        {(isScanning || scanResult) && (
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-sage/10 text-text-main/60 hover:text-charcoal dark:hover:text-[#E8ECE6] transition-all"
            aria-label={tr.closeScanner}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4">
        {/* Error State */}
        {error && (
          <div role="alert" className="bg-warning-light dark:bg-warning/10 border border-warning/20 rounded-xl p-4 mb-4 flex items-start gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning mb-1">{tr.cameraError}</p>
              <p className="text-sm text-text-main/70">{error}</p>
              <button
                onClick={() => { setError(null); startCameraScanning(); }}
                className="mt-2 text-xs text-emerald-deep dark:text-sage-light font-medium hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {language === 'hi' ? 'पुनः प्रयास करें' : 'Try again'}
              </button>
            </div>
          </div>
        )}

        {/* Idle State - Mode Selection */}
        {mode === 'idle' && !scanResult && !error && (
          <div className="space-y-4">
            <p className="text-sm text-text-main/60 dark:text-[#D0D6CE] text-center">
              {tr.description}
            </p>

            {/* Camera Scan Button */}
            <button
              onClick={startCameraScanning}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-deep text-white rounded-xl font-semibold hover:bg-emerald-light transition-all shadow-lg shadow-emerald-deep/20"
              aria-label={tr.scanFromCamera}
            >
              <Camera className="w-6 h-6" />
              {tr.scanFromCamera}
            </button>

            {/* Image Upload Fallback */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-sage/20 dark:border-sage/10"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-[#1A211E] px-3 text-text-main/40">
                  {language === 'hi' ? 'या' : 'or'}
                </span>
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
                aria-label={tr.uploadForBarcode}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage}
                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-[#1A211E] text-emerald-deep border-2 border-dashed border-sage/30 dark:border-sage/15 rounded-xl font-medium hover:border-emerald-deep/40 transition-all disabled:opacity-50"
                aria-label={tr.scanFromImage}
              >
                {isProcessingImage ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    {language === 'hi' ? 'प्रोसेसिंग...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    {tr.scanFromImage}
                  </>
                )}
              </button>
            </div>

            {/* Image scan error */}
            {imageScanError && (
              <div role="alert" className="bg-warning-light dark:bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center gap-2 text-sm text-warning animate-fade-in">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {imageScanError}
              </div>
            )}

            {/* Supported formats info */}
            <div className="bg-ivory/50 dark:bg-emerald-deep/10 rounded-xl p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-main/60 dark:text-[#D0D6CE]">
                {language === 'hi' 
                  ? 'समर्थित बारकोड: EAN-13, EAN-8, UPC-A, UPC-E, Code 128'
                  : 'Supported formats: EAN-13, EAN-8, UPC-A, UPC-E, Code 128'}
              </p>
            </div>
          </div>
        )}

        {/* Camera Scanning State */}
        {mode === 'camera' && (
          <div className="space-y-4">
            <div className="relative bg-charcoal dark:bg-black rounded-xl overflow-hidden aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Scanning overlay */}
              {isScanning && !scanResult && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* Scan frame */}
                  <div className="relative w-3/4 h-1/2 border-2 border-white/50 rounded-lg">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-gold rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-gold rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-gold rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-gold rounded-br-lg" />
                    
                    {/* Scanning line animation */}
                    <div className="absolute inset-x-2 top-2 bottom-2 overflow-hidden">
                      <div className="w-full h-0.5 bg-gold/80 animate-pulse-soft" />
                    </div>
                  </div>
                </div>
              )}

              {/* Status badge */}
              {isScanning && !scanResult && (
                <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-positive rounded-full animate-pulse" />
                  {tr.scanning}
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="flex gap-2">
              <button
                onClick={stopCamera}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-warning text-white rounded-xl font-medium hover:bg-warning/90 transition-all"
                aria-label={tr.stopScan}
              >
                <CameraOff className="w-5 h-5" />
                {tr.stopScan}
              </button>
              {cameras.length > 1 && (
                <button
                  onClick={switchCamera}
                  className="px-4 py-3 bg-white dark:bg-[#1A211E] text-emerald-deep border border-sage/20 dark:border-sage/15 rounded-xl font-medium hover:bg-sage/5 transition-all"
                  aria-label={tr.switchCamera}
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div className="space-y-4 animate-fade-in">
            {/* Success indicator */}
            <div className="bg-positive-light dark:bg-positive/10 border border-positive/20 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-positive/20 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-positive" />
              </div>
              <div>
                <p className="font-semibold text-positive">
                  {tr.barcodeFound}
                </p>
                <p className="text-xs text-text-main/60 dark:text-[#D0D6CE]">
                  {tr.barcodeFormat}: {scanResult.formatLabel}
                </p>
              </div>
            </div>

            {/* Barcode value */}
            <div className="bg-ivory/50 dark:bg-emerald-deep/10 rounded-xl p-4">
              <p className="text-xs font-medium text-text-main/50 dark:text-[#D0D6CE] uppercase tracking-wider mb-2">
                {tr.barcodeValue}
              </p>
              <div className="flex items-center justify-between gap-3">
                <code className="text-lg font-mono font-bold text-charcoal dark:text-[#E8ECE6] break-all">
                  {scanResult.value}
                </code>
                <button
                  onClick={handleCopy}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    copied 
                      ? 'bg-positive/20 text-positive' 
                      : 'bg-white dark:bg-[#1A211E] text-emerald-deep border border-sage/20 dark:border-sage/15 hover:bg-sage/5'
                  }`}
                  aria-label={tr.copyBarcode}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      {tr.copied}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      {language === 'hi' ? 'कॉपी' : 'Copy'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-gold/10 dark:bg-gold/5 border border-gold/20 rounded-xl p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gold mb-0.5">
                  {tr.disclaimer}
                </p>
                <p className="text-xs text-text-main/60 dark:text-[#D0D6CE]">
                  {tr.disclaimerLong}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-deep text-white rounded-xl font-medium hover:bg-emerald-light transition-all"
              >
                <ScanLine className="w-4 h-4" />
                {language === 'hi' ? 'नया स्कैन' : 'New scan'}
              </button>
              {onClose && (
                <button
                  onClick={handleClose}
                  className="px-4 py-3 bg-white dark:bg-[#1A211E] text-text-main/70 border border-sage/20 dark:border-sage/15 rounded-xl font-medium hover:bg-sage/5 transition-all"
                  aria-label={tr.closeScanner}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
