import { $ } from '@wdio/globals';

export class HomeOnboardingScreen {
  /**
   * Gets the title and subtitle welcome message elements
   * Uses text selector since these are TextView elements without content-desc
   */
  async getTitleAndSubtitleWelcomeMessage(timeoutMs = 15000) {
    // Use text selector for TextView elements
    const titleElement = $('android=new UiSelector().text("Welcome!")');
    const subtitleElement = $('android=new UiSelector().text("Set up your wallet and start exploring the crypto world.")');
    
    // Wait for elements to be displayed
    await titleElement.waitForDisplayed({ timeout: timeoutMs });
    await subtitleElement.waitForDisplayed({ timeout: timeoutMs });
    
    // Get text from elements
    const titleText = await titleElement.getText();
    const subtitleText = await subtitleElement.getText();
    
    return { titleText, subtitleText };
  }
  
  /**
   * Gets the Create Wallet button element using content-desc selector
   * @returns Chainable WebdriverIO element
   */
  getCreateWalletButton() {
    // Use accessibility ID selector (content-desc) - ~ prefix means content-desc
    return $('~Create Wallet');
  }

  /**
   * Gets the Import Wallet button element using content-desc selector
   * @returns Chainable WebdriverIO element
   */
  getImportWalletButton() {
    // Use accessibility ID selector (content-desc) - ~ prefix means content-desc
    return $('~Import Wallet');
  }
}
