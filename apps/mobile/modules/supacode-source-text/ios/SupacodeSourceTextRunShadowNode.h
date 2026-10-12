#pragma once

#include <react/renderer/components/SupacodeSourceTextSpec/EventEmitters.h>
#include <react/renderer/components/SupacodeSourceTextSpec/Props.h>
#include <react/renderer/components/SupacodeSourceTextSpec/States.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>

namespace facebook::react {
extern const char SupacodeSourceTextRunComponentName[];

using SupacodeSourceTextRunShadowNode =
    ConcreteViewShadowNode<SupacodeSourceTextRunComponentName, SupacodeSourceTextRunProps,
                           SupacodeSourceTextRunEventEmitter, SupacodeSourceTextRunState>;
} // namespace facebook::react
