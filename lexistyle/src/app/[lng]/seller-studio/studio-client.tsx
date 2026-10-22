"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, ChevronRight, FileUp, Package, Plus, RefreshCw, Search, Store, X } from "lucide-react";
import styles from "./studio.module.css";

type Variant = { sku: string; color: string; size: string; stock: number };
type ProductInput = {
  sku: string; title: string; description: string; englishTitle: string; englishDescription: string;
  imageUrls: string[]; variants: Variant[]; costSgd: number; priceSgd: number; shippingSgd: number;
  feePercent: number; weightKg: number; categoryId: number; logisticId: number; brand: string; rightsConfirmed: boolean;
};
type Product = ProductInput & {
  id: string; revision: number; status: "draft" | "approved" | "publishing" | "published" | "attention";
  source: "manual" | "csv" | "catalog"; engine?: string; issues: string[]; margin: number; updatedAt: string;
  publication?: { shopId: string; itemId?: number; error?: string };
};
type Order = {
  orderSn: string; status: string; currency: string; total: number; shopId: string;
  items: { name: string; sku: string; quantity: number; match: "matched" | "unmatched" | "ambiguous"; supplierSku?: string }[];
};
type Snapshot = {
  workspace: { name: string; id: string }; products: Product[]; shops: { id: string; shopId: string; name: string; region: string }[];
  orders: Order[]; audit: { at: string; action: string; detail: string }[];
  capabilities: { local: boolean; catalog: boolean; ai: boolean; shopee: boolean; live: boolean }; actor: string;
};
type CatalogItem = { id: number; title: string; titleKo?: string; primaryThumbUrl?: string };
const statusLabels: Record<Product["status"], string> = {
  draft: "작성 중", approved: "승인 완료", publishing: "등록 중", published: "등록 완료", attention: "확인 필요",
};
const emptyProduct = (): ProductInput => ({
  sku: "", title: "", description: "", englishTitle: "", englishDescription: "", imageUrls: [],
  variants: [{ sku: "", color: "", size: "", stock: 0 }], costSgd: 0, priceSgd: 0,
  shippingSgd: 0, feePercent: 0, weightKg: 0, categoryId: 0, logisticId: 0, brand: "", rightsConfirmed: false,
});
const money = (value: number) => new Intl.NumberFormat("ko-KR", { style: "currency", currency: "SGD" }).format(value);
const stamp = (value: string) => new Date(value).toLocaleString("ko-KR");

async function request(url: string, body?: Record<string, unknown>) {
  const response = await fetch(url, body ? {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  } : { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 401 ? "LOGIN_REQUIRED" : data.error || `요청 실패 (${response.status})`);
  return data;
}

export default function StudioClient() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [tab, setTab] = useState<"products" | "orders" | "connections">("products");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [editor, setEditor] = useState(false);
  const [form, setForm] = useState<ProductInput>(emptyProduct);
  const [dirty, setDirty] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [shopId, setShopId] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogSearched, setCatalogSearched] = useState(false);
  const [unmatchedOnly, setUnmatchedOnly] = useState(false);
  const upload = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const snapshot: Snapshot = await request("/api/seller-studio");
    setData(snapshot);
    setShopId(current => snapshot.shops.some(shop => String(shop.shopId) === current) ? current : String(snapshot.shops[0]?.shopId || ""));
    return snapshot;
  }, []);

  useEffect(() => { reload().catch(err => setError(err.message)); }, [reload]);
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);

  function openEditor(product?: Product) {
    setSelected(product || null); setForm(product ? structuredClone(product) : emptyProduct());
    setDirty(false); setShowReview(false); setEditor(true); setError("");
  }
  function change<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm(current => ({ ...current, [key]: value })); setDirty(true); setShowReview(false);
  }
  function changeVariant(index: number, key: keyof Variant, value: string | number) {
    change("variants", form.variants.map((variant, i) => i === index ? { ...variant, [key]: value } : variant));
  }
  async function mutate(action: string, payload: Record<string, unknown> = {}, success = "저장했습니다.") {
    setBusy(action); setError(""); setNotice("");
    try {
      const result = await request("/api/seller-studio", { action, ...payload });
      const snapshot = await reload();
      const updated = snapshot.products.find(product => product.id === (result.product?.id || payload.id));
      if (updated) { setSelected(updated); setForm(structuredClone(updated)); setDirty(false); }
      setNotice(success); return result;
    } catch (err) { setError(err instanceof Error ? err.message : "요청을 처리하지 못했습니다."); return null; }
    finally { setBusy(""); }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    const result = await mutate(selected ? "save" : "create", { ...(selected ? { id: selected.id, revision: selected.revision } : {}), product: form });
    if (result && !selected && !result.product) setEditor(false);
  }
  async function importCsv(file?: File) {
    if (!file) return;
    if (file.size > 1024 * 1024) { setError("CSV 파일은 1MB 이하로 올려 주세요."); return; }
    try { await mutate("importCsv", { csv: await file.text() }, "CSV 상품을 가져왔습니다. 각 상품의 옵션과 가격을 검토해 주세요."); }
    catch { setError("파일을 읽지 못했습니다."); }
    if (upload.current) upload.current.value = "";
  }
  function template() {
    const csv = "\uFEFFsku,title,description,englishTitle,englishDescription,imageUrls,costSgd,priceSgd,shippingSgd,feePercent,weightKg,categoryId,logisticId,brand\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "lexi-seller-studio-template.csv"; anchor.click(); URL.revokeObjectURL(url);
  }
  async function searchCatalog(event: FormEvent) {
    event.preventDefault(); setBusy("catalog"); setError("");
    try { const result = await request(`/api/seller-studio?catalog=${encodeURIComponent(catalogQuery)}`); setCatalog(result.items || []); setCatalogSearched(true); }
    catch (err) { setError(err instanceof Error ? err.message : "카탈로그 조회 실패"); }
    finally { setBusy(""); }
  }

  if (!data) return <section className={styles.studio}><div className={styles.empty}>
    <p className={styles.eyebrow}>LEXI SELLER STUDIO</p><h1>{error === "LOGIN_REQUIRED" ? "내 판매 작업 공간에 로그인" : error ? "작업 공간을 불러오지 못했습니다" : "판매 작업 공간을 불러오는 중"}</h1>
    {error === "LOGIN_REQUIRED" ? <><p>상품과 상점 데이터는 로그인한 계정별로 관리됩니다.</p><a className={styles.primary} href="/api/auth/google">Google로 로그인 <ArrowRight size={16} /></a></> : error ? <><p role="alert">{error}</p><button onClick={() => { setError(""); reload().catch(err => setError(err.message)); }}>다시 시도</button></> : <p>상품·연결 상점·주문 상태를 확인하고 있습니다.</p>}
  </div></section>;

  const products = data.products.filter(product => (filter === "all" || product.status === filter) && `${product.title} ${product.englishTitle} ${product.sku}`.toLowerCase().includes(query.toLowerCase()));
  const unmatched = data.orders.reduce((count, order) => count + order.items.filter(item => item.match !== "matched").length, 0);
  const orders = data.orders.filter(order => (!shopId || String(order.shopId) === shopId) && (!unmatchedOnly || order.items.some(item => item.match !== "matched")));
  const busyAny = !!busy;
  const estimatedMargin = form.priceSgd * (1 - form.feePercent / 100) - form.costSgd - form.shippingSgd;
  const shopSelect = <select aria-label="대상 Shopee 상점" value={shopId} onChange={event => setShopId(event.target.value)} disabled={busyAny || !data.shops.length}>
    {!data.shops.length && <option value="">연결된 상점 없음</option>}
    {data.shops.map(shop => <option key={shop.id} value={String(shop.shopId)}>{shop.name} · {shop.region}</option>)}
  </select>;

  return <section className={styles.studio}>
    <header className={styles.hero}>
      <div><p className={styles.eyebrow}>LEXI / SELLER STUDIO</p><h1>좋은 상품을,<br />다음 시장으로.</h1><p>상품 현지화부터 Shopee 등록, 주문 옵션 확인까지.<br className={styles.desktopBreak} /> 내 상점의 판매 준비를 한곳에서 관리하세요.</p></div>
      <div className={styles.workspace}><Store size={22} /><strong>{data.workspace.name}</strong><span>{data.capabilities.local ? "로컬 작업 공간" : "계정 전용 작업 공간"}</span><span className={styles.badge}>{data.shops.length ? `${data.shops.length}개 상점 연결` : "Shopee 연결 전"}</span><small>{data.capabilities.live ? "실제 상품등록 사용 가능" : "초안 작성·검토 가능 / 실등록 비활성"}</small></div>
    </header>
    <div className={styles.stats}>
      {[["작업 중인 상품", data.products.length, "전체 상품"], ["등록 승인", data.products.filter(p => p.status === "approved").length, "검토를 마친 상품"], ["등록 완료", data.products.filter(p => p.status === "published").length, "Shopee 등록 확인"], ["옵션 확인 필요", unmatched, "미매칭·중복 SKU"]].map(([label, value, sub]) => <div key={label}><span>{label}</span><strong>{value}<small>건</small></strong><small>{sub}</small></div>)}
    </div>
    <nav className={styles.tabs} aria-label="판매 작업 메뉴">{([["products", "상품 작업"], ["orders", "주문·옵션 확인"], ["connections", "상점 연결·기록"]] as const).map(([value, label]) => <button key={value} aria-current={tab === value ? "page" : undefined} onClick={() => setTab(value)}>{label}</button>)}</nav>
    {error && <div className={styles.error} role="alert">{error === "LOGIN_REQUIRED" ? <a href="/api/auth/google">로그인이 만료되었습니다. 다시 로그인해 주세요.</a> : error}<button aria-label="오류 닫기" onClick={() => setError("")}><X size={16} /></button></div>}
    {notice && <div className={styles.notice} role="status"><Check size={16} />{notice}<button aria-label="알림 닫기" onClick={() => setNotice("")}><X size={16} /></button></div>}
    {busy && <p className={styles.working} role="status"><RefreshCw size={15} /> {busy === "publish" ? "Shopee 상품등록 결과를 확인하고 있습니다. 중복 등록하지 말고 기다려 주세요." : busy === "syncOrders" ? "상점의 주문과 옵션을 확인하고 있습니다." : "작업을 처리하고 있습니다."}</p>}

    {tab === "products" && <>
      <div className={styles.sectionHeading}><div><h2>상품 작업</h2><p>자료를 모으고, 영어 콘텐츠와 옵션을 검토한 뒤 등록하세요.</p></div><div className={styles.actions}><button onClick={template}>CSV 양식</button><button disabled={busyAny} onClick={() => upload.current?.click()}><FileUp size={16} /> CSV 가져오기</button>{data.capabilities.catalog && <button onClick={() => setCatalogOpen(!catalogOpen)}>기존 카탈로그</button>}<button className={styles.primary} onClick={() => openEditor()}><Plus size={16} /> 상품 추가</button><input ref={upload} type="file" accept=".csv,text/csv" className={styles.hidden} onChange={event => void importCsv(event.target.files?.[0])} /></div></div>
      {catalogOpen && <section className={styles.panel}><h3>기존 카탈로그에서 가져오기</h3><p>현재 작업 공간에 초안으로 복사합니다. 권리·가격·옵션은 다시 확인하세요.</p><form onSubmit={searchCatalog} className={styles.actions}><input aria-label="카탈로그 검색어" value={catalogQuery} onChange={event => setCatalogQuery(event.target.value)} placeholder="상품명 또는 카탈로그 ID" /><button disabled={busyAny}><Search size={16} /> 검색</button></form><div className={styles.catalogList}>{catalog.map(item => <div key={item.id}><div><strong>{item.titleKo || item.title}</strong><small>카탈로그 #{item.id}</small></div><button disabled={busyAny} onClick={() => void mutate("importCatalog", { catalogId: item.id }, "카탈로그 상품을 초안으로 가져왔습니다.")}>가져오기</button></div>)}</div>{catalogSearched && !catalog.length && <p>검색 결과가 없습니다.</p>}</section>}
      <div className={styles.toolbar}><div className={styles.search}><Search size={16} /><input aria-label="상품 검색" placeholder="상품명 또는 SKU 검색" value={query} onChange={event => setQuery(event.target.value)} /></div><select aria-label="상품 상태 필터" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">전체 상태</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span>{products.length}개 상품</span></div>
      {!products.length ? <div className={styles.empty}><Package size={36} /><h3>{data.products.length ? "조건에 맞는 상품이 없습니다" : "첫 상품의 판매 준비를 시작하세요"}</h3><p>{data.products.length ? "검색어나 상태 필터를 바꿔 보세요." : "Shopee 연결 전에도 상품 초안 작성과 CSV 가져오기를 사용할 수 있습니다."}</p>{!data.products.length && <button className={styles.primary} onClick={() => openEditor()}><Plus size={16} /> 첫 상품 추가</button>}</div> : <div className={styles.productGrid}>{products.map(product => <button key={product.id} className={styles.productCard} onClick={() => openEditor(product)}><div className={styles.thumbnail}>{product.imageUrls[0] ? <img src={product.imageUrls[0]} alt={product.title} loading="lazy" referrerPolicy="no-referrer" /> : <Package size={36} />}<span className={styles.badge} data-status={product.status}>{statusLabels[product.status]}</span></div><div className={styles.productInfo}><small>{product.sku || "SKU 미입력"}</small><h3>{product.title || "제목 없는 상품"}</h3><p>{product.englishTitle || "영문 콘텐츠를 준비해 주세요"}</p><div><strong>{money(product.priceSgd)}</strong><span>옵션 {product.variants.length}개</span></div><small className={product.issues.length ? styles.warningText : ""}>{product.issues.length ? `검토 항목 ${product.issues.length}개` : "검토 항목 확인"}<ChevronRight size={14} /></small></div></button>)}</div>}
    </>}

    {tab === "orders" && <>
      <div className={styles.sectionHeading}><div><h2>주문·옵션 확인</h2><p>실제 주문의 SKU와 작업 공간의 공급 SKU를 대조합니다.</p></div><div className={styles.actions}>{shopSelect}<button className={styles.primary} disabled={busyAny || !shopId || !data.capabilities.live} onClick={() => void mutate("syncOrders", { shopId }, "주문을 조회하고 옵션 연결 상태를 갱신했습니다.")}><RefreshCw size={16} /> 주문 불러오기</button></div></div>
      {!data.capabilities.live && <p className={styles.panel}>실제 주문 조회는 API 설정과 상점 연결이 완료된 뒤 사용할 수 있습니다.</p>}
      <label className={styles.check}><input type="checkbox" checked={unmatchedOnly} onChange={event => setUnmatchedOnly(event.target.checked)} />확인이 필요한 주문만 보기</label>
      {!orders.length ? <div className={styles.empty}><Package size={36} /><h3>표시할 주문이 없습니다</h3><p>연결된 상점에서 주문을 불러오면 실제 주문과 옵션 대조 결과가 표시됩니다.</p></div> : <div className={styles.orderList}>{orders.map(order => <article className={styles.panel} key={`${order.shopId}:${order.orderSn}`}><div className={styles.sectionHeading}><div><h3>{order.orderSn}</h3><small>상점 {order.shopId} · {order.status}</small></div><strong>{order.currency} {order.total.toLocaleString("ko-KR")}</strong></div>{order.items.map((item, index) => <div className={styles.orderItem} key={`${item.sku}:${index}`}><div><strong>{item.name}</strong><small>주문 SKU: {item.sku || "없음"} · {item.quantity}개</small>{item.supplierSku && <small>공급 SKU: {item.supplierSku}</small>}</div><span className={styles.badge} data-status={item.match === "matched" ? "approved" : "attention"}>{item.match === "matched" ? "연결 확인" : item.match === "ambiguous" ? "중복 SKU" : "미매칭"}</span></div>)}</article>)}</div>}
    </>}

    {tab === "connections" && <>
      <div className={styles.sectionHeading}><div><h2>상점 연결</h2><p>상점 소유자의 승인으로 Shopee를 연결합니다.</p></div>{data.capabilities.shopee ? <a className={styles.primary} href="/api/seller-studio/connect">Shopee 상점 연결 <ArrowRight size={16} /></a> : <span className={styles.badge}>개발자 API 설정 필요</span>}</div>
      {!data.capabilities.shopee && <div className={styles.panel}><h3>상품 준비는 지금, 상점 연결은 승인 후</h3><p>Shopee Open Platform의 앱 승인과 Partner ID·Key 설정이 필요합니다. 키와 비밀번호는 이 화면에 입력하지 않습니다.</p><a href="https://open.shopee.com/" target="_blank" rel="noreferrer">Shopee Open Platform 열기 <ArrowRight size={14} /></a></div>}
      <div className={styles.connectionGrid}>{data.shops.map(shop => <article className={styles.panel} key={shop.id}><Store size={22} /><h3>{shop.name}</h3><p>{shop.region} · Shop ID {shop.shopId}</p><span className={styles.badge}>상점 연결됨</span></article>)}</div>
      <section className={styles.panel}><h3>현재 사용 가능한 기능</h3><dl className={styles.capabilities}><div><dt>상품 작성·CSV·검토</dt><dd>사용 가능</dd></div><div><dt>현지화 초안</dt><dd>{data.capabilities.ai ? "AI 초안 생성" : "템플릿·수동 작성"}</dd></div><div><dt>기존 카탈로그 가져오기</dt><dd>{data.capabilities.catalog ? "사용 가능" : "권한 필요"}</dd></div><div><dt>실제 상품등록·주문조회</dt><dd>{data.capabilities.live ? "사용 가능" : "API·상점 연결 필요"}</dd></div></dl><p className={styles.muted}>템플릿 모드는 번역을 수행하지 않습니다. 상품의 실제 정보와 영문 내용을 직접 검토해 주세요.</p></section>
      <section className={styles.panel}><h3>작업 기록</h3>{!data.audit.length ? <p>아직 기록된 작업이 없습니다.</p> : <div className={styles.audit}>{data.audit.slice(0, 30).map((entry, index) => <div key={`${entry.at}:${index}`}><time dateTime={entry.at}>{stamp(entry.at)}</time><strong>{entry.action}</strong><span>{entry.detail}</span></div>)}</div>}</section>
    </>}

    {editor && <div className={styles.overlay}><section className={styles.editor} role="dialog" aria-modal="true" aria-labelledby="studio-editor-title"><header className={styles.editorHeader}><div><p className={styles.eyebrow}>PRODUCT WORKSPACE</p><h2 id="studio-editor-title">{selected ? "상품 편집·등록 검토" : "새 상품"}</h2></div><button type="button" aria-label="상품 편집 닫기" disabled={busyAny} onClick={() => { if (!dirty || window.confirm("저장하지 않은 변경을 버리고 닫을까요?")) setEditor(false); }}><X size={20} /></button></header>
      <form onSubmit={save} className={styles.editorBody}>
        {error && <div className={styles.error} role="alert">{error === "LOGIN_REQUIRED" ? <a href="/api/auth/google">다시 로그인해 주세요.</a> : error}</div>}
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        <div className={styles.editorSteps}><span>01 상품 자료</span><ChevronRight size={14} /><span>02 영문·옵션 검토</span><ChevronRight size={14} /><span>03 승인·등록</span></div>
        <fieldset disabled={busyAny || selected?.status === "publishing"}>
          <legend>상품 자료</legend><div className={styles.fields}><label>상품명<input required value={form.title} onChange={event => change("title", event.target.value)} placeholder="예: 코튼 루즈핏 셔츠" /></label><label>상품 SKU<input required value={form.sku} onChange={event => change("sku", event.target.value)} placeholder="고유한 상품 코드" /></label><label>브랜드<input value={form.brand} onChange={event => change("brand", event.target.value)} /></label><label>무게 (kg)<input type="number" min="0" step="0.001" value={form.weightKg} onChange={event => change("weightKg", Number(event.target.value))} /></label></div>
          <label>원본 상품 설명<textarea rows={4} value={form.description} onChange={event => change("description", event.target.value)} placeholder="소재, 실측, 세탁법 등 확인된 정보를 입력하세요." /></label>
          <label>이미지 URL (한 줄에 하나)<textarea rows={3} value={form.imageUrls.join("\n")} onChange={event => change("imageUrls", event.target.value.split("\n"))} placeholder="https://…" /></label>
          <label className={styles.check}><input type="checkbox" checked={form.rightsConfirmed} onChange={event => change("rightsConfirmed", event.target.checked)} />이 상품 자료와 이미지를 사용할 권한이 있습니다.</label>
        </fieldset>
        <fieldset disabled={busyAny || selected?.status === "publishing"}><legend>현지화 콘텐츠</legend><p className={styles.muted}>{data.capabilities.ai ? "AI 초안은 실제 상품 정보와 대조한 뒤 사용하세요." : "AI 미연결: 템플릿을 준비할 수 있으며, 영문 번역은 직접 작성해야 합니다."}</p><label>영문 상품명<input value={form.englishTitle} onChange={event => change("englishTitle", event.target.value)} /></label><label>영문 상품 설명<textarea rows={6} value={form.englishDescription} onChange={event => change("englishDescription", event.target.value)} /></label><button type="button" disabled={!selected || dirty || busyAny || selected.status === "published"} onClick={() => selected && void mutate("localize", { id: selected.id, revision: selected.revision }, data.capabilities.ai ? "현지화 초안을 준비했습니다. 실제 상품과 대조해 주세요." : "템플릿을 준비했습니다. 영문 번역을 직접 검토·작성해 주세요.")}>{data.capabilities.ai ? "현지화 초안 생성" : "현지화 템플릿 준비"}</button>{dirty && <small>초안을 생성하기 전에 변경사항을 저장하세요.</small>}{selected?.engine && <small>작성 방식: {selected.engine}</small>}</fieldset>
        <fieldset disabled={busyAny || selected?.status === "publishing"}><legend>옵션·공급 SKU</legend><p className={styles.muted}>옵션별 고유 SKU가 주문 대조에 사용됩니다. 현재 실등록 지원 범위는 등록 검토 결과를 확인하세요.</p>{form.variants.map((variant, index) => <div key={index} className={styles.variant}><label>옵션 SKU<input aria-label={`옵션 ${index + 1} SKU`} value={variant.sku} onChange={event => changeVariant(index, "sku", event.target.value)} /></label><label>색상<input value={variant.color} onChange={event => changeVariant(index, "color", event.target.value)} /></label><label>사이즈<input value={variant.size} onChange={event => changeVariant(index, "size", event.target.value)} /></label><label>재고<input type="number" min="0" step="1" value={variant.stock} onChange={event => changeVariant(index, "stock", Number(event.target.value))} /></label><button type="button" aria-label={`옵션 ${index + 1} 삭제`} onClick={() => change("variants", form.variants.filter((_, i) => i !== index))}><X size={16} /></button></div>)}<button type="button" onClick={() => change("variants", [...form.variants, { sku: "", color: "", size: "", stock: 0 }])}><Plus size={16} /> 옵션 추가</button></fieldset>
        <fieldset disabled={busyAny || selected?.status === "publishing"}><legend>가격·Shopee 등록 정보</legend><div className={styles.fields}>{([["costSgd", "원가 (SGD)"], ["priceSgd", "판매가 (SGD)"], ["shippingSgd", "배송비 (SGD)"], ["feePercent", "예상 수수료 (%)"], ["categoryId", "Shopee 카테고리 ID"], ["logisticId", "Shopee 물류 ID"]] as const).map(([key, label]) => <label key={key}>{label}<input type="number" min="0" max={key === "feePercent" ? 100 : undefined} step={key.endsWith("Id") ? "1" : "0.01"} value={form[key]} onChange={event => change(key, Number(event.target.value))} /></label>)}</div><div className={styles.margin}><span>예상 건당 마진</span><strong className={estimatedMargin < 0 ? styles.warningText : ""}>{money(estimatedMargin)}</strong><small>판매가 − 수수료 − 원가 − 배송비 · 세금·반품비 제외</small></div></fieldset>
        {selected && <div className={styles.panel}><h3>검토 결과 <span className={styles.badge} data-status={selected.status}>{statusLabels[selected.status]}</span></h3>{dirty && <p className={styles.warningText}>아래 결과는 마지막 저장 기준입니다. 변경사항을 먼저 저장하세요.</p>}{selected.issues.length ? <ul>{selected.issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul> : <p>저장된 상품의 기본 검토를 통과했습니다. 실제 상품과 영문 내용을 확인한 뒤 승인하세요.</p>}{selected.publication?.itemId && <p>Shopee 상품 ID: {selected.publication.itemId}</p>}{selected.publication?.error && <p className={styles.warningText}>{selected.publication.error}</p>}</div>}
        <div className={styles.editorActions}><span>{dirty ? "저장하지 않은 변경사항" : selected ? `저장됨 · 버전 ${selected.revision}` : "새 상품 초안"}</span><button className={styles.primary} disabled={busyAny || selected?.status === "publishing"} type="submit">{busy === "save" || busy === "create" ? "저장 중…" : "상품 저장"}</button>{selected && selected.status !== "published" && <button type="button" disabled={busyAny || dirty || !!selected.issues.length || selected.status === "publishing"} onClick={() => void mutate("approve", { id: selected.id, revision: selected.revision }, "상품을 승인했습니다. 실제 등록은 별도 확인 후 진행됩니다.")}>검토 완료·승인</button>}{selected?.status === "approved" && <button type="button" disabled={busyAny || dirty} onClick={() => setShowReview(true)}>Shopee 등록 검토 <ArrowRight size={16} /></button>}</div>
        {showReview && selected && <section className={styles.publishReview}><h3>이 상품을 실제 Shopee 상점에 등록합니다</h3><p>승인된 버전 {selected.revision} · {selected.englishTitle} · {money(selected.priceSgd)}</p>{shopSelect}<p>최종 확인을 누르면 실제 판매 상품이 생성됩니다. 상점·가격·재고를 확인하세요.</p>{!data.capabilities.live && <p className={styles.warningText}>API 설정과 상점 연결이 완료되어야 실제 등록할 수 있습니다.</p>}<div className={styles.actions}><button type="button" onClick={() => setShowReview(false)} disabled={busyAny}>취소</button><button type="button" className={styles.primary} disabled={busyAny || !shopId || !data.capabilities.live || dirty} onClick={async () => { const result = await mutate("publish", { id: selected.id, revision: selected.revision, shopId }, "Shopee 등록 결과를 갱신했습니다."); if (result) setShowReview(false); }}>{busy === "publish" ? "등록 중…" : "확인·실제 상품등록"}</button></div></section>}
      </form>
    </section></div>}
  </section>;
}
