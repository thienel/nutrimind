import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProgressScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Progress</Text>
			<Text style={styles.subtitle}>UC-3.7.2 coming soon</Text>
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
});
