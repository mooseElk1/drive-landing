import { useColorScheme } from 'nativewind';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View as RNView } from 'react-native';

import { Pressable, SegmentedControl, Text, Tile } from '@/components/ui';
import colors from '@/components/ui/colors';
import { Modal, useModal } from '@/components/ui/modal';
import { formatMassForUnit, lbsToKg, type MassUnit } from '@/lib/mass-units';
import { useCalculationConfigStore } from '@/store/calculation-config';
import { useUnitPreferencesStore } from '@/store/unit-preferences';

function MassUnitToggle({
  massUnit,
  onChange,
}: {
  massUnit: MassUnit;
  onChange: (unit: MassUnit) => void;
}) {
  return (
    <RNView style={sheetStyles.unitToggleRow}>
      <SegmentedControl<MassUnit>
        size="sm"
        value={massUnit}
        options={[
          { value: 'kg', label: 'kg' },
          { value: 'lbs', label: 'lbs' },
        ]}
        onChange={onChange}
        testID="sled-mass-unit-toggle"
      />
    </RNView>
  );
}

function MassValueInputRow({
  draft,
  setDraft,
  unitLabel,
  inputBg,
  inputBorder,
  inputText,
  unitColor,
}: {
  draft: string;
  setDraft: (next: string) => void;
  unitLabel: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  unitColor: string;
}) {
  return (
    <RNView
      style={[
        sheetStyles.inputRow,
        { backgroundColor: inputBg, borderColor: inputBorder },
      ]}
    >
      <TextInput
        style={[sheetStyles.input, { color: inputText }]}
        value={draft}
        onChangeText={setDraft}
        keyboardType="decimal-pad"
        selectTextOnFocus
        autoFocus
        placeholderTextColor={colors.neutral[500]}
      />
      <Text style={[sheetStyles.inputUnit, { color: unitColor }]}>
        {unitLabel}
      </Text>
    </RNView>
  );
}

function EditMassModal({
  modal,
  currentMass,
  onConfirm,
}: {
  modal: ReturnType<typeof useModal>;
  currentMass: number;
  onConfirm: (value: number) => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const massUnit = useUnitPreferencesStore((s) => s.massUnit);
  const setMassUnit = useUnitPreferencesStore((s) => s.setMassUnit);
  const [draft, setDraft] = useState(formatMassForUnit(currentMass, massUnit));

  // Re-sync draft whenever the stored mass changes (e.g. after a successful save)
  useEffect(() => {
    setDraft(formatMassForUnit(currentMass, massUnit));
  }, [currentMass, massUnit]);

  const sheetBg = isDark ? '#1E1E1E' : '#F5F5F5';
  const handleBg = isDark ? '#474747' : '#D4D4D4';
  const inputBg = isDark ? '#2E2E2E' : '#FFFFFF';
  const inputBorder = isDark ? '#474747' : '#D4D4D4';
  const inputText = isDark ? colors.neutral[100] : colors.neutral[900];
  const unitColor = isDark ? colors.neutral[400] : colors.neutral[500];

  const handleConfirm = () => {
    const parsed = parseFloat(draft);
    if (!isNaN(parsed) && parsed > 0) {
      const valueKg = massUnit === 'lbs' ? lbsToKg(parsed) : parsed;
      onConfirm(valueKg);
      modal.dismiss();
    }
  };

  return (
    <Modal
      ref={modal.ref}
      snapPoints={['40%']}
      title={'Set Sled Mass'}
      backgroundStyle={{ backgroundColor: sheetBg }}
      handleIndicatorStyle={{ backgroundColor: handleBg }}
    >
      <RNView style={sheetStyles.body}>
        <MassUnitToggle massUnit={massUnit} onChange={setMassUnit} />
        <MassValueInputRow
          draft={draft}
          setDraft={setDraft}
          unitLabel={massUnit}
          inputBg={inputBg}
          inputBorder={inputBorder}
          inputText={inputText}
          unitColor={unitColor}
        />

        <Pressable onPress={handleConfirm} style={sheetStyles.confirmBtn}>
          <Text style={sheetStyles.confirmLabel}>{'Set'}</Text>
        </Pressable>
      </RNView>
    </Modal>
  );
}

export function SledMassTile({ className }: { className?: string }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const modal = useModal();
  const { config, updateConfig } = useCalculationConfigStore();
  const massUnit = useUnitPreferencesStore((s) => s.massUnit);

  // Keep a stable ref to current mass so modal re-renders don't reset draft
  const massRef = useRef(config.mass);
  massRef.current = config.mass;

  const labelColor = isDark ? colors.neutral[400] : colors.neutral[500];
  const valueColor = isDark ? colors.neutral[100] : colors.neutral[900];
  const unitColor = isDark ? colors.neutral[500] : colors.neutral[400];

  return (
    <>
      <Tile
        pressable
        variant="full"
        onPress={modal.present}
        className={
          className ?? 'mx-5 mb-2 bg-neutral-100 px-4 py-3 dark:bg-charcoal-900'
        }
      >
        <Text style={[tileStyles.label, { color: labelColor }]}>
          {'SLED MASS'}
        </Text>
        <RNView style={tileStyles.valueRow}>
          <Text style={[tileStyles.value, { color: valueColor }]}>
            {formatMassForUnit(config.mass, massUnit)}
          </Text>
          <Text style={[tileStyles.unit, { color: unitColor }]}>
            {massUnit.toUpperCase()}
          </Text>
        </RNView>
      </Tile>

      <EditMassModal
        modal={modal}
        currentMass={config.mass}
        onConfirm={(v) => updateConfig({ mass: v })}
      />
    </>
  );
}

const tileStyles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
});

const sheetStyles = StyleSheet.create({
  body: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 16,
  },
  unitToggleRow: {
    alignItems: 'flex-start',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    paddingVertical: 8,
  },
  inputUnit: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 4,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8C00',
  },
  confirmLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
