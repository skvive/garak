import json, os

store = json.loads(open(os.path.expanduser('~/.lexi-local/data/lexi-local.json'), 'r', encoding='utf8').read())
cats = store.get('catalog', [])
products = store.get('products', [])

# Build product lookup by title
product_by_title = {}
for p in products:
    name = (p.get('name','') or '').lower()
    product_by_title[name] = p

# Build slug lookup from catalog
cat_by_extid = {}
for r in cats:
    eid = str(r.get('externalId',''))
    cat_by_extid[eid] = r

print('Products in store:', len(products))
print()

# Check each mock dir
mocks = sorted([d for d in os.listdir('E:/cursor_HS/lexistyle/public/sample3') if d.startswith('mock-')])
for d in mocks:
    m_path = f'E:/cursor_HS/lexistyle/public/sample3/{d}/meta.json'
    if not os.path.exists(m_path):
        print(f'{d}: NO meta.json')
        continue
    
    m = json.loads(open(m_path, 'r', encoding='utf8').read())
    ct = m.get('catalog', {})
    mc = m.get('modelCast', {})
    ext_id = ct.get('externalId', '?')
    title = (ct.get('titleMarketing', {}) or {}).get('ko', ct.get('titleInternal','?'))[:40]
    model = mc.get('name', '?')
    
    # Find matching product
    match = None
    for p in products:
        pn = (p.get('name','') or '').lower()
        tn = title.lower().strip()
        if tn in pn or pn in tn:
            match = p
            break
        # Try by external ID
        if str(p.get('externalId','')) == ext_id:
            match = p
            break
    
    slug = match.get('slug', 'N/A') if match else 'NO_MATCH'
    print(f'{d}')
    print(f'  title={title}  model={model}')
    print(f'  extId=...{ext_id[-8:] if len(ext_id) > 8 else ext_id}')
    print(f'  slug={slug}')
    print()