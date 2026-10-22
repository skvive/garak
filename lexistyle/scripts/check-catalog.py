import json, os, sys

# Fix encoding for Korean Windows
if sys.platform == "win32" and sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

home = os.path.expanduser("~")
path = os.path.join(home, ".lexi-local", "data", "lexi-local.json")
d = json.load(open(path, "r", encoding="utf-8"))

cats = d.get("catalog", [])
print(f"Total catalog items: {len(cats)}")

active = [c for c in cats if c.get("sourceStatus") == "active"]
print(f"Active items: {len(active)}")

cj = [c for c in cats if c.get("supplierCode") == "cjdropshipping"]
print(f"CJ items: {len(cj)}")

docs = d.get("pdpDocs", [])
print(f"PDP documents: {len(docs)}")

exports = d.get("exports", [])
print(f"Export jobs: {len(exports)}")

imported = [c for c in cats if c.get("importState") == "imported"]
print(f"Imported items: {len(imported)}")

print("\n--- ACTIVE CATALOG ITEMS (top 20) ---")
for c in active[:20]:
    print(f"  id={c.get('id')}: {c.get('title','?')} [{c.get('supplierCode')}] ek={c.get('externalId','?')} imp={c.get('importState')} doc={c.get('documentId')}")

print("\n--- PDP DOCUMENTS ---")
for d_ in docs[:10]:
    b = d_.get("body", {})
    cat_id = b.get("catalogId", "?")
    print(f"  docId={d_.get('id')}: {d_.get('title','?')} cat={cat_id}")