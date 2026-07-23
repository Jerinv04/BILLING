import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus, Trash2, Pencil, Receipt, LayoutDashboard, Package, Users, History,
  Settings as SettingsIcon, AlertTriangle, TrendingUp, QrCode, Search, Phone,
  CreditCard, Wallet, Landmark, Smartphone, CalendarClock, ChevronRight,
  CheckCircle2, Gauge, X, Save, Loader2, Inbox
} from "lucide-react";

/* =========================================================================
   Fresh, empty-by-default billing system. Everything (shop details,
   products, customers, invoices) is created and edited from inside the
   app and persisted with window.storage — nothing is hardcoded.
   ========================================================================= */

const KEYS = {
  settings: "shop:settings",
  products: "shop:products",
  customers: "shop:customers",
  invoices: "shop:invoices",
  counter: "shop:invoice-counter",
};

const DEFAULT_SETTINGS = { name: "My Tyre Shop", address: "", phone: "", gstin: "" };
const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Wallet },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "bank", label: "Bank Transfer", icon: Landmark },
  { id: "emi", label: "EMI", icon: CalendarClock },
];
const CATEGORIES = ["Tyre", "Tube", "Battery", "Oil", "Accessory", "Service"];

const inr = (n) =>
  "\u20B9" + (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(16).slice(2));

// Shared build: persists to a Supabase table (app_data) instead of
// localStorage, so every device — laptop, phone, another PC — reads and
// writes the exact same live data. See src/supabaseClient.js.
import { supabase, isSupabaseConfigured } from "./supabaseClient";

async function loadJSON(key, fallback) {
  try {
    const { data, error } = await supabase
      .from("app_data")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return fallback;
    return data.value ?? fallback;
  } catch {
    return fallback;
  }
}
async function saveJSON(key, value) {
  try {
    await supabase.from("app_data").upsert({ key, value, updated_at: new Date().toISOString() });
  } catch (e) {
    console.error("supabase save failed", key, e);
  }
}

export default function TyreBillingSystem() {
  const [tab, setTab] = useState("invoice");
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [counter, setCounter] = useState(1);

  const loadAll = useCallback(async () => {
    const [s, p, c, inv, cnt] = await Promise.all([
      loadJSON(KEYS.settings, DEFAULT_SETTINGS),
      loadJSON(KEYS.products, []),
      loadJSON(KEYS.customers, []),
      loadJSON(KEYS.invoices, []),
      loadJSON(KEYS.counter, 1),
    ]);
    setSettings(s); setProducts(p); setCustomers(c); setInvoices(inv); setCounter(cnt);
  }, []);

  useEffect(() => {
    (async () => {
      await loadAll();
      setLoading(false);
    })();

    // Live sync: when this shop's data changes on ANY device, refresh here too.
    const channel = supabase
      .channel("app_data_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_data" }, () => {
        loadAll();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadAll]);

  const persist = {
    settings: async (v) => { setSettings(v); await saveJSON(KEYS.settings, v); },
    products: async (v) => { setProducts(v); await saveJSON(KEYS.products, v); },
    customers: async (v) => { setCustomers(v); await saveJSON(KEYS.customers, v); },
    invoices: async (v) => { setInvoices(v); await saveJSON(KEYS.invoices, v); },
    counter: async (v) => { setCounter(v); await saveJSON(KEYS.counter, v); },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121417] text-white/60">
        <FontImports />
        <Loader2 className="animate-spin mr-2" size={18} /> Loading your shop data...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-[#121417] text-[#E7E5DF]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <FontImports />
      {!isSupabaseConfigured && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-sm text-center py-2 px-4">
          Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Data will not be saved or synced until this is fixed.
        </div>
      )}
      <Sidebar tab={tab} setTab={setTab} shopName={settings.name} />
      <main className="flex-1 min-w-0">
        {tab === "invoice" && (
          <InvoiceScreen
            settings={settings} products={products} customers={customers}
            invoices={invoices} counter={counter}
            setProducts={persist.products} setCustomers={persist.customers}
            setInvoices={persist.invoices} setCounter={persist.counter}
          />
        )}
        {tab === "dashboard" && <DashboardScreen invoices={invoices} products={products} />}
        {tab === "history" && <HistoryScreen invoices={invoices} />}
        {tab === "products" && <ProductsScreen products={products} setProducts={persist.products} />}
        {tab === "customers" && <CustomersScreen customers={customers} setCustomers={persist.customers} invoices={invoices} />}
        {tab === "settings" && <SettingsScreen settings={settings} setSettings={persist.settings} />}
      </main>
    </div>
  );
}

function FontImports() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
      .font-display { font-family: 'Oswald', sans-serif; letter-spacing: 0.02em; }
      .font-mono { font-family: 'JetBrains Mono', monospace; }
      .tread { background-image: repeating-linear-gradient(115deg, #FF6A1A 0 3px, transparent 3px 16px); height: 4px; opacity: 0.55; }
      .torn-edge {
        -webkit-mask-image: linear-gradient(to bottom, black calc(100% - 10px), transparent calc(100% - 10px)),
          repeating-linear-gradient(-135deg, transparent 0 7px, black 7px 14px);
        -webkit-mask-composite: source-in; mask-composite: intersect;
      }
    `}</style>
  );
}

/* ---------------- Sidebar ---------------- */
function Sidebar({ tab, setTab, shopName }) {
  const items = [
    { id: "invoice", label: "New Invoice", icon: Receipt },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "history", label: "Invoices", icon: History },
    { id: "products", label: "Products", icon: Package },
    { id: "customers", label: "Customers", icon: Users },
    { id: "settings", label: "Shop Settings", icon: SettingsIcon },
  ];
  return (
    <aside className="w-[220px] shrink-0 bg-[#181B1F] border-r border-white/5 flex flex-col">
      <div className="px-5 pt-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#FF6A1A] flex items-center justify-center shrink-0">
            <Gauge size={17} strokeWidth={2.5} className="text-[#121417]" />
          </div>
          <div className="min-w-0">
            <div className="font-display text-[14px] font-semibold tracking-wide text-white leading-tight truncate">{shopName || "My Tyre Shop"}</div>
            <div className="text-[10px] text-white/40 mt-0.5 tracking-wider">BILLING SYSTEM</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = tab === it.id;
          return (
            <button key={it.id} onClick={() => setTab(it.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                active ? "bg-[#FF6A1A]/12 text-[#FF6A1A]" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}>
              <Icon size={16} strokeWidth={2} />
              <span className="font-medium">{it.label}</span>
              {active && <ChevronRight size={14} className="ml-auto" />}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/5">
        <div className="rounded-md bg-white/[0.03] px-3 py-2.5">
          <div className="text-[11px] text-white/40">Logged in as</div>
          <div className="text-sm font-medium text-white">Owner</div>
        </div>
      </div>
    </aside>
  );
}

/* ---------------- Settings ---------------- */
function SettingsScreen({ settings, setSettings }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  useEffect(() => setForm(settings), [settings]);

  const save = async () => {
    await setSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 max-w-[700px]">
      <h1 className="font-display text-2xl font-semibold text-white mb-1">Shop Settings</h1>
      <p className="text-sm text-white/40 mb-6">This appears on every invoice you generate.</p>
      <Panel title="Shop details">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Shop name" full>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Treadline Tyres" className={inputCls} />
          </Field>
          <Field label="Phone number">
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="98XXX XXXXX" className={inputCls} />
          </Field>
          <Field label="GSTIN (optional)">
            <input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })}
              placeholder="27ABCDE1234F1Z5" className={inputCls + " font-mono"} />
          </Field>
          <Field label="Address" full>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Shop no., street, city" rows={2} className={inputCls} />
          </Field>
        </div>
        <button onClick={save} className="mt-5 flex items-center gap-2 bg-[#FF6A1A] text-[#121417] font-medium text-sm px-4 py-2 rounded-md hover:bg-[#ff7c39]">
          <Save size={15} /> {saved ? "Saved!" : "Save details"}
        </button>
      </Panel>
    </div>
  );
}

/* ---------------- Products ---------------- */
const emptyProduct = { category: "Tyre", brand: "", name: "", size: "", mrp: "", price: "", gst: 28, stock: "", warrantyMonths: 0 };

function ProductsScreen({ products, setProducts }) {
  const [form, setForm] = useState(null); // null = closed, object = open (editing or new)
  const [query, setQuery] = useState("");

  const filtered = products.filter((p) =>
    (p.name + p.brand + p.size).toLowerCase().includes(query.toLowerCase())
  );

  const startNew = () => setForm({ ...emptyProduct, id: null });
  const startEdit = (p) => setForm({ ...p });

  const save = async () => {
    if (!form.name.trim()) return;
    let next;
    if (form.id) {
      next = products.map((p) => (p.id === form.id ? { ...form } : p));
    } else {
      next = [...products, { ...form, id: uid() }];
    }
    await setProducts(next);
    setForm(null);
  };

  const remove = async (id) => {
    await setProducts(products.filter((p) => p.id !== id));
  };

  return (
    <div className="p-8 max-w-[1100px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Products</h1>
          <p className="text-sm text-white/40 mt-1">Tyres, tubes, batteries, oils, accessories & services you bill for</p>
        </div>
        <button onClick={startNew} className="flex items-center gap-1.5 text-sm font-medium bg-[#FF6A1A] text-[#121417] px-3.5 py-2 rounded-md hover:bg-[#ff7c39]">
          <Plus size={15} /> Add product
        </button>
      </div>

      {form && (
        <ProductForm form={form} setForm={setForm} onSave={save} onCancel={() => setForm(null)} />
      )}

      <Panel title={`Catalog (${products.length})`} right={
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products..."
            className="bg-[#0F1114] border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs w-48 outline-none focus:border-[#FF6A1A]" />
        </div>
      }>
        {products.length === 0 ? (
          <EmptyState icon={Package} text="No products yet" hint='Click "Add product" to create your first tyre, service, or accessory listing.' />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-white/40 border-b border-white/10">
                <th className="text-left font-medium py-2">Item</th>
                <th className="text-left font-medium py-2">Category</th>
                <th className="text-right font-medium py-2">Price</th>
                <th className="text-right font-medium py-2">GST</th>
                <th className="text-right font-medium py-2">Stock</th>
                <th className="text-right font-medium py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const low = p.category !== "Service" && Number(p.stock) <= 5;
                return (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-2.5 text-white">
                      {p.brand ? `${p.brand} ` : ""}{p.name} {p.size && <span className="text-white/35 font-mono text-xs">{p.size}</span>}
                    </td>
                    <td className="py-2.5 text-white/50">{p.category}</td>
                    <td className="py-2.5 text-right font-mono">{inr(p.price)}</td>
                    <td className="py-2.5 text-right font-mono text-white/50">{p.gst}%</td>
                    <td className="py-2.5 text-right font-mono">
                      {p.category === "Service" ? <span className="text-white/30">—</span> : (
                        <span className={low ? "text-red-400" : ""}>{p.stock ?? 0}</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(p)} className="text-white/40 hover:text-white"><Pencil size={13} /></button>
                        <button onClick={() => remove(p.id)} className="text-white/40 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

function ProductForm({ form, setForm, onSave, onCancel }) {
  const isService = form.category === "Service";
  return (
    <div className="bg-[#181B1F] border border-[#FF6A1A]/30 rounded-lg p-5 mb-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">{form.id ? "Edit product" : "New product"}</h3>
        <button onClick={onCancel} className="text-white/40 hover:text-white"><X size={16} /></button>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Field label="Category">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Brand">
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. MRF" className={inputCls} />
        </Field>
        <Field label="Name">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Nylogrip Zapper" className={inputCls} />
        </Field>
        <Field label="Size">
          <input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="e.g. 80/100-18" className={inputCls} />
        </Field>
        <Field label="MRP">
          <input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className={inputCls + " font-mono"} />
        </Field>
        <Field label="Selling price">
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls + " font-mono"} />
        </Field>
        <Field label="GST %">
          <input type="number" value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} className={inputCls + " font-mono"} />
        </Field>
        {!isService && (
          <Field label="Stock qty">
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputCls + " font-mono"} />
          </Field>
        )}
        {!isService && (
          <Field label="Warranty (months)">
            <input type="number" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })} className={inputCls + " font-mono"} />
          </Field>
        )}
      </div>
      <button onClick={onSave} className="mt-4 flex items-center gap-2 bg-[#FF6A1A] text-[#121417] font-medium text-sm px-4 py-2 rounded-md hover:bg-[#ff7c39]">
        <Save size={15} /> Save product
      </button>
    </div>
  );
}

/* ---------------- Customers ---------------- */
const emptyCustomer = { name: "", phone: "", vehicle: "", notes: "" };

function CustomersScreen({ customers, setCustomers, invoices }) {
  const [form, setForm] = useState(null);
  const [query, setQuery] = useState("");

  const filtered = customers.filter((c) => (c.name + c.phone + c.vehicle).toLowerCase().includes(query.toLowerCase()));

  const save = async () => {
    if (!form.name.trim()) return;
    let next;
    if (form.id) next = customers.map((c) => (c.id === form.id ? { ...form } : c));
    else next = [...customers, { ...form, id: uid() }];
    await setCustomers(next);
    setForm(null);
  };
  const remove = async (id) => setCustomers(customers.filter((c) => c.id !== id));

  const lastPurchase = (customerId) => {
    const inv = invoices.filter((i) => i.customerId === customerId).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return inv ? inv.items?.[0]?.name : "—";
  };
  const visitCount = (customerId) => invoices.filter((i) => i.customerId === customerId).length;

  return (
    <div className="p-8 max-w-[1100px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Customers</h1>
          <p className="text-sm text-white/40 mt-1">Your customer database builds automatically as you bill, or add them here directly</p>
        </div>
        <button onClick={() => setForm({ ...emptyCustomer, id: null })} className="flex items-center gap-1.5 text-sm font-medium bg-[#FF6A1A] text-[#121417] px-3.5 py-2 rounded-md hover:bg-[#ff7c39]">
          <Plus size={15} /> Add customer
        </button>
      </div>

      {form && (
        <div className="bg-[#181B1F] border border-[#FF6A1A]/30 rounded-lg p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">{form.id ? "Edit customer" : "New customer"}</h3>
            <button onClick={() => setForm(null)} className="text-white/40 hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} /></Field>
            <Field label="Vehicle number"><input value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} className={inputCls + " font-mono"} /></Field>
            <Field label="Notes"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} /></Field>
          </div>
          <button onClick={save} className="mt-4 flex items-center gap-2 bg-[#FF6A1A] text-[#121417] font-medium text-sm px-4 py-2 rounded-md hover:bg-[#ff7c39]">
            <Save size={15} /> Save customer
          </button>
        </div>
      )}

      <Panel title={`All customers (${customers.length})`} right={
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers..."
            className="bg-[#0F1114] border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs w-48 outline-none focus:border-[#FF6A1A]" />
        </div>
      }>
        {customers.length === 0 ? (
          <EmptyState icon={Users} text="No customers yet" hint="Add a customer here, or they'll be added automatically the first time you bill them." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-white/40 border-b border-white/10">
                <th className="text-left font-medium py-2">Customer</th>
                <th className="text-left font-medium py-2">Vehicle</th>
                <th className="text-left font-medium py-2">Last purchase</th>
                <th className="text-right font-medium py-2">Visits</th>
                <th className="text-right font-medium py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-white/5">
                  <td className="py-2.5">
                    <div className="text-white">{c.name}</div>
                    <div className="text-white/35 text-xs flex items-center gap-1"><Phone size={10} /> {c.phone || "—"}</div>
                  </td>
                  <td className="py-2.5 font-mono text-white/70">{c.vehicle || "—"}</td>
                  <td className="py-2.5 text-white/60">{lastPurchase(c.id)}</td>
                  <td className="py-2.5 text-right font-mono">{visitCount(c.id)}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setForm(c)} className="text-white/40 hover:text-white"><Pencil size={13} /></button>
                      <button onClick={() => remove(c.id)} className="text-white/40 hover:text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- Invoice ---------------- */
function InvoiceScreen({ settings, products, customers, invoices, counter, setProducts, setCustomers, setInvoices, setCounter }) {
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null); // {id,name,phone,vehicle} or null
  const [newCustomerMode, setNewCustomerMode] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", vehicle: "" });

  const [lines, setLines] = useState([]);
  const [picker, setPicker] = useState(false);
  const [itemQuery, setItemQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [received, setReceived] = useState(0);
  const [justSaved, setJustSaved] = useState(false);

  const invoiceNo = `INV-${String(counter).padStart(4, "0")}`;

  const matchedCustomers = customers.filter((c) =>
    (c.name + c.phone + c.vehicle).toLowerCase().includes(customerQuery.toLowerCase())
  ).slice(0, 6);

  const filteredCatalog = products.filter((p) =>
    (p.brand + p.name + p.size).toLowerCase().includes(itemQuery.toLowerCase())
  );

  const addItem = (p) => {
    setLines((L) => [...L, { rowKey: uid(), productId: p.id, category: p.category, brand: p.brand, name: p.name, size: p.size, price: Number(p.price) || 0, gst: Number(p.gst) || 0, qty: 1, discount: 0 }]);
    setPicker(false); setItemQuery("");
  };
  const removeLine = (rowKey) => setLines((L) => L.filter((l) => l.rowKey !== rowKey));
  const updateLine = (rowKey, field, value) => setLines((L) => L.map((l) => (l.rowKey === rowKey ? { ...l, [field]: value } : l)));

  const calc = useMemo(() => {
    let subtotal = 0, discountTotal = 0, gstTotal = 0;
    const rows = lines.map((l) => {
      const gross = l.price * l.qty;
      const disc = gross * (Number(l.discount) || 0) / 100;
      const taxable = gross - disc;
      const gst = taxable * (l.gst / 100);
      subtotal += gross; discountTotal += disc; gstTotal += gst;
      return { ...l, gross, disc, taxable, gst, lineTotal: taxable + gst };
    });
    const grandTotal = subtotal - discountTotal + gstTotal;
    const balance = Math.max(grandTotal - (Number(received) || 0), 0);
    const status = grandTotal > 0 && balance <= 0.5 ? "PAID" : Number(received) > 0 ? "PARTIAL" : "UNPAID";
    return { rows, subtotal, discountTotal, gstTotal, grandTotal, balance, status };
  }, [lines, received]);

  const resetForm = () => {
    setLines([]); setReceived(0); setSelectedCustomer(null); setNewCustomer({ name: "", phone: "", vehicle: "" });
    setNewCustomerMode(false); setCustomerQuery("");
  };

  const generateInvoice = async () => {
    if (lines.length === 0) return;

    // resolve customer (existing, new, or walk-in)
    let customerId = selectedCustomer?.id || null;
    let customerRecord = selectedCustomer;
    let updatedCustomers = customers;
    if (!customerId && newCustomer.name.trim()) {
      const rec = { id: uid(), ...newCustomer, notes: "" };
      updatedCustomers = [...customers, rec];
      await setCustomers(updatedCustomers);
      customerId = rec.id; customerRecord = rec;
    }

    // deduct stock
    const updatedProducts = products.map((p) => {
      const line = lines.find((l) => l.productId === p.id);
      if (line && p.category !== "Service") {
        return { ...p, stock: Math.max((Number(p.stock) || 0) - line.qty, 0) };
      }
      return p;
    });
    await setProducts(updatedProducts);

    const invoice = {
      id: uid(),
      invoiceNo,
      date: new Date().toISOString(),
      customerId,
      customerName: customerRecord?.name || "Walk-in customer",
      vehicle: customerRecord?.vehicle || "",
      items: calc.rows.map((r) => ({ productId: r.productId, name: r.name, brand: r.brand, size: r.size, qty: r.qty, price: r.price, discount: r.discount, gst: r.gst, lineTotal: r.lineTotal })),
      subtotal: calc.subtotal, discountTotal: calc.discountTotal, gstTotal: calc.gstTotal,
      grandTotal: calc.grandTotal, received: Number(received) || 0, balance: calc.balance,
      status: calc.status, paymentMethod,
    };
    await setInvoices([invoice, ...invoices]);
    await setCounter(counter + 1);

    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
    resetForm();
  };

  return (
    <div className="p-8 max-w-[1200px]">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">New Invoice</h1>
          <p className="text-sm text-white/40 mt-1">Bill tyres, tubes, batteries & services in one pass</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-white/40 tracking-wider">INVOICE NO.</div>
          <div className="font-mono text-[#FF6A1A] font-medium">{invoiceNo}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          {/* customer */}
          <Panel title="Customer & Vehicle">
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-[#0F1114] border border-white/10 rounded-md px-3 py-2.5">
                <div>
                  <div className="text-sm text-white">{selectedCustomer.name}</div>
                  <div className="text-xs text-white/40 font-mono">{selectedCustomer.vehicle || "no vehicle on file"} &middot; {selectedCustomer.phone}</div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-white/40 hover:text-white"><X size={15} /></button>
              </div>
            ) : newCustomerMode ? (
              <div>
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <Field label="Name"><input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} placeholder="Customer name" className={inputCls} /></Field>
                  <Field label="Phone"><input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} placeholder="10-digit mobile" className={inputCls} /></Field>
                  <Field label="Vehicle number"><input value={newCustomer.vehicle} onChange={(e) => setNewCustomer({ ...newCustomer, vehicle: e.target.value })} placeholder="e.g. MH12 AB 3456" className={inputCls + " font-mono"} /></Field>
                </div>
                <button onClick={() => setNewCustomerMode(false)} className="text-xs text-white/40 hover:text-white underline underline-offset-2">cancel &amp; search existing instead</button>
              </div>
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Search by name, phone, or vehicle number..."
                    className="w-full bg-[#0F1114] border border-white/10 rounded-md pl-9 pr-3 py-2 text-sm outline-none focus:border-[#FF6A1A]" />
                </div>
                {customerQuery && matchedCustomers.length > 0 && (
                  <div className="border border-white/10 rounded-md overflow-hidden mb-2">
                    {matchedCustomers.map((c) => (
                      <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerQuery(""); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-0">
                        <span className="text-white">{c.name}</span>
                        <span className="font-mono text-xs text-white/40">{c.vehicle}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setNewCustomerMode(true)} className="text-xs text-[#FF6A1A] hover:underline flex items-center gap-1">
                  <Plus size={12} /> add new customer
                </button>
              </div>
            )}
          </Panel>

          {/* line items */}
          <Panel title="Items & Services" right={
            <div className="relative">
              <button onClick={() => setPicker((p) => !p)}
                className="flex items-center gap-1.5 text-xs font-medium bg-[#FF6A1A] text-[#121417] px-3 py-1.5 rounded-md hover:bg-[#ff7c39]">
                <Plus size={14} /> Add item
              </button>
              {picker && (
                <div className="absolute right-0 top-9 z-10 w-80 bg-[#1D2024] border border-white/10 rounded-lg shadow-xl py-2">
                  <div className="px-2 pb-2">
                    <input autoFocus value={itemQuery} onChange={(e) => setItemQuery(e.target.value)} placeholder="Search products..."
                      className="w-full bg-[#0F1114] border border-white/10 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-[#FF6A1A]" />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredCatalog.length === 0 && (
                      <div className="px-3 py-4 text-xs text-white/40 text-center">
                        No products found. Add products from the <span className="text-[#FF6A1A]">Products</span> tab first.
                      </div>
                    )}
                    {filteredCatalog.map((it) => (
                      <button key={it.id} onClick={() => addItem(it)}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between">
                        <div>
                          <div className="text-sm text-white">{it.brand ? `${it.brand} ` : ""}{it.name}</div>
                          <div className="text-[11px] text-white/40">{it.category}{it.size ? ` \u00B7 ${it.size}` : ""}{it.category !== "Service" ? ` \u00B7 stock ${it.stock ?? 0}` : ""}</div>
                        </div>
                        <div className="font-mono text-xs text-white/60">{inr(it.price)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          }>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-white/40 tracking-wide border-b border-white/10">
                    <th className="text-left font-medium py-2 px-1">Item</th>
                    <th className="text-left font-medium py-2 px-1">Size</th>
                    <th className="text-right font-medium py-2 px-1">Qty</th>
                    <th className="text-right font-medium py-2 px-1">Price</th>
                    <th className="text-right font-medium py-2 px-1">Disc %</th>
                    <th className="text-right font-medium py-2 px-1">GST</th>
                    <th className="text-right font-medium py-2 px-1">Total</th>
                    <th className="py-2 px-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {calc.rows.map((l) => (
                    <tr key={l.rowKey} className="border-b border-white/5">
                      <td className="py-2 px-1">
                        <div className="text-white">{l.brand ? `${l.brand} ` : ""}{l.name}</div>
                        <div className="text-[11px] text-white/35">{l.category}</div>
                      </td>
                      <td className="py-2 px-1 font-mono text-white/60 text-xs">{l.size || "—"}</td>
                      <td className="py-2 px-1">
                        <input type="number" min={1} value={l.qty}
                          onChange={(e) => updateLine(l.rowKey, "qty", Math.max(1, Number(e.target.value)))}
                          className="w-14 bg-[#0F1114] border border-white/10 rounded px-2 py-1 text-right font-mono text-xs" />
                      </td>
                      <td className="py-2 px-1 text-right font-mono text-xs text-white/70">{inr(l.price)}</td>
                      <td className="py-2 px-1">
                        <input type="number" min={0} max={100} value={l.discount}
                          onChange={(e) => updateLine(l.rowKey, "discount", Number(e.target.value))}
                          className="w-14 bg-[#0F1114] border border-white/10 rounded px-2 py-1 text-right font-mono text-xs" />
                      </td>
                      <td className="py-2 px-1 text-right font-mono text-xs text-white/50">{l.gst}%</td>
                      <td className="py-2 px-1 text-right font-mono text-xs text-white font-medium">{inr(l.lineTotal)}</td>
                      <td className="py-2 px-1 text-right">
                        <button onClick={() => removeLine(l.rowKey)} className="text-white/30 hover:text-red-400"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                  {calc.rows.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-white/30 py-6 text-sm">No items yet — click "Add item"</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* payment */}
          <Panel title="Payment">
            <div className="flex flex-wrap gap-2 mb-4">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon; const active = paymentMethod === m.id;
                return (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border ${
                      active ? "bg-[#FF6A1A]/15 border-[#FF6A1A] text-[#FF6A1A]" : "border-white/10 text-white/60 hover:text-white"
                    }`}>
                    <Icon size={13} /> {m.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <Field label="Amount received">
                <input type="number" value={received} onChange={(e) => setReceived(e.target.value)}
                  className="w-40 bg-[#0F1114] border border-white/10 rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-[#FF6A1A]" />
              </Field>
              <button onClick={() => setReceived(calc.grandTotal.toFixed(2))} className="text-xs text-[#FF6A1A] underline underline-offset-2 mt-5">mark fully paid</button>
            </div>
          </Panel>
        </div>

        {/* preview */}
        <div>
          <div className="bg-[#F0EFEA] text-[#1A1A1A] rounded-t-lg p-5 sticky top-6">
            <div className="flex items-center justify-between mb-1">
              <div>
                <div className="font-display font-bold text-lg leading-none">{settings.name || "My Tyre Shop"}</div>
                <div className="text-[10px] text-black/50 mt-1">{settings.address || "Add your shop address in Settings"}</div>
                <div className="text-[10px] text-black/50">{settings.phone ? `Ph: ${settings.phone}` : ""}{settings.gstin ? ` \u00B7 GSTIN: ${settings.gstin}` : ""}</div>
              </div>
              <div className="w-11 h-11 grid grid-cols-4 grid-rows-4 gap-[1px] bg-black/80 p-1 rounded-sm shrink-0">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className={[0,1,3,4,6,9,11,12,14,15].includes(i) ? "bg-black" : "bg-[#F0EFEA]"} />
                ))}
              </div>
            </div>
            <div className="tread my-3 -mx-5" />
            <div className="flex justify-between text-[11px] mb-3">
              <div>
                <div className="text-black/40">Bill to</div>
                <div className="font-medium">{selectedCustomer?.name || newCustomer.name || "Walk-in customer"}</div>
                <div className="font-mono text-black/60">{selectedCustomer?.vehicle || newCustomer.vehicle || "—"}</div>
              </div>
              <div className="text-right">
                <div className="text-black/40">Invoice / Date</div>
                <div className="font-mono">{invoiceNo}</div>
                <div className="font-mono text-black/60">{new Date().toLocaleDateString("en-IN")}</div>
              </div>
            </div>
            <div className="space-y-1 text-[11px] border-t border-black/10 pt-2 max-h-40 overflow-y-auto">
              {calc.rows.map((l) => (
                <div key={l.rowKey} className="flex justify-between">
                  <span className="truncate pr-2">{l.name} &times;{l.qty}</span>
                  <span className="font-mono shrink-0">{inr(l.lineTotal)}</span>
                </div>
              ))}
              {calc.rows.length === 0 && <div className="text-black/30">No items added</div>}
            </div>
            <div className="border-t border-black/10 mt-2 pt-2 space-y-1 text-[11px]">
              <Row label="Subtotal" value={inr(calc.subtotal)} />
              <Row label="Discount" value={"-" + inr(calc.discountTotal)} />
              <Row label="GST" value={inr(calc.gstTotal)} />
              <div className="flex justify-between font-display font-semibold text-base pt-1.5 border-t border-black/20 mt-1.5">
                <span>Grand Total</span><span className="font-mono">{inr(calc.grandTotal)}</span>
              </div>
              <Row label="Received" value={inr(Number(received) || 0)} />
              <div className="flex justify-between font-semibold"><span>Balance due</span><span className="font-mono">{inr(calc.balance)}</span></div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <StatusBadge status={calc.status} />
              <span className="text-[10px] text-black/40 flex items-center gap-1"><QrCode size={11} /> scan to verify</span>
            </div>
          </div>
          <div className="torn-edge h-3 bg-[#F0EFEA]" />
          <button onClick={generateInvoice} disabled={calc.rows.length === 0}
            className="w-full mt-4 bg-[#FF6A1A] text-[#121417] font-medium text-sm py-2.5 rounded-md hover:bg-[#ff7c39] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <CheckCircle2 size={16} /> {justSaved ? "Invoice saved!" : "Generate invoice"}
          </button>
          <p className="text-[11px] text-white/30 mt-2 text-center">Saves the invoice, deducts stock, and adds new customers automatically.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- History ---------------- */
function HistoryScreen({ invoices }) {
  const [query, setQuery] = useState("");
  const filtered = invoices.filter((i) => (i.invoiceNo + i.customerName).toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="p-8 max-w-[1100px]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-white">Invoices</h1>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices..."
            className="bg-[#181B1F] border border-white/10 rounded-md pl-8 pr-3 py-2 text-sm w-56 outline-none focus:border-[#FF6A1A]" />
        </div>
      </div>
      <Panel title={`All invoices (${invoices.length})`}>
        {invoices.length === 0 ? (
          <EmptyState icon={Inbox} text="No invoices yet" hint="Generated invoices will show up here automatically." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-white/40 border-b border-white/10">
                <th className="text-left font-medium py-2">Invoice</th>
                <th className="text-left font-medium py-2">Customer</th>
                <th className="text-left font-medium py-2">Date</th>
                <th className="text-right font-medium py-2">Amount</th>
                <th className="text-right font-medium py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-white/5">
                  <td className="py-2.5 font-mono text-[#FF6A1A]">{inv.invoiceNo}</td>
                  <td className="py-2.5 text-white">{inv.customerName}</td>
                  <td className="py-2.5 text-white/50">{new Date(inv.date).toLocaleDateString("en-IN")}</td>
                  <td className="py-2.5 text-right font-mono">{inr(inv.grandTotal)}</td>
                  <td className="py-2.5 text-right"><StatusBadge status={inv.status} dark /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
function DashboardScreen({ invoices, products }) {
  const today = new Date().toDateString();
  const thisMonth = new Date().getMonth();
  const todayInvoices = invoices.filter((i) => new Date(i.date).toDateString() === today);
  const monthInvoices = invoices.filter((i) => new Date(i.date).getMonth() === thisMonth);
  const todaySales = todayInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const monthSales = monthInvoices.reduce((s, i) => s + i.grandTotal, 0);
  const lowStock = products.filter((p) => p.category !== "Service" && Number(p.stock) <= 5);

  const salesByProduct = {};
  invoices.forEach((inv) => inv.items.forEach((it) => {
    const key = it.name;
    if (!salesByProduct[key]) salesByProduct[key] = { name: it.name, units: 0, revenue: 0 };
    salesByProduct[key].units += it.qty;
    salesByProduct[key].revenue += it.lineTotal;
  }));
  const bestSellers = Object.values(salesByProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const stats = [
    { label: "Today's sales", value: inr(todaySales), sub: `${todayInvoices.length} invoices` },
    { label: "This month", value: inr(monthSales), sub: `${monthInvoices.length} invoices` },
    { label: "Total invoices", value: String(invoices.length), sub: "all time" },
    { label: "Low stock items", value: String(lowStock.length), sub: "need reorder", warn: lowStock.length > 0 },
  ];

  return (
    <div className="p-8 max-w-[1200px]">
      <h1 className="font-display text-2xl font-semibold text-white mb-6">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-[#181B1F] border border-white/5 rounded-lg p-4">
            <div className="text-[11px] text-white/40">{s.label}</div>
            <div className="font-mono text-xl font-semibold text-white mt-1">{s.value}</div>
            <div className={`text-[11px] mt-1 flex items-center gap-1 ${s.warn ? "text-amber-400" : "text-white/40"}`}>
              {s.warn && <TrendingUp size={11} />} {s.sub}
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-5">
        <Panel title="Best-selling items (all time)">
          {bestSellers.length === 0 ? (
            <EmptyState icon={TrendingUp} text="No sales yet" hint="Generate your first invoice to see best-sellers here." small />
          ) : (
            <div className="space-y-2.5">
              {bestSellers.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-white/30 text-xs w-4">{i + 1}</span>
                    <span className="text-white/80">{b.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-white text-xs">{inr(b.revenue)}</div>
                    <div className="text-[10px] text-white/35">{b.units} units</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Low stock alerts">
          {lowStock.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Stock levels are healthy" hint="You'll see alerts here when any item drops to 5 units or fewer." small />
          ) : (
            <div className="space-y-2.5">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm bg-red-500/5 border border-red-500/15 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-white/80">{p.brand ? `${p.brand} ` : ""}{p.name}</span>
                  </div>
                  <span className="font-mono text-red-400 text-xs">{p.stock ?? 0} left</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- shared bits ---------------- */
const inputCls = "w-full bg-[#0F1114] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF6A1A]";

function Panel({ title, right, children }) {
  return (
    <div className="bg-[#181B1F] border border-white/5 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white/80 tracking-wide">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] text-white/40 mb-1">{label}</div>
      {children}
    </label>
  );
}
function Row({ label, value }) {
  return <div className="flex justify-between text-black/60"><span>{label}</span><span className="font-mono">{value}</span></div>;
}
function StatusBadge({ status, dark }) {
  const light = { PAID: "bg-emerald-500/15 text-emerald-700", PARTIAL: "bg-amber-500/15 text-amber-700", UNPAID: "bg-red-500/15 text-red-700" };
  const darkS = { PAID: "bg-emerald-500/15 text-emerald-400", PARTIAL: "bg-amber-500/15 text-amber-400", UNPAID: "bg-red-500/15 text-red-400" };
  const styles = dark ? darkS : light;
  return <span className={`text-[10px] font-semibold px-2 py-1 rounded ${styles[status]}`}>{status}</span>;
}
function EmptyState({ icon: Icon, text, hint, small }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${small ? "py-6" : "py-12"}`}>
      <Icon size={small ? 22 : 28} className="text-white/15 mb-3" />
      <div className="text-sm text-white/50 font-medium">{text}</div>
      {hint && <div className="text-xs text-white/30 mt-1 max-w-xs">{hint}</div>}
    </div>
  );
}
