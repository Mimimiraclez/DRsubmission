// captcha.js — Simple CAPTCHA solvers

/**
 * Solve color-based CAPTCHAs like "Click the button with the {color} color"
 * Used by submitaitools.org and similar sites
 */
export async function solveColorCaptcha(page, opts = {}) {
  const timeout = opts.timeout || 5000;

  try {
    // Look for color CAPTCHA instruction text
    const instruction = await page.locator('text=/click the button with the/i').first();
    if (!instruction) return false;

    const text = await instruction.textContent();
    if (!text) return false;

    // Extract color name from instruction
    const colorMatch = text.match(/with the (\w+) color/i);
    if (!colorMatch) return false;

    const targetColor = colorMatch[1].toLowerCase();
    console.log(`  🎨 CAPTCHA detected: looking for "${targetColor}" button`);

    // Find and click the button matching the color
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const btnText = await btn.textContent();
      if (btnText && btnText.toLowerCase().trim() === targetColor) {
        await btn.click();
        console.log(`  ✅ Clicked "${targetColor}" button`);
        return true;
      }
    }

    // Try matching by background color style
    for (const btn of buttons) {
      const style = await btn.getAttribute('style');
      if (style && style.toLowerCase().includes(targetColor)) {
        await btn.click();
        console.log(`  ✅ Clicked button with ${targetColor} style`);
        return true;
      }
    }

    console.log(`  ⚠️ Could not find "${targetColor}" button`);
    return false;
  } catch (e) {
    // No CAPTCHA found, that's fine
    return false;
  }
}
