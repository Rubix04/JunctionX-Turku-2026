import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';

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

// Map colours, close to a light street map
const LAND = '#EEF0EA';
const WATER = '#BFDCE6';
const PARK = '#D5E6CC';
const BLOCK = '#E2E4DE';
const ROAD = '#FFFFFF';
const HIGHWAY = '#F3DFA8';
const YOU = '#2F7BEA';

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
        {/* Land, the sea and the archipelago in the south-west */}
        <Rect width="100" height="60" fill={LAND} />
        <Path d="M0 38 C 7 40, 12 46, 15 52 S 18 58, 19 60 H0 Z" fill={WATER} />
        <G fill={LAND}>
          <Ellipse cx="4" cy="49" rx="2.4" ry="1.6" />
          <Ellipse cx="9" cy="56" rx="3" ry="1.8" />
          <Ellipse cx="2.5" cy="57" rx="1.6" ry="1.1" />
        </G>
        {/* Parks and woods */}
        <G fill={PARK}>
          <Rect x="66" y="5" width="15" height="9" rx="4" />
          <Rect x="6" y="7" width="11" height="8" rx="4" />
          <Rect x="30" y="47" width="10" height="7" rx="3.5" />
          <Rect x="88" y="28" width="9" height="12" rx="4" />
        </G>
        {/* City centre blocks along the river */}
        <G fill={BLOCK}>
          <Rect x="38" y="17" width="7" height="5" rx="1" />
          <Rect x="46" y="16" width="6" height="4" rx="1" />
          <Rect x="36" y="31" width="7" height="5" rx="1" />
          <Rect x="58" y="29" width="7" height="5" rx="1" />
          <Rect x="61" y="21" width="6" height="5" rx="1" />
          <Rect x="44" y="35" width="6" height="4" rx="1" />
        </G>
        {/* Aurajoki flowing to the sea */}
        <Path d="M82 0 C 74 9, 64 18, 56 25 S 40 38, 31 46 S 20 55, 16 60" stroke={WATER} strokeWidth="3.2" fill="none" />
        {/* Streets, the ring road and the roads out of town */}
        <G stroke={ROAD} fill="none" strokeLinecap="round">
          <Path d="M48 29 L12 12 M48 29 L86 48 M48 29 L57 4 M48 29 L26 40 M48 29 L70 36" strokeWidth="1.3" />
          <Path d="M34 22 H62 M38 36 H60 M44 14 V44" strokeWidth="0.8" />
          <Path d="M8 32 C 14 12, 60 2, 94 20" strokeWidth="1.6" />
        </G>
        <Path d="M0 18 C 30 20, 62 8, 100 12" stroke={HIGHWAY} strokeWidth="2.2" fill="none" />
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
              <View style={styles.pinIcon}>
                <Icon
                  name={pin.kind === 'store' || pin.kind === 'partnerStore' ? 'store' : pin.emergency ? 'emergency' : 'paw'}
                  size={selected ? 17 : 13}
                  color={colors.onDark}
                  strokeWidth={2.2}
                />
              </View>
            </View>
          </Pressable>
        );
      })}
      <View style={styles.youAreHere} accessible accessibilityLabel={t('map.youAreHere')}>
        <View style={styles.youHalo}>
          <View style={styles.youDot} />
        </View>
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
  // The marker's tip sits on the place: the target ends just below the tip.
  pinTarget: {
    position: 'absolute',
    width: 44,
    height: 48,
    marginLeft: -22,
    marginTop: -46,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // A rounded square with one sharp corner, turned so the corner points down
  pin: {
    width: 28,
    height: 28,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 2,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    marginBottom: 6,
  },
  pinSelected: { width: 36, height: 36, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderWidth: 3 },
  pinIcon: { transform: [{ rotate: '-45deg' }] },
  youAreHere: {
    position: 'absolute',
    left: '48%',
    top: '48.3%',
    marginTop: -14,
    marginLeft: -36,
    width: 72,
    alignItems: 'center',
  },
  youHalo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(47,123,234,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: YOU, borderWidth: 2.5, borderColor: colors.surface },
  youText: { fontFamily: fonts.bodyBold, fontSize: 11, color: '#2F5FA8' },
});
