import { driver, expect } from '@wdio/globals';
import { HomeOnboardingScreen } from '../pageObjects/home-onboarding-screen';

const homeOnboardingScreen = new HomeOnboardingScreen();

describe('Wallet App E2E Tests', () => {
  it('should launch the standalone app and verify the create wallet button', async () => {
    // Wait for app to load by waiting for the welcome message to appear
    const { titleText, subtitleText } = await homeOnboardingScreen.getTitleAndSubtitleWelcomeMessage();
    expect(titleText).toContain('Welcome!');
    expect(subtitleText).toContain('Set up your wallet and start exploring the crypto world.');

    // Get the button elements using description selector
    const createWalletButton = homeOnboardingScreen.getCreateWalletButton();
    const importWalletButton = homeOnboardingScreen.getImportWalletButton();
    
    // Wait for buttons to be displayed with explicit waits
    await createWalletButton.waitForDisplayed({ timeout: 10000 });
    await importWalletButton.waitForDisplayed({ timeout: 10000 });

    // Verify buttons have correct content-desc (accessibility label)
    const contentDesc = await createWalletButton.getAttribute('content-desc');
    const importContentDesc = await importWalletButton.getAttribute('content-desc');
    expect(contentDesc).toContain('Create Wallet');
    expect(importContentDesc).toContain('Import Wallet');
  });
});
