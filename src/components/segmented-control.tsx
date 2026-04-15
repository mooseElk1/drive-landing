import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface SegmentedControlProps {
  values: string[];
  selectedIndex: number;
  onValueChange: (index: number) => void;
  activeColor?: string;
  inactiveColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
}

export function SegmentedControl({
  values,
  selectedIndex,
  onValueChange,
  activeColor = '#3B82F6',
  inactiveColor = '#E5E7EB',
  activeTextColor = '#FFFFFF',
  inactiveTextColor = '#6B7280',
}: SegmentedControlProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: inactiveColor,
        borderRadius: 8,
        padding: 2,
        width: 'auto',
        alignSelf: 'center',
      }}
    >
      {values.map((value, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onValueChange(index)}
          style={{
            flex: 1,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 6,
            backgroundColor:
              selectedIndex === index ? activeColor : 'transparent',
            minWidth: 60,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color:
                selectedIndex === index ? activeTextColor : inactiveTextColor,
            }}
          >
            {value}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
