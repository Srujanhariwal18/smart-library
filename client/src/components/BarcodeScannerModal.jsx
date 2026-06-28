import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, ScanLine, AlertCircle } from 'lucide-react';

let BrowserMultiFormatReader;

const BarcodeScannerModal = ({ onScan, onClose }) => {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const initScanner = async () => {
      try {
        // Lazy import to avoid SSR / bundle issues
        const zxing = await import('@zxing/browser');
        BrowserMultiFormatReader = zxing.BrowserMultiFormatReader;

        if (cancelled) return;

        const codeReader = new BrowserMultiFormatReader();
        readerRef.current = codeReader;

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (devices.length === 0) {
          setError('No camera found on this device.');
          setLoading(false);
          return;
        }

        setLoading(false);
        setScanning(true);

        const selectedDeviceId = devices[devices.length - 1]?.deviceId;

        codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, err) => {
          if (result) {
            const text = result.getText();
            onScan(text);
            onClose();
          }
        });
      } catch (err) {
        if (!cancelled) {
          console.error('Barcode scanner error:', err);
          setError('Failed to access camera. Please check permissions.');
          setLoading(false);
        }
      }
    };

    initScanner();

    return () => {
      cancelled = true;
      if (readerRef.current) {
        try { readerRef.current.reset(); } catch (_) {}
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-5 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white z-10"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary-100 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-lg">
            <ScanLine size={18} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">ISBN Barcode Scanner</h3>
            <p className="text-xs text-slate-400">Point camera at barcode to auto-fill</p>
          </div>
        </div>

        {/* Camera View */}
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video mb-4">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-xs font-medium">Starting camera...</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 p-4">
              <div className="text-center">
                <AlertCircle size={32} className="mx-auto text-rose-500 mb-2" />
                <p className="text-white text-sm font-semibold">{error}</p>
                <p className="text-slate-400 text-xs mt-1">Try granting camera access in browser settings.</p>
              </div>
            </div>
          ) : null}

          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ display: loading || error ? 'none' : 'block' }}
          />

          {/* Scan indicator overlay */}
          {scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-24 border-2 border-primary-400 rounded-lg relative">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-primary-400/70 animate-pulse" />
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary-400 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary-400 rounded-br" />
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Hold the ISBN barcode steady within the frame. Scan happens automatically.
        </p>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default BarcodeScannerModal;
