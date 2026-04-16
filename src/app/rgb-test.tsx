import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Wallet,
  RefreshCw,
  Copy,
  Plus,
  Coins,
  List,
  Send,
  Download,
  ArrowUpDown,
  Shield,
  Archive,
  Hash,
  CircleCheck,
  CircleX,
  Clock,
  Eye,
} from 'lucide-react-native';
import { useDebouncedNavigation } from '@/hooks/use-debounced-navigation';
import { WDKService } from '@tetherto/wdk-react-native-provider';
import { colors } from '@/constants/colors';
import * as Clipboard from 'expo-clipboard';

// ─── Types ───────────────────────────────────────────────────────────────────

type RgbAsset = {
  assetId?: string;
  asset_id?: string;
  ticker?: string;
  name?: string;
  balance?: { settled?: number; future?: number; spendable?: number };
  settledBalance?: number;
  totalBalance?: number;
  precision?: number;
};

type TransferItem = {
  idx?: number;
  status?: string;
  amount?: string;
  kind?: string;
  txid?: string;
  createdAt?: number;
  updatedAt?: number;
  recipientId?: string;
};

type TransactionItem = {
  txid?: string;
  txType?: string;
  received?: number;
  sent?: number;
  fee?: number;
  confirmationTime?: any;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWdk() {
  const wdk = (WDKService as any).wdkManager;
  if (!wdk) throw new Error('WDK not initialized. Go to main wallet first.');
  return wdk;
}

function truncate(s: string, len = 24) {
  if (!s || s.length <= len) return s || '--';
  return s.slice(0, len / 2) + '...' + s.slice(-len / 2);
}

function formatSats(sats: string | number | null | undefined): string {
  if (sats === null || sats === undefined) return '--';
  const n = typeof sats === 'string' ? parseInt(sats, 10) : sats;
  if (isNaN(n)) return String(sats);
  return n.toLocaleString() + ' sats';
}

function timeSince(ts: number): string {
  if (!ts) return '';
  const secs = Math.floor((Date.now() / 1000) - ts);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ─── Collapsible Section Component ───────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rotation = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = () => {
    Animated.timing(rotation, {
      toValue: open ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setOpen(!open);
  };

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={styles.sectionHeaderLeft}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
          {badge !== undefined && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronRight size={18} color={colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>
      {open && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

// ─── Action Button Component ─────────────────────────────────────────────────

function ActionButton({
  label,
  onPress,
  loading,
  loadingKey,
  icon,
  variant = 'secondary',
  disabled = false,
  small = false,
}: {
  label: string;
  onPress: () => void;
  loading: string | null;
  loadingKey: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  disabled?: boolean;
  small?: boolean;
}) {
  const isLoading = loading === loadingKey;
  const isDisabled = disabled || (loading !== null && !isLoading);

  const btnStyle = [
    styles.btn,
    small && styles.btnSmall,
    variant === 'primary' && styles.btnPrimary,
    variant === 'accent' && styles.btnAccent,
    variant === 'danger' && styles.btnDanger,
    variant === 'secondary' && styles.btnSecondary,
    isDisabled && styles.btnDisabled,
  ];

  const textColor =
    variant === 'primary' || variant === 'accent' ? '#000' : colors.text;

  return (
    <TouchableOpacity style={btnStyle} onPress={onPress} disabled={isDisabled} activeOpacity={0.7}>
      {isLoading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.btnText, small && styles.btnTextSmall, { color: textColor }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Result Display ──────────────────────────────────────────────────────────

function ResultCard({
  result,
  error,
  onDismiss,
}: {
  result: string | null;
  error: string | null;
  onDismiss: () => void;
}) {
  if (!result && !error) return null;
  const isError = !!error;
  return (
    <TouchableOpacity
      style={[styles.resultCard, isError ? styles.resultError : styles.resultSuccess]}
      onPress={onDismiss}
      activeOpacity={0.8}
    >
      <View style={styles.resultRow}>
        {isError ? (
          <CircleX size={16} color={colors.error} />
        ) : (
          <CircleCheck size={16} color={colors.success} />
        )}
        <Text
          style={[styles.resultText, { color: isError ? colors.error : colors.success }]}
          numberOfLines={4}
        >
          {error || result}
        </Text>
      </View>
      <Text style={styles.resultDismiss}>tap to dismiss</Text>
    </TouchableOpacity>
  );
}

// ─── Copyable Value Row ──────────────────────────────────────────────────────

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <TouchableOpacity style={styles.copyRow} onPress={copy} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text style={styles.copyValue} numberOfLines={1} ellipsizeMode="middle">
          {value}
        </Text>
      </View>
      {copied ? (
        <CircleCheck size={16} color={colors.success} />
      ) : (
        <Copy size={16} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════════════

export default function RgbTestScreen() {
  const insets = useSafeAreaInsets();
  const router = useDebouncedNavigation();

  // ─── State ───────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<'idle' | 'initializing' | 'connected' | 'error'>('idle');
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [assets, setAssets] = useState<RgbAsset[]>([]);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [sectionResults, setSectionResults] = useState<Record<string, { result?: string; error?: string }>>({});

  // Input fields
  const [sendInvoice, setSendInvoice] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendAssetId, setSendAssetId] = useState('');
  const [sendBtcAddress, setSendBtcAddress] = useState('');
  const [sendBtcAmount, setSendBtcAmount] = useState('');
  const [issueTicker, setIssueTicker] = useState('');
  const [issueName, setIssueName] = useState('');
  const [issueAmount, setIssueAmount] = useState('1000');

  const isConnected = status === 'connected';

  // Map loading keys to section names for per-section results
  const keyToSection: Record<string, string> = {
    init: 'init', sync: 'overview', balance: 'overview', refresh: 'assets',
    assets: 'assets', assetBal: 'assets',
    utxos: 'utxo', unspents: 'utxo', fee: 'utxo',
    issueNia: 'issue', issueCfa: 'issue',
    blindRecv: 'receive', witnessRecv: 'receive',
    sendRgb: 'send', sendBtc: 'send',
    transfers: 'history', txns: 'history',
    backup: 'backup', backupInfo: 'backup',
  };

  const setResult = (msg: string, key?: string) => {
    const section = key ? (keyToSection[key] || key) : 'init';
    setSectionResults(prev => ({ ...prev, [section]: { result: msg } }));
  };

  const setError = (msg: string, key?: string) => {
    const section = key ? (keyToSection[key] || key) : 'init';
    setSectionResults(prev => ({ ...prev, [section]: { error: msg } }));
  };

  const clearSectionResult = (section: string) => {
    setSectionResults(prev => {
      const next = { ...prev };
      delete next[section];
      return next;
    });
  };

  const withLoading = useCallback(
    (key: string, fn: () => Promise<void>) => async () => {
      setLoading(key);
      const section = keyToSection[key] || key;
      setSectionResults(prev => {
        const next = { ...prev };
        delete next[section];
        return next;
      });
      try {
        await fn();
      } catch (err: any) {
        console.log(`[RGB] ${key} error:`, err?.message || err);
        const section2 = keyToSection[key] || key;
        setSectionResults(prev => ({ ...prev, [section2]: { error: err?.message || String(err) } }));
      } finally {
        setLoading(null);
      }
    },
    []
  );

  // ─── Core Actions ────────────────────────────────────────────────────────

  const initRgb = withLoading('init', async () => {
    setStatus('initializing');
    const wdk = getWdk();
    const res = await wdk.getAddress({ network: 'rgb', accountIndex: 0 });
    const addr = res?.address || 'Unknown';
    setAddress(addr);

    let bal: string | null = null;
    try {
      const balRes = await wdk.getAddressBalance({ network: 'rgb', accountIndex: 0 });
      bal = balRes?.balance ?? null;
    } catch {}

    setBalance(bal);
    setStatus('connected');
    setResult('RGB wallet initialized successfully', 'init');
  });

  const refreshBalance = withLoading('balance', async () => {
    const wdk = getWdk();
    const res = await wdk.getAddressBalance({ network: 'rgb', accountIndex: 0 });
    if (res?.balance === undefined || res?.balance === null)
      throw new Error('Balance unavailable');
    setBalance(res.balance);
    setResult(`Balance: ${formatSats(res.balance)}`, 'balance');
  });

  const syncWallet = withLoading('sync', async () => {
    const wdk = getWdk();
    await wdk.rgbSync({ accountIndex: 0 });
    setResult('Wallet synced with electrum', 'sync');
  });

  const refreshWallet = withLoading('refresh', async () => {
    const wdk = getWdk();
    await wdk.rgbRefresh({ accountIndex: 0 });
    setResult('Wallet data refreshed', 'refresh');
  });

  const copyAddress = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      setResult('Address copied to clipboard', 'balance');
    }
  };

  // ─── Assets ──────────────────────────────────────────────────────────────

  const loadAssets = withLoading('assets', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbListAssets({ accountIndex: 0 });
    const parsed = res?.assets ? JSON.parse(res.assets) : {};
    const nia = (parsed?.nia || []).map((a: any) => ({ ...a, _type: 'NIA' }));
    const cfa = (parsed?.cfa || []).map((a: any) => ({ ...a, _type: 'CFA' }));
    const uda = (parsed?.uda || []).map((a: any) => ({ ...a, _type: 'UDA' }));
    const all = [...nia, ...cfa, ...uda];
    setAssets(all);
    setResult(`Found ${all.length} asset(s)${nia.length ? ` (${nia.length} NIA` : ''}${cfa.length ? `, ${cfa.length} CFA` : ''}${uda.length ? `, ${uda.length} UDA` : ''}${all.length ? ')' : ''}`, 'assets');
  });

  const getAssetBalance = withLoading('assetBal', async () => {
    if (!sendAssetId.trim()) { Alert.alert('Enter an asset ID first'); return; }
    const wdk = getWdk();
    const res = await wdk.rgbGetAssetBalance({ accountIndex: 0, assetId: sendAssetId.trim() });
    const bal = res?.balance ? JSON.parse(res.balance) : res;
    setResult(`Asset balance — settled: ${bal?.settled ?? '?'}, future: ${bal?.future ?? '?'}, spendable: ${bal?.spendable ?? '?'}`, 'assetBal');
  });

  // ─── UTXO Management ────────────────────────────────────────────────────

  const createUtxos = withLoading('utxos', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbCreateUtxos({ accountIndex: 0, num: 5, size: 2000, feeRate: 2 });
    setResult(`Created ${res?.created || 0} UTXOs`, 'utxos');
    // Refresh balance after UTXO creation
    try {
      const balRes = await wdk.getAddressBalance({ network: 'rgb', accountIndex: 0 });
      setBalance(balRes?.balance ?? balance);
    } catch {}
  });

  const listUnspents = withLoading('unspents', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbListUnspents({ accountIndex: 0 });
    const unspents = res?.unspents ? JSON.parse(res.unspents) : [];
    setResult(`Found ${unspents.length} unspent UTXO(s)`, 'unspents');
  });

  // ─── Issue Asset ─────────────────────────────────────────────────────────

  const issueAssetNia = withLoading('issueNia', async () => {
    const ticker = issueTicker.trim().toUpperCase();
    const name = issueName.trim() || `${ticker} Token`;
    const amount = parseInt(issueAmount.trim() || '1000', 10);
    if (!ticker) { Alert.alert('Enter a ticker symbol'); return; }
    if (ticker.length < 2 || ticker.length > 8) { Alert.alert('Ticker must be 2-8 characters'); return; }

    const wdk = getWdk();
    const res = await wdk.rgbIssueAsset({
      accountIndex: 0,
      ticker,
      name,
      amounts: JSON.stringify([amount]),
      precision: 0,
    });
    const assetId = res?.assetId || 'unknown';
    setResult(`Issued ${ticker} (NIA) — ${amount} units\nID: ${assetId}`, 'issueNia');
    setIssueTicker('');
    setIssueName('');
    setIssueAmount('1000');
  });

  const issueAssetCfa = withLoading('issueCfa', async () => {
    const name = issueName.trim();
    const amount = parseInt(issueAmount.trim() || '1000', 10);
    if (!name) { Alert.alert('Enter asset name'); return; }

    const wdk = getWdk();
    const res = await wdk.rgbIssueAssetCfa({
      accountIndex: 0,
      name,
      amounts: JSON.stringify([amount]),
      precision: 0,
    });
    const assetId = res?.assetId || 'unknown';
    setResult(`Issued ${name} (CFA) — ${amount} units\nID: ${assetId}`, 'issueCfa');
  });

  // ─── Receive ─────────────────────────────────────────────────────────────

  const blindReceive = withLoading('blindRecv', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbBlindReceive({ accountIndex: 0 });
    const invoice = res?.invoice || '';
    if (invoice) {
      await Clipboard.setStringAsync(invoice);
      setSendInvoice(invoice);
    }
    setResult(`Invoice copied to clipboard and filled "RGB Invoice" field:\n${invoice}`, 'blindRecv');
  });

  const witnessReceive = withLoading('witnessRecv', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbWitnessReceive({ accountIndex: 0 });
    const invoice = res?.invoice || '';
    if (invoice) {
      await Clipboard.setStringAsync(invoice);
      setSendInvoice(invoice);
    }
    setResult(`Witness invoice copied to clipboard and filled "RGB Invoice" field:\n${invoice}`, 'witnessRecv');
  });

  // ─── Send ────────────────────────────────────────────────────────────────

  const sendRgb = withLoading('sendRgb', async () => {
    if (!sendInvoice.trim()) { Alert.alert('Paste an RGB invoice'); return; }
    if (!sendAssetId.trim()) { Alert.alert('Enter or select an Asset ID'); return; }
    const wdk = getWdk();
    const res = await wdk.rgbSend({
      accountIndex: 0,
      token: sendAssetId.trim(),
      recipient: sendInvoice.trim(),
      amount: parseInt(sendAmount.trim() || '1', 10),
      feeRate: 2,
    });
    setResult(`Send TX: ${res?.hash || 'submitted'}`, 'sendRgb');
    setSendInvoice('');
    setSendAmount('');
  });

  const sendBtc = withLoading('sendBtc', async () => {
    if (!sendBtcAddress.trim()) { Alert.alert('Enter a BTC address'); return; }
    if (!sendBtcAmount.trim()) { Alert.alert('Enter amount in sats'); return; }
    const wdk = getWdk();
    const res = await wdk.rgbSendBtc({
      accountIndex: 0,
      address: sendBtcAddress.trim(),
      amount: parseInt(sendBtcAmount.trim(), 10),
      feeRate: 2,
    });
    setResult(`BTC sent — TX: ${res?.txid || 'submitted'}`, 'sendBtc');
    setSendBtcAddress('');
    setSendBtcAmount('');
  });

  // ─── History ─────────────────────────────────────────────────────────────

  const loadTransfers = withLoading('transfers', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbListTransfers({ accountIndex: 0 });
    const parsed = res?.transfers ? JSON.parse(res.transfers) : [];
    setTransfers(Array.isArray(parsed) ? parsed : []);
    setResult(`Found ${Array.isArray(parsed) ? parsed.length : 0} transfer(s)`, 'transfers');
  });

  const loadTransactions = withLoading('txns', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbListTransactions({ accountIndex: 0 });
    const parsed = res?.transactions ? JSON.parse(res.transactions) : [];
    setTransactions(Array.isArray(parsed) ? parsed : []);
    setResult(`Found ${Array.isArray(parsed) ? parsed.length : 0} transaction(s)`, 'txns');
  });

  // ─── Backup ──────────────────────────────────────────────────────────────

  const createBackup = withLoading('backup', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbCreateBackup({ accountIndex: 0, backupPath: '/tmp/rgb-backup', password: 'demo123' });
    setResult('Backup created at /tmp/rgb-backup', 'backup');
  });

  const backupInfo = withLoading('backupInfo', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbBackupInfo({ accountIndex: 0 });
    const info = res?.info ? JSON.parse(res.info) : res;
    setResult(`Backup info: ${JSON.stringify(info, null, 2)}`, 'backupInfo');
  });

  // ─── Fee Estimation ─────────────────────────────────────────────────────

  const estimateFee = withLoading('fee', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbEstimateFee({ accountIndex: 0, blocks: 6 });
    const fee = res?.feeRate ?? res?.fee ?? JSON.stringify(res);
    setResult(`Fee estimate (6 blocks): ${fee} sat/vB`, 'fee');
  });

  // ─── Additional Functions (uncovered) ─────────────────────────────────────

  const signMessage = withLoading('signMsg', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbSignMessage({ accountIndex: 0, message: 'RGB test message' });
    setResult(`Signature: ${String(res?.signature || res).substring(0, 40)}...`, 'signMsg');
  });

  const verifyMessage = withLoading('verifyMsg', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbVerifyMessage({
      accountIndex: 0,
      message: 'RGB test message',
      signature: 'test-signature',
    });
    setResult(`Verified: ${res?.valid ?? res}`, 'verifyMsg');
  });

  const issueAssetUda = withLoading('issueUda', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbIssueAssetUda({
      accountIndex: 0,
      ticker: 'TNFT',
      name: 'Test NFT',
      precision: 0,
    });
    const assetId = res?.assetId || res?.asset_id || 'unknown';
    setResult(`Issued UDA: ${assetId}`, 'issueUda');
  });

  const inflateAsset = withLoading('inflate', async () => {
    const wdk = getWdk();
    if (!assetIdInput.trim()) {
      throw new Error('Enter an IFA asset ID to inflate');
    }
    const res = await wdk.rgbInflate({
      accountIndex: 0,
      assetId: assetIdInput.trim(),
      amounts: JSON.stringify([100]),
      feeRate: 2,
    });
    setResult(`Inflated: ${JSON.stringify(res)}`, 'inflate');
  });

  const decodeInvoice = withLoading('decode', async () => {
    const wdk = getWdk();
    if (!sendInvoice.trim()) {
      throw new Error('Enter an RGB invoice to decode');
    }
    const res = await wdk.rgbDecodeInvoice({ invoice: sendInvoice.trim() });
    const data = typeof res?.data === 'string' ? JSON.parse(res.data) : res;
    setResult(`Invoice: ${JSON.stringify(data).substring(0, 200)}`, 'decode');
  });

  const restoreFromBackup = withLoading('restore', async () => {
    const wdk = getWdk();
    const res = await wdk.rgbRestoreFromBackup({
      accountIndex: 0,
      backupFilePath: 'rgb-backup.rgb',
      password: 'test-password',
      // dataDir omitted — bare-binding uses os.tmpdir() for cross-platform support
    });
    setResult(`Restored: ${JSON.stringify(res)}`, 'restore');
  });

  // ─── Render ──────────────────────────────────────────────────────────────

  const statusColor = status === 'connected' ? colors.success : status === 'error' ? colors.error : status === 'initializing' ? colors.warning : colors.textSecondary;
  const statusLabel = status === 'connected' ? 'Connected' : status === 'initializing' ? 'Initializing...' : status === 'error' ? 'Error' : 'Not Initialized';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RGB Wallet</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Status Bar ───────────────────────────────────────────────── */}
        <View style={styles.statusBar}>
          <View style={styles.statusLeft}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          {isConnected && (
            <TouchableOpacity onPress={syncWallet} disabled={loading !== null}>
              {loading === 'sync' ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <RefreshCw size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ─── Init Button (when not connected) ─────────────────────────── */}
        {!isConnected && (
          <ActionButton
            label="Initialize RGB Wallet"
            onPress={initRgb}
            loading={loading}
            loadingKey="init"
            icon={<Zap size={20} color="#000" />}
            variant="primary"
          />
        )}

        {/* ─── Init Result ────────────────────────────────────────────────── */}
        <ResultCard
          result={sectionResults.init?.result || null}
          error={sectionResults.init?.error || null}
          onDismiss={() => clearSectionResult('init')}
        />

        {/* ─── Wallet Overview Card ─────────────────────────────────────── */}
        {isConnected && (
          <View style={styles.overviewCard}>
            {/* Address */}
            <TouchableOpacity style={styles.addressRow} onPress={copyAddress} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={styles.overviewLabel}>Address</Text>
                <Text style={styles.addressValue} numberOfLines={1} ellipsizeMode="middle">
                  {address || '--'}
                </Text>
              </View>
              <Copy size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Balance */}
            <View style={styles.balanceRow}>
              <View>
                <Text style={styles.overviewLabel}>BTC Balance</Text>
                <Text style={styles.balanceValue}>{formatSats(balance)}</Text>
              </View>
              <ActionButton
                label="Refresh"
                onPress={refreshBalance}
                loading={loading}
                loadingKey="balance"
                icon={<RefreshCw size={14} color={colors.text} />}
                small
              />
            </View>

            {balance === '0' && (
              <Text style={styles.hint}>
                Send testnet BTC to the address above to get started
              </Text>
            )}

            <ResultCard
              result={sectionResults.overview?.result || null}
              error={sectionResults.overview?.error || null}
              onDismiss={() => clearSectionResult('overview')}
            />
          </View>
        )}

        {/* ═══ Sections (only when connected) ═════════════════════════════ */}
        {isConnected && (
          <>
            {/* ─── Assets Section ───────────────────────────────────────── */}
            <Section
              title="Assets"
              icon={<Coins size={18} color={colors.primary} />}
              defaultOpen={true}
              badge={assets.length || undefined}
            >
              <View style={styles.btnRow}>
                <ActionButton
                  label="Load Assets"
                  onPress={loadAssets}
                  loading={loading}
                  loadingKey="assets"
                  icon={<List size={16} color={colors.text} />}
                  small
                />
                <ActionButton
                  label="Refresh"
                  onPress={refreshWallet}
                  loading={loading}
                  loadingKey="refresh"
                  icon={<RefreshCw size={14} color={colors.text} />}
                  small
                />
              </View>

              {/* Asset list */}
              {assets.length > 0 && (
                <View style={styles.listContainer}>
                  {assets.map((asset, idx) => {
                    const id = asset.assetId || asset.asset_id || '';
                    const settled = asset.balance?.settled ?? asset.settledBalance ?? asset.totalBalance ?? 0;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.listItem, idx < assets.length - 1 && styles.listItemBorder]}
                        onPress={async () => {
                          await Clipboard.setStringAsync(id);
                          setSendAssetId(id);
                          setResult(`Copied asset ID and filled "Asset ID" field:\n${id}`, 'assets');
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.assetHeader}>
                          <View style={styles.assetBadge}>
                            <Text style={styles.assetBadgeText}>{(asset as any)._type || 'RGB'}</Text>
                          </View>
                          <Text style={styles.assetTicker}>{asset.ticker || asset.name || 'Unknown'}</Text>
                          <Text style={styles.assetAmount}>{String(settled)}</Text>
                        </View>
                        {asset.name && asset.ticker && (
                          <Text style={styles.assetName}>{asset.name}</Text>
                        )}
                        <Text style={styles.assetId} numberOfLines={1}>{truncate(id, 40)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Asset Balance Check */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Check Asset Balance</Text>
                <TextInput
                  style={styles.input}
                  value={sendAssetId}
                  onChangeText={setSendAssetId}
                  placeholder="Asset ID"
                  placeholderTextColor={colors.textTertiary}
                />
                <ActionButton
                  label="Check Balance"
                  onPress={getAssetBalance}
                  loading={loading}
                  loadingKey="assetBal"
                  icon={<Eye size={14} color={colors.text} />}
                  small
                />
              </View>

              <ResultCard
                result={sectionResults.assets?.result || null}
                error={sectionResults.assets?.error || null}
                onDismiss={() => clearSectionResult('assets')}
              />
            </Section>

            {/* ─── UTXO Management ──────────────────────────────────────── */}
            <Section
              title="UTXO Management"
              icon={<Hash size={18} color="#60a5fa" />}
            >
              <Text style={styles.sectionDesc}>
                RGB assets need UTXOs to allocate tokens. Create UTXOs before issuing or receiving assets.
              </Text>
              <View style={styles.btnRow}>
                <ActionButton
                  label="Create UTXOs"
                  onPress={createUtxos}
                  loading={loading}
                  loadingKey="utxos"
                  icon={<Plus size={16} color="#000" />}
                  variant="accent"
                  small
                />
                <ActionButton
                  label="List Unspents"
                  onPress={listUnspents}
                  loading={loading}
                  loadingKey="unspents"
                  icon={<List size={14} color={colors.text} />}
                  small
                />
              </View>
              <ActionButton
                label="Estimate Fee (6 blocks)"
                onPress={estimateFee}
                loading={loading}
                loadingKey="fee"
                icon={<ArrowUpDown size={14} color={colors.text} />}
                small
              />
              <ResultCard
                result={sectionResults.utxo?.result || null}
                error={sectionResults.utxo?.error || null}
                onDismiss={() => clearSectionResult('utxo')}
              />
            </Section>

            {/* ─── Issue Asset ──────────────────────────────────────────── */}
            <Section
              title="Issue Asset"
              icon={<Plus size={18} color={colors.success} />}
            >
              <Text style={styles.sectionDesc}>
                Create new fungible tokens (NIA) or collectible assets (CFA). Requires available UTXOs.
              </Text>

              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  value={issueTicker}
                  onChangeText={setIssueTicker}
                  placeholder="Ticker (e.g. TEST)"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                  maxLength={8}
                />
                <TextInput
                  style={styles.input}
                  value={issueName}
                  onChangeText={setIssueName}
                  placeholder="Name (e.g. Test Token)"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={issueAmount}
                  onChangeText={setIssueAmount}
                  placeholder="Supply amount"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                />
                <View style={styles.btnRow}>
                  <ActionButton
                    label="Issue NIA"
                    onPress={issueAssetNia}
                    loading={loading}
                    loadingKey="issueNia"
                    icon={<Coins size={16} color="#000" />}
                    variant="accent"
                    small
                  />
                  <ActionButton
                    label="Issue CFA"
                    onPress={issueAssetCfa}
                    loading={loading}
                    loadingKey="issueCfa"
                    icon={<Coins size={16} color="#000" />}
                    variant="accent"
                    small
                  />
                </View>
              </View>
              <ResultCard
                result={sectionResults.issue?.result || null}
                error={sectionResults.issue?.error || null}
                onDismiss={() => clearSectionResult('issue')}
              />
            </Section>

            {/* ─── Receive ──────────────────────────────────────────────── */}
            <Section
              title="Receive"
              icon={<Download size={18} color={colors.success} />}
            >
              <Text style={styles.sectionDesc}>
                Generate an invoice to receive RGB assets. Share the invoice with the sender.
              </Text>
              <View style={styles.btnRow}>
                <ActionButton
                  label="Blind Receive"
                  onPress={blindReceive}
                  loading={loading}
                  loadingKey="blindRecv"
                  icon={<Download size={16} color="#000" />}
                  variant="accent"
                  small
                />
                <ActionButton
                  label="Witness Receive"
                  onPress={witnessReceive}
                  loading={loading}
                  loadingKey="witnessRecv"
                  icon={<Shield size={16} color="#000" />}
                  variant="accent"
                  small
                />
              </View>
              <ResultCard
                result={sectionResults.receive?.result || null}
                error={sectionResults.receive?.error || null}
                onDismiss={() => clearSectionResult('receive')}
              />
            </Section>

            {/* ─── Send ─────────────────────────────────────────────────── */}
            <Section
              title="Send"
              icon={<Send size={18} color={colors.warning} />}
            >
              {/* Send RGB */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Send RGB Asset</Text>
                <TextInput
                  style={styles.input}
                  value={sendAssetId}
                  onChangeText={setSendAssetId}
                  placeholder="Asset ID"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={sendInvoice}
                  onChangeText={setSendInvoice}
                  placeholder="Recipient invoice"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={sendAmount}
                  onChangeText={setSendAmount}
                  placeholder="Amount"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                />
                <ActionButton
                  label="Send RGB"
                  onPress={sendRgb}
                  loading={loading}
                  loadingKey="sendRgb"
                  icon={<Send size={16} color="#000" />}
                  variant="primary"
                  small
                />
              </View>

              <View style={styles.divider} />

              {/* Send BTC */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Send BTC</Text>
                <TextInput
                  style={styles.input}
                  value={sendBtcAddress}
                  onChangeText={setSendBtcAddress}
                  placeholder="BTC address"
                  placeholderTextColor={colors.textTertiary}
                />
                <TextInput
                  style={styles.input}
                  value={sendBtcAmount}
                  onChangeText={setSendBtcAmount}
                  placeholder="Amount (sats)"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                />
                <ActionButton
                  label="Send BTC"
                  onPress={sendBtc}
                  loading={loading}
                  loadingKey="sendBtc"
                  icon={<Send size={16} color="#000" />}
                  variant="primary"
                  small
                />
              </View>
              <ResultCard
                result={sectionResults.send?.result || null}
                error={sectionResults.send?.error || null}
                onDismiss={() => clearSectionResult('send')}
              />
            </Section>

            {/* ─── History ──────────────────────────────────────────────── */}
            <Section
              title="History"
              icon={<Clock size={18} color={colors.textSecondary} />}
              badge={transfers.length + transactions.length || undefined}
            >
              <View style={styles.btnRow}>
                <ActionButton
                  label="Transfers"
                  onPress={loadTransfers}
                  loading={loading}
                  loadingKey="transfers"
                  icon={<ArrowUpDown size={14} color={colors.text} />}
                  small
                />
                <ActionButton
                  label="Transactions"
                  onPress={loadTransactions}
                  loading={loading}
                  loadingKey="txns"
                  icon={<List size={14} color={colors.text} />}
                  small
                />
              </View>

              {/* Transfer list */}
              {transfers.length > 0 && (
                <View style={styles.listContainer}>
                  <Text style={styles.listTitle}>Transfers ({transfers.length})</Text>
                  {transfers.slice(0, 10).map((t, idx) => (
                    <View key={idx} style={[styles.listItem, idx < Math.min(transfers.length, 10) - 1 && styles.listItemBorder]}>
                      <View style={styles.txRow}>
                        <View style={[styles.txBadge, { backgroundColor: t.kind === 'send' ? 'rgba(255,149,0,0.15)' : 'rgba(76,175,80,0.15)' }]}>
                          <Text style={[styles.txBadgeText, { color: t.kind === 'send' ? colors.warning : colors.success }]}>
                            {t.kind === 'send' ? 'OUT' : 'IN'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txAmount}>{t.amount || '--'}</Text>
                          <Text style={styles.txMeta}>{t.status || '--'}{t.updatedAt ? ' · ' + timeSince(t.updatedAt) : ''}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  {transfers.length > 10 && <Text style={styles.moreText}>+ {transfers.length - 10} more</Text>}
                </View>
              )}

              {/* Transaction list */}
              {transactions.length > 0 && (
                <View style={styles.listContainer}>
                  <Text style={styles.listTitle}>Transactions ({transactions.length})</Text>
                  {transactions.slice(0, 10).map((tx, idx) => (
                    <View key={idx} style={[styles.listItem, idx < Math.min(transactions.length, 10) - 1 && styles.listItemBorder]}>
                      <View style={styles.txRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txAmount}>
                            {tx.received ? `+${formatSats(tx.received)}` : ''}{tx.sent ? ` -${formatSats(tx.sent)}` : ''}
                          </Text>
                          <Text style={styles.txMeta} numberOfLines={1}>
                            {tx.txid ? truncate(tx.txid, 32) : '--'}
                          </Text>
                          {tx.fee !== undefined && <Text style={styles.txFee}>Fee: {formatSats(tx.fee)}</Text>}
                        </View>
                      </View>
                    </View>
                  ))}
                  {transactions.length > 10 && <Text style={styles.moreText}>+ {transactions.length - 10} more</Text>}
                </View>
              )}
              <ResultCard
                result={sectionResults.history?.result || null}
                error={sectionResults.history?.error || null}
                onDismiss={() => clearSectionResult('history')}
              />
            </Section>

            {/* ─── Backup & Tools ───────────────────────────────────────── */}
            <Section
              title="Backup & Tools"
              icon={<Archive size={18} color={colors.textSecondary} />}
            >
              <View style={styles.btnRow}>
                <ActionButton
                  label="Create Backup"
                  onPress={createBackup}
                  loading={loading}
                  loadingKey="backup"
                  icon={<Archive size={14} color={colors.text} />}
                  small
                />
                <ActionButton
                  label="Backup Info"
                  onPress={backupInfo}
                  loading={loading}
                  loadingKey="backupInfo"
                  icon={<Eye size={14} color={colors.text} />}
                  small
                />
              </View>
              <ResultCard
                result={sectionResults.backup?.result || null}
                error={sectionResults.backup?.error || null}
                onDismiss={() => clearSectionResult('backup')}
              />
            </Section>

            {/* ─── Advanced Operations ─────────────────────────────────── */}
            <Section
              title="Advanced Operations"
              icon={<Shield size={18} color={colors.textSecondary} />}
            >
              <View style={styles.btnRow}>
                <ActionButton
                  label="Sign Message"
                  onPress={signMessage}
                  loading={loading}
                  loadingKey="signMsg"
                  icon={<Hash size={14} color={colors.text} />}
                  small
                />
                <ActionButton
                  label="Verify Message"
                  onPress={verifyMessage}
                  loading={loading}
                  loadingKey="verifyMsg"
                  icon={<CircleCheck size={14} color={colors.text} />}
                  small
                />
              </View>
              <View style={styles.btnRow}>
                <ActionButton
                  label="Issue UDA"
                  onPress={issueAssetUda}
                  loading={loading}
                  loadingKey="issueUda"
                  icon={<Plus size={14} color={colors.text} />}
                  small
                />
                <ActionButton
                  label="Inflate IFA"
                  onPress={inflateAsset}
                  loading={loading}
                  loadingKey="inflate"
                  icon={<ArrowUpDown size={14} color={colors.text} />}
                  small
                />
              </View>
              <View style={styles.btnRow}>
                <ActionButton
                  label="Decode Invoice"
                  onPress={decodeInvoice}
                  loading={loading}
                  loadingKey="decode"
                  icon={<Hash size={14} color={colors.text} />}
                  small
                />
                <ActionButton
                  label="Restore Backup"
                  onPress={restoreFromBackup}
                  loading={loading}
                  loadingKey="restore"
                  icon={<Download size={14} color={colors.text} />}
                  small
                />
              </View>
              <ResultCard
                result={sectionResults.signMsg?.result || sectionResults.verifyMsg?.result || sectionResults.issueUda?.result || sectionResults.inflate?.result || sectionResults.decode?.result || sectionResults.restore?.result || null}
                error={sectionResults.signMsg?.error || sectionResults.verifyMsg?.error || sectionResults.issueUda?.error || sectionResults.inflate?.error || sectionResults.decode?.error || sectionResults.restore?.error || null}
                onDismiss={() => { clearSectionResult('signMsg'); clearSectionResult('verifyMsg'); clearSectionResult('issueUda'); clearSectionResult('inflate'); clearSectionResult('decode'); clearSectionResult('restore'); }}
              />
            </Section>
          </>
        )}

        {/* ─── Testing Guide ────────────────────────────────────────────── */}
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>Demo Flow</Text>
          <View style={styles.guideSteps}>
            {[
              'Initialize RGB Wallet',
              'Copy address, send testnet BTC from faucet',
              'Wait for confirmation, refresh balance',
              'Create UTXOs (allocate slots for RGB)',
              'Issue an asset (NIA or CFA)',
              'Load assets to verify',
              'Generate receive invoice (Blind Receive)',
              'Send assets using an invoice',
            ].map((step, idx) => (
              <View key={idx} style={styles.guideStep}>
                <View style={styles.guideNum}>
                  <Text style={styles.guideNumText}>{idx + 1}</Text>
                </View>
                <Text style={styles.guideStepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 70 },
  backText: { color: colors.primary, fontSize: 16, marginLeft: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // Status bar
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14, fontWeight: '600' },

  // Overview card
  overviewCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addressValue: { fontSize: 14, color: colors.text, fontFamily: 'monospace' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceValue: { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 2 },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 8, fontStyle: 'italic' },

  // Section
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  sectionDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#000' },

  // Buttons
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
  },
  btnSmall: {
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnAccent: { backgroundColor: '#60a5fa' },
  btnDanger: { backgroundColor: colors.danger },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 15, fontWeight: '600' },
  btnTextSmall: { fontSize: 13 },
  btnRow: { flexDirection: 'row', gap: 8 },

  // Inputs
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    fontFamily: 'monospace',
  },

  // Result card
  resultCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: 'rgba(76,175,80,0.08)',
    borderColor: 'rgba(76,175,80,0.25)',
  },
  resultError: {
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderColor: 'rgba(255,107,107,0.25)',
  },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  resultText: { fontSize: 13, flex: 1, lineHeight: 18 },
  resultDismiss: { fontSize: 11, color: colors.textTertiary, marginTop: 6, textAlign: 'right' },

  // Copy row
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  copyLabel: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  copyValue: { fontSize: 14, color: colors.text, fontFamily: 'monospace' },

  // List
  listContainer: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listTitle: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  listItem: { paddingVertical: 10 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },

  // Asset items
  assetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assetBadge: {
    backgroundColor: 'rgba(255,101,1,0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  assetBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  assetTicker: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  assetAmount: { fontSize: 16, fontWeight: '600', color: colors.text },
  assetName: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  assetId: { fontSize: 11, color: colors.textTertiary, fontFamily: 'monospace', marginTop: 4 },

  // Transaction items
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  txBadgeText: { fontSize: 11, fontWeight: '700' },
  txAmount: { fontSize: 14, fontWeight: '600', color: colors.text },
  txMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  txFee: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  moreText: { fontSize: 12, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },

  // Guide
  guideCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guideTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  guideSteps: { gap: 10 },
  guideStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  guideNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideNumText: { fontSize: 12, fontWeight: '700', color: '#000' },
  guideStepText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
});
