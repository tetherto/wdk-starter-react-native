import { $ } from '@wdio/globals';

export class HomeOnboardingScreen {
  /**
   * Gets the title and subtitle welcome message elements
   * Cross-platform: Uses class chain for iOS and Android UiSelector for Android
   */
  async getTitleAndSubtitleWelcomeMessage() {
    // Cross-platform text selector
    // For iOS: Use class chain or accessibility ID
    // For Android: UiSelector works
    const isIOS = (driver as any).capabilities.platformName === 'iOS';
    
    const titleElement = isIOS 
      ? $('-ios class chain:**/XCUIElementTypeStaticText[`name == "Welcome!" OR label == "Welcome!"`]')
      : $('android=new UiSelector().text("Welcome!")');
    
    const subtitleElement = isIOS
      ? $('-ios class chain:**/XCUIElementTypeStaticText[`name CONTAINS "Set up your wallet" OR label CONTAINS "Set up your wallet"`]')
      : $('android=new UiSelector().text("Set up your wallet and start exploring the crypto world.")');
    
    // Wait for elements to be displayed
    await titleElement.waitForDisplayed({ timeout: 15000 });
    await subtitleElement.waitForDisplayed({ timeout: 15000 });
    
    // Get text from elements
    const titleText = await titleElement.getText();
    const subtitleText = await subtitleElement.getText();
    
    return { titleText, subtitleText };
  }
  
  /**
   * Gets the Create Wallet button element using accessibility ID
   * Cross-platform: ~ prefix works for both iOS and Android
   * @returns Chainable WebdriverIO element
   */
  getCreateWalletButton() {
    // Use accessibility ID selector - ~ prefix works for both iOS and Android
    return $('~Create Wallet');
  }

  /**
   * Gets the Import Wallet button element using accessibility ID
   * Cross-platform: ~ prefix works for both iOS and Android
   * @returns Chainable WebdriverIO element
   */
  getImportWalletButton() {
    // Use accessibility ID selector - ~ prefix works for both iOS and Android
    return $('~Import Wallet');
  }
}
