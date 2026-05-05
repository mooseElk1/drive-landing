import { Env } from '@env';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Alert } from 'react-native';

import { BooleanSettingItem } from '@/components/settings/boolean-setting-item';
import { Item } from '@/components/settings/item';
import { ItemsContainer } from '@/components/settings/items-container';
import { LanguageItem } from '@/components/settings/language-item';
import { NumericSettingItem } from '@/components/settings/numeric-setting-item';
import { SelectSettingItem } from '@/components/settings/select-setting-item';
import { ThemeItem } from '@/components/settings/theme-item';
import {
  colors,
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { Github, Rate, Share, Support, Website } from '@/components/ui/icons';
import { useAthleteProfileStore } from '@/features/power-profile/store/athlete-profile-store';
import { translate, useAuth } from '@/lib';
import {
  DEFAULT_CALCULATION_CONFIG,
  useCalculationConfigStore,
} from '@/store/calculation-config';
import type { AccelerationConfig } from '@/types/calculation-configs';
import type { VelocityConfig } from '@/types/velocity-calcs';

function AppLinksSection() {
  const { colorScheme } = useColorScheme();
  const iconColor =
    colorScheme === 'dark' ? colors.neutral[400] : colors.neutral[500];
  return (
    <>
      <ItemsContainer title="settings.support_us">
        <Item
          text="settings.share"
          icon={<Share color={iconColor} />}
          onPress={() => {}}
        />
        <Item
          text="settings.rate"
          icon={<Rate color={iconColor} />}
          onPress={() => {}}
        />
        <Item
          text="settings.support"
          icon={<Support color={iconColor} />}
          onPress={() => {}}
        />
      </ItemsContainer>
      <ItemsContainer title="settings.links">
        <Item text="settings.privacy" onPress={() => {}} />
        <Item text="settings.terms" onPress={() => {}} />
        <Item
          text="settings.github"
          icon={<Github color={iconColor} />}
          onPress={() => {}}
        />
        <Item
          text="settings.website"
          icon={<Website color={iconColor} />}
          onPress={() => {}}
        />
      </ItemsContainer>
    </>
  );
}

function AlgorithmSection() {
  const { config, updateConfig, updateVelocityConfig } =
    useCalculationConfigStore();
  const defaultVel =
    DEFAULT_CALCULATION_CONFIG.velocity as Readonly<VelocityConfig>;
  const vel = config.velocity ?? defaultVel;
  return (
    <ItemsContainer title="settings.algorithm">
      <NumericSettingItem
        label="settings.mass"
        value={config.mass}
        onChange={(mass) => updateConfig({ mass })}
        decimalPlaces={1}
      />
      <NumericSettingItem
        label="settings.vel_leak"
        value={vel.velLeak ?? defaultVel.velLeak}
        onChange={(velLeak) => updateVelocityConfig({ velLeak })}
        decimalPlaces={4}
      />
      <SelectSettingItem
        label="settings.integration_source"
        value={vel.integrationAccelSource ?? 'vel_lp'}
        options={[
          { value: 'vel_lp', labelKey: 'settings.integration_source_vel_lp' },
          { value: 'raw', labelKey: 'settings.integration_source_raw' },
          { value: 'lp', labelKey: 'settings.integration_source_lp' },
          { value: 'hp', labelKey: 'settings.integration_source_hp' },
        ]}
        onChange={(integrationAccelSource) =>
          updateVelocityConfig({ integrationAccelSource })
        }
      />
      <NumericSettingItem
        label="settings.vel_floor_activation"
        value={
          vel.velFloorActivationThreshold ??
          defaultVel.velFloorActivationThreshold ??
          0.5
        }
        onChange={(velFloorActivationThreshold) =>
          updateVelocityConfig({ velFloorActivationThreshold })
        }
        decimalPlaces={2}
      />
      <NumericSettingItem
        label="settings.vel_floor_direction"
        value={
          vel.velFloorDirectionThreshold ??
          defaultVel.velFloorDirectionThreshold ??
          0.08
        }
        onChange={(velFloorDirectionThreshold) =>
          updateVelocityConfig({ velFloorDirectionThreshold })
        }
        decimalPlaces={3}
      />
    </ItemsContainer>
  );
}

function ZuptItems() {
  const { config, updateAccelerationConfig, resetConfig } =
    useCalculationConfigStore();
  const defaultAcc =
    DEFAULT_CALCULATION_CONFIG.acceleration as Readonly<AccelerationConfig>;
  const acc = config.acceleration ?? defaultAcc;
  return (
    <>
      <NumericSettingItem
        label="settings.zupt_accel"
        value={acc.zuptAccelThreshold ?? defaultAcc.zuptAccelThreshold}
        onChange={(zuptAccelThreshold) =>
          updateAccelerationConfig({ zuptAccelThreshold })
        }
        decimalPlaces={3}
      />
      <NumericSettingItem
        label="settings.zupt_gyro"
        value={acc.zuptGyroThreshold ?? defaultAcc.zuptGyroThreshold}
        onChange={(zuptGyroThreshold) =>
          updateAccelerationConfig({ zuptGyroThreshold })
        }
        decimalPlaces={3}
      />
      <NumericSettingItem
        label="settings.zupt_min_time"
        value={acc.zuptMinTime ?? defaultAcc.zuptMinTime}
        onChange={(zuptMinTime) => updateAccelerationConfig({ zuptMinTime })}
        decimalPlaces={3}
      />
      <NumericSettingItem
        label="settings.zupt_bias_alpha"
        value={acc.zuptBiasAlphaActive ?? defaultAcc.zuptBiasAlphaActive}
        onChange={(zuptBiasAlphaActive) =>
          updateAccelerationConfig({ zuptBiasAlphaActive })
        }
        decimalPlaces={3}
      />
      <Item text="settings.reset_defaults" onPress={resetConfig} />
    </>
  );
}

function AccelerationSection() {
  const { config, updateAccelerationConfig } = useCalculationConfigStore();
  const defaultAcc =
    DEFAULT_CALCULATION_CONFIG.acceleration as Readonly<AccelerationConfig>;
  const acc = config.acceleration ?? defaultAcc;
  return (
    <ItemsContainer title="settings.acceleration">
      <BooleanSettingItem
        label="settings.apply_rotation"
        value={acc.applyRotation ?? defaultAcc.applyRotation}
        onChange={(applyRotation) =>
          updateAccelerationConfig({ applyRotation })
        }
      />
      <BooleanSettingItem
        label="settings.remove_bias"
        value={acc.removeBias ?? defaultAcc.removeBias}
        onChange={(removeBias) => updateAccelerationConfig({ removeBias })}
      />
      <NumericSettingItem
        label="settings.hpf_cutoff"
        value={acc.hpfCutoffHz ?? defaultAcc.hpfCutoffHz}
        onChange={(hpfCutoffHz) => updateAccelerationConfig({ hpfCutoffHz })}
        decimalPlaces={1}
      />
      <NumericSettingItem
        label="settings.lpf_cutoff"
        value={acc.lpfCutoffHz ?? defaultAcc.lpfCutoffHz}
        onChange={(lpfCutoffHz) => updateAccelerationConfig({ lpfCutoffHz })}
        decimalPlaces={1}
      />
      <NumericSettingItem
        label="settings.vel_lpf_cutoff"
        value={acc.velLpfCutoffHz ?? defaultAcc.velLpfCutoffHz}
        onChange={(velLpfCutoffHz) =>
          updateAccelerationConfig({ velLpfCutoffHz })
        }
        decimalPlaces={1}
      />
      <NumericSettingItem
        label="settings.smooth_window"
        value={acc.smoothWindowSize ?? defaultAcc.smoothWindowSize}
        onChange={(v) =>
          updateAccelerationConfig({ smoothWindowSize: Math.round(v) })
        }
        decimalPlaces={0}
      />
      <ZuptItems />
    </ItemsContainer>
  );
}

export default function Settings() {
  const router = useRouter();
  const signOut = useAuth.use.signOut();
  const athletes = useAthleteProfileStore((s) => s.athletes);
  const deleteAthlete = useAthleteProfileStore((s) => s.deleteAthlete);

  const activeAthlete = athletes[0] ?? null;
  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView>
        <View className="flex-1 px-4 pt-16 ">
          <Text className="text-xl font-bold">
            {translate('settings.title')}
          </Text>
          <ItemsContainer title="settings.generale">
            <Item
              text="settings.athlete_profile"
              onPress={() => router.push('/profile-setup')}
              value={activeAthlete?.name}
            />
            <Item
              text="settings.delete_athlete_profile"
              onPress={() => {
                if (!activeAthlete) return;
                Alert.alert(
                  translate('settings.delete_athlete_profile'),
                  translate('settings.delete_athlete_profile_confirm'),
                  [
                    { text: translate('settings.cancel'), style: 'cancel' },
                    {
                      text: translate('settings.delete'),
                      style: 'destructive',
                      onPress: () => deleteAthlete(activeAthlete.id),
                    },
                  ]
                );
              }}
            />
            <Item
              text="settings.style_guide"
              onPress={() => router.push('/style')}
            />
            <LanguageItem />
            <ThemeItem />
          </ItemsContainer>
          <ItemsContainer title="settings.about">
            <Item text="settings.app_name" value={Env.NAME} />
            <Item text="settings.version" value={Env.VERSION} />
          </ItemsContainer>
          <AppLinksSection />
          <AlgorithmSection />
          <AccelerationSection />
          <View className="my-8">
            <ItemsContainer>
              <Item text="settings.logout" onPress={signOut} />
            </ItemsContainer>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
