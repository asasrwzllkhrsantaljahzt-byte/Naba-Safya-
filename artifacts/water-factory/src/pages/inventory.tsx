import { useGetInventory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileInput, FileOutput, History } from "lucide-react";

export default function Inventory() {
  const { data: inventory, isLoading } = useGetInventory();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">رصيد المخزن</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : inventory?.items?.map((item: any, i: number) => (
          <Card key={i} className="border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">{item.productName}</CardTitle>
              <Droplet className={`w-6 h-6 ${item.color === 'white' ? 'text-gray-400' : 'text-blue-500'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{item.quantity} <span className="text-base font-normal text-muted-foreground">عبوة</span></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        <Link href="/inventory/vouchers">
          <div className="border rounded-lg p-5 bg-card hover:bg-muted cursor-pointer transition-colors text-center">
            <FileInput className="w-7 h-7 mx-auto text-green-600 mb-2" />
            <div className="font-semibold">سند استلام</div>
            <div className="text-sm text-muted-foreground">إضافة مخزن يدوياً</div>
          </div>
        </Link>
        <Link href="/inventory/vouchers">
          <div className="border rounded-lg p-5 bg-card hover:bg-muted cursor-pointer transition-colors text-center">
            <FileOutput className="w-7 h-7 mx-auto text-red-600 mb-2" />
            <div className="font-semibold">سند صرف</div>
            <div className="text-sm text-muted-foreground">خصم مخزن يدوياً</div>
          </div>
        </Link>
        <Link href="/inventory/transactions">
          <div className="border rounded-lg p-5 bg-card hover:bg-muted cursor-pointer transition-colors text-center">
            <History className="w-7 h-7 mx-auto text-blue-600 mb-2" />
            <div className="font-semibold">حركة المخزن</div>
            <div className="text-sm text-muted-foreground">كل الحركات والتفاصيل</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
