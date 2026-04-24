/**
 * stress_test.js
 * Comprehensive test suite covering all hidden input patterns.
 * Run: node stress_test.js
 */

const BASE_URL = 'http://localhost:3000/bfhl';

let passed = 0;
let failed = 0;

async function call(data) {
  const t0 = Date.now();
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  const elapsed = Date.now() - t0;
  const json = await res.json();
  return { json, elapsed };
}

function assert(label, condition, actual, expected) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    console.error(`     Expected: ${JSON.stringify(expected)}`);
    console.error(`     Got:      ${JSON.stringify(actual)}`);
    failed++;
  }
}

async function test(name, data, checks) {
  console.log(`\n🧪 ${name}`);
  try {
    const { json, elapsed } = await call(data);
    assert(`Response < 3000ms`, elapsed < 3000, elapsed, '< 3000ms');
    checks(json, elapsed);
  } catch (e) {
    console.error(`  ❌ EXCEPTION: ${e.message}`);
    failed++;
  }
}

async function run() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  BFHL API — Full Hidden Input Stress Test Suite');
  console.log('═══════════════════════════════════════════════════');

  // ── T1: Official spec example ──────────────────────────────────
  await test('T1: Official spec example', 
    ['A->B','A->C','B->D','C->E','E->F','X->Y','Y->Z','Z->X','P->Q','Q->R','G->H','G->I','G->H','hello','1->2','A->'],
    (r) => {
      assert('user_id present', !!r.user_id, r.user_id, 'non-empty');
      assert('email_id present', !!r.email_id, r.email_id, 'non-empty');
      assert('roll present', !!r.college_roll_number, r.college_roll_number, 'non-empty');
      assert('4 hierarchies', r.hierarchies.length === 4, r.hierarchies.length, 4);
      assert('root A depth=4', r.hierarchies.find(h=>h.root==='A')?.depth === 4, r.hierarchies.find(h=>h.root==='A')?.depth, 4);
      assert('X is cycle', r.hierarchies.find(h=>h.root==='X')?.has_cycle === true, r.hierarchies.find(h=>h.root==='X'), 'has_cycle:true');
      assert('X no depth', r.hierarchies.find(h=>h.root==='X')?.depth === undefined, r.hierarchies.find(h=>h.root==='X')?.depth, undefined);
      assert('P depth=3', r.hierarchies.find(h=>h.root==='P')?.depth === 3, r.hierarchies.find(h=>h.root==='P')?.depth, 3);
      assert('G depth=2', r.hierarchies.find(h=>h.root==='G')?.depth === 2, r.hierarchies.find(h=>h.root==='G')?.depth, 2);
      assert('3 invalid', r.invalid_entries.length === 3, r.invalid_entries.length, 3);
      assert('1 duplicate', r.duplicate_edges.length === 1, r.duplicate_edges.length, 1);
      assert('dup is G->H', r.duplicate_edges[0] === 'G->H', r.duplicate_edges[0], 'G->H');
      assert('total_trees=3', r.summary.total_trees === 3, r.summary.total_trees, 3);
      assert('total_cycles=1', r.summary.total_cycles === 1, r.summary.total_cycles, 1);
      assert('largest_root=A', r.summary.largest_tree_root === 'A', r.summary.largest_tree_root, 'A');
    }
  );

  // ── T2: Empty data ─────────────────────────────────────────────
  await test('T2: Empty array', [], (r) => {
    assert('hierarchies=[]', r.hierarchies.length === 0, r.hierarchies.length, 0);
    assert('total_trees=0', r.summary.total_trees === 0, r.summary.total_trees, 0);
    assert('total_cycles=0', r.summary.total_cycles === 0, r.summary.total_cycles, 0);
  });

  // ── T3: All invalid entries ────────────────────────────────────
  await test('T3: All invalid', ['hello','world','1->2','AB->C','A-B','A->','->B','A->A','','  '], (r) => {
    assert('no hierarchies', r.hierarchies.length === 0, r.hierarchies.length, 0);
    assert('10 invalids', r.invalid_entries.length === 10, r.invalid_entries.length, 10);
    assert('no dups', r.duplicate_edges.length === 0, r.duplicate_edges.length, 0);
    assert('total_trees=0', r.summary.total_trees === 0, r.summary.total_trees, 0);
  });

  // ── T4: Self-loop ──────────────────────────────────────────────
  await test('T4: Self-loop A->A', ['A->A'], (r) => {
    assert('A->A is invalid', r.invalid_entries.includes('A->A'), r.invalid_entries, ['A->A']);
    assert('no hierarchies', r.hierarchies.length === 0, r.hierarchies.length, 0);
  });

  // ── T5: Pure cycle ─────────────────────────────────────────────
  await test('T5: Pure cycle A->B->C->A', ['A->B','B->C','C->A'], (r) => {
    assert('1 hierarchy', r.hierarchies.length === 1, r.hierarchies.length, 1);
    assert('is cycle', r.hierarchies[0].has_cycle === true, r.hierarchies[0].has_cycle, true);
    assert('tree={}', JSON.stringify(r.hierarchies[0].tree) === '{}', r.hierarchies[0].tree, {});
    assert('no depth', r.hierarchies[0].depth === undefined, r.hierarchies[0].depth, undefined);
    assert('root=A (lex smallest)', r.hierarchies[0].root === 'A', r.hierarchies[0].root, 'A');
    assert('total_cycles=1', r.summary.total_cycles === 1, r.summary.total_cycles, 1);
    assert('total_trees=0', r.summary.total_trees === 0, r.summary.total_trees, 0);
  });

  // ── T6: Pure cycle lex smallest root ──────────────────────────
  await test('T6: Pure cycle — lex root is Z->Y->X->Z → root=X', ['Z->Y','Y->X','X->Z'], (r) => {
    assert('is cycle', r.hierarchies[0].has_cycle === true, r.hierarchies[0].has_cycle, true);
    assert('root=X (lex smallest)', r.hierarchies[0].root === 'X', r.hierarchies[0].root, 'X');
  });

  // ── T7: Duplicate edges ────────────────────────────────────────
  await test('T7: Triple duplicate A->B appears 3 times', ['A->B','A->B','A->B'], (r) => {
    assert('1 hierarchy', r.hierarchies.length === 1, r.hierarchies.length, 1);
    assert('dup recorded once', r.duplicate_edges.length === 1, r.duplicate_edges.length, 1);
    assert('dup=A->B', r.duplicate_edges[0] === 'A->B', r.duplicate_edges[0], 'A->B');
  });

  // ── T8: Multi-parent (diamond) ─────────────────────────────────
  await test('T8: Diamond — A->D, B->D (first parent A wins)', ['A->D','B->D'], (r) => {
    const aTree = r.hierarchies.find(h => h.root === 'A');
    const bTree = r.hierarchies.find(h => h.root === 'B');
    assert('A has D as child', aTree?.tree?.A?.D !== undefined, aTree?.tree?.A, 'has D');
    assert('B has no children (D taken)', JSON.stringify(bTree?.tree?.B) === '{}', bTree?.tree?.B, {});
  });

  // ── T9: Deep chain A->B->C->...->J (depth=10) ─────────────────
  const chain = ['A->B','B->C','C->D','D->E','E->F','F->G','G->H','H->I','I->J'];
  await test('T9: Deep chain 10 nodes', chain, (r) => {
    assert('1 tree', r.hierarchies.length === 1, r.hierarchies.length, 1);
    assert('root=A', r.hierarchies[0].root === 'A', r.hierarchies[0].root, 'A');
    assert('depth=10', r.hierarchies[0].depth === 10, r.hierarchies[0].depth, 10);
    assert('total_trees=1', r.summary.total_trees === 1, r.summary.total_trees, 1);
    assert('largest_root=A', r.summary.largest_tree_root === 'A', r.summary.largest_tree_root, 'A');
  });

  // ── T10: Wide tree A->B, A->C, ... A->Z (depth=2) ─────────────
  const letters = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';
  const wide = letters.split('').map(l => `A->${l}`);
  await test('T10: Wide tree A->25 children', wide, (r) => {
    assert('1 tree', r.hierarchies.length === 1, r.hierarchies.length, 1);
    assert('root=A', r.hierarchies[0].root === 'A', r.hierarchies[0].root, 'A');
    assert('depth=2', r.hierarchies[0].depth === 2, r.hierarchies[0].depth, 2);
    assert('25 children of A', Object.keys(r.hierarchies[0].tree?.A || {}).length === 25, Object.keys(r.hierarchies[0].tree?.A||{}).length, 25);
  });

  // ── T11: Two equal-depth trees (lex smallest wins) ─────────────
  await test('T11: Tie-break lex — B->C (depth=2) and A->D (depth=2) → largest=A', ['B->C','A->D'], (r) => {
    assert('2 trees', r.hierarchies.length === 2, r.hierarchies.length, 2);
    assert('largest_root=A (lex smallest)', r.summary.largest_tree_root === 'A', r.summary.largest_tree_root, 'A');
  });

  // ── T12: Whitespace trimming ────────────────────────────────────
  await test('T12: Whitespace trim " A->B " is valid', [' A->B ', '  C->D  '], (r) => {
    assert('2 valid trees (trimmed)', r.hierarchies.length === 2, r.hierarchies.length, 2);
    assert('no invalids', r.invalid_entries.length === 0, r.invalid_entries.length, 0);
  });

  // ── T13: 50-node stress test ────────────────────────────────────
  const stress = [];
  // Tree 1: A→B→C→D→E→F→G→H→I→J (depth 10)
  for (let i = 0; i < 9; i++) stress.push(`${String.fromCharCode(65+i)}->${String.fromCharCode(66+i)}`);
  // Tree 2: K→L→M→N→O→P→Q→R→S→T (depth 10)
  for (let i = 10; i < 19; i++) stress.push(`${String.fromCharCode(65+i)}->${String.fromCharCode(66+i)}`);
  // Cycle: U→V→W→U
  stress.push('U->V','V->W','W->U');
  // Invalids + dups
  stress.push('hello','1->2','A->B'); // A->B already exists, so duplicate
  stress.push('AB->C','A->A','');
  await test('T13: 50-node stress (multiple trees + cycle + invalid + dup)', stress, (r, elapsed) => {
    assert(`Time ${elapsed}ms < 3000ms`, elapsed < 3000, elapsed, '< 3000ms');
    assert('has_cycle group exists', r.summary.total_cycles >= 1, r.summary.total_cycles, '>= 1');
    assert('invalid_entries present', r.invalid_entries.length >= 4, r.invalid_entries.length, '>= 4');
    assert('duplicate A->B present', r.duplicate_edges.includes('A->B'), r.duplicate_edges, 'includes A->B');
  });

  // ── T14: Single edge ────────────────────────────────────────────
  await test('T14: Single edge A->B', ['A->B'], (r) => {
    assert('1 hierarchy', r.hierarchies.length === 1, r.hierarchies.length, 1);
    assert('root=A', r.hierarchies[0].root === 'A', r.hierarchies[0].root, 'A');
    assert('depth=2', r.hierarchies[0].depth === 2, r.hierarchies[0].depth, 2);
    assert('no has_cycle field', r.hierarchies[0].has_cycle === undefined, r.hierarchies[0].has_cycle, undefined);
    assert('tree has A->B', r.hierarchies[0].tree?.A?.B !== undefined, r.hierarchies[0].tree, '{A:{B:{}}}');
  });

  // ── T15: Multiple disconnected trees ────────────────────────────
  await test('T15: Multiple disconnected trees A->B, C->D, E->F', ['A->B','C->D','E->F'], (r) => {
    assert('3 trees', r.hierarchies.length === 3, r.hierarchies.length, 3);
    assert('total_trees=3', r.summary.total_trees === 3, r.summary.total_trees, 3);
    assert('largest_root=A (lex)', r.summary.largest_tree_root === 'A', r.summary.largest_tree_root, 'A');
  });

  // ── T16: has_cycle MUST be absent for trees ─────────────────────
  await test('T16: Non-cyclic tree must NOT have has_cycle field', ['A->B'], (r) => {
    assert('has_cycle absent (not false)', !('has_cycle' in r.hierarchies[0]), r.hierarchies[0], 'no has_cycle key');
  });

  // ── T17: Cycle tree must be {} ──────────────────────────────────
  await test('T17: Cycle tree object must be exactly {}', ['A->B','B->A'], (r) => {
    const cycleH = r.hierarchies.find(h => h.has_cycle);
    assert('tree is {}', JSON.stringify(cycleH?.tree) === '{}', cycleH?.tree, {});
  });

  // ── Summary ─────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
}

run().catch(console.error);
