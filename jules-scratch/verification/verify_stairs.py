import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        try:
            # 1. Go to the game page.
            await page.goto("http://localhost:5173/")

            # Wait for the game to load
            await page.wait_for_selector('canvas', timeout=10000)

            # 2. Start the game by pressing Enter.
            await page.press('body', 'Enter')

            # Give a moment for the game scene to initialize
            await page.wait_for_timeout(1000)

            # 3. Move player to the stairs on Floor 1 (at x:14, y:14) from (x:2, y:2)
            # This requires 12 moves right and 12 moves down.
            for _ in range(12):
                await page.press('body', 'd')
                await page.wait_for_timeout(100) # Small delay between key presses

            for _ in range(12):
                await page.press('body', 's')
                await page.wait_for_timeout(100)

            # 4. Wait for the floor transition animation to complete
            await page.wait_for_timeout(2000) # Wait for fade out, state change, and fade in

            # 5. Assert that we are on Floor 2.
            # We can check the HUD for the floor number.
            floor_text_locator = page.locator('text=Floor: 2')
            await expect(floor_text_locator).to_be_visible()

            # 6. Take a screenshot for visual verification.
            await page.screenshot(path="jules-scratch/verification/floor_2_transition.png")
            print("Successfully navigated to Floor 2 and took a screenshot.")

        except Exception as e:
            print(f"An error occurred: {e}")
            await page.screenshot(path="jules-scratch/verification/error.png")

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
