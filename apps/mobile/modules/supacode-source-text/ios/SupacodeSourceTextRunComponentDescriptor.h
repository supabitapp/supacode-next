#pragma once

#include "SupacodeSourceTextRunShadowNode.h"

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {
using SupacodeSourceTextRunComponentDescriptor =
    ConcreteComponentDescriptor<SupacodeSourceTextRunShadowNode>;

void SupacodeSourceTextRunSpec_registerComponentDescriptorsFromCodegen(
    std::shared_ptr<const ComponentDescriptorProviderRegistry> registry);
} // namespace facebook::react
