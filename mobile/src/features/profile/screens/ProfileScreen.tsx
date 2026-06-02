import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '@t/navigation.types';

type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

export default function ProfileScreen() {
	const navigation = useNavigation<ProfileNavigation>();

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Profile</Text>
			<Text style={styles.subtitle}>Profile overview coming soon</Text>
			<TouchableOpacity
				style={styles.button}
				onPress={() => navigation.navigate('Reminders')}
				activeOpacity={0.85}
			>
				<Text style={styles.buttonText}>Manage Reminders</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
		backgroundColor: '#fff',
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#111827',
	},
	subtitle: {
		marginTop: 6,
		fontSize: 14,
		color: '#6b7280',
	},
	button: {
		marginTop: 16,
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 10,
		backgroundColor: '#111827',
	},
	buttonText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '600',
	},
});
