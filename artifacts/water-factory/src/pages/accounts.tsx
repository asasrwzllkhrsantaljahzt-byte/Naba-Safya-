import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronDown, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Account = {
  id: number; code: string; name: string; type: string;
  openingBalance: number; notes?: string | null;
  parentId: number | null; level: number;
  children?: Account[];
};

const TYPE_LABELS: Record<string, string> = {
  asset: "أصل", liability: "التزام", equity: "حقوق ملكية",
  revenue: "إيراد", expense: "مصروف",
};

const TYPE_COLORS: Record<string, string> = {
  asset: "text-blue-600", liability: "text-red-600",
  equity: "text-purple-600", revenue: "text-green-600", expense: "text-orange-600",
};

function buildTree(accounts: Account[]): Account[] {
  const map = new Map<number, Account>();
  accounts.forEach(a => map.set(a.id, { ...a, children: [] }));
  const roots: Account[] = [];
  map.forEach(a => {
    if (a.parentId === null) roots.push(a);
    else map.get(a.parentId)?.children?.push(a);
  });
  return roots;
}

function AccountNode({ account, onAdd, onEdit, onDelete, canEdit, searchTerm }: {
  account: Account; onAdd: (parent: Account) => void;
  onEdit: (a: Account) => void; onDelete: (id: number) => void;
  canEdit: boolean; searchTerm: string;
}) {
  const [open, setOpen] = useState(searchTerm.length > 0);
  const hasChildren = (account.children?.length ?? 0) > 0;
  const indent = account.level * 20;

  useEffect(() => {
    if (searchTerm.length > 0) setOpen(true);
  }, [searchTerm]);

  return (
    <div>
      <div
        className="flex items-center gap-1 py-2 px-3 hover:bg-muted/50 rounded-lg group cursor-pointer border-b border-border/30"
        style={{ paddingRight: indent + 12 + "px" }}
      >
        <button onClick={() => setOpen(!open)} className="w-5 h-5 flex items-center justify-center text-muted-foreground">
         {open ? <ChevronDown className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <span className="font-mono text-xs text-muted-foreground w-12 shrink-0">{account.code}</span>
        <span className={"font-medium flex-1 " + (account.level === 0 ? "font-bold text-base" : "")}>
          {account.name}
        </span>
        <span className={"text-xs " + TYPE_COLORS[account.type]}>{TYPE_LABELS[account.type]}</span>
        {account.openingBalance !== 0 && (
          <span className="text-sm font-mono mr-4">{account.openingBalance.toFixed(2)} ر.س</span>
        )}
        {canEdit && (
          <div className="flex gap-1 mr-2">
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onAdd(account)}>
              <Plus className="w-3.5 h-3.5 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onEdit(account)}>
              <Pencil className="w-3.5 h-3.5 text-blue-600" />
            </Button>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onDelete(account.id)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>
      {open && hasChildren && (
        <div>
          {account.children?.map(child => (
            <AccountNode key={child.id} account={child} onAdd={onAdd}
              onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} searchTerm={searchTerm} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Accounts() {
  const { toast } = useToast();
  const { can } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tree, setTree] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [parentAccount, setParentAccount] = useState<Account | null>(null);
  const [form, setForm] = useState({ code: "", name: "", type: "asset", openingBalance: "0", notes: "" });
  const [searchResults, setSearchResults] = useState<Account[]>([]);

  const load = () => {
    fetch(BASE + "/api/accounts")
      .then(r => r.json())
      .then((data: Account[]) => {
        setAccounts(data);
        setTree(buildTree(data));
      })
      .catch(() => toast({ title: "خطأ في التحميل", variant: "destructive" }));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (search.trim()) {
      setSearchResults(accounts.filter(a => a.name.includes(search) || a.code.includes(search)));
    } else {
      setSearchResults([]);
    }
  }, [search, accounts]);

  const openAdd = (parent?: Account) => {
    setEditing(null);
    setParentAccount(parent ?? null);
    setForm({ code: parent ? parent.code + "." : "", name: "", type: parent?.type ?? "asset", openingBalance: "0", notes: "" });
    setDialog(true);
  };

  const openEdit = (a: Account) => {
    setEditing(a);
    setParentAccount(null);
    setForm({ code: a.code, name: a.name, type: a.type, openingBalance: String(a.openingBalance), notes: a.notes ?? "" });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ title: "رمز الحساب والاسم مطلوبان", variant: "destructive" });
      return;
    }
    const body = {
      code: form.code, name: form.name, type: form.type,
      openingBalance: parseFloat(form.openingBalance) || 0,
      notes: form.notes || null,
      parentId: editing ? editing.parentId : (parentAccount ? parentAccount.id : null),
      level: editing ? editing.level : (parentAccount ? parentAccount.level + 1 : 0),
    };
    try {
      if (editing) {
        await fetch(BASE + "/api/accounts/" + editing.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: "تم التعديل" });
      } else {
        await fetch(BASE + "/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        toast({ title: "تمت الإضافة" });
      }
      setDialog(false);
      load();
    } catch {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("حذف هذا الحساب؟")) return;
    await fetch(BASE + "/api/accounts/" + id, { method: "DELETE" });
    toast({ title: "تم الحذف" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">دليل الحسابات</h1>
        {can("edit") && (
          <Button onClick={() => openAdd()}>
            <Plus className="ml-2 w-4 h-4" /> إضافة حساب رئيسي
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input placeholder="ابحث بالاسم أو الرمز..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full bg-background border rounded-lg shadow-lg mt-1 max-h-60 overflow-auto">
            {searchResults.map(a => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer" onClick={() => setSearch("")}>
                <span className="font-mono text-xs text-muted-foreground">{a.code}</span>
                <span className="flex-1">{a.name}</span>
                <span className={"text-xs " + TYPE_COLORS[a.type]}>{TYPE_LABELS[a.type]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border rounded-lg bg-card overflow-hidden">
        {tree.map(root => (
          <AccountNode key={root.id} account={root} onAdd={openAdd} onEdit={openEdit} onDelete={handleDelete} canEdit={can("edit")} searchTerm={search} />
        ))}
      </div>
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الحساب" : parentAccount ? "إضافة حساب فرعي من: " + parentAccount.name : "إضافة حساب رئيسي"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">رمز الحساب</label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="مثال: 1.1" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">نوع الحساب</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">اسم الحساب</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="اسم الحساب" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">الرصيد الافتتاحي (ر.س)</label>
              <Input type="number" min="0" step="0.01" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ملاحظات</label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات اختيارية" />
            </div>
            <Button className="w-full" onClick={handleSave}>{editing ? "حفظ التعديلات" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
