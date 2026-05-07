import { Text, View, StyleSheet, Button } from 'react-native';
import {
  isAvailable,
  requestReview,
  openStoreListing,
} from '@dongminyu/react-native-in-app-review';
import { useEffect, useState } from 'react';

export default function App() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    isAvailable().then(setAvailable);
  }, []);

  const handleReview = () => {
    requestReview();
  };

  const handleStoreListing = () => {
    openStoreListing({ appStoreId: 'com.example.app' });
  };

  return (
    <View style={styles.container}>
      <Text>In-App Review Module</Text>
      <Text>Available: {available ? 'Yes' : 'No'}</Text>
      <Button title="Request Review" onPress={handleReview} />
      <Button title="Open Store Listing" onPress={handleStoreListing} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
