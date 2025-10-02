import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ArrowUp, ArrowDown } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';

interface HoldingItem {
  amount: string;
  value: string;
  change: string;
  isPositive: boolean;
}

interface ActivityItem {
  id: string;
  type: 'sent' | 'received';
  amount: string;
  value: string;
  date: string;
}

export default function AssetDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedTimeframe, setSelectedTimeframe] = useState('24H');

  const screenWidth = Dimensions.get('window').width;

  // Mock chart data
  const chartData = {
    labels: ['', '', '', '', '', ''],
    datasets: [
      {
        data: [45000, 47000, 46500, 48000, 52000, 54000, 53000, 55000, 58000, 62000, 65000, 93941],
        strokeWidth: 3,
      },
    ],
  };

  const timeframes = ['24H', '1W', '1M', '1Y', 'All'];

  // Get asset data from params or use defaults
  const assetData = {
    name: (params.name as string) || 'Bitcoin',
    symbol: (params.symbol as string) || 'BTC',
    price: '$93,941.20',
    change: '+12.55%',
    isPositive: true,
    icon: (params.icon as string) || '₿',
    color: (params.color as string) || '#FF9500',
  };

  const holdings: HoldingItem = {
    amount: '0.5025 BTC',
    value: '$48,827.32',
    change: '+6.93%',
    isPositive: true,
  };

  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'sent',
      amount: '2.45 BTC',
      value: '99,064.83 USD',
      date: 'Today',
    },
    {
      id: '2',
      type: 'received',
      amount: '0.5 BTC',
      value: '49,532.42 USD',
      date: 'Yesterday',
    },
  ];

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ChevronLeft size={24} color="#FF6501" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.assetHeader}>
          <View style={[styles.assetIcon, { backgroundColor: assetData.color }]}>
            <Text style={styles.assetIconText}>{assetData.icon}</Text>
          </View>
          <Text style={styles.assetTitle}>
            {assetData.name} | {assetData.symbol}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={styles.priceText}>{assetData.price}</Text>
          <Text
            style={[styles.changeText, { color: assetData.isPositive ? '#4CAF50' : '#FF3B30' }]}
          >
            {assetData.change}
          </Text>
        </View>

        {/* Chart Section */}
        <View style={styles.chartSection}>
          <LineChart
            data={chartData}
            width={screenWidth - 40}
            height={200}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'transparent',
              backgroundGradientTo: 'transparent',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(30, 144, 255, ${opacity})`,
              labelColor: () => 'transparent',
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '0',
              },
              propsForBackgroundLines: {
                strokeWidth: 0,
              },
            }}
            bezier
            style={styles.chart}
            withDots={false}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLabels={false}
            withHorizontalLabels={false}
          />
        </View>

        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          {timeframes.map(timeframe => (
            <TouchableOpacity
              key={timeframe}
              style={[
                styles.timeframeButton,
                selectedTimeframe === timeframe && styles.selectedTimeframe,
              ]}
              onPress={() => setSelectedTimeframe(timeframe)}
            >
              <Text
                style={[
                  styles.timeframeText,
                  selectedTimeframe === timeframe && styles.selectedTimeframeText,
                ]}
              >
                {timeframe}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Holdings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Holdings</Text>
          <View style={styles.holdingItem}>
            <View style={styles.holdingLeft}>
              <View style={[styles.holdingIcon, { backgroundColor: assetData.color }]}>
                <Text style={styles.holdingIconText}>{assetData.icon}</Text>
              </View>
              <View style={styles.holdingInfo}>
                <Text style={styles.holdingName}>{assetData.name}</Text>
                <Text
                  style={[
                    styles.holdingChange,
                    { color: holdings.isPositive ? '#4CAF50' : '#FF3B30' },
                  ]}
                >
                  {holdings.change}
                </Text>
              </View>
            </View>
            <View style={styles.holdingRight}>
              <Text style={styles.holdingAmount}>{holdings.amount}</Text>
              <Text style={styles.holdingValue}>{holdings.value}</Text>
            </View>
          </View>
        </View>

        {/* Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          {activities.map(activity => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityLeft}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: activity.type === 'sent' ? '#FF3B30' : '#4CAF50' },
                  ]}
                >
                  {activity.type === 'sent' ? (
                    <ArrowUp size={16} color="#fff" />
                  ) : (
                    <ArrowDown size={16} color="#fff" />
                  )}
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityType}>{assetData.name}</Text>
                  <Text style={styles.activityStatus}>
                    {activity.type === 'sent' ? 'Sent' : 'Received'}
                  </Text>
                </View>
              </View>
              <View style={styles.activityRight}>
                <Text style={styles.activityAmount}>{activity.amount}</Text>
                <Text style={styles.activityValue}>{activity.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#FF6501',
    fontSize: 16,
    marginLeft: 4,
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  assetIconText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  assetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  priceSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  priceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  changeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  chart: {
    borderRadius: 16,
  },
  timeframeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: 'transparent',
  },
  selectedTimeframe: {
    backgroundColor: '#FF6501',
  },
  timeframeText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedTimeframeText: {
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  holdingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  holdingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  holdingIconText: {
    fontSize: 18,
    color: '#fff',
  },
  holdingInfo: {
    flex: 1,
  },
  holdingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  holdingChange: {
    fontSize: 14,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  holdingValue: {
    fontSize: 14,
    color: '#999',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  activityStatus: {
    fontSize: 14,
    color: '#999',
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  activityValue: {
    fontSize: 14,
    color: '#999',
  },
});
