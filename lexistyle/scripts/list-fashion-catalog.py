import json, os

store = json.loads(open(os.path.expanduser('~/.lexi-local/data/lexi-local.json'), 'r', encoding='utf8').read())
cats = store.get('catalog', [])

# Manually pick diverse, good fashion items by known catalog IDs
known_goods = [20, 29, 61, 1275, 1326, 1523, 4314, 4212, 3645, 100]

for cid in known_goods:
    r = next((x for x in cats if str(x.get('id')) == str(cid)), None)
    if r:
        print(f'[{cid:>4}]  ${r.get("minPrice","?"):>5}  {r.get("title","?")[:55]}  [{r.get("categoryPath",["?"])[0]}]  thumb={bool(r.get("primaryThumbUrl"))}')