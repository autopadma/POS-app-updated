import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Sale } from '../db';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Download, Calendar as CalendarIcon, Lock, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { useLanguage } from '@/i18n/LanguageContext';
import { db } from '@/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export function Reports() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [sales, setSales] = useState<Sale[]>([]);

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
  const [editFormData, setEditFormData] = useState({
    customerName: '',
    customerPhone: '',
    discount: 0,
    serviceCharge: 0,
  });

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'sales'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date()
        } as Sale;
      });
      setSales(salesData);
    }, (error) => {
      console.error("Firestore Error: ", error);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredSales = sales?.filter((sale) => {
    const saleDate = new Date(sale.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the whole end day

    return isWithinInterval(saleDate, { start, end });
  }) || [];

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalSellPrice, 0);
  const totalCost = filteredSales.reduce((sum, sale) => sum + sale.totalBuyPrice, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.profit, 0);
  const totalServiceCharge = filteredSales.reduce((sum, sale) => sum + (sale.serviceCharge || 0), 0);

  const handleExport = () => {
    if (filteredSales.length === 0) return;

    // Flatten sales data for Excel
    const exportData = filteredSales.flatMap((sale) =>
      sale.items.map((item) => ({
        'Sale ID': sale.id,
        'Date': format(new Date(sale.date), 'dd/MM/yyyy HH:mm'),
        'Customer Name': sale.customerName || '',
        'Customer Phone': sale.customerPhone || '',
        'Barcode': item.barcode,
        'Product Name': item.name,
        'Quantity': item.quantity,
        'Buy Price (Unit)': item.buyPrice,
        'Sell Price (Unit)': item.sellPrice,
        'Total Buy Price': item.buyPrice * item.quantity,
        'Total Sell Price': item.sellPrice * item.quantity,
        'Service Charge': sale.serviceCharge || 0,
        'Profit': (item.sellPrice - item.buyPrice) * item.quantity,
      }))
    );

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
    
    const fileName = `Ryan_Enterprise_Sales_${format(new Date(startDate), 'MMM_yyyy')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handlePinSubmit = () => {
    if (pinInput === '4203') {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

  const openEditDialog = (sale: Sale) => {
    setEditingSale(sale);
    setEditFormData({
      customerName: sale.customerName || '',
      customerPhone: sale.customerPhone || '',
      discount: sale.discount || 0,
      serviceCharge: sale.serviceCharge || 0,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingSale || !editingSale.id) return;
    
    const newDiscount = Number(editFormData.discount) || 0;
    const newServiceCharge = Number(editFormData.serviceCharge) || 0;
    const subtotal = editingSale.subtotal || 0;
    
    const newTotalSellPrice = Math.max(0, subtotal - newDiscount + newServiceCharge);
    const newProfit = newTotalSellPrice - editingSale.totalBuyPrice;

    try {
      await updateDoc(doc(db, 'sales', editingSale.id), {
        customerName: editFormData.customerName,
        customerPhone: editFormData.customerPhone,
        discount: newDiscount,
        serviceCharge: newServiceCharge,
        totalSellPrice: newTotalSellPrice,
        profit: newProfit,
        updatedAt: serverTimestamp()
      });
      setEditingSale(null);
    } catch (error) {
      console.error("Error updating sale: ", error);
    }
  };

  const handleDeleteSale = (sale: Sale) => {
    setDeletingSale(sale);
  };

  const executeDeleteSale = async () => {
    if (!deletingSale || !deletingSale.id) return;

    try {
      // Restore stock
      for (const item of deletingSale.items) {
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          await updateDoc(productRef, {
            stock: productData.stock + item.quantity,
            updatedAt: serverTimestamp()
          });
        }
      }
      // Delete sale
      await deleteDoc(doc(db, 'sales', deletingSale.id));
      setDeletingSale(null);
    } catch (error) {
      console.error("Error deleting sale: ", error);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-6">
        <div className="bg-primary/10 p-4 rounded-full">
          <Lock className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{t('reportsLocked')}</h2>
        <div className="flex flex-col items-center gap-4 w-full max-w-xs">
          <Input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder={t('enterPin')}
            className="text-center text-lg tracking-widest"
            maxLength={4}
            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
          />
          <Button onClick={handlePinSubmit} className="w-full">{t('submit')}</Button>
          {pinError && <p className="text-destructive text-sm">{t('incorrectPin')}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">{t('reportsTitle')}</h2>
        <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white">
          <Download className="mr-2 h-4 w-4" /> {t('exportExcel')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" /> {t('filterByDate')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('startDate')}</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t('endDate')}</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold">Tk {totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Cost</h3>
            <p className="text-3xl font-bold">Tk {totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('totalServiceCharge')}</h3>
            <p className="text-3xl font-bold">Tk {totalServiceCharge.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-primary mb-2">{t('totalProfit')}</h3>
            <p className="text-3xl font-bold text-primary">Tk {totalProfit.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale ID</TableHead>
              <TableHead>{t('date')}</TableHead>
              <TableHead>{t('customerName')}</TableHead>
              <TableHead>{t('items')}</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">{t('serviceCharge')}</TableHead>
              <TableHead className="text-right">{t('profit')}</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-mono text-xs">#{sale.id}</TableCell>
                <TableCell>{format(new Date(sale.date), 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell>
                  {sale.customerName && <div className="font-medium">{sale.customerName}</div>}
                  {sale.customerPhone && <div className="text-xs text-muted-foreground">{sale.customerPhone}</div>}
                  {!sale.customerName && !sale.customerPhone && <span className="text-muted-foreground">-</span>}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {sale.items.map((item, idx) => (
                      <span key={idx} className="text-sm">
                        {item.quantity}x {item.name}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">Tk {sale.totalSellPrice.toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">Tk {(sale.serviceCharge || 0).toFixed(2)}</TableCell>
                <TableCell className="text-right text-green-600 font-medium">Tk {sale.profit.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(sale)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteSale(sale)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No sales found in this date range.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingSale} onOpenChange={(open) => !open && setEditingSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sale #{editingSale?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input 
                value={editFormData.customerName} 
                onChange={e => setEditFormData({...editFormData, customerName: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Phone</Label>
              <Input 
                value={editFormData.customerPhone} 
                onChange={e => setEditFormData({...editFormData, customerPhone: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Discount (Tk)</Label>
              <Input 
                type="number"
                min="0"
                step="0.01"
                value={editFormData.discount} 
                onChange={e => setEditFormData({...editFormData, discount: Number(e.target.value)})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Service Charge (Tk)</Label>
              <Input 
                type="number"
                min="0"
                step="0.01"
                value={editFormData.serviceCharge} 
                onChange={e => setEditFormData({...editFormData, serviceCharge: Number(e.target.value)})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSale(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingSale} onOpenChange={(open) => !open && setDeletingSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sale #{deletingSale?.id}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this sale? Stock for the items in this sale will be restored to your inventory.</p>
            <p className="text-destructive font-medium mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSale(null)}>Cancel</Button>
            <Button variant="destructive" onClick={executeDeleteSale}>Delete Sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
