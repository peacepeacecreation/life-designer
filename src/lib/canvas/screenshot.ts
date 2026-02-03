/**
 * Canvas Screenshot Generator
 *
 * Captures React Flow canvas as image and uploads to Vercel Blob Storage
 */

import { toPng } from 'html-to-image'

/**
 * Capture canvas screenshot
 * @param elementId - ID of the React Flow wrapper element
 * @returns Base64 PNG image data
 */
export async function captureCanvasScreenshot(elementId: string = 'react-flow-wrapper'): Promise<string> {
  const element = document.querySelector(`.react-flow`) as HTMLElement

  if (!element) {
    throw new Error('Canvas element not found')
  }

  try {
    // Capture as PNG with better quality
    const dataUrl = await toPng(element, {
      quality: 0.8,
      pixelRatio: 1.5,
      backgroundColor: '#ffffff',
      // Skip elements that might cause issues
      filter: (node) => {
        // Skip handles, controls, and panels during screenshot
        if (node.classList && (
          node.classList.contains('react-flow__handle') ||
          node.classList.contains('react-flow__controls') ||
          node.classList.contains('react-flow__panel')
        )) {
          return false
        }

        // Skip cross-origin images (favicons, external images) to avoid CORS errors
        if (node instanceof HTMLImageElement) {
          try {
            const url = new URL(node.src, window.location.href)
            // Skip external images (different origin)
            if (url.origin !== window.location.origin) {
              return false
            }
          } catch {
            // If URL parsing fails, skip this image
            return false
          }
        }

        return true
      },
      skipFonts: false,
      cacheBust: false,
    })

    return dataUrl
  } catch (error) {
    console.error('Error capturing screenshot:', error)
    throw error
  }
}

/**
 * Upload screenshot to Vercel Blob Storage
 * @param canvasId - Canvas ID for filename
 * @param dataUrl - Base64 image data
 * @returns Public URL of uploaded image
 */
export async function uploadCanvasScreenshot(
  canvasId: string,
  dataUrl: string
): Promise<string> {
  try {
    // Convert base64 to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    // Create FormData
    const formData = new FormData()
    formData.append('file', blob, `canvas-${canvasId}.png`)
    formData.append('canvasId', canvasId)

    // Upload via API
    const uploadResponse = await fetch('/api/canvas/screenshot', {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload screenshot')
    }

    const data = await uploadResponse.json()
    return data.url
  } catch (error) {
    console.error('Error uploading screenshot:', error)
    throw error
  }
}

/**
 * Generate and upload canvas screenshot (for OG preview)
 * @param canvasId - Canvas ID
 * @returns Public URL of uploaded screenshot
 */
export async function generateCanvasPreview(canvasId: string): Promise<string> {
  const dataUrl = await captureCanvasScreenshot()
  const url = await uploadCanvasScreenshot(canvasId, dataUrl)
  return url
}

/**
 * Generate and upload canvas screenshot for direct sharing
 * @param canvasId - Canvas ID
 * @param canvasTitle - Canvas title for filename
 * @returns Public URL of uploaded screenshot
 */
export async function generateShareableScreenshot(
  canvasId: string,
  canvasTitle: string = 'canvas'
): Promise<string> {
  try {
    // Capture screenshot
    const dataUrl = await captureCanvasScreenshot()

    // Convert base64 to blob
    const response = await fetch(dataUrl)
    const blob = await response.blob()

    // Create FormData with different folder
    const formData = new FormData()
    const timestamp = Date.now()
    const filename = `canvas-share-${canvasId}-${timestamp}.png`
    formData.append('file', blob, filename)
    formData.append('canvasId', canvasId)
    formData.append('folder', 'canvas-shares') // Different folder for direct shares

    // Upload via API
    const uploadResponse = await fetch('/api/canvas/screenshot', {
      method: 'POST',
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload screenshot')
    }

    const data = await uploadResponse.json()
    return data.url
  } catch (error) {
    console.error('Error generating shareable screenshot:', error)
    throw error
  }
}
