// MedVerify Barcode Scanner Module
// Uses @zxing/library for browser-based barcode scanning
// Supports EAN-13, EAN-8, UPC-A, UPC-E, Code 128

import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
  Result,
  NotFoundException,
} from '@zxing/library';

// Supported barcode formats on medicine packaging
export const SUPPORTED_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
];

export const FORMAT_LABELS: Record<number, string> = {
  [BarcodeFormat.EAN_13]: 'EAN-13',
  [BarcodeFormat.EAN_8]: 'EAN-8',
  [BarcodeFormat.UPC_A]: 'UPC-A',
  [BarcodeFormat.UPC_E]: 'UPC-E',
  [BarcodeFormat.CODE_128]: 'Code 128',
};

export interface BarcodeScanResult {
  value: string;
  format: string;
  formatLabel: string;
  timestamp: string;
}

export interface CameraPermissionStatus {
  granted: boolean;
  error: string | null;
  isSupported: boolean;
}

// Check if browser supports camera/barcode scanning
export function checkBarcodeSupport(): { isSupported: boolean; error: string | null } {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      isSupported: false,
      error: 'Camera API is not supported in this browser.'
    };
  }
  return { isSupported: true, error: null };
}

// Request camera permission and list available devices
export async function requestCameraPermission(): Promise<CameraPermissionStatus> {
  const support = checkBarcodeSupport();
  if (!support.isSupported) {
    return { granted: false, error: support.error, isSupported: false };
  }

  try {
    // Request permission first
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    
    // Stop the stream immediately — we just needed permission
    stream.getTracks().forEach(track => track.stop());
    
    return { granted: true, error: null, isSupported: true };
  } catch (err: any) {
    let errorMessage = 'Camera access was denied.';
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      errorMessage = 'No camera found on this device.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      errorMessage = 'Camera is in use by another application.';
    } else if (err.name === 'OverconstrainedError') {
      errorMessage = 'No suitable camera found. Try without rear camera constraint.';
    } else if (err.name === 'TypeError') {
      errorMessage = 'Camera constraints not supported.';
    }
    
    return { granted: false, error: errorMessage, isSupported: true };
  }
}

// List available video input devices
export async function listCameras(): Promise<{ deviceId: string; label: string }[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`
      }));
  } catch {
    return [];
  }
}

// Create a barcode reader configured for medicine packaging formats
export function createBarcodeReader(): BrowserMultiFormatReader {
  const hints = new Map<DecodeHintType, any>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, SUPPORTED_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  
  return new BrowserMultiFormatReader(hints);
}

// Decode barcode from an image file (fallback for when camera isn't available)
export async function decodeBarcodeFromImage(
  imageFile: File | string
): Promise<BarcodeScanResult | null> {
  const reader = createBarcodeReader();
  
  try {
    let result: Result;
    
    if (typeof imageFile === 'string') {
      // It's a data URL or image URL
      result = await reader.decodeFromImageUrl(imageFile);
    } else {
      // It's a File object - convert to data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => resolve(fileReader.result as string);
        fileReader.onerror = reject;
        fileReader.readAsDataURL(imageFile);
      });
      result = await reader.decodeFromImageUrl(dataUrl);
    }
    
    return {
      value: result.getText(),
      format: BarcodeFormat[result.getBarcodeFormat()],
      formatLabel: FORMAT_LABELS[result.getBarcodeFormat()] || 'Unknown',
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    if (err instanceof NotFoundException) {
      return null; // No barcode found in image
    }
    throw err;
  }
}

// Get Hindi translations for barcode-related messages
export function getBarcodeTranslations(language: 'en' | 'hi') {
  if (language === 'hi') {
    return {
      title: 'बारकोड स्कैन करें',
      description: 'दवा पैकेजिंग पर बारकोड को कैमरे के सामने रखें।',
      startScan: 'स्कैन शुरू करें',
      stopScan: 'स्कैन बंद करें',
      closeScanner: 'स्कैनर बंद करें',
      scanning: 'स्कैन हो रहा है...',
      barcodeFound: 'बारकोड मिला!',
      noBarcode: 'इस इमेज में कोई बारकोड नहीं मिला।',
      cameraError: 'कैमरा त्रुटि',
      permissionDenied: 'कैमरा अनुमति अस्वीकार कर दी गई। कृपया ब्राउज़र सेटिंग्स में कैमरा एक्सेस की अनुमति दें।',
      noCamera: 'इस डिवाइस पर कोई कैमरा नहीं मिला।',
      cameraInUse: 'कैमरा किसी अन्य एप्लिकेशन द्वारा उपयोग में है।',
      notSupported: 'इस ब्राउज़र में बारकोड स्कैनिंग समर्थित नहीं है।',
      scanFromImage: 'इमेज से स्कैन करें',
      scanFromCamera: 'कैमरे से स्कैन करें',
      copyBarcode: 'बारकोड नंबर कॉपी करें',
      copied: 'कॉपी हो गया!',
      barcodeValue: 'बारकोड नंबर',
      barcodeFormat: 'बारकोड प्रकार',
      disclaimer: 'बारकोड स्कैन हुआ — प्रामाणिकता या सुरक्षा सत्यापित नहीं।',
      disclaimerLong: 'बारकोड स्कैन करने से केवल पैकेजिंग पर छपा नंबर पढ़ा जाता है। कैटलॉग लुकअप उत्पाद की पहचान कर सकता है, लेकिन यह दवा की प्रामाणिकता या सुरक्षा की पुष्टि नहीं करता। भौतिक उत्पाद बारकोड से मेल खाता है इसकी कोई गारंटी नहीं है। सुरक्षा या असली होने के प्रमाण के रूप में बारकोड पर भरोसा न करें।',
      switchCamera: 'कैमरा बदलें',
      orUploadImage: 'या बारकोड की इमेज अपलोड करें',
      uploadForBarcode: 'बारकोड इमेज अपलोड करें',
    };
  }
  
  return {
    title: 'Scan Barcode',
    description: 'Hold the barcode on medicine packaging in front of the camera.',
    startScan: 'Start scanning',
    stopScan: 'Stop scanning',
    closeScanner: 'Close scanner',
    scanning: 'Scanning...',
    barcodeFound: 'Barcode found!',
    noBarcode: 'No barcode was found in this image.',
    cameraError: 'Camera error',
    permissionDenied: 'Camera permission denied. Please allow camera access in your browser settings.',
    noCamera: 'No camera found on this device.',
    cameraInUse: 'Camera is in use by another application.',
    notSupported: 'Barcode scanning is not supported in this browser.',
    scanFromImage: 'Scan from image',
    scanFromCamera: 'Scan from camera',
    copyBarcode: 'Copy barcode number',
    copied: 'Copied!',
    barcodeValue: 'Barcode number',
    barcodeFormat: 'Barcode format',
    disclaimer: 'Barcode scanned — authenticity and safety not verified.',
    disclaimerLong: 'Scanning a barcode only reads the number printed on the packaging. A catalog lookup may identify the product, but this does NOT authenticate or verify the medicine. There is no guarantee that the physical product matches the barcode. Do not rely on a barcode as proof of safety or genuineness.',
    switchCamera: 'Switch camera',
    orUploadImage: 'Or upload an image of the barcode',
    uploadForBarcode: 'Upload barcode image',
  };
}
