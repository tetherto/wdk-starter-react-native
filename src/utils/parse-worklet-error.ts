const ERROR_MESSAGES = {
  '13': 'The biometric authentication was cancelled',
};

const parseWorkletError = (error: any) => {
  if (!error.message) {
    return undefined;
  }

  const [codeRaw, messageRaw] = error.message.split(',');

  if (codeRaw.trim().startsWith('code:') && messageRaw.trim().startsWith('msg:')) {
    const code = (codeRaw.split(':')[1] || '').trim();
    const message = (messageRaw.split(':')[1] || '').trim();

    return { code, message: ERROR_MESSAGES[code as keyof typeof ERROR_MESSAGES] || message };
  }
};

export default parseWorkletError;
