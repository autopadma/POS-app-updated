import React, { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Product, SaleItem } from '../db';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Receipt } from './Receipt';
import { BarcodeScanner } from './BarcodeScanner';
import { Camera, Minus, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/i18n/LanguageContext';
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, where, serverTimestamp, getDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface CartSession {
  id: string;
  name: string;
  items: SaleItem[];
  discount: number;
  serviceCharge: number;
  customerName?: string;
  customerPhone?: string;
}

export function POS() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  
  const [sessions, setSessions] = useState<CartSession[]>([
    { id: Date.now().toString(), name: 'Cart 1', items: [], discount: 0, serviceCharge: 0, customerName: '', customerPhone: '' }
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0].id);
  
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const cart = activeSession.items;
  const discount = activeSession.discount;
  const serviceCharge = activeSession.serviceCharge || 0;
  const customerName = activeSession.customerName || '';
  const customerPhone = activeSession.customerPhone || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{ items: SaleItem[], subtotal: number, discount: number, serviceCharge?: number, total: number, date: Date } | null>(null);
  
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: 'Receipt',
    onBeforePrint: () => {
      toast.info(t('preparingReceipt'));
      return Promise.resolve();
    },
    onAfterPrint: () => {
      toast.success(t('receiptPrinted'));
      setReceiptData(null);
    },
    onPrintError: (error) => {
      console.error('Print failed:', error);
      toast.error(t('printFailed'));
    }
  });

  // Focus search input on mount for physical barcode scanners
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const updateActiveSession = (updates: Partial<CartSession>) => {
    setSessions(prev => 
      prev.map(session => 
        session.id === activeSessionId 
          ? { ...session, ...updates } 
          : session
      )
    );
  };

  const addSession = () => {
    const newId = Date.now().toString();
    setSessions(prev => [
      ...prev, 
      { id: newId, name: `${t('cart')} ${prev.length + 1}`, items: [], discount: 0, serviceCharge: 0, customerName: '', customerPhone: '' }
    ]);
    setActiveSessionId(newId);
  };

  const removeSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      // If it's the last session, just clear it
      updateActiveSession({ items: [], discount: 0, serviceCharge: 0, customerName: '', customerPhone: '' });
      return;
    }
    
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (activeSessionId === id) {
      setActiveSessionId(newSessions[newSessions.length - 1].id);
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Out of stock!');
      return;
    }

    const existing = cart.find((item) => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast.error('Cannot add more than available stock!');
        return;
      }
      updateActiveSession({
        items: cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      updateActiveSession({
        items: [
          ...cart,
          {
            productId: product.id!,
            barcode: product.barcode,
            name: product.name,
            quantity: 1,
            buyPrice: product.buyPrice,
            sellPrice: product.sellPrice,
          },
        ]
      });
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    updateActiveSession({
      items: cart.map((item) => {
        if (item.productId === productId) {
          const product = products?.find((p) => p.id === productId);
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return item;
          if (product && newQuantity > product.stock) {
            toast.error('Cannot exceed available stock!');
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    });
  };

  const removeFromCart = (productId: string) => {
    updateActiveSession({
      items: cart.filter((item) => item.productId !== productId)
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Auto-add if exact barcode match
    if (products) {
      const exactMatch = products.find((p) => p.barcode === query);
      if (exactMatch) {
        addToCart(exactMatch);
        setSearchQuery('');
      }
    }
  };

  const handleScan = (barcode: string) => {
    if (products) {
      const exactMatch = products.find((p) => p.barcode === barcode);
      if (exactMatch) {
        addToCart(exactMatch);
        toast.success(`${t('added')} ${exactMatch.name}`);
      } else {
        toast.error(t('productNotFound'));
      }
    }
    setIsScannerOpen(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.sellPrice * item.quantity, 0);
  const totalAmount = Math.max(0, subtotal - discount + serviceCharge);

  const handleCheckout = async () => {
    if (cart.length === 0 || !user) return;

    const totalBuyPrice = cart.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
    const totalSellPrice = totalAmount;
    const profit = totalSellPrice - totalBuyPrice;
    const date = new Date();

    try {
      // Record Sale
      await addDoc(collection(db, 'sales'), {
        date: serverTimestamp(),
        items: cart,
        totalBuyPrice,
        totalSellPrice,
        subtotal,
        discount,
        serviceCharge,
        profit,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      // Update Stock
      for (const item of cart) {
        const productRef = doc(db, 'products', item.productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          await updateDoc(productRef, {
            stock: productData.stock - item.quantity,
            updatedAt: serverTimestamp()
          });
        }
      }

      // Prepare Receipt & Show Preview
      setReceiptData({ items: cart, subtotal, discount, serviceCharge, total: totalAmount, date });
      
      if (sessions.length > 1) {
        const newSessions = sessions.filter(s => s.id !== activeSessionId);
        setSessions(newSessions);
        setActiveSessionId(newSessions[newSessions.length - 1].id);
      } else {
        updateActiveSession({ items: [], discount: 0, serviceCharge: 0, customerName: '', customerPhone: '' });
      }
      
      toast.success(t('saleCompleted'));

    } catch (error) {
      console.error('Checkout failed:', error);
      toast.error(t('checkoutFailed'));
    }
  };

  const filteredProducts = products?.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery)
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] gap-4 p-4">
      {/* Left Panel: Products */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={t('searchProducts')}
              value={searchQuery}
              onChange={handleSearch}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setIsScannerOpen(true)}>
            <Camera className="h-4 w-4 mr-2" /> {t('scanBarcode')}
          </Button>
        </div>

        {isScannerOpen && (
          <div className="absolute inset-0 z-50 bg-background p-4 flex flex-col items-center justify-center">
            <h3 className="text-lg font-bold mb-4">{t('scanBarcode')}</h3>
            <BarcodeScanner onScan={handleScan} onClose={() => setIsScannerOpen(false)} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
          {filteredProducts?.map((product) => (
            <Card
              key={product.id}
              className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary ${product.stock <= 0 ? 'opacity-50' : ''}`}
              onClick={() => addToCart(product)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="h-24 w-24 object-cover rounded-md" />
                ) : (
                  <div className="h-24 w-24 bg-muted rounded-md flex items-center justify-center text-muted-foreground">
                    No Image
                  </div>
                )}
                <div>
                  <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">Tk {product.sellPrice.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('stock')}: {product.stock}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredProducts?.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              {t('noProducts')}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Cart */}
      <div className="w-full md:w-96 flex flex-col bg-muted/30 rounded-lg border overflow-hidden">
        <div className="bg-muted/50 border-b flex flex-col">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="font-semibold text-lg">{t('pos')}</h2>
            </div>
            <Button variant="outline" size="sm" onClick={addSession} className="h-8">
              <Plus className="h-4 w-4 mr-1" /> {t('newCart')}
            </Button>
          </div>
          
          <div className="flex overflow-x-auto px-2 pb-2 gap-2 hide-scrollbar">
            {sessions.map(session => (
              <div 
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer text-sm whitespace-nowrap transition-colors ${
                  activeSessionId === session.id 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'bg-background hover:bg-muted border'
                }`}
              >
                <span>{session.customerName || session.name}</span>
                {session.items.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeSessionId === session.id ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
                  }`}>
                    {session.items.length}
                  </span>
                )}
                <button 
                  onClick={(e) => removeSession(session.id, e)}
                  className={`ml-1 rounded-full p-0.5 hover:bg-black/20 ${
                    activeSessionId === session.id ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2 mb-2">
            <Input 
              placeholder={t('customerName')} 
              value={customerName} 
              onChange={(e) => updateActiveSession({ customerName: e.target.value })}
              className="h-8 text-sm"
            />
            <Input 
              placeholder={t('customerPhone')} 
              value={customerPhone} 
              onChange={(e) => updateActiveSession({ customerPhone: e.target.value })}
              className="h-8 text-sm"
            />
          </div>

          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 flex flex-col items-center gap-2">
              <ShoppingCart className="h-8 w-8 opacity-20" />
              <p>{t('cartEmpty')}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex flex-col gap-2 p-3 bg-background rounded-md border shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="font-medium line-clamp-1">{item.name}</span>
                  <span className="font-semibold">Tk {(item.sellPrice * item.quantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tk {item.sellPrice.toFixed(2)} each</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.productId, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive ml-1" onClick={() => removeFromCart(item.productId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t bg-background">
          <div className="flex justify-between items-center mb-2 text-sm text-muted-foreground">
            <span>{t('subtotal')}:</span>
            <span>Tk {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center mb-4 text-sm">
            <span className="flex items-center">{t('discount')}:</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tk</span>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={discount || ''} 
                onChange={(e) => updateActiveSession({ discount: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-20 h-8 text-right"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mb-4 text-sm">
            <span className="flex items-center">{t('serviceCharge')}:</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tk</span>
              <Input 
                type="number" 
                min="0" 
                step="0.01" 
                value={serviceCharge || ''} 
                onChange={(e) => updateActiveSession({ serviceCharge: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="w-20 h-8 text-right"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mb-4 text-lg font-bold">
            <span>{t('total')}:</span>
            <span>Tk {totalAmount.toFixed(2)}</span>
          </div>
          <Button 
            className="w-full h-12 text-lg" 
            size="lg" 
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            {t('checkoutPrint')}
          </Button>
        </div>
      </div>

      {/* Receipt Preview Dialog */}
      <Dialog open={!!receiptData} onOpenChange={(open) => !open && setReceiptData(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('receiptPreview')}</DialogTitle>
          </DialogHeader>
          
          <div className="flex justify-center py-4 bg-muted/30 rounded-md overflow-y-auto max-h-[60vh]">
            {receiptData && (
              <Receipt
                ref={receiptRef}
                items={receiptData.items}
                subtotal={receiptData.subtotal}
                discount={receiptData.discount}
                serviceCharge={receiptData.serviceCharge}
                total={receiptData.total}
                date={receiptData.date}
              />
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setReceiptData(null)}>
              {t('close')}
            </Button>
            <Button onClick={handlePrint}>
              {t('printReceipt')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
