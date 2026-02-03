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
        // Skip handles during screenshot
        if (node.classList && (
          node.classList.contains('react-flow__handle') ||
          node.classList.contains('react-flow__controls') ||
          node.classList.contains('react-flow__panel')
        )) {
          return false
        }
        return true
      }
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
 * Generate and upload canvas screenshot
 * @param canvasId - Canvas ID
 * @returns Public URL of uploaded screenshot
 */
export async function generateCanvasPreview(canvasId: string): Promise<string> {
  const dataUrl = await captureCanvasScreenshot()
  const url = await uploadCanvasScreenshot(canvasId, dataUrl)
  return url
}
