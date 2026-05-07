import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  isAvailable(): Promise<boolean>;
  requestReview(): Promise<void>;
  openStoreListing(appStoreId: string | null): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('InAppReview');
