/**
 * Harness Result Types
 *
 * Shared types for harness results with metadata.
 */

import type { HarnessResultMetadata } from "../shared/metadata";

export interface HarnessResult {
  output: string;
  metadata: HarnessResultMetadata;
}
