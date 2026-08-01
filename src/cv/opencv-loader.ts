/**
 * OpenCV.js WASM Loader
 * 
 * Handles lazy-loading of OpenCV.js WebAssembly module with singleton pattern.
 * The OpenCV module is large (~8MB), so it's loaded on-demand rather than at startup.
 */

// OpenCV.js global type (loaded via WASM)
declare global {
  interface Window {
    cv: any;
  }
  var cv: any;
}

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

let loadStatus: LoadStatus = 'idle';
let loadPromise: Promise<any> | null = null;
let cvInstance: any = null;

/**
 * Get the current load status of OpenCV.js
 */
export function getOpenCVStatus(): LoadStatus {
  return loadStatus;
}

/**
 * Check if OpenCV.js is ready to use.
 */
export function isOpenCVReady(): boolean {
  return loadStatus === 'ready' && cvInstance !== null;
}

/**
 * Load OpenCV.js WASM module. Returns the cv instance.
 * Uses singleton pattern — safe to call multiple times.
 * 
 * In React Native, we use a polyfill approach:
 * OpenCV.js is loaded in a hidden WebView and we communicate via messages.
 * For the initial implementation, we'll use a JavaScript-based image
 * processing approach that runs natively without WASM.
 */
export async function loadOpenCV(): Promise<any> {
  if (loadStatus === 'ready' && cvInstance) {
    return cvInstance;
  }

  if (loadStatus === 'loading' && loadPromise) {
    return loadPromise;
  }

  loadStatus = 'loading';

  loadPromise = new Promise((resolve, reject) => {
    try {
      // In React Native environment, we use a JS-based image processing
      // fallback. The actual OpenCV operations are implemented as pure
      // TypeScript functions operating on pixel arrays.
      // 
      // For production, consider:
      // 1. expo-opencv (native module)
      // 2. Hidden WebView with OpenCV.js
      // 3. Server-side processing
      
      // Create a mock CV interface that matches our usage
      cvInstance = createNativeImageProcessor();
      loadStatus = 'ready';
      console.log('[OpenCV] Image processor initialized successfully');
      resolve(cvInstance);
    } catch (error) {
      loadStatus = 'error';
      console.error('[OpenCV] Failed to initialize:', error);
      reject(error);
    }
  });

  return loadPromise;
}

/**
 * Creates a native JavaScript image processor that provides
 * the same interface as OpenCV.js for the operations we need.
 * 
 * This avoids the WASM loading complexity in React Native while
 * providing sufficient functionality for answer sheet processing.
 */
function createNativeImageProcessor() {
  return {
    // Matrix operations
    Mat: class Mat {
      data: Uint8ClampedArray;
      rows: number;
      cols: number;
      channels: number;
      type: number;

      constructor(rows?: number, cols?: number, type?: number) {
        this.rows = rows || 0;
        this.cols = cols || 0;
        this.type = type || 0;
        this.channels = type === 0 ? 1 : (type === 16 ? 3 : 4);
        this.data = new Uint8ClampedArray(this.rows * this.cols * this.channels);
      }

      static fromImageData(imageData: { data: Uint8ClampedArray; width: number; height: number }): Mat {
        const mat = new Mat(imageData.height, imageData.width, 24); // CV_8UC4
        mat.data = new Uint8ClampedArray(imageData.data);
        mat.channels = 4;
        return mat;
      }

      roi(rect: { x: number; y: number; width: number; height: number }): Mat {
        const result = new Mat(rect.height, rect.width, this.type);
        for (let row = 0; row < rect.height; row++) {
          for (let col = 0; col < rect.width; col++) {
            const srcIdx = ((rect.y + row) * this.cols + (rect.x + col)) * this.channels;
            const dstIdx = (row * rect.width + col) * this.channels;
            for (let c = 0; c < this.channels; c++) {
              result.data[dstIdx + c] = this.data[srcIdx + c];
            }
          }
        }
        return result;
      }

      clone(): Mat {
        const result = new Mat(this.rows, this.cols, this.type);
        result.data = new Uint8ClampedArray(this.data);
        result.channels = this.channels;
        return result;
      }

      delete(): void {
        // No-op for JS, but keeps API compatible
      }
    },

    // We'll keep the CV namespace methods as references
    // The actual implementations are in preprocessor.ts, perspective.ts, etc.
    CV_8UC1: 0,
    CV_8UC3: 16,
    CV_8UC4: 24,
    THRESH_BINARY_INV: 1,
    ADAPTIVE_THRESH_GAUSSIAN_C: 1,
    MORPH_RECT: 0,
    MORPH_CLOSE: 3,
    MORPH_OPEN: 2,
    RETR_EXTERNAL: 0,
    CHAIN_APPROX_SIMPLE: 2,

    _ready: true,
  };
}

/**
 * Get the loaded CV instance. Throws if not loaded.
 */
export function getCV(): any {
  if (!cvInstance || loadStatus !== 'ready') {
    throw new Error('OpenCV is not loaded. Call loadOpenCV() first.');
  }
  return cvInstance;
}
