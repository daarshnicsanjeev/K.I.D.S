import { describe, it, expect } from 'vitest';
import { ErrorHasher } from '../src/services/errorHasher';

describe('ErrorHasher', () => {
  it('should generate a 12-character deterministic hash', async () => {
    const domain = "wittykids.edusprint.in";
    const component = "Homework";
    const stackTrace = "Error: Failed at fetch (https://wittykids.edusprint.in/app:12:45)";

    const fp1 = await ErrorHasher.generateFingerprint(domain, component, stackTrace);
    const fp2 = await ErrorHasher.generateFingerprint(domain, component, stackTrace);

    expect(fp1).toHaveLength(12);
    expect(fp1).toBe(fp2);
  });
});
