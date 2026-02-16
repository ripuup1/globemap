# Severity Classification System

## Overview

The severity system provides a centralized, reusable way to classify and visualize global events based on real-world data fields.

## Severity Levels

The system uses a 0-10 numeric scale mapped to semantic labels:

- **0-1: MINIMAL** - Minimal impact, isolated incidents
- **2-3: LOW** - Low impact, localized effects  
- **4-5: MODERATE** - Moderate impact, regional significance
- **6-7: HIGH** - High impact, widespread effects
- **8-10: CRITICAL** - Critical impact, major disaster to catastrophic event

## Computation

The `computeSeverity()` function analyzes multiple data fields:

1. **Text Content** - Keyword pattern matching in title/description
2. **Quantitative Metrics** - Magnitude, casualties, affected population
3. **Event Type** - Base severity modifiers per event type
4. **Temporal Indicators** - Ongoing/escalating status

### Input Data Fields

```typescript
interface SeverityInputData {
  title?: string
  description?: string
  content?: string
  type?: EventType
  magnitude?: number
  casualties?: number
  affectedArea?: number
  populationAffected?: number
  isOngoing?: boolean
  isEscalating?: boolean
  metadata?: Record<string, any>
}
```

## Visual Mappings

### Color (Severity-Based Gradient)
- MINIMAL: Green (#4ade80)
- LOW: Light Green (#84cc16)
- MODERATE: Yellow (#eab308)
- HIGH: Orange (#f97316)
- CRITICAL: Red (#ef4444)

### Size
- Range: 0.2 to 1.5 globe units
- Linear mapping based on severity level

### Priority (Z-Index)
- Range: 0-100
- Higher severity = higher priority (renders on top)

### Glow Intensity
- CRITICAL (8-10): 0.8 opacity
- HIGH (6-7): 0.5 opacity
- MODERATE (4-5): 0.2 opacity
- LOW/MINIMAL (0-3): No glow

## Usage

```typescript
import { computeSeverity, getSeverityVisualConfig } from './severity'

// Compute severity from event data
const severity = computeSeverity({
  title: 'Major earthquake hits region',
  description: 'Hundreds killed, widespread damage',
  type: 'earthquake',
  magnitude: 7.5,
  casualties: 250,
})

// Get complete visual configuration
const visualConfig = getSeverityVisualConfig(severity)
// Returns: { color, size, priority, glow, label }
```

## Centralization

All severity logic is centralized in:
- `client/src/utils/severity.ts` - Core system
- `client/src/utils/colorMapper.ts` - Visual mapping utilities
- `client/src/utils/eventNormalizer.ts` - Uses computeSeverity()

No hardcoded severity values should exist in UI components.
