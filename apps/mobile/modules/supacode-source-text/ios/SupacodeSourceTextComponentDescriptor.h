#pragma once

#include "SupacodeSourceTextShadowNode.h"

#include <react/renderer/componentregistry/ComponentDescriptorProviderRegistry.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {
using SupacodeSourceTextComponentDescriptor =
    ConcreteComponentDescriptor<SupacodeSourceTextShadowNode>;

void SupacodeSourceTextSpec_registerComponentDescriptorsFromCodegen(
    std::shared_ptr<const ComponentDescriptorProviderRegistry> registry);
} // namespace facebook::react
