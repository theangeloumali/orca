import { View, type StyleProp, type ViewStyle } from 'react-native'

/** A small filled circle carrying a machine's or a status's color. */
export function ColorDot({
  color,
  size = 6,
  style
}: {
  color: string
  size?: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  )
}
