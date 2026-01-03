/**
 * Color utility functions for the Domino Planner
 */

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (e.g., "#ff0000")
 * @returns {{ r: number, g: number, b: number } | null}
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  }
}

/**
 * Get hue value from hex color (0-360)
 * @param {string} hex - Hex color string
 * @returns {number} - Hue value 0-360
 */
export function getHue(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0

  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  if (max === min) return 0

  let h
  const d = max - min
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break
    case g: h = ((b - r) / d + 2) * 60; break
    case b: h = ((r - g) / d + 4) * 60; break
  }

  return h
}

/**
 * Convert RGB values to hex color string
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string}
 */
export function rgbToHex(r, g, b) {
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Calculate weighted Euclidean color distance (better perceptual accuracy)
 * Based on the "redmean" approximation which weights RGB differences
 * according to human color perception.
 *
 * @param {string} hex1 - First hex color
 * @param {string} hex2 - Second hex color
 * @returns {number} - Distance value (lower = more similar)
 */
export function colorDistance(hex1, hex2) {
  const rgb1 = hexToRgb(hex1)
  const rgb2 = hexToRgb(hex2)

  if (!rgb1 || !rgb2) return Infinity

  const rmean = (rgb1.r + rgb2.r) / 2
  const dr = rgb1.r - rgb2.r
  const dg = rgb1.g - rgb2.g
  const db = rgb1.b - rgb2.b

  // Weighted by human perception - greens are more perceptible
  return Math.sqrt(
    (2 + rmean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rmean) / 256) * db * db
  )
}

/**
 * Find the closest color in the palette to a given pixel color
 * @param {string} pixelHex - The hex color to match
 * @param {Array<{ hex: string, quantity: number, name?: string }>} palette - Palette with quantities
 * @returns {string} - The closest palette color hex, or 'clear' if no match
 */
export function findClosestPaletteColor(pixelHex, palette) {
  let closestColor = null
  let minDistance = Infinity

  for (const paletteColor of palette) {
    // Skip clear and disney colors for matching
    if (paletteColor.hex === 'clear' || paletteColor.hex === 'disney') continue

    const distance = colorDistance(pixelHex, paletteColor.hex)
    if (distance < minDistance) {
      minDistance = distance
      closestColor = paletteColor.hex
    }
  }

  return closestColor || 'clear'
}

/**
 * Find the closest AVAILABLE color in the palette (respecting quantity limits)
 * @param {string} pixelHex - The hex color to match
 * @param {Array<{ hex: string, quantity: number, name?: string }>} palette - Palette with quantities
 * @param {Object} usageCounts - Current usage counts by hex color
 * @returns {string} - The closest available palette color hex, or 'clear' if none available
 */
export function findClosestAvailableColor(pixelHex, palette, usageCounts) {
  // Build list of colors sorted by distance
  const colorDistances = []

  for (const paletteColor of palette) {
    // Skip clear and disney colors for matching
    if (paletteColor.hex === 'clear' || paletteColor.hex === 'disney') continue

    const distance = colorDistance(pixelHex, paletteColor.hex)
    const used = usageCounts[paletteColor.hex] || 0
    const available = paletteColor.quantity === Infinity ? Infinity : paletteColor.quantity - used

    colorDistances.push({
      hex: paletteColor.hex,
      distance,
      available
    })
  }

  // Sort by distance
  colorDistances.sort((a, b) => a.distance - b.distance)

  // Find the closest color that still has availability
  for (const color of colorDistances) {
    if (color.available > 0) {
      return color.hex
    }
  }

  // If all colors are exhausted, return the closest one anyway (will show warning)
  return colorDistances[0]?.hex || 'clear'
}

/**
 * Get sorted color preferences for a pixel (all colors ranked by distance)
 * @param {string} pixelHex - The hex color to match
 * @param {Array<{ hex: string, quantity: number, name?: string }>} palette - Palette with quantities
 * @returns {Array<{hex: string, distance: number}>} - Colors sorted by distance (best match first)
 */
export function getColorPreferences(pixelHex, palette) {
  const preferences = []

  for (const paletteColor of palette) {
    if (paletteColor.hex === 'clear' || paletteColor.hex === 'disney') continue
    const distance = colorDistance(pixelHex, paletteColor.hex)
    preferences.push({ hex: paletteColor.hex, distance })
  }

  preferences.sort((a, b) => a.distance - b.distance)
  return preferences
}

/**
 * Two-pass color distribution algorithm for better image import
 * Instead of greedily assigning colors top-to-bottom, this:
 * 1. First pass: Determine what color each pixel "wants" (best match)
 * 2. Second pass: Distribute oversubscribed colors evenly across the image
 *
 * @param {Array<Array<string>>} pixelColors - 2D array of pixel hex colors
 * @param {Array<{ hex: string, quantity: number }>} palette - Palette with quantities
 * @returns {Array<Array<string>>} - 2D array of assigned palette colors
 */
export function distributeColorsEvenly(pixelColors, palette) {
  const rows = pixelColors.length
  const cols = pixelColors[0]?.length || 0

  // Build availability map
  const availability = {}
  for (const p of palette) {
    if (p.hex !== 'clear' && p.hex !== 'disney') {
      availability[p.hex] = p.quantity === Infinity ? Infinity : p.quantity
    }
  }

  // First pass: Calculate preferences for each pixel
  // Store as { row, col, preferences: [{hex, distance}, ...] }
  const pixelPrefs = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pixelHex = pixelColors[r][c]
      if (pixelHex === 'clear' || pixelHex === 'transparent') {
        pixelPrefs.push({ row: r, col: c, preferences: [{ hex: 'clear', distance: 0 }], assigned: 'clear' })
      } else {
        const prefs = getColorPreferences(pixelHex, palette)
        pixelPrefs.push({ row: r, col: c, preferences: prefs, assigned: null })
      }
    }
  }

  // Count demand for each color (first choice)
  const demand = {}
  for (const pixel of pixelPrefs) {
    if (pixel.assigned === 'clear') continue
    const firstChoice = pixel.preferences[0]?.hex
    if (firstChoice) {
      demand[firstChoice] = (demand[firstChoice] || 0) + 1
    }
  }

  // For each color, determine the "acceptance threshold"
  // If demand > availability, we need to select which pixels get this color
  // We'll use distance as priority - pixels with smaller distance get priority

  const remainingAvailability = { ...availability }

  // Sort all unassigned pixels by their first-choice distance (best matches first)
  const unassigned = pixelPrefs.filter(p => p.assigned === null)

  // Process in rounds - each round tries to assign colors based on best available match
  let maxRounds = 10 // Safety limit
  let round = 0

  while (unassigned.some(p => p.assigned === null) && round < maxRounds) {
    round++

    // Group pixels by their current best available choice
    const groups = {}

    for (const pixel of unassigned) {
      if (pixel.assigned !== null) continue

      // Find best available color for this pixel
      let bestAvailable = null
      for (const pref of pixel.preferences) {
        if (remainingAvailability[pref.hex] > 0) {
          bestAvailable = pref
          break
        }
      }

      if (!bestAvailable) {
        // No colors available - assign first preference anyway (will show warning)
        pixel.assigned = pixel.preferences[0]?.hex || 'clear'
        continue
      }

      if (!groups[bestAvailable.hex]) {
        groups[bestAvailable.hex] = []
      }
      groups[bestAvailable.hex].push({ pixel, distance: bestAvailable.distance })
    }

    // For each color group, assign based on who needs it most (smallest distance)
    for (const [colorHex, pixels] of Object.entries(groups)) {
      const available = remainingAvailability[colorHex]

      if (pixels.length <= available) {
        // Everyone gets their color
        for (const { pixel } of pixels) {
          pixel.assigned = colorHex
          remainingAvailability[colorHex]--
        }
      } else {
        // Need to ration - sort by distance and give to the best matches
        pixels.sort((a, b) => a.distance - b.distance)

        for (let i = 0; i < pixels.length; i++) {
          if (i < available) {
            pixels[i].pixel.assigned = colorHex
            remainingAvailability[colorHex]--
          }
          // Others will try again in next round with their second choice
        }
      }
    }
  }

  // Build output grid
  const result = []
  for (let r = 0; r < rows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) {
      const pixel = pixelPrefs[r * cols + c]
      row.push(pixel.assigned || pixel.preferences[0]?.hex || 'clear')
    }
    result.push(row)
  }

  return result
}

/**
 * Normalize a palette from old format (array of strings) to new format (array of objects)
 * @param {Array<string | { hex: string, quantity: number }>} palette - Mixed format palette
 * @returns {Array<{ hex: string, quantity: number, name?: string }>}
 */
export function normalizePalette(palette) {
  return palette.map(item => {
    if (typeof item === 'string') {
      return {
        hex: item,
        quantity: item === 'clear' ? Infinity : Infinity,
        name: item === 'clear' ? 'Clear' : undefined
      }
    }
    return item
  })
}
