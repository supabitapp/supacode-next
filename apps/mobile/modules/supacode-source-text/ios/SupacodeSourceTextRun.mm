#import "SupacodeSourceTextRun.h"
#import <React/RCTFabricComponentsPlugins.h>
#import "SupacodeSourceTextRunComponentDescriptor.h"
#import <react/renderer/components/SupacodeSourceTextSpec/Props.h>
#import <react/renderer/components/SupacodeSourceTextSpec/RCTComponentViewHelpers.h>

using namespace facebook::react;

@interface SupacodeSourceTextRun () <RCTSupacodeSourceTextRunViewProtocol>

@end

@implementation SupacodeSourceTextRun {
  NSString *_text;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<
      SupacodeSourceTextRunComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps =
        std::make_shared<const SupacodeSourceTextRunProps>();
    _props = defaultProps;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props
           oldProps:(Props::Shared const &)oldProps {
  const auto &oldViewProps =
      *std::static_pointer_cast<SupacodeSourceTextRunProps const>(_props);
  const auto &newViewProps =
      *std::static_pointer_cast<SupacodeSourceTextRunProps const>(props);

  if (newViewProps.text != oldViewProps.text) {
    NSString *text = [NSString stringWithUTF8String:newViewProps.text.c_str()];
    _text = text;
  }

  [super updateProps:props oldProps:oldProps];
}

+ (BOOL)shouldBeRecycled {
  return NO;
}

Class<RCTComponentViewProtocol> SupacodeSourceTextRunCls(void) {
  return SupacodeSourceTextRun.class;
}

@end
