import React from 'react';
import type { PressableProps, ViewProps } from 'react-native';
import { Pressable, View } from 'react-native';

export const TILE_RADIUS = 16;

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
    const combinedClassName = `rounded-[${TILE_RADIUS}px] ${baseClassName} ${className}`;
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
  const combinedClassName = `rounded-[${TILE_RADIUS}px] ${baseClassName} ${className}`;
  return <View className={combinedClassName} style={style} {...rest} />;
}
