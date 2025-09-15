import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, CameraIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import Webcam from 'react-webcam';
import Quagga from 'quagga';

const BarcodeScanner = ({ onClose, onBarcodeScanned, loading }) => {
  const [scannerMode, setScannerMode] = useState('manual'); // 'manual' or 'camera'
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const webcamRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (scannerMode === 'camera' && scannerRef.current) {
      initializeQuagga();
    }

    return () => {
      if (Quagga.initialized) {
        Quagga.stop();
      }
    };
  }, [scannerMode]);

  const initializeQuagga = () => {
    if (!scannerRef.current) return;

    Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: scannerRef.current,
        constraints: {
          width: 480,
          height: 320,
          facingMode: 'environment' // Use back camera
        }
      },
      decoder: {
        readers: [
          'code_128_reader',
          'ean_reader',
          'ean_8_reader',
          'code_39_reader',
          'code_39_vin_reader',
          'codabar_reader',
          'upc_reader',
          'upc_e_reader',
          'i2of5_reader'
        ]
      },
      locator: {
        patchSize: 'medium',
        halfSample: true
      },
      numOfWorkers: 2,
      frequency: 10,
      locate: true
    }, (err) => {
      if (err) {
        console.error('Quagga initialization error:', err);
        setCameraError('Failed to initialize camera scanner');
        return;
      }
      
      console.log('Quagga initialization finished. Ready to start');
      Quagga.start();
      setScanning(true);

      // Listen for barcode detection
      Quagga.onDetected((data) => {
        if (data && data.codeResult && data.codeResult.code) {
          const barcode = data.codeResult.code;
          console.log('Barcode detected:', barcode);
          
          // Stop scanning and process the barcode
          Quagga.stop();
          setScanning(false);
          onBarcodeScanned(barcode);
        }
      });
    });
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onBarcodeScanned(manualBarcode.trim());
    }
  };

  const handleCameraCapture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      // In a real implementation, you would send this image to a barcode detection service
      // For now, we'll just show how to capture the image
      console.log('Image captured:', imageSrc);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Barcode Scanner</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Scanner Mode Selection */}
        <div className="p-6 border-b">
          <div className="flex space-x-4">
            <button
              onClick={() => setScannerMode('manual')}
              className={`flex-1 p-4 rounded-lg border-2 flex items-center justify-center space-x-2 ${
                scannerMode === 'manual'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <QrCodeIcon className="h-6 w-6" />
              <span className="font-medium">Manual Entry</span>
            </button>
            <button
              onClick={() => setScannerMode('camera')}
              className={`flex-1 p-4 rounded-lg border-2 flex items-center justify-center space-x-2 ${
                scannerMode === 'camera'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <CameraIcon className="h-6 w-6" />
              <span className="font-medium">Camera Scan</span>
            </button>
          </div>
        </div>

        {/* Scanner Content */}
        <div className="p-6">
          {scannerMode === 'manual' ? (
            <div>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Barcode
                  </label>
                  <input
                    id="barcode"
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="Enter or scan barcode..."
                    className="form-input w-full text-lg"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualBarcode.trim() || loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium"
                >
                  {loading ? 'Searching...' : 'Search Product'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              {cameraError ? (
                <div className="text-center py-8">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-800">{cameraError}</p>
                  </div>
                  <button
                    onClick={() => setScannerMode('manual')}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                  >
                    Use Manual Entry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Camera Scanner */}
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <div
                      ref={scannerRef}
                      className="w-full h-64 flex items-center justify-center"
                    >
                      {!scanning && (
                        <div className="text-white text-center">
                          <CameraIcon className="h-12 w-12 mx-auto mb-2" />
                          <p>Initializing camera...</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Scanning Overlay */}
                    {scanning && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="border-2 border-green-500 bg-transparent w-64 h-32 relative">
                          <div className="absolute inset-0 border border-green-500 animate-pulse"></div>
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 bg-green-500 text-white px-2 py-1 rounded text-sm">
                            Scanning for barcode...
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Position the barcode within the scanning area. The scanner will automatically detect and process barcodes.
                    </p>
                    
                    <div className="flex space-x-4 justify-center">
                      <button
                        onClick={() => {
                          if (Quagga.initialized) {
                            Quagga.stop();
                          }
                          initializeQuagga();
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                      >
                        Restart Scanner
                      </button>
                      <button
                        onClick={() => setScannerMode('manual')}
                        className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
                      >
                        Manual Entry
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg">
          <p className="text-sm text-gray-600">
            Tip: You can scan UPC, EAN, Code 128, Code 39, and other common barcode formats.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
