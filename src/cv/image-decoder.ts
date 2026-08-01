import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Buffer } from 'buffer';
import { RGBAImage } from './preprocessor';

/**
 * Resizes and decodes a base64 JPEG image into a raw RGBA pixel array
 * suitable for our custom CV pipeline.
 * 
 * @param uri The URI or base64 string of the image
 * @param maxHeight Maximum height to resize to (to prevent memory issues in JS)
 * @returns RGBAImage with raw pixel data
 */
export async function decodeImageForCV(
  uri: string, 
  maxHeight: number = 1000
): Promise<RGBAImage> {
  try {
    console.log('[ImageDecoder] Resizing image...');
    
    // 1. Resize image using Expo's native module (fast and memory efficient)
    // We also compress it slightly to speed up base64 transfer
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { height: maxHeight } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    
    if (!manipResult.base64) {
      throw new Error('Gagal mendapatkan base64 dari gambar');
    }

    console.log(`[ImageDecoder] Resized to ${manipResult.width}x${manipResult.height}`);
    console.log('[ImageDecoder] Decoding JPEG to raw pixels...');

    // 2. Convert base64 to Buffer
    const buffer = Buffer.from(manipResult.base64, 'base64');
    
    // 3. Decode JPEG to raw pixels using jpeg-js
    // { useTArray: true } uses Uint8Array instead of Node Buffer for the output data
    const rawImageData = jpeg.decode(buffer, { useTArray: true });
    
    // 4. jpeg-js returns { width, height, data } where data is a Uint8Array of RGBA values
    // Our CV pipeline expects RGBAImage interface with Uint8ClampedArray
    return {
      width: rawImageData.width,
      height: rawImageData.height,
      data: new Uint8ClampedArray(rawImageData.data)
    };
  } catch (error) {
    console.error('[ImageDecoder] Error:', error);
    throw new Error(`Gagal membaca piksel gambar: ${error instanceof Error ? error.message : String(error)}`);
  }
}
