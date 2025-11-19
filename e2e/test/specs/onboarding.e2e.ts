import { driver, expect } from '@wdio/globals';
import { HomeOnboardingScreen } from '../../pageObjects/home-onboarding-screen';

const homeOnboardingScreen = new HomeOnboardingScreen();

describe('Wallet App E2E Tests', () => {
  it('should launch the standalone app and verify the create wallet button', async () => {
    // Wait for app to load
    await driver.pause(3000);

    // Verify driver session exists
    const sessionId = (driver as any).sessionId;
    expect(sessionId).toBeDefined();

    // Verify welcome message
    const { titleText, subtitleText } = await homeOnboardingScreen.getTitleAndSubtitleWelcomeMessage();
    expect(titleText).toContain('Welcome!');
    expect(subtitleText).toContain('Set up your wallet and start exploring the crypto world.');

    // Get the button elements using description selector
    const createWalletButton = homeOnboardingScreen.getCreateWalletButton();
    const importWalletButton = homeOnboardingScreen.getImportWalletButton();
    
    // Verify buttons are displayed
    await expect(createWalletButton).toBeDisplayed();
    await expect(importWalletButton).toBeDisplayed();

    // Verify buttons have correct content-desc (accessibility label)
    const contentDesc =  await createWalletButton.getAttribute('content-desc');
    const importContentDesc =  await importWalletButton.getAttribute('content-desc');
    expect(contentDesc).toContain('Create Wallet');
    expect(importContentDesc).toContain('Import Wallet');
  });
});
