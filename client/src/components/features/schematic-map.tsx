import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import AppText from '@/components/ui/app-text';
import Icon from '@/components/ui/icon';
import { colors, fonts, radius } from '@/theme';

export type MapPin = {
  id: string;
  label: string;
  /** 0–1 across and down the map */
  x: number;
  y: number;
  kind: 'contracted' | 'other' | 'store' | 'partnerStore';
  emergency?: boolean;
};

type SchematicMapProps = {
  pins: MapPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  height?: number;
};

const pinColors = {
  contracted: colors.primary,
  other: colors.muted,
  store: colors.accentDark,
  partnerStore: colors.accentDark,
};

// A drawn city map with tappable pins. Stands in for a real map service (Mapbox,
// Google Maps or OpenStreetMap) until positioning and map keys are set up.
const SchematicMap = ({ pins, selectedId, onSelect, height = 240 }: SchematicMapProps) => {
  const { t } = useTranslation();

  return (
    <View style={[styles.map, { height }]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 60" preserveAspectRatio="none" accessible={false}>
        <Rect width="100" height="60" fill="#E9EEEA" />
        <Path d="M0 44 C 20 40, 30 50, 50 46 S 80 36, 100 42 V60 H0 Z" fill="#CFE3E6" />
        <Path d="M38 0 C 40 14, 52 22, 50 30 S 44 44, 50 46" stroke="#CFE3E6" strokeWidth="3" fill="none" />
        <Rect x="66" y="8" width="18" height="12" rx="3" fill="#D8E7D2" />
        <Rect x="8" y="12" width="12" height="9" rx="3" fill="#D8E7D2" />
        <Path d="M0 24 H100 M0 34 H100 M24 0 V60 M62 0 V60 M84 0 V60" stroke="#FFFFFF" strokeWidth="1.6" />
        <Path d="M0 8 L100 52" stroke="#FFFFFF" strokeWidth="2.4" />
        <Circle cx="48" cy="29" r="1.6" fill="#2F7BEA" />
        <Circle cx="48" cy="29" r="3.2" fill="#2F7BEA" opacity="0.2" />
      </Svg>
      {pins.map((pin) => {
        const selected = pin.id === selectedId;
        const color = pin.emergency ? colors.red : pinColors[pin.kind];
        return (
          <Pressable
            key={pin.id}
            accessibilityRole="button"
            accessibilityLabel={pin.label}
            accessibilityState={{ selected }}
            onPress={() => onSelect(pin.id)}
            style={[styles.pinTarget, { left: `${pin.x * 100}%`, top: `${pin.y * 100}%` }]}
          >
            <View style={[styles.pin, { backgroundColor: color }, selected && styles.pinSelected]}>
              <Icon
                name={pin.kind === 'store' || pin.kind === 'partnerStore' ? 'store' : pin.emergency ? 'emergency' : 'paw'}
                size={selected ? 18 : 14}
                color={colors.onDark}
                strokeWidth={2.2}
              />
            </View>
          </Pressable>
        );
      })}
      <View style={styles.youAreHere} accessible accessibilityLabel={t('map.youAreHere')}>
        <AppText variant="caption" style={styles.youText}>
          {t('map.youAreHere')}
        </AppText>
      </View>
    </View>
  );
};

export default SchematicMap;

const styles = StyleSheet.create({
  map: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  pinTarget: {
    position: 'absolute',
    width: 44,
    height: 44,
    marginLeft: -22,
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinSelected: { width: 38, height: 38, borderRadius: 19, borderWidth: 3 },
  youAreHere: {
    position: 'absolute',
    left: '50%',
    top: '48%',
    marginTop: 14,
    marginLeft: -36,
    width: 72,
    alignItems: 'center',
  },
  youText: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#2F5FA8' },
});
