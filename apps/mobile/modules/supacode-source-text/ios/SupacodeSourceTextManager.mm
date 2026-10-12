#import <React/RCTUIManager.h>
#import <React/RCTViewManager.h>

@interface SupacodeSourceTextManager : RCTViewManager
@end

@implementation SupacodeSourceTextManager

RCT_EXPORT_MODULE(SupacodeSourceText)

- (UIView *)view {
  return [[UIView alloc] init];
}

@end

@interface SupacodeSourceTextRunManager : RCTViewManager
@end

@implementation SupacodeSourceTextRunManager

RCT_EXPORT_MODULE(SupacodeSourceTextRun)

- (UIView *)view {
  return nil;
}

@end
