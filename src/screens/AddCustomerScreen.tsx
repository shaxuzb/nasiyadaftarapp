import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApp }        from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { useTheme }      from '../hooks/useTheme';
import { AppHeader }     from '../components/AppHeader';
import { AppInput }      from '../components/AppInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { hapticError, hapticSuccess, hapticTap } from '../utils/haptics';
import { spacing, typography } from '../theme';
import { RootStackParamList }  from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface FormErrors {
  firstName?: string;
  lastName?:  string;
  phone?:     string;
}

export function AddCustomerScreen() {
  const theme      = useTheme();
  const navigation = useNavigation<Nav>();
  const { addCustomer } = useApp();
  const { showToast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [note,      setNote]      = useState('');
  const [errors,    setErrors]    = useState<FormErrors>({});
  const [saving,    setSaving]    = useState(false);

  function validate(): boolean {
    const e: FormErrors = {};
    if (!firstName.trim()) e.firstName = "Ismni kiriting";
    if (!lastName.trim())  e.lastName  = "Familiyani kiriting";
    if (!phone.trim())     e.phone     = "Telefon raqami majburiy";
    else if (!/^\+?\d{7,15}$/.test(phone.replace(/\s/g, '')))
      e.phone = "Telefon raqami noto'g'ri (+998901234567)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) {
      hapticError();
      showToast("Formani tekshiring", 'error');
      return;
    }
    setSaving(true);
    const customer = addCustomer({
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      phone:     phone.trim(),
      note:      note.trim(),
    });
    setSaving(false);
    hapticSuccess();
    showToast("Mijoz muvaffaqiyatli qo'shildi", 'success');
    navigation.replace('CustomerDetail', { customerId: customer.id });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <AppHeader
        title="Yangi mijoz"
        showBack
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.bodyMedium, styles.hint, { color: theme.textSecondary }]}>
          Yangi mijoz ma'lumotlarini kiriting
        </Text>

        <AppInput
          label="Ism *"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Masalan: Ali"
          iconName="person-outline"
          autoCapitalize="words"
          error={errors.firstName}
        />
        <AppInput
          label="Familiya *"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Masalan: Valiyev"
          iconName="person-outline"
          autoCapitalize="words"
          error={errors.lastName}
        />
        <AppInput
          label="Telefon raqami *"
          value={phone}
          onChangeText={setPhone}
          placeholder="+998901234567"
          iconName="call-outline"
          keyboardType="phone-pad"
          error={errors.phone}
        />
        <AppInput
          label="Izoh (ixtiyoriy)"
          value={note}
          onChangeText={setNote}
          placeholder="Mijoz haqida eslatma..."
          iconName="chatbubble-ellipses-outline"
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, paddingTop: 10, textAlignVertical: 'top' }}
        />

        <View style={styles.btnWrap}>
          <PrimaryButton
            label="Saqlash"
            onPress={handleSave}
            loading={saving}
          />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton
            label="Bekor qilish"
            onPress={() => {
              hapticTap();
              navigation.goBack();
            }}
            variant="outline"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: spacing.md },
  hint: {
    marginBottom: spacing.lg,
    lineHeight:   22,
  },
  btnWrap: {
    marginTop: spacing.md,
  },
});
