import { driver, expect } from '@wdio/globals';
import { HomeOnboardingScreen } from '../pageObjects/home-onboarding-screen';
import { qase } from '../utils/qase-wrapper';

const homeOnboardingScreen = new HomeOnboardingScreen();

describe('Onboarding Screen', () => {
  it('TW-1: First launch', qase('TW-1', async () => {
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

    // Verify buttons have correct accessibility label
    // iOS uses 'name' or 'label', Android uses 'content-desc'
    const caps = driver.capabilities as WebdriverIO.Capabilities;
    const isIOS = (caps.platformName || caps['appium:platformName']) === 'iOS';
    const createButtonLabel = isIOS 
      ? (await createWalletButton.getAttribute('name')) || (await createWalletButton.getAttribute('label'))
      : await createWalletButton.getAttribute('content-desc');
    const importButtonLabel = isIOS
      ? (await importWalletButton.getAttribute('name')) || (await importWalletButton.getAttribute('label'))
      : await importWalletButton.getAttribute('content-desc');
    
    expect(createButtonLabel).toContain('Create Wallet');
    expect(importButtonLabel).toContain('Import Wallet');
  }));
});
