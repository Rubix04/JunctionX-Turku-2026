import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, type VideoSource } from 'expo-video';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

type VideoBackgroundProps = {
  source: VideoSource;
  /** Shown until the first video frame, and instead of the video if it can't play */
  poster?: number;
  /** Darkness of the brand-blue overlay at the bottom, 0–1. Keeps white text readable. */
  overlayOpacity?: number;
  /**
   * Moves the video up by this share of the screen height (0–0.4), so the subject isn't hidden
   * behind content at the bottom. The space left below fades into brand blue.
   */
  shiftUp?: number;
  children?: ReactNode;
};

// Full-screen, muted, looping video behind the content, e.g. the sign-in landing page.
const VideoBackground = ({
  source,
  poster,
  overlayOpacity = 0.85,
  shiftUp = 0,
  children,
}: VideoBackgroundProps) => {
  const [firstFrameShown, setFirstFrameShown] = useState(false);
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <View style={styles.container}>
      <View style={[styles.media, { top: `${-shiftUp * 100}%` }]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
          playsInline
          onFirstFrameRender={() => setFirstFrameShown(true)}
        />
        {poster !== undefined && !firstFrameShown && (
          <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" />
        )}
      </View>

      {/* Light at the top so the video shows, dark at the bottom behind the buttons. */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="videoShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primaryDark} stopOpacity={overlayOpacity * 0.45} />
            <Stop offset="0.45" stopColor={colors.primaryDark} stopOpacity={overlayOpacity * 0.2} />
            <Stop offset="1" stopColor={colors.primaryDark} stopOpacity={overlayOpacity} />
          </LinearGradient>
          {/* Hides the bottom edge of a shifted video. */}
          <LinearGradient id="videoEdge" x1="0" y1="0" x2="0" y2="1">
            <Stop offset={Math.max(0, 1 - shiftUp - 0.15)} stopColor={colors.primaryDark} stopOpacity={0} />
            <Stop offset={1 - shiftUp} stopColor={colors.primaryDark} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.primaryDark} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#videoShade)" />
        {shiftUp > 0 && <Rect width="100%" height="100%" fill="url(#videoEdge)" />}
      </Svg>

      {children}
    </View>
  );
};

export default VideoBackground;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark, overflow: 'hidden' },
  media: { position: 'absolute', left: 0, right: 0, height: '100%' },
});
