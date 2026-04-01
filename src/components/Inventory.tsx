import React, { useState, useEffect } from 'react';
import { Product } from '../db';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { BarcodeScanner } from './BarcodeScanner';
import { Camera, Plus, Trash2, Edit, Minus } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export function Inventory() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    barcode: '',
    buyPrice: 0,
    sellPrice: 0,
    stock: 0,
    image: '',
  });

  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'products'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
    }, (error) => {
      console.error("Firestore Error: ", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.barcode || !user) return;
    
    try {
      if (editingProduct && editingProduct.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), {
          name: formData.name,
          barcode: formData.barcode,
          buyPrice: Number(formData.buyPrice),
          sellPrice: Number(formData.sellPrice),
          stock: Number(formData.stock),
          image: formData.image || '',
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'products'), {
          name: formData.name,
          barcode: formData.barcode,
          buyPrice: Number(formData.buyPrice),
          sellPrice: Number(formData.sellPrice),
          stock: Number(formData.stock),
          image: formData.image || '',
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error saving product: ", error);
    }
    
    setIsOpen(false);
    setEditingProduct(null);
    setFormData({ name: '', barcode: '', buyPrice: 0, sellPrice: 0, stock: 0, image: '' });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode,
      buyPrice: product.buyPrice,
      sellPrice: product.sellPrice,
      stock: product.stock,
      image: product.image || '',
    });
    setIsOpen(true);
  };

  const handleUpdateStock = async (id: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    try {
      await updateDoc(doc(db, 'products', id), { 
        stock: newStock,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating stock: ", error);
    }
  };

  const handleDelete = async (id?: string) => {
    if (id && window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (error) {
        console.error("Error deleting product: ", error);
      }
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t('inventory')}</h2>
        <Dialog open={isOpen} onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setEditingProduct(null);
            setFormData({ name: '', barcode: '', buyPrice: 0, sellPrice: 0, stock: 0, image: '' });
          }
        }}>
          <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" /> {t('addProduct')}</Button>} />
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingProduct ? t('editProduct') : t('addProduct')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">{t('barcode')}</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    required
                  />
                  <Button type="button" variant="outline" onClick={() => setIsScannerOpen(true)}>
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {isScannerOpen && (
                <div className="absolute inset-0 z-50 bg-background p-4 flex flex-col items-center justify-center">
                  <h3 className="text-lg font-bold mb-4">{t('scanBarcode')}</h3>
                  <BarcodeScanner 
                    onScan={(code) => {
                      setFormData({ ...formData, barcode: code });
                      setIsScannerOpen(false);
                    }} 
                    onClose={() => setIsScannerOpen(false)} 
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">{t('name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="buyPrice">{t('buyPrice')}</Label>
                  <Input
                    id="buyPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.buyPrice}
                    onChange={(e) => setFormData({ ...formData, buyPrice: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellPrice">{t('sellPrice')}</Label>
                  <Input
                    id="sellPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sellPrice}
                    onChange={(e) => setFormData({ ...formData, sellPrice: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">{t('stock')}</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">Product Image (Optional)</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                {formData.image && (
                  <img src={formData.image} alt="Preview" className="mt-2 h-20 w-20 object-cover rounded" />
                )}
              </div>
              <Button type="submit" className="w-full">{editingProduct ? t('updateProduct') : t('save')}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>{t('barcode')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead className="text-right">{t('buyPrice')}</TableHead>
              <TableHead className="text-right">{t('sellPrice')}</TableHead>
              <TableHead className="text-right">{t('stock')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="h-10 w-10 object-cover rounded" />
                  ) : (
                    <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">No img</div>
                  )}
                </TableCell>
                <TableCell className="font-mono">{product.barcode}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-right">Tk {product.buyPrice.toFixed(2)}</TableCell>
                <TableCell className="text-right">Tk {product.sellPrice.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdateStock(product.id!, product.stock, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{product.stock}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleUpdateStock(product.id!, product.stock, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(product)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {products?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {t('noProducts')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
