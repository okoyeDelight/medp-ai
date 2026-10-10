/**
 * Controlled source import: NLM Prescribable RxNorm Ingredient concepts.
 *
 * NO patient information enters this script or request. Output is a source-
 * attributable reference artifact, NOT a medical safety/interaction database.
 *
 * Usage: node scripts/import-rxnorm-ingredients.mjs path/to/artifact.json
 * Avoid ingesting full/proprietary RxNorm releases without license review.
 */
import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const RXNORM_SOURCE_URL =
  "https://rxnav.nlm.nih.gov/REST/Prescribe/allconcepts.json?tty=IN";

export const NLM_ACKNOWLEDGMENT =
  "This product uses publicly available data from the U.S. National Library of Medicine (NLM), National Institutes of Health, Department of Health and Human Services; NLM is not responsible for the product and does not endorse or recommend this or any other product.";

export function parseIngredientConcepts(payload) {
  const values = payload?.minConceptGroup?.minConcept;
  if (!Array.isArray(values)) {
    throw new Error("NLM response is missing minConceptGroup.minConcept; no artifact written.");
  }
  const ids = new Map();
  for (const value of values) {
    if (value?.tty !== "IN" || typeof value.name !== "string" ||
        typeof value.rxcui !== "string") continue;
    const rxcui = value.rxcui.trim();
    const name = value.name.trim();
    if (!/^[0-9]{1,12}$/.test(rxcui) || name.length < 1 || name.length > 240) continue;
    if (ids.has(rxcui) && ids.get(rxcui).name !== name) {
      throw new Error("NLM returned two different ingredient labels for one RxCUI.");
    }
    ids.set(rxcui, { rxcui, name, tty: "IN" });
  }
  return [...ids.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "en") || a.rxcui.localeCompare(b.rxcui, "en"));
}

export function createReferenceArtifact(concepts, retrievedAt) {
  if (!Array.isArray(concepts) || concepts.length === 0) {
    throw new Error("Empty NLM catalog must never be published.");
  }
  const serialized = JSON.stringify(concepts);
  return {
    schemaVersion: "1.0.0",
    sourceId: "nlm-prescribable-rxnorm-ingredients",
    sourceUrl: RXNORM_SOURCE_URL,
    retrievedAt,
    jurisdiction: "United States",
    catalogPurpose: "Ingredient-name reference candidate only",
    permittedUse: "Terminology identification support; human verification required",
    clinicalUseApproved: false,
    patientMedicationFacts: false,
    interactionSafetyCoverage: false,
    medicineAvailabilityInNigeria: "unknown",
    conceptCount: concepts.length,
    conceptSha256: createHash("sha256").update(serialized, "utf8").digest("hex"),
    nlmAcknowledgment: NLM_ACKNOWLEDGMENT,
    concepts,
  };
}

export async function importIngredients({
  destination,
  fetcher = fetch,
  clock = () => new Date(),
} = {}) {
  if (!destination || typeof destination !== "string") {
    throw new Error("Destination artifact path required.");
  }
  const response = await fetcher(RXNORM_SOURCE_URL, {
    signal: AbortSignal.timeout(45000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("NLM catalog request failed with HTTP " + response.status);
  }
  const declaredSize = Number(response.headers?.get?.("content-length") ?? 0);
  if (declaredSize > 15000000) {
    throw new Error("NLM response unexpectedly large; import aborted.");
  }
  const payload = await response.json();
  const concepts = parseIngredientConcepts(payload);
  // A very small response could indicate a provider outage or truncated feed.
  if (concepts.length < 1000 || concepts.length > 100000) {
    throw new Error("Unexpected ingredient concept count; require human inspection.");
  }
  const artifact = createReferenceArtifact(concepts, clock().toISOString());
  const output = resolve(destination);
  await mkdir(dirname(output), { recursive: true });
  const temp = output + ".tmp";
  try {
    await writeFile(temp, JSON.stringify(artifact, null, 2) + "\n", "utf8");
    await rename(temp, output);
  } catch (error) {
    // Never leave a half-written public reference artifact.
    throw error;
  }
  return {
    destination: output,
    count: concepts.length,
    sha256: artifact.conceptSha256,
    retrievedAt: artifact.retrievedAt,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  importIngredients({ destination: process.argv[2] }).then(
    result => {
      process.stdout.write(JSON.stringify(result) + "\n");
    },
    error => {
      process.stderr.write(
        "Reference import aborted: " + (error instanceof Error ? error.message : "unknown error") + "\n",
      );
      process.exitCode = 1;
    },
  );
}
