import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../theme';
import { AppTheme } from '../types';

export function useTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}