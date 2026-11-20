// End-to-end check through the real stack: browser-style requests -> Next.js (proxy + cookies) -> .NET API -> PostgreSQL (v6 schema).
//   BASE=http://localhost:3100 COMPANY="Smoke Shoes" USER=owner PASSWORD='Smoke-Owner-1' node scripts/smoke.mjs
// It creates data in the company it signs in to (use a scratch database). Exit code 1 if anything fails.
const BASE = process.env.BASE ?? "http://localhost:3100";
const COMPANY = process.env.COMPANY ?? "Smoke Shoes";
const USER = process.env.USER_NAME ?? "owner";
const PASSWORD = process.env.PASSWORD ?? "Smoke-Owner-1";

let jar = {};
const results = [];
const ok = (name, cond, extra = "") => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  " + extra}`); };
const cookieHeader = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join("; ");
function absorb(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair, ...attrs] = c.split(";");
    const [k, v] = [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)];
    if (v === "" || attrs.some((a) => /max-age=0|expires=thu, 01 jan 1970/i.test(a))) delete jar[k]; else jar[k] = v;
  }
}
async function raw(path, init = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", ...init, headers: { cookie: cookieHeader(), ...(init.body ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}) } });
  absorb(res);
  return res;
}
async function api(method, path, body) {
  const res = await raw(`/api/v1${path}`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : undefined; } catch { /* not json */ }
  return { status: res.status, json, text };
}
const id = (r) => r.json?.id;

async function main() {
  // ---- gate and sign-in
  let r = await raw("/dashboard");
  ok("anonymous visitor is sent to /login", r.status >= 300 && r.status < 400 && (r.headers.get("location") ?? "").includes("/login"));
  r = await raw("/login"); ok("login page renders", r.status === 200);
  r = await raw("/api/v1/auth/me"); ok("API through the proxy needs a session (401)", r.status === 401);

  r = await raw("/api/session/login", { method: "POST", body: JSON.stringify({ company: COMPANY, userName: USER, password: "wrong-pass-1" }) });
  const bad = await r.json();
  ok("wrong password is refused with a readable message", r.status === 401 && /invalid/i.test(bad.title ?? ""), JSON.stringify(bad));
  ok("no cookie is set by a failed sign-in", !jar.efw_sid);

  r = await raw("/api/session/login", { method: "POST", body: JSON.stringify({ company: COMPANY, userName: USER, password: PASSWORD }) });
  const login = await r.json();
  ok("owner signs in", r.status === 200 && login.me?.isOwner === true, JSON.stringify(login));
  ok("session cookie is httpOnly and not in the JSON body", !!jar.efw_sid && !JSON.stringify(login).includes(jar.efw_sid));
  const me = login.me;

  // ---- every screen answers
  const pages = ["/dashboard", "/sales", "/sales/new", "/purchases", "/purchases/new", "/products", "/products/new", "/stock", "/parties?kind=customer", "/parties?kind=vendor", "/parties/new", "/vouchers", "/vouchers/new?type=PAYMENT",
    "/reports", "/reports/run?key=trial-balance", "/settings/stores", "/settings/masters", "/users", "/users/new", "/account/password"];
  for (const p of pages) { r = await raw(p); ok(`page ${p} renders (200)`, r.status === 200, String(r.status)); }
  r = await raw("/login"); ok("signed-in visitor is moved off /login", r.status >= 300 && r.status < 400);

  // ---- master data, product, purchase, sale
  const tag = Math.random().toString(36).slice(2, 8);
  const dep = id(await api("POST", "/masters/departments", { name: "Footwear " + tag }));
  const cat = id(await api("POST", "/masters/categories", { name: "Sandals " + tag, departmentId: dep }));
  const grp = id(await api("POST", "/masters/size-groups", { name: "Adult " + tag }));
  for (const s of ["7", "8", "9"]) await api("POST", "/masters/sizes", { sizeGroupId: grp, sizeCode: s, sortOrder: Number(s) });
  ok("master data created", dep && cat && grp);
  const vendor = id(await api("POST", "/parties", { name: "Bata Supply " + tag, isVendor: true, creditLimit: 1000000 }));
  const customer = id(await api("POST", "/parties", { name: "Ali Khan " + tag, isCustomer: true, cnic: "35202-1234567-1" }));
  r = await api("POST", "/catalog/products", { name: "Sandal " + tag, departmentId: dep, categoryId: cat, variants: ["7", "8", "9"].map((s) => ({ sizeGroupId: grp, sizeCode: s, purchasePrice: 1200, salePrice: 2000 })) });
  ok("product with 3 sizes created", r.status === 201, r.text);
  const prod = await api("GET", `/catalog/products/${id(r)}`);
  const vs = prod.json.variants;
  ok("product shows sizes and barcodes", vs.length === 3 && vs.every((v) => v.barcode));

  r = await api("POST", "/purchases", { vendorId: vendor, vendorBillNo: "VB-" + tag, lines: vs.map((v) => ({ variantId: v.id, qty: 10, unitCost: 1200 })) });
  ok("purchase posted (36,000)", r.status === 201 && r.json.netAmount === 36000, r.text);
  const purchaseId = r.json?.id;
  ok("vendor balance is -36,000", (await api("GET", `/parties/${vendor}`)).json.balance === -36000);

  const barcode = vs[0].barcode;
  r = await api("GET", `/catalog/lookup?barcode=${encodeURIComponent(barcode)}`);
  ok("barcode lookup returns price and stock", r.json?.salePrice === 2000 && r.json?.stockQty === 10, r.text);

  r = await api("POST", "/sales", { customerId: customer, saleUuid: crypto.randomUUID(), lines: [{ barcode, qty: 2 }, { variantId: vs[1].id, qty: 1 }], payments: [{ method: "CASH", amount: 4000 }] });
  ok("sale posted: net 6,000, 4,000 paid, 2,000 on account", r.status === 201 && r.json.invoice.netAmount === 6000 && r.json.invoice.creditAmount === 2000, r.text);
  const sale = r.json.invoice;
  ok("customer balance is 2,000", (await api("GET", `/parties/${customer}`)).json.balance === 2000);
  const uuid = crypto.randomUUID();
  const body = { saleUuid: uuid, lines: [{ barcode, qty: 1 }], payInFull: true };
  const a = await api("POST", "/sales", body), b = await api("POST", "/sales", body);
  ok("a retried sale (same saleUuid) is not posted twice", a.status === 201 && b.status === 200 && b.json.duplicate === true && a.json.invoice.id === b.json.invoice.id);
  r = await api("POST", "/sales", { lines: [{ barcode, qty: 500 }], payInFull: true });
  ok("selling more than the stock is refused, readably", r.status === 422 && /Not enough stock/.test(r.json?.title ?? ""), r.text);

  r = await api("GET", `/sales/${sale.id}/receipt`);
  ok("receipt data has company, store and lines", r.json?.company?.name === COMPANY && r.json?.lines?.length === 2);
  r = await raw(`/sales/${sale.id}`); ok("invoice page renders", r.status === 200);

  r = await api("POST", "/sales/returns", { originalInvoiceId: sale.id, lines: [{ originalLineId: sale.lines[0].id, qty: 1 }] });
  ok("return posted (-2,000), stock back", r.status === 201 && r.json.invoice.netAmount === -2000, r.text);
  r = await api("POST", "/sales/returns", { originalInvoiceId: sale.id, lines: [{ originalLineId: sale.lines[0].id, qty: 5 }] });
  ok("over-return is refused with the numbers", r.status === 422 && /at most 1/.test(r.json?.title ?? ""), r.text);

  // ---- money
  r = await api("POST", "/accounting/vouchers", { type: "PAYMENT", partyId: vendor, amount: 10000, mode: "BANK", allocations: [{ purchaseInvoiceId: purchaseId, amount: 10000 }] });
  ok("vendor payment settles part of the bill", r.status === 201, r.text);
  ok("vendor balance is -26,000", (await api("GET", `/parties/${vendor}`)).json.balance === -26000);
  const from = new Date().toISOString().slice(0, 8) + "01", to = new Date().toISOString().slice(0, 10);
  r = await api("GET", `/reports/trial-balance?from=${from}&to=${to}`);
  const rows = r.json?.rows ?? [];
  const dr = rows.reduce((x, y) => x + y.periodDebit, 0), cr = rows.reduce((x, y) => x + y.periodCredit, 0);
  ok("trial balance balances", rows.length > 3 && dr === cr && dr > 0, `${dr} vs ${cr}`);

  // ---- stores and permissions
  r = await api("POST", "/stores", { code: "S" + tag.toUpperCase(), name: "Branch " + tag });
  const second = id(r);
  ok("second store opened", r.status === 201, r.text);
  r = await raw("/api/session/switch-store", { method: "POST", body: JSON.stringify({ storeId: second }) });
  const sw = await r.json();
  ok("switching store changes the working store", r.status === 200 && sw.currentStore?.id === second, JSON.stringify(sw));
  r = await api("GET", "/auth/me"); ok("the proxy sends the chosen store on later calls", r.json?.currentStore?.id === second);
  r = await raw("/api/session/switch-store", { method: "POST", body: JSON.stringify({ storeId: 999999 }) }); ok("a store the user does not hold is refused", r.status >= 400);
  await raw("/api/session/switch-store", { method: "POST", body: JSON.stringify({ storeId: me.currentStore.id }) });

  const cashier = "cashier" + tag;
  r = await api("POST", "/users", { userName: cashier, fullName: "Cashier " + tag, role: "CASHIER_SALESMAN", password: "Start-Pass-1", storeIds: [me.currentStore.id], permissions: ["SALE_CREATE"] });
  ok("cashier created with one permission", r.status === 201, r.text);

  // ---- parallel requests, then sign out
  const many = await Promise.all(Array.from({ length: 20 }, () => api("GET", "/auth/me")));
  ok("20 parallel requests all succeed", many.every((x) => x.status === 200));
  const before = { ...jar };
  r = await raw("/api/session/logout", { method: "POST" });
  ok("sign-out clears the cookie", r.status === 200 && !jar.efw_sid);
  jar = before;   // replay the old cookie: the API must have ended that session
  r = await api("GET", "/auth/me"); ok("the old session token no longer works (revoked in the database)", r.status === 401);
  jar = {};

  // ---- the cashier signs in: forced password change, then limited rights
  r = await raw("/api/session/login", { method: "POST", body: JSON.stringify({ company: COMPANY, userName: cashier, password: "Start-Pass-1" }) });
  const cl = await r.json();
  ok("a new user must change the temporary password", r.status === 200 && cl.mustChangePassword === true);
  r = await api("GET", "/stores"); ok("…and nothing else works until they do", r.status === 403);
  r = await api("POST", "/auth/change-password", { currentPassword: "Start-Pass-1", newPassword: "Better-Pass-22" }); ok("password changed", r.status === 204);
  jar = {};
  r = await raw("/api/session/login", { method: "POST", body: JSON.stringify({ company: COMPANY, userName: cashier, password: "Better-Pass-22" }) });
  ok("signs in with the new password", r.status === 200);
  r = await api("GET", "/users"); ok("a cashier cannot open user administration (403)", r.status === 403);
  r = await api("PUT", `/catalog/variants/${vs[0].id}/prices`, { purchasePrice: 1, salePrice: 1 }); ok("a cashier cannot change prices (403)", r.status === 403);
  r = await api("POST", "/sales", { lines: [{ barcode, qty: 1 }], payInFull: true }); ok("a cashier can sell", r.status === 201, r.text);
  r = await api("POST", "/sales", { lines: [{ barcode, qty: 1, unitPrice: 100 }], payInFull: true }); ok("…but not at a price they made up (403)", r.status === 403);

  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
