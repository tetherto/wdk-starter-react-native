// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
