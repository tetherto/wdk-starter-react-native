import b4a from 'b4a';
import * as Keychain from 'react-native-keychain';

export const WDK_STORAGE_SEED = 'seed';
export const WDK_STORAGE_ENTROPY = 'entropy';
export const WDK_STORAGE_SALT = 'salt';

export class WdkSecretManagerStorage {
  static BASE_SERVICE_NAME = 'wdk.secretManager';

  /**
   * Saves a Buffer to secure storage (Keychain on iOS, Keystore on Android).
   * @param {WDK_STORAGE_ENTROPY | WDK_STORAGE_SEED | WDK_STORAGE_SALT} key - The key to associate with the data.
   * @param {Buffer | string} value - The data to store.
   * @returns {Promise<void>}
   */
  static async saveData(key: 'seed' | 'entropy' | 'salt', value: Buffer | string) {
    const itemService = WdkSecretManagerStorage.getServiceForItem(key);
    await Keychain.setGenericPassword(
      key,
      b4a.isBuffer(value) ? b4a.toString(value, 'hex') : value,
      {
        service: itemService,
        accessControl: key === 'seed' ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY : undefined,
      }
    );
  }

  /**
   * Retrieves an individual item from secure storage.
   * @param {WDK_STORAGE_ENTROPY | WDK_STORAGE_SEED | WDK_STORAGE_SALT} key - The key of the item to retrieve.
   * @returns {Promise<Buffer | boolean>} The retrieved data, or null if not found.
   */
  static async retrieveData(key: 'seed' | 'entropy' | 'salt') {
    const itemService = WdkSecretManagerStorage.getServiceForItem(key);

    try {
      const credentials = await Keychain.getGenericPassword({
        service: itemService,
        accessControl: key === 'seed' ? Keychain.ACCESS_CONTROL.BIOMETRY_ANY : undefined,
      });
      if (credentials) {
        return b4a.from(credentials.password, 'hex');
      }
      console.info(`For key ${itemService} in secure storage data do not exist.`);
      return false;
    } catch (error) {
      console.info(error);
      return false;
    }
  }

  /**
   * Checks if an item exists in secure storage without retrieving it.
   * @param {WDK_STORAGE_ENTROPY | WDK_STORAGE_SEED | WDK_STORAGE_SALT} key - The key of the item to check.
   * @returns {Promise<boolean>} True if the item exists, false otherwise.
   */
  static async hasKey(key: 'seed' | 'entropy' | 'salt') {
    const itemService = WdkSecretManagerStorage.getServiceForItem(key);
    return await Keychain.hasGenericPassword({ service: itemService });
  }

  /**
   * Deletes an individual item from secure storage.
   * @param {WDK_STORAGE_ENTROPY | WDK_STORAGE_SEED | WDK_STORAGE_SALT} key - The key of the item to delete.
   * @returns {Promise<boolean>}
   */
  static async resetData(key: 'seed' | 'entropy' | 'salt') {
    const itemService = WdkSecretManagerStorage.getServiceForItem(key);
    try {
      const success = await Keychain.resetGenericPassword({ service: itemService });
      if (success) {
        console.info(`Item for key '${key}' was reset successfully.`);
      }
      return true;
    } catch (error) {
      console.error(`Failed to reset item for key '${key}':`, error);
      return false;
    }
  }

  static async resetAllData() {
    await WdkSecretManagerStorage.resetData(WDK_STORAGE_ENTROPY);
    await WdkSecretManagerStorage.resetData(WDK_STORAGE_SEED);
    await WdkSecretManagerStorage.resetData(WDK_STORAGE_SALT);
  }

  /**
   *
   * @param {WDK_STORAGE_ENTROPY | WDK_STORAGE_SEED | WDK_STORAGE_SALT} key
   * @returns {string}
   */
  static getServiceForItem(key: 'seed' | 'entropy' | 'salt') {
    return `${WdkSecretManagerStorage.BASE_SERVICE_NAME}.${key}`;
  }
}
