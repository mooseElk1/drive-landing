import React, { useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface MassInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (mass: number) => void;
  currentMass: number;
}

export function MassInputModal({
  visible,
  onClose,
  onSave,
  currentMass,
}: MassInputModalProps) {
  const [massInput, setMassInput] = useState(currentMass.toString());

  const handleSave = () => {
    const mass = parseFloat(massInput);
    if (!isNaN(mass) && mass > 0) {
      onSave(mass);
      onClose();
    }
  };

  const handleCancel = () => {
    setMassInput(currentMass.toString());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 24,
            margin: 20,
            minWidth: 300,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              textAlign: 'center',
              marginBottom: 16,
              color: '#374151',
            }}
          >
            Set Sled Mass
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            Enter the total mass of the sled including any weights
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              paddingHorizontal: 12,
              marginBottom: 24,
            }}
          >
            <TextInput
              value={massInput}
              onChangeText={setMassInput}
              keyboardType="numeric"
              placeholder="Enter mass"
              style={{
                flex: 1,
                paddingVertical: 12,
                fontSize: 16,
                color: '#374151',
              }}
            />
            <Text
              style={{
                fontSize: 16,
                color: '#6B7280',
                marginLeft: 8,
              }}
            >
              kg
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#D1D5DB',
                backgroundColor: 'white',
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 16,
                  color: '#6B7280',
                  fontWeight: '500',
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: '#3B82F6',
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 16,
                  color: 'white',
                  fontWeight: '500',
                }}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
