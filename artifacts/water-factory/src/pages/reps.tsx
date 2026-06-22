import { useState } from "react";
import {
  useListReps,
  useCreateRep,
  useDeleteRep,
  getListRepsQueryKey
} from "@workspace/api-client-react";

import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, KeyRound, ExternalLink, Edit } from "lucide-react";
import { queryClient } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ✅ مهم جدًا: يحل كل مشاكل map/filter
const toArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

export default function Reps() {
  const { can } = useAuth();

  const reps = toArray(useListReps().data);
  const isLoading = useListReps().isLoading;

  const createRep = useCreateRep();
  const deleteRep = useDeleteRep();

  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    area: ""
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const res = await fetch(`${BASE}/api/reps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListRepsQueryKey() });
      setEditItem(null);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createRep.mutateAsync({ data: formData });

    setIsOpen(false);
    setFormData({ name: "", phone: "", area: "" });

    queryClient.invalidateQueries({ queryKey: getListRepsQueryKey() });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد؟")) return;
    await deleteRep.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListRepsQueryKey() });
  };

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">المندوبين</h1>

        {can("edit") && (
          <Button onClick={() => setIsOpen(true)}>
            <Plus className="ml-2 w-4 h-4" />
            إضافة مندوب
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الاسم</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>المنطقة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>جاري التحميل...</TableCell>
              </TableRow>
            ) : reps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>لا يوجد مندوبين</TableCell>
              </TableRow>
            ) : (
              reps.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.phone || "-"}</TableCell>
                  <TableCell>{r.area || "-"}</TableCell>

                  <TableCell>
                    <Badge variant={r.isActive ? "default" : "secondary"}>
                      {r.isActive ? "نشط" : "موقوف"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-left">
                    <div className="flex gap-1">

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditItem(r)}
                      >
                        <Edit className="w-4 h-4 text-green-600" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(r.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>

                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة مندوب</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">

            <Input
              placeholder="الاسم"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              placeholder="الجوال"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />

            <Input
              placeholder="المنطقة"
              value={formData.area}
              onChange={e => setFormData({ ...formData, area: e.target.value })}
            />

            <Button type="submit" className="w-full">
              حفظ
            </Button>

          </form>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editItem} onOpenChange={v => !v && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المندوب</DialogTitle>
          </DialogHeader>

          {editItem && (
            <form
              onSubmit={e => {
                e.preventDefault();
                update.mutate({
                  id: editItem.id,
                  data: editItem
                });
              }}
              className="space-y-4"
            >
              <Input
                value={editItem.name}
                onChange={e => setEditItem({ ...editItem, name: e.target.value })}
              />

              <Input
                value={editItem.phone || ""}
                onChange={e => setEditItem({ ...editItem, phone: e.target.value })}
              />

              <Input
                value={editItem.area || ""}
                onChange={e => setEditItem({ ...editItem, area: e.target.value })}
              />

              <Button className="w-full">حفظ التعديل</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}