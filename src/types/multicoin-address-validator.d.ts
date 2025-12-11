declare module 'multicoin-address-validator' {
  interface ValidateOptions {
    networkType?: 'prod' | 'test';
  }

  interface Validator {
    validate(
      address: string,
      currency: string,
      options?: ValidateOptions
    ): boolean;
  }

  const WAValidator: Validator;

  export = WAValidator;
}
