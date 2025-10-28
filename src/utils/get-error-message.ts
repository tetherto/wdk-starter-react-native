import parseWorkletError from './parse-worklet-error';

const getErrorMessage = (error: unknown, fallbackMessage: string) => {
  const workletError = parseWorkletError(error);
  if (workletError) return workletError.message;
  if (error instanceof Error) return error.message;
  return fallbackMessage;
};

export default getErrorMessage;
