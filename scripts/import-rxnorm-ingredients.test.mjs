import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createReferenceArtifact, importIngredients, parseIngredientConcepts,
  NLM_ACKNOWLEDGMENT, RXNORM_SOURCE_URL,
} from "./import-rxnorm-ingredients.mjs";

// Test values are NOT medicines presented to any user or clinical workflow.
const concept = (rxcui, name, tty = "IN") => ({ rxcui, name, tty });

test("rejects a malformed response rather than inventing reference entries", () => {
  assert.throws(() => parseIngredientConcepts({}), /missing minConceptGroup/);
  assert.throws(() => createReferenceArtifact([], "2026-10-10T00:00:00Z"), /Empty NLM catalog/);
});

test("filters to validated NLM ingredient concepts and sorts consistently", () => {
  const parsed = parseIngredientConcepts({ minConceptGroup: { minConcept: [
    concept("9", "Zulu Ingredient"), concept("4", "Alpha Ingredient"),
    concept("9", "Zulu Ingredient"), concept("not-an-id", "Unknown"),
    concept("20", "Non Ingredient", "BN"), concept("3", "   "),
  ] } });
  assert.deepEqual(parsed, [
    { rxcui: "4", name: "Alpha Ingredient", tty: "IN" },
    { rxcui: "9", name: "Zulu Ingredient", tty: "IN" },
  ]);
  const artifact = createReferenceArtifact(parsed, "2026-10-10T00:00:00Z");
  assert.equal(artifact.conceptCount, 2);
  assert.equal(artifact.patientMedicationFacts, false);
  assert.equal(artifact.clinicalUseApproved, false);
  assert.equal(artifact.interactionSafetyCoverage, false);
  assert.equal(artifact.nlmAcknowledgment, NLM_ACKNOWLEDGMENT);
  assert.match(artifact.conceptSha256, /^[a-f0-9]{64}$/);
});

test("rejects conflicting source IDs rather than silently choosing an ingredient", () => {
  assert.throws(() => parseIngredientConcepts({
    minConceptGroup: { minConcept: [
      concept("100", "Label A"), concept("100", "Label B"),
    ] },
  }), /two different ingredient labels/);
});

test("rejects upstream HTTP failure and never leaves a data artifact", async () => {
  await assert.rejects(
    importIngredients({
      destination: "/tmp/unused-nlm-data-output.json",
      fetcher: async () => ({ ok: false, status: 429 }),
    }),
    /HTTP 429/,
  );
});

test("writes reproducible provenance-bearing data only from a sufficiently complete NLM response", async () => {
  const path = await mkdtemp(join(tmpdir(), "medpai-rxnorm-test-"));
  try {
    const destination = join(path, "ingredients.json");
    const data = { minConceptGroup: { minConcept:
      Array.from({ length: 1001 }, (_, i) => concept(String(i + 1), "Testing ingredient " + String(i).padStart(4, "0"))) } };
    const result = await importIngredients({
      destination, clock: () => new Date("2026-10-10T09:00:00Z"),
      fetcher: async url => {
        assert.equal(url, RXNORM_SOURCE_URL);
        return {
          ok: true, headers: new Map([["content-length", "100"]]),
          json: async () => data,
        };
      },
    });
    const saved = JSON.parse(await readFile(destination, "utf8"));
    assert.equal(result.count, 1001);
    assert.equal(saved.conceptCount, 1001);
    assert.equal(saved.retrievedAt, "2026-10-10T09:00:00.000Z");
    assert.equal(saved.sourceUrl, RXNORM_SOURCE_URL);
    assert.equal(saved.interactionSafetyCoverage, false);
  } finally {
    await rm(path, { recursive: true, force: true });
  }
});
