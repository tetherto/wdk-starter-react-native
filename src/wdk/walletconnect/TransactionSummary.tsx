import React from 'react';
import { View } from 'react-native';
import BigNumber from 'bignumber.js';
import { Card, Text } from '@/components';
import { ASSETS } from '../assets';
import type { NetworkId } from '../networks';
import { nativeSymbolFor } from './chains';
import { decodeCall, type DappTransaction } from './requests';

function formatUnits(amount: bigint | string, decimals: number): string {
  return new BigNumber(amount.toString()).shiftedBy(-decimals).toFormat();
}

/** A token amount in its own units when the token is one this app knows, otherwise in base units. */
function tokenAmount(token: string, network: string, amount: bigint): string {
  const asset = ASSETS.find(
    (a) => a.getNetwork() === network && a.getContractAddress()?.toLowerCase() === token.toLowerCase(),
  );
  return asset
    ? `${formatUnits(amount, asset.getDecimals())} ${asset.getSymbol()}`
    : `${amount.toString()} base units of token ${token}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text variant="small" color="textSecondary">{label}</Text>
      {children}
    </View>
  );
}

/**
 * What a dApp transaction does, as far as the wallet can tell. ERC-20
 * `approve` and `transfer` are spelled out; any other call is shown as raw
 * data, because the wallet cannot know what a contract does with it.
 */
export function TransactionSummary({ tx, network }: { tx: DappTransaction; network: NetworkId }) {
  const call = decodeCall(tx.data);

  return (
    <>
      {call?.kind === 'approve' && (
        <Text variant="small" color="error" style={{ marginTop: 16 }}>
          {call.unlimited
            ? 'This lets the address below spend ALL of this token in your account, now and later, without asking you again.'
            : 'This lets the address below spend this token from your account without asking you again.'}
        </Text>
      )}
      <Card style={{ marginTop: 16 }}>
        {call?.kind === 'approve' ? (
          <>
            <Text variant="tokenName">Token approval</Text>
            <Row label="Token">
              <Text variant="mono" mono>{tx.to}</Text>
            </Row>
            <Row label="Spender">
              <Text variant="mono" mono>{call.spender}</Text>
            </Row>
            <Row label="Amount">
              <Text variant="body">{call.unlimited ? 'Unlimited' : tokenAmount(tx.to, network, call.amount)}</Text>
            </Row>
          </>
        ) : call?.kind === 'transfer' ? (
          <>
            <Text variant="tokenName">Token transfer</Text>
            <Row label="Amount">
              <Text variant="body">{tokenAmount(tx.to, network, call.amount)}</Text>
            </Row>
            <Row label="To">
              <Text variant="mono" mono>{call.recipient}</Text>
            </Row>
          </>
        ) : (
          <>
            <Text variant="tokenName">{tx.data === '0x' ? 'Send' : 'Contract call'}</Text>
            <Row label={tx.data === '0x' ? 'To' : 'Contract'}>
              <Text variant="mono" mono>{tx.to}</Text>
            </Row>
          </>
        )}

        {/* Value is shown whenever it is set, even on a decoded token call: it is sent as well. */}
        {(tx.value !== '0' || tx.data === '0x') && (
          <Row label="Value">
            <Text variant="body">{formatUnits(tx.value, 18)} {nativeSymbolFor(network)}</Text>
          </Row>
        )}

        {tx.data !== '0x' && !call && (
          <Row label="Data">
            <Text variant="mono" mono numberOfLines={6}>{tx.data}</Text>
          </Row>
        )}

        <Row label="Network fee">
          <Text variant="body" color="success">Free · sponsored</Text>
        </Row>
      </Card>
    </>
  );
}
