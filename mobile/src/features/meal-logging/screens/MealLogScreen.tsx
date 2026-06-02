import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MealStackParamList } from '@t/navigation.types';

type MealNavigation = NativeStackNavigationProp<MealStackParamList, 'MealLog'>;

export default function MealLogScreen() {
	const navigation = useNavigation<MealNavigation>();

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Meal Log</Text>
			<Text style={styles.subtitle}>Daily meals coming soon</Text>
			<View style={styles.actions}>
				<TouchableOpacity
					style={styles.button}
					onPress={() => navigation.navigate('ManualFoodEntry')}
					activeOpacity={0.85}
				>
					<Text style={styles.buttonText}>Manual Entry</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.button, styles.secondaryButton]}
					onPress={() => navigation.navigate('PhotoAnalysis')}
					activeOpacity={0.85}
				>
					<Text style={[styles.buttonText, styles.secondaryButtonText]}>Photo Analysis</Text>
				</TouchableOpacity>
			</View>
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
	actions: {
		marginTop: 16,
		width: '100%',
		gap: 12,
	},
	button: {
		borderRadius: 10,
		paddingVertical: 10,
		alignItems: 'center',
		backgroundColor: '#10b981',
	},
	secondaryButton: {
		backgroundColor: '#e5e7eb',
	},
	buttonText: {
		fontSize: 14,
		fontWeight: '600',
		color: '#fff',
	},
	secondaryButtonText: {
		color: '#111827',
	},
});
