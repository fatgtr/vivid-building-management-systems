// Shared asset-import helpers used by every building-profile AI extractor.
// Owns: asset matching (upsert/dedup), source Document creation, document-to-asset
// linking, and the consistent import summary shape. Imported by backend functions
// via `import { ... } from "../../shared/assetImport.js"`.

const CHUNK = 150;

export function normalizeKey(v) {
  if (v == null) return '';
  return String(v).trim().toLowerCase();
}

export function buildAssetIndex(assets) {
  const byIdentifier = new Map();
  const byFitting = new Map();
  const byName = new Map();
  const byBarcode = new Map();
  for (const a of assets || []) {
    const id = normalizeKey(a.identifier);
    const fit = normalizeKey(a.fitting_number);
    const nm = normalizeKey(a.name);
    const bc = normalizeKey(a.barcode);
    if (id) byIdentifier.set(id, a);
    if (fit) byFitting.set(fit, a);
    if (nm) byName.set(nm, a);
    if (bc) byBarcode.set(bc, a);
  }
  return { byIdentifier, byFitting, byName, byBarcode };
}

export function matchAsset(index, row) {
  const id = normalizeKey(row.identifier);
  const fit = normalizeKey(row.fitting_number);
  const nm = normalizeKey(row.name);
  const bc = normalizeKey(row.barcode);
  return (
    (id && byIdentifier_get(index.byIdentifier, id)) ||
    (fit && byIdentifier_get(index.byFitting, fit)) ||
    (nm && byIdentifier_get(index.byName, nm)) ||
    (bc && byIdentifier_get(index.byBarcode, bc)) ||
    null
  );
}
function byIdentifier_get(m, k) { return m.get(k) || null; }

// Upsert a list of asset field-objects against existing assets.
// Each field-object may carry identifier / fitting_number / name / barcode for matching.
// Returns { created, updated, createdCount, updatedCount } where `created` and `updated`
// hold the resulting asset objects (created = new records, updated = matched existing).
export async function upsertAssets(base44, existingAssets, assetFieldsArray) {
  const index = buildAssetIndex(existingAssets);
  const toCreate = [];
  const toUpdate = [];
  const matchedExisting = [];
  for (const fields of assetFieldsArray) {
    const ex = matchAsset(index, fields);
    if (ex) {
      toUpdate.push({ id: ex.id, ...fields });
      matchedExisting.push(ex);
    } else {
      toCreate.push(fields);
    }
  }

  let created = [];
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    const batch = await base44.entities.Asset.bulkCreate(toCreate.slice(i, i + CHUNK));
    created = created.concat(batch);
  }
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    await base44.entities.Asset.bulkUpdate(toUpdate.slice(i, i + CHUNK));
  }

  return {
    created,
    updated: matchedExisting,
    createdCount: created.length,
    updatedCount: toUpdate.length
  };
}

// Push a document id into each asset's `documents` array (deduped) via bulkUpdate.
// `assets` = array of asset objects (must include `id` and current `documents` array).
export async function linkDocumentToAssets(base44, documentId, assets) {
  if (!documentId || !assets || !assets.length) return 0;
  const updates = assets.map((a) => ({
    id: a.id,
    documents: Array.from(new Set([...(a.documents || []), documentId]))
  }));
  for (let i = 0; i < updates.length; i += CHUNK) {
    await base44.entities.Asset.bulkUpdate(updates.slice(i, i + CHUNK));
  }
  return updates.length;
}

export async function createSourceDocument(base44, opts) {
  const doc = await base44.entities.Document.create({
    building_id: opts.building_id,
    title: opts.title || 'AI Imported Document',
    category: opts.category || 'other',
    file_url: opts.file_url || null,
    description: opts.description || null,
    visibility: opts.visibility || 'staff_only',
    status: 'active',
    ocr_status: 'pending'
  });
  return doc.id;
}

// Use the provided documentId if present (BuildingDocumentManager pre-creates the
// Document record); otherwise create one (standalone importers).
export async function ensureDocument(base44, opts) {
  if (opts.documentId) return opts.documentId;
  return await createSourceDocument(base44, opts);
}

export function buildSummary({ created, updated, unmatched, documentId, linked }) {
  return {
    success: true,
    created: created || 0,
    updated: updated || 0,
    unmatched: unmatched || 0,
    documentId: documentId || null,
    linked: linked || 0
  };
}