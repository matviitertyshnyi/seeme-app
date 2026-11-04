import { runTier1FeatureCoverage } from './e2e/tier1_features';
import { runTier2BoundaryCases } from './e2e/tier2_boundaries';
import { runTier3CrossFeatureCombinations } from './e2e/tier3_combinations';
import { runTier4RealWorldScenarios } from './e2e/tier4_realworld';
import { runRegressionR1R4 } from './regression_r1_r4';

interface TierSummary {
  name: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  durationMs: number;
}

export async function runFullE2ESuite(): Promise<{
  allPassed: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  overallPassRate: number;
  totalDurationMs: number;
  tierBreakdown: TierSummary[];
}> {
  const overallStartTime = Date.now();
  console.log('================================================================================');
  console.log('STARTING "LEAVE THE ROOM" MASTER E2E TEST SUITE (TIERS 1 - 4)');
  console.log('Opaque-Box Requirement-Driven Verification Framework');
  console.log('================================================================================');

  const tierSummaries: TierSummary[] = [];

  // 1. Tier 1 - Feature Coverage
  const t1Collector = await runTier1FeatureCoverage();
  const t1Stats = t1Collector.getStats();
  tierSummaries.push({
    name: 'Tier 1 - Feature Coverage (21 Features)',
    total: t1Stats.total,
    passed: t1Stats.passed,
    failed: t1Stats.failed,
    passRate: t1Stats.passRate,
    durationMs: t1Stats.durationMs,
  });

  // 2. Tier 2 - Boundary & Corner Cases
  const t2Collector = await runTier2BoundaryCases();
  const t2Stats = t2Collector.getStats();
  tierSummaries.push({
    name: 'Tier 2 - Boundary & Corner Cases',
    total: t2Stats.total,
    passed: t2Stats.passed,
    failed: t2Stats.failed,
    passRate: t2Stats.passRate,
    durationMs: t2Stats.durationMs,
  });

  // 3. Tier 3 - Cross-Feature Combinations
  const t3Collector = await runTier3CrossFeatureCombinations();
  const t3Stats = t3Collector.getStats();
  tierSummaries.push({
    name: 'Tier 3 - Cross-Feature Combinations',
    total: t3Stats.total,
    passed: t3Stats.passed,
    failed: t3Stats.failed,
    passRate: t3Stats.passRate,
    durationMs: t3Stats.durationMs,
  });

  // 4. Tier 4 - Real-World End-to-End Scenarios
  const t4Collector = await runTier4RealWorldScenarios();
  const t4Stats = t4Collector.getStats();
  tierSummaries.push({
    name: 'Tier 4 - Real-World Scenarios',
    total: t4Stats.total,
    passed: t4Stats.passed,
    failed: t4Stats.failed,
    passRate: t4Stats.passRate,
    durationMs: t4Stats.durationMs,
  });

  // 5. Automated Regression Test Suite (13 Acceptance Criteria R1 - R4)
  const regressionCollector = await runRegressionR1R4();
  const regressionStats = regressionCollector.getStats();
  tierSummaries.push({
    name: 'Regression Suite (R1 - R4 Criteria)',
    total: regressionStats.total,
    passed: regressionStats.passed,
    failed: regressionStats.failed,
    passRate: regressionStats.passRate,
    durationMs: regressionStats.durationMs,
  });

  // 6. Automated Language Verification Audit (scripts/verify-languages.js)
  console.log('\n================================================================================');
  console.log('RUNNING MANDATORY AUTOMATED VERIFICATION FOR 5 LANGUAGES (scripts/verify-languages.js)');
  console.log('================================================================================');
  const langStartTime = Date.now();
  let langPassed = false;
  let langOutput = '';
  try {
    const { execSync } = await import('child_process');
    langOutput = execSync('node scripts/verify-languages.js', { encoding: 'utf-8' });
    console.log(langOutput);
    langPassed = langOutput.includes('ALL 10 LANGUAGE INTEGRITY CHECKS PASSED');
  } catch (err: any) {
    console.error('scripts/verify-languages.js failed:', err.message);
    langPassed = false;
  }
  const langDuration = Date.now() - langStartTime;

  tierSummaries.push({
    name: 'Language Audit (scripts/verify-languages.js)',
    total: 10,
    passed: langPassed ? 10 : 0,
    failed: langPassed ? 0 : 10,
    passRate: langPassed ? 100 : 0,
    durationMs: langDuration,
  });

  const totalDurationMs = Date.now() - overallStartTime;
  const totalChecks = tierSummaries.reduce((acc, t) => acc + t.total, 0);
  const passedChecks = tierSummaries.reduce((acc, t) => acc + t.passed, 0);
  const failedChecks = tierSummaries.reduce((acc, t) => acc + t.failed, 0);
  const overallPassRate = totalChecks > 0 ? Number(((passedChecks / totalChecks) * 100).toFixed(1)) : 100;
  const allPassed = failedChecks === 0;

  console.log('\n================================================================================');
  console.log('LEAVE THE ROOM — FINAL E2E TEST SUITE EXECUTION REPORT');
  console.log('================================================================================');
  console.log('Tier Breakdown:');
  console.log('--------------------------------------------------------------------------------');
  console.log(
    'Tier Name'.padEnd(42) +
      'Total'.padStart(8) +
      'Passed'.padStart(8) +
      'Failed'.padStart(8) +
      'Pass Rate'.padStart(11) +
      'Duration'.padStart(10)
  );
  console.log('--------------------------------------------------------------------------------');

  for (const t of tierSummaries) {
    console.log(
      t.name.padEnd(42) +
        String(t.total).padStart(8) +
        String(t.passed).padStart(8) +
        String(t.failed).padStart(8) +
        `${t.passRate}%`.padStart(11) +
        `${t.durationMs}ms`.padStart(10)
    );
  }

  console.log('--------------------------------------------------------------------------------');
  console.log(
    'TOTAL'.padEnd(42) +
      String(totalChecks).padStart(8) +
      String(passedChecks).padStart(8) +
      String(failedChecks).padStart(8) +
      `${overallPassRate}%`.padStart(11) +
      `${totalDurationMs}ms`.padStart(10)
  );
  console.log('================================================================================');

  if (allPassed) {
    console.log('VERDICT: ALL 4 TIERS & REGRESSION SUITE EMPIRICALLY PASSED WITH 100% SUCCESS RATE! [APPROVE]\n');
  } else {
    console.error(`VERDICT: FAILED WITH ${failedChecks} UNRESOLVED DEFECTS. [REJECT]\n`);
  }

  return {
    allPassed,
    totalChecks,
    passedChecks,
    failedChecks,
    overallPassRate,
    totalDurationMs,
    tierBreakdown: tierSummaries,
  };
}

if (require.main === module || process.argv[1]?.includes('e2e_suite')) {
  runFullE2ESuite().then((res) => {
    process.exit(res.allPassed ? 0 : 1);
  });
}
