import React from 'react';
import type { PressableProps, ViewProps } from 'react-native';
import { Pressable, View } from 'react-native';

export const TILE_RADIUS = 24;
// NOTE: Keep this static. NativeWind can't reliably apply dynamic classnames.
const TILE_RADIUS_CLASS = 'rounded-3xl';

type TileVariant = 'stat' | 'full';

type BaseProps = {
  variant?: TileVariant;
  className?: string;
};

type TileViewProps = BaseProps & ViewProps & { pressable?: false };
type TilePressableProps = BaseProps & PressableProps & { pressable: true };

export function Tile(props: TileViewProps): React.ReactElement;
export function Tile(props: TilePressableProps): React.ReactElement;
export function Tile(props: TileViewProps | TilePressableProps) {
  if ('pressable' in props && props.pressable) {
    const {
      pressable: _pressable,
      variant = 'full',
      className = '',
      style,
      ...rest
    } = props;
    const baseClassName =
      variant === 'stat' ? 'flex-1 items-center px-2 py-3' : 'px-4 py-3';
    const combinedClassName = `${TILE_RADIUS_CLASS} ${baseClassName} ${className}`;
    return <Pressable className={combinedClassName} style={style} {...rest} />;
  }

  const {
    variant = 'full',
    className = '',
    style,
    ...rest
  } = props as TileViewProps;
  const baseClassName =
    variant === 'stat' ? 'flex-1 items-center px-2 py-3' : 'px-4 py-3';
  const combinedClassName = `${TILE_RADIUS_CLASS} ${baseClassName} ${className}`;
  return <View className={combinedClassName} style={style} {...rest} />;
}
