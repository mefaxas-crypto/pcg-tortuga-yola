import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { db } from '@/lib/firebase';
import { InventoryItem } from '@/lib/types';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function getLowStockItems(): Promise<InventoryItem[]> {
  const inventoryRef = collection(db, 'inventory');
  const q = query(inventoryRef, where('status', '==', 'Low Stock'));
  const querySnapshot = await getDocs(q);
  const items: InventoryItem[] = [];
  querySnapshot.forEach((doc) => {
    items.push({ id: doc.id, ...doc.data() } as InventoryItem);
  });
  return items;
}


export async function LowStockItems() {
  const lowStockItems = await getLowStockItems();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock Items</CardTitle>
        <CardDescription>
          These items are below their set par levels. Consider reordering.
        </CardDescription>
      </CardHeader>
      <CardContent>
         {lowStockItems.length > 0 ? (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Par</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {lowStockItems.map((item) => (
                <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                    {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell>
                    {item.parLevel} {item.unit}
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        ) : (
            <div className="py-12 text-center text-muted-foreground">
                Your inventory is looking good! No items are currently low on stock.
            </div>
        )}
      </CardContent>
    </Card>
  );
}
