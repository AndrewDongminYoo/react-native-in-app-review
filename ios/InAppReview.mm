#import "InAppReview.h"
#import <StoreKit/StoreKit.h>

@implementation InAppReview

- (void)isAvailable:(RCTPromiseResolveBlock)resolve
             reject:(RCTPromiseRejectBlock)reject
{
  // In-app review is available on iOS 10.3+. StoreKit is always present
  // on physical devices. Return YES unconditionally; the OS rate-limits calls.
  resolve(@YES);
}

- (void)requestReview:(RCTPromiseResolveBlock)resolve
               reject:(RCTPromiseRejectBlock)reject
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (@available(iOS 14.0, *)) {
      // iOS 14+: use the scene-based API to avoid deprecation warning.
      NSSet<UIScene *> *scenes = [[UIApplication sharedApplication] connectedScenes];
      UIWindowScene *targetScene = nil;
      for (UIScene *scene in scenes) {
        if ([scene isKindOfClass:[UIWindowScene class]] &&
            scene.activationState == UISceneActivationStateForegroundActive) {
          targetScene = (UIWindowScene *)scene;
          break;
        }
      }
      if (targetScene) {
        [SKStoreReviewController requestReviewInScene:targetScene];
      } else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
        [SKStoreReviewController requestReview];
#pragma clang diagnostic pop
      }
    } else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
      [SKStoreReviewController requestReview];
#pragma clang diagnostic pop
    }
    resolve(nil);
  });
}

- (void)openStoreListing:(NSString * _Nullable)appStoreId
                 resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject
{
  if (appStoreId == nil || appStoreId.length == 0) {
    reject(@"MISSING_APP_STORE_ID", @"appStoreId is required for iOS", nil);
    return;
  }

  NSString *urlString = [NSString stringWithFormat:
    @"itms-apps://itunes.apple.com/app/id%@?action=write-review", appStoreId];
  NSURL *url = [NSURL URLWithString:urlString];

  dispatch_async(dispatch_get_main_queue(), ^{
    [[UIApplication sharedApplication] openURL:url
                                       options:@{}
                             completionHandler:^(BOOL success) {
      if (success) {
        resolve(nil);
      } else {
        reject(@"OPEN_URL_FAILED", @"Failed to open the App Store URL", nil);
      }
    }];
  });
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeInAppReviewSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"InAppReview";
}

@end
