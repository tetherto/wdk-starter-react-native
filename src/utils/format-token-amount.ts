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

import { AssetTicker } from '@/config/assets';
import formatAmount from './format-amount';
import getDisplaySymbol from './get-display-symbol';

const formatTokenAmount = (amount: number, token: AssetTicker, includeSymbol: boolean = true) => {
  const symbol = getDisplaySymbol(token);

  if (amount === 0) return `0.00${includeSymbol ? ` ${symbol}` : ''}`;

  let decimals = Math.max(Math.ceil(Math.abs(Math.log10(amount))), 2);

  const formattedAmount = formatAmount(amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return `${formattedAmount}${includeSymbol ? ` ${symbol}` : ''}`;
};

export default formatTokenAmount;
